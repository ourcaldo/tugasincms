import { NextRequest } from 'next/server'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { validateRedirect } from '@/lib/redirect-validator'

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }

    const searchParams = request.nextUrl.searchParams
    const sourcePostId = searchParams.get('sourcePostId')
    const redirectType = searchParams.get('redirectType') as 'post' | 'url'
    const targetPostId = searchParams.get('targetPostId') || undefined
    const targetUrl = searchParams.get('targetUrl') || undefined
    const existingRedirectId = searchParams.get('existingRedirectId') || undefined

    if (!sourcePostId || !redirectType) {
      return errorResponse('sourcePostId and redirectType are required', 400)
    }

    if (redirectType !== 'post' && redirectType !== 'url') {
      return errorResponse('redirectType must be "post" or "url"', 400)
    }

    const validationResult = await validateRedirect(
      sourcePostId,
      redirectType,
      targetPostId,
      targetUrl,
      existingRedirectId
    )

    return successResponse({
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings
    })
  } catch (error) {
    return errorResponse('Failed to validate redirect')
  }
}