import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { redirectSchema } from '@/lib/validation'
import { validateRedirect } from '@/lib/redirect-validator'
import { invalidateRedirectCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''

    const offset = (page - 1) * limit

    let query = supabase
      .from('post_redirects')
      .select(`
        *,
        target_post:posts!post_redirects_target_post_id_fkey(id, title, slug, status)
      `, { count: 'exact' })
      .eq('created_by', currentUserId)

    if (type && (type === 'post' || type === 'url')) {
      query = query.eq('redirect_type', type)
    }

    if (search) {
      query = query.or(`target_url.ilike.%${search}%`)
    }

    const { data: redirects, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const redirectsData = redirects || []
    
    const sourcePostIds = redirectsData
      .map(r => r.source_post_id)
      .filter((id): id is string => id != null)
    
    let sourcePostsMap: Record<string, any> = {}
    if (sourcePostIds.length > 0) {
      const { data: sourcePosts } = await supabase
        .from('posts')
        .select('id, title, slug, status')
        .in('id', sourcePostIds)
      
      if (sourcePosts) {
        sourcePostsMap = sourcePosts.reduce((acc, post) => {
          acc[post.id] = post
          return acc
        }, {} as Record<string, any>)
      }
    }
    
    const enrichedRedirects = redirectsData.map(redirect => ({
      ...redirect,
      source_post: sourcePostsMap[redirect.source_post_id] || null
    }))

    return successResponse({
      redirects: enrichedRedirects,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: (count || 0) > offset + limit,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    return errorResponse('Failed to fetch redirects')
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }

    const body = await request.json()
    
    const validation = redirectSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { sourcePostId, redirectType, targetPostId, targetUrl, httpStatusCode, notes } = validation.data

    const validationResult = await validateRedirect(
      sourcePostId,
      redirectType,
      targetPostId,
      targetUrl
    )

    if (!validationResult.valid) {
      return validationErrorResponse(validationResult.errors.join(', '))
    }

    const { data: sourcePost } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', sourcePostId)
      .single()

    if (!sourcePost) {
      return errorResponse('Source post not found', 404)
    }

    if (sourcePost.author_id !== currentUserId) {
      return unauthorizedResponse('You can only create redirects for your own posts')
    }

    const insertData: any = {
      source_post_id: sourcePostId,
      redirect_type: redirectType,
      http_status_code: httpStatusCode,
      created_by: currentUserId,
      notes
    }

    if (redirectType === 'post') {
      insertData.target_post_id = targetPostId
    } else {
      insertData.target_url = targetUrl
    }

    const { data: newRedirect, error } = await supabase
      .from('post_redirects')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    await invalidateRedirectCache(sourcePostId)

    return successResponse({
      redirect: newRedirect,
      warnings: validationResult.warnings
    }, false, 201)
  } catch (error) {
    return errorResponse('Failed to create redirect')
  }
}