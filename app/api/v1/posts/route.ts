import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { mapPostsFromDB } from '@/lib/post-mapper'
import { checkRateLimit } from '@/lib/rate-limit'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

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
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const tag = searchParams.get('tag') || ''
    const status = searchParams.get('status') || 'published'
    
    const offset = (page - 1) * limit
    
    const cacheKey = `api:v1:posts:${page}:${limit}:${search}:${category}:${tag}:${status}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `, { count: 'exact' })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }
    
    if (category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .or(`id.eq.${category},slug.eq.${category}`)
        .single()
      
      if (categoryData) {
        const { data: postIds } = await supabase
          .from('post_categories')
          .select('post_id')
          .eq('category_id', categoryData.id)
        
        if (postIds && postIds.length > 0) {
          const ids = postIds.map((p: any) => p.post_id)
          query = query.in('id', ids)
        } else {
          query = query.in('id', [])
        }
      }
    }
    
    if (tag) {
      const { data: tagData } = await supabase
        .from('tags')
        .select('id')
        .or(`id.eq.${tag},slug.eq.${tag}`)
        .single()
      
      if (tagData) {
        const { data: postIds } = await supabase
          .from('post_tags')
          .select('post_id')
          .eq('tag_id', tagData.id)
        
        if (postIds && postIds.length > 0) {
          const ids = postIds.map((p: any) => p.post_id)
          query = query.in('id', ids)
        } else {
          query = query.in('id', [])
        }
      }
    }
    
    const { data: posts, error, count } = await query
      .order('publish_date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    
    const postsWithRelations = await mapPostsFromDB(posts || [])
    
    const totalPages = Math.ceil((count || 0) / limit)
    
    const responseData = {
      posts: postsWithRelations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search: search || null,
        category: category || null,
        tag: tag || null,
        status: status || null,
      }
    }
    
    await setCachedData(cacheKey, responseData, 3600)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return setCorsHeaders(errorResponse('Failed to fetch posts'), origin)
  }
}
