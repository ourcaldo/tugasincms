import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { mapPostFromDB } from '@/lib/post-mapper'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { updatePostSchema } from '@/lib/validation'
import { invalidateSitemaps } from '@/lib/sitemap'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const cacheKey = `api:posts:id:${id}`
    const cachedPost = await getCachedData(cacheKey)
    if (cachedPost) {
      return successResponse(cachedPost, true)
    }
    
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('id', id)
      .eq('author_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Post not found')
      }
      throw error
    }
    
    if (!post) {
      return notFoundResponse('Post not found')
    }
    
    const mappedPost = await mapPostFromDB(post)
    
    await setCachedData(cacheKey, mappedPost, 300)
    
    return successResponse(mappedPost, false)
  } catch (error) {
    console.error('Error fetching post:', error)
    return errorResponse('Failed to fetch post')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const { data: existingPost } = await supabase
      .from('posts')
      .select('author_id, status')
      .eq('id', id)
      .single()
    
    if (!existingPost) {
      return notFoundResponse('Post not found')
    }
    
    if (existingPost.author_id !== userId) {
      return forbiddenResponse('You can only edit your own posts')
    }
    
    const body = await request.json()
    
    const validation = updatePostSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = validation.data
    
    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        excerpt,
        slug,
        featured_image: featuredImage,
        publish_date: publishDate,
        status,
        seo_title: seo?.title,
        meta_description: seo?.metaDescription,
        focus_keyword: seo?.focusKeyword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    await supabase.from('post_categories').delete().eq('post_id', id)
    await supabase.from('post_tags').delete().eq('post_id', id)
    
    if (categories && categories.length > 0) {
      const categoryInserts = categories.map((catId: string) => ({
        post_id: id,
        category_id: catId,
      }))
      await supabase.from('post_categories').insert(categoryInserts)
    }
    
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        post_id: id,
        tag_id: tagId,
      }))
      await supabase.from('post_tags').insert(tagInserts)
    }
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    await deleteCachedData(`api:posts:id:${id}`)
    
    if (status === 'published' || existingPost.status === 'published') {
      await invalidateSitemaps()
    }
    
    const { data: fullPost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    return successResponse(await mapPostFromDB(fullPost), false)
  } catch (error) {
    console.error('Error updating post:', error)
    return errorResponse('Failed to update post')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    
    const { data: existingPost } = await supabase
      .from('posts')
      .select('author_id, status')
      .eq('id', id)
      .single()
    
    if (!existingPost) {
      return notFoundResponse('Post not found')
    }
    
    if (existingPost.author_id !== userId) {
      return forbiddenResponse('You can only delete your own posts')
    }
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    await deleteCachedData(`api:posts:id:${id}`)
    
    if (existingPost.status === 'published') {
      await invalidateSitemaps()
    }
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting post:', error)
    return errorResponse('Failed to delete post')
  }
}
