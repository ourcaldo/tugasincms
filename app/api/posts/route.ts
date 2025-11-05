import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { mapPostsFromDB, mapPostFromDB } from '@/lib/post-mapper'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { postSchema } from '@/lib/validation'
import { invalidateSitemaps } from '@/lib/sitemap'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const cacheKey = `api:posts:user:${userId}:page:${page}:limit:${limit}:search:${search}:status:${status}:category:${category}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return successResponse(cachedData, true)
    }
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `, { count: 'exact' })
      .eq('author_id', userId)
    
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (category) {
      query = query.contains('post_categories', [{ category_id: category }])
    }
    
    const { data: posts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    const postsWithRelations = await mapPostsFromDB(posts || [])
    
    const responseData = {
      posts: postsWithRelations,
      total: count || 0,
      page,
      limit
    }
    
    await setCachedData(cacheKey, responseData, 300)
    
    return successResponse(responseData, false)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return errorResponse('Failed to fetch posts')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    
    const validation = postSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = validation.data
    
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        excerpt,
        slug,
        featured_image: featuredImage,
        publish_date: publishDate || new Date().toISOString(),
        status: status || 'draft',
        author_id: userId,
        seo_title: seo?.title,
        meta_description: seo?.metaDescription,
        focus_keyword: seo?.focusKeyword,
      })
      .select()
      .single()
    
    if (error) throw error
    
    if (categories && categories.length > 0) {
      const categoryInserts = categories.map((catId: string) => ({
        post_id: newPost.id,
        category_id: catId,
      }))
      await supabase.from('post_categories').insert(categoryInserts)
    }
    
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        post_id: newPost.id,
        tag_id: tagId,
      }))
      await supabase.from('post_tags').insert(tagInserts)
    }
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    
    if (status === 'published') {
      await invalidateSitemaps()
    }
    
    const { data: fullPost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('id', newPost.id)
      .single()
    
    if (fetchError) throw fetchError
    
    return successResponse(await mapPostFromDB(fullPost), false, 201)
  } catch (error) {
    console.error('Error creating post:', error)
    return errorResponse('Failed to create post')
  }
}
