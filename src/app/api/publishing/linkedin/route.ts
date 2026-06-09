import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import {
  getLinkedinPostById,
  updateLinkedinPost,
  resolveBlogStoryByUuid,
} from '@/lib/storyblok-management'
import { buildBlogLinkPreview } from '@/lib/linkedin-link'
import {
  formatForLinkedIn,
  scheduleLinkedinPost,
  getPublerPostState,
  deletePublerPost,
  isPublishedState,
  isQueuedState,
  isLinkedinPublerConfigured,
  getLinkedinAccountId,
} from '@/lib/publer'

/**
 * POST /api/publishing/linkedin
 * Publish a LinkedIn post to Publer via AutoSchedule into the post's slot label
 * (MICM-13). Replaces the existing queued entry while still scheduled; blocks
 * hard if already published (MICM-12).
 * Body: { id: <linkedin storyblokId> }. Protected: Requires authentication.
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (!isLinkedinPublerConfigured()) {
    return NextResponse.json(
      { error: 'Publer/LinkedIn not configured (need PUBLER_API_KEY, PUBLER_WORKSPACE_ID, PUBLER_LINKEDIN_ACCOUNT_ID)' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const id: string = body.id
    if (!id) {
      return NextResponse.json({ error: 'LinkedIn post id required' }, { status: 400 })
    }

    const story = await getLinkedinPostById(id)
    if (!story) {
      return NextResponse.json({ error: 'LinkedIn post not found' }, { status: 404 })
    }

    const content = story.content || {}
    const text: string = content.linkedin_text || ''
    if (!text.trim()) {
      return NextResponse.json({ error: 'LinkedIn text is empty — nothing to publish' }, { status: 400 })
    }

    // Publer slot label (MICM-13) routes the post into the matching timeslot series
    // via AutoSchedule. Default "Standard" so publishing always works (incl. legacy
    // posts that predate the field) — matches the "Default Standard" product choice.
    const label: string = (content.cm_publer_label || '').trim() || 'Standard'

    const blogUuid: string | undefined = content.cm_blog_ref || undefined
    const isAttached = !!blogUuid

    // Hard publish guard (MICM-12 AK6): attached post requires a published parent blog.
    let blogUrl: string | undefined
    if (isAttached) {
      const blog = await resolveBlogStoryByUuid(blogUuid!)
      if (!blog) {
        return NextResponse.json({ error: 'Parent blog not found — cannot resolve link' }, { status: 400 })
      }
      const preview = buildBlogLinkPreview(blogUuid!, blog)
      if (!preview.published) {
        return NextResponse.json(
          { error: 'Parent blog is not published yet. Publish the blog first, then publish to LinkedIn.' },
          { status: 409 }
        )
      }
      blogUrl = preview.url
    }

    // Replace-while-queued / block-if-published (MICM-12 AK5).
    const existingIds: string[] = (content.cm_publer_post_ids || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    let replaced = false
    if (existingIds.length > 0) {
      const states = await Promise.all(
        existingIds.map(async (pid) => ({ pid, state: await getPublerPostState(pid).catch(() => 'unknown') }))
      )
      if (states.some((s) => isPublishedState(s.state))) {
        return NextResponse.json(
          { error: 'This post is already published on LinkedIn. Reset it before publishing again.' },
          { status: 409 }
        )
      }
      // Delete still-queued entries so we don't create a duplicate.
      const queued = states.filter((s) => isQueuedState(s.state))
      for (const { pid } of queued) {
        await deletePublerPost(pid)
        replaced = true
      }
    }

    // Media (MICM-12 AK2): attached → none (OG card); standalone → own image if present.
    const mediaUrl = !isAttached ? content.linkedin_image?.filename || undefined : undefined

    const finalText = formatForLinkedIn(text, blogUrl)
    const { jobId, postIds } = await scheduleLinkedinPost({
      text: finalText,
      accountId: getLinkedinAccountId()!,
      label,
      mediaUrl,
      mediaName: `linkedin-${story.slug || id}`,
    })

    // Persist real post ids + timestamp; story stays draft-only (MICM-12 AK4).
    await updateLinkedinPost(id, {
      cm_publer_post_ids: postIds.length ? postIds.join(',') : jobId,
      cm_publer_published_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      replaced,
      postIds,
      jobId,
      message: replaced
        ? `LinkedIn post replaced in the "${label}" slot queue.`
        : `LinkedIn post auto-scheduled into the next free "${label}" slot.`,
    })
  } catch (error: any) {
    console.error('[Publer LinkedIn] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
