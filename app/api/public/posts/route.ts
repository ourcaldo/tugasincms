import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { mapPostsFromDB } from '@/lib/post-mapper'
import { checkRateLimit } from '@/lib/rate-limit'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { publicPostSchema } from '@/lib/validation'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`)
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse('Rate limit exceeded. Please try again later.', 429),
        origin
      )
    }
    
    const cacheKey = 'api:public:posts:all'
    
    const cachedPosts = await getCachedData(cacheKey)
    if (cachedPosts) {
      return setCorsHeaders(successResponse(cachedPosts, true), origin)
    }
    
    const { data: publishedPosts, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('status', 'published')
      .order('publish_date', { ascending: false })
    
    if (error) throw error
    
    const postsWithRelations = await mapPostsFromDB(publishedPosts || [])
    
    await setCachedData(cacheKey, postsWithRelations, 3600)
    
    return setCorsHeaders(successResponse(postsWithRelations, false), origin)
  } catch (error) {
    console.error('Error fetching published posts:', error)
    return setCorsHeaders(errorResponse('Failed to fetch posts'), origin)
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    const rateLimitResult = await checkRateLimit(`api_token:${validToken.id}`)
    if (!rateLimitResult.success) {
      return setCorsHeaders(
        errorResponse('Rate limit exceeded. Please try again later.', 429),
        origin
      )
    }
    
    const body = await request.json()
    
    const validation = publicPostSchema.safeParse(body)
    if (!validation.success) {
      return setCorsHeaders(
        validationErrorResponse(validation.error.issues[0].message),
        origin
      )
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = validation.data
    
    const postPublishDate = publishDate || new Date().toISOString()
    const isFutureDate = new Date(postPublishDate) > new Date()
    
    let postStatus = status
    if (!postStatus) {
      postStatus = isFutureDate ? 'scheduled' : 'draft'
    } else if (postStatus === 'scheduled' && !isFutureDate) {
      postStatus = 'published'
    }
    
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        excerpt,
        slug,
        featured_image: featuredImage,
        publish_date: postPublishDate,
        status: postStatus,
        author_id: validToken.user_id,
        seo_title: seo?.title,
        meta_description: seo?.metaDescription,
        focus_keyword: seo?.focusKeyword,
      })
      .select()
      .single()
    
    if (error) throw error
    
    const categoryIds: string[] = []
    
    if (categories && typeof categories === 'string' && categories.trim()) {
      const categoryNames = categories.split(',').map((name: string) => name.trim()).filter(Boolean)
      
      for (const categoryName of categoryNames) {
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('name', categoryName)
          .single()
        
        if (existingCategory) {
          categoryIds.push(existingCategory.id)
        } else {
          const { data: newCategory } = await supabase
            .from('categories')
            .insert({
              name: categoryName,
              slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
            })
            .select('id')
            .single()
          
          if (newCategory) {
            categoryIds.push(newCategory.id)
          }
        }
      }
      
      if (categoryIds.length > 0) {
        const categoryInserts = categoryIds.map((catId: string) => ({
          post_id: newPost.id,
          category_id: catId,
        }))
        await supabase.from('post_categories').insert(categoryInserts)
      }
    }
    
    if (tags && typeof tags === 'string' && tags.trim()) {
      const tagNames = tags.split(',').map((name: string) => name.trim()).filter(Boolean)
      const tagIds = []
      
      for (const tagName of tagNames) {
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single()
        
        if (existingTag) {
          tagIds.push(existingTag.id)
        } else {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({
              name: tagName,
              slug: tagName.toLowerCase().replace(/\s+/g, '-'),
            })
            .select('id')
            .single()
          
          if (newTag) {
            tagIds.push(newTag.id)
          }
        }
      }
      
      if (tagIds.length > 0) {
        const tagInserts = tagIds.map((tagId: string) => ({
          post_id: newPost.id,
          tag_id: tagId,
        }))
        await supabase.from('post_tags').insert(tagInserts)
      }
    }
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    
    const sitemapHost = process.env.SITEMAP_HOST || process.env.NEXT_PUBLIC_SITEMAP_HOST || 'localhost:5000'
    
    let postUrl = `https://${sitemapHost}/${newPost.slug}`
    
    if (categoryIds.length > 0) {
      const { data: firstCategory } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', categoryIds[0])
        .single()
      
      if (firstCategory?.slug) {
        postUrl = `https://${sitemapHost}/${firstCategory.slug}/${newPost.slug}`
      }
    }
    
    const responseData = {
      ...newPost,
      postUrl
    }
    
    return setCorsHeaders(successResponse(responseData, false, 201), origin)
  } catch (error) {
    console.error('Error creating post:', error)
    return setCorsHeaders(errorResponse('Failed to create post'), origin)
  }
}
