import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCachedData, setCachedData } from '@/lib/cache'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/response'
import { mapPostsFromDB, MappedPost } from '@/lib/post-mapper'
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
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const offset = (page - 1) * limit
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const cacheKey = `api:v1:categories:${isUUID ? 'id' : 'slug'}:${id}:${page}:${limit}`
    
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return setCorsHeaders(successResponse(cachedData, true), origin)
    }
    
    let categoryQuery = supabase
      .from('categories')
      .select('*')
    
    if (isUUID) {
      categoryQuery = categoryQuery.eq('id', id)
    } else {
      categoryQuery = categoryQuery.eq('slug', id)
    }
    
    const { data: category, error: categoryError } = await categoryQuery.single()
    
    if (categoryError) {
      if (categoryError.code === 'PGRST116') {
        return setCorsHeaders(notFoundResponse('Category not found'), origin)
      }
      throw categoryError
    }
    
    if (!category) {
      return setCorsHeaders(notFoundResponse('Category not found'), origin)
    }
    
    const { data: postCategories, count } = await supabase
      .from('post_categories')
      .select('post_id', { count: 'exact' })
      .eq('category_id', category.id)
    
    const postIds = (postCategories || []).map((pc: any) => pc.post_id)
    
    let postsData: MappedPost[] = []
    if (postIds.length > 0) {
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          categories:post_categories(category:categories(*)),
          tags:post_tags(tag:tags(*))
        `)
        .in('id', postIds)
        .eq('status', 'published')
        .order('publish_date', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (postsError) throw postsError
      
      postsData = await mapPostsFromDB(posts || [])
    }
    
    const totalPages = Math.ceil((count || 0) / limit)
    
    const responseData = {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        postCount: count || 0,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
      },
      posts: postsData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
    
    await setCachedData(cacheKey, responseData, 3600)
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching category:', error)
    return setCorsHeaders(errorResponse('Failed to fetch category'), origin)
  }
}
