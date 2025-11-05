import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { updateRedirectSchema } from '@/lib/validation'
import { validateRedirect } from '@/lib/redirect-validator'
import { invalidateRedirectCache } from '@/lib/cache'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }

    const redirectId = params.id
    const body = await request.json()

    const validation = updateRedirectSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }

    const { data: existingRedirect, error: fetchError } = await supabase
      .from('post_redirects')
      .select('*')
      .eq('id', redirectId)
      .eq('created_by', currentUserId)
      .single()

    if (fetchError || !existingRedirect) {
      return errorResponse('Redirect not found', 404)
    }

    const { redirectType, targetPostId, targetUrl, httpStatusCode, notes } = validation.data

    const newRedirectType = redirectType || existingRedirect.redirect_type
    const newTargetPostId = targetPostId !== undefined ? targetPostId : existingRedirect.target_post_id
    const newTargetUrl = targetUrl !== undefined ? targetUrl : existingRedirect.target_url

    const validationResult = await validateRedirect(
      existingRedirect.source_post_id,
      newRedirectType,
      newTargetPostId,
      newTargetUrl,
      redirectId
    )

    if (!validationResult.valid) {
      return validationErrorResponse(validationResult.errors.join(', '))
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (redirectType) updateData.redirect_type = redirectType
    if (httpStatusCode) updateData.http_status_code = httpStatusCode
    if (notes !== undefined) updateData.notes = notes

    if (redirectType === 'post' || (existingRedirect.redirect_type === 'post' && !redirectType)) {
      if (targetPostId) updateData.target_post_id = targetPostId
      updateData.target_url = null
    } else if (redirectType === 'url' || (existingRedirect.redirect_type === 'url' && !redirectType)) {
      if (targetUrl) updateData.target_url = targetUrl
      updateData.target_post_id = null
    }

    const { data: updatedRedirect, error } = await supabase
      .from('post_redirects')
      .update(updateData)
      .eq('id', redirectId)
      .eq('created_by', currentUserId)
      .select()
      .single()

    if (error) throw error

    await invalidateRedirectCache(existingRedirect.source_post_id)

    const mappedRedirect = {
      id: updatedRedirect.id,
      sourcePostId: updatedRedirect.source_post_id,
      redirectType: updatedRedirect.redirect_type,
      targetPostId: updatedRedirect.target_post_id,
      targetUrl: updatedRedirect.target_url,
      httpStatusCode: updatedRedirect.http_status_code,
      createdBy: updatedRedirect.created_by,
      createdAt: updatedRedirect.created_at,
      updatedAt: updatedRedirect.updated_at,
      notes: updatedRedirect.notes
    }

    return successResponse({
      redirect: mappedRedirect,
      warnings: validationResult.warnings
    })
  } catch (error) {
    return errorResponse('Failed to update redirect')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }

    const redirectId = params.id

    const { data: existingRedirect, error: fetchError } = await supabase
      .from('post_redirects')
      .select('source_post_id')
      .eq('id', redirectId)
      .eq('created_by', currentUserId)
      .single()

    if (fetchError || !existingRedirect) {
      return errorResponse('Redirect not found', 404)
    }

    const { error } = await supabase
      .from('post_redirects')
      .delete()
      .eq('id', redirectId)
      .eq('created_by', currentUserId)

    if (error) throw error

    await invalidateRedirectCache(existingRedirect.source_post_id)

    return successResponse({ message: 'Redirect deleted successfully' })
  } catch (error) {
    return errorResponse('Failed to delete redirect')
  }
}