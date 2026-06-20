import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { publishLinkedinNow } from '@/lib/linkedin-publish'

/**
 * POST /api/publishing/linkedin
 * Manually publish a LinkedIn post to Publer immediately (MICM-17). Shares the
 * publishLinkedinNow() orchestration with the scheduler (MICM-14): the Content
 * Manager owns the timing, Publer is a plain "post now" API. Replace-while-queued /
 * block-if-published idempotency lives inside publishLinkedinNow.
 * Body: { id: <linkedin storyblokId> }. Protected: requires authentication.
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const id: string = body.id
    if (!id) {
      return NextResponse.json({ error: 'LinkedIn post id required' }, { status: 400 })
    }

    const result = await publishLinkedinNow(id)

    return NextResponse.json({
      success: true,
      replaced: result.replaced,
      postIds: result.postIds,
      jobId: result.jobId,
      message: result.replaced
        ? 'LinkedIn post replaced and re-published.'
        : 'LinkedIn post published to LinkedIn.',
    })
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500
    if (status >= 500) console.error('[Publer LinkedIn] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status })
  }
}
