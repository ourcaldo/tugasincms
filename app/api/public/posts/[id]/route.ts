import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/response'
import { mapPostFromDB } from '@/lib/post-mapper'
import { checkRateLimit } from '@/lib/rate-limit'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id } = await params
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const cacheKey = `api:public:posts:${isUUID ? 'id' : 'slug'}:${id}`
    
    const cachedPost = await getCachedData(cacheKey)
    if (cachedPost) {
      return setCorsHeaders(successResponse(cachedPost, true), origin)
    }
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('status', 'published')
    
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }
    
    const { data: post, error } = await query.single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return setCorsHeaders(notFoundResponse('Post not found'), origin)
      }
      throw error
    }
    
    if (!post) {
      return setCorsHeaders(notFoundResponse('Post not found'), origin)
    }
    
    const postWithRelations = await mapPostFromDB(post)
    
    await setCachedData(cacheKey, postWithRelations, 3600)
    
    return setCorsHeaders(successResponse(postWithRelations, false), origin)
  } catch (error) {
    console.error('Error fetching post:', error)
    return setCorsHeaders(errorResponse('Failed to fetch post'), origin)
  }
}
