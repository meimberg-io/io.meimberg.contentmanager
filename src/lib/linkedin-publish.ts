/**
 * LinkedIn publish orchestration (MICM-17).
 *
 * Extracted from the manual route (/api/publishing/linkedin) into a session-free
 * lib function so BOTH the manual button and the scheduler (MICM-14) share it.
 * Publishes a LinkedIn post to Publer immediately ("post now"); the Content Manager
 * owns the timing, so this is called exactly when the post should go out.
 */

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
 * Error carrying an HTTP-ish status so the manual route can map it to a response.
 * The scheduler simply treats any throw as a failure for that entry.
 */
export class LinkedinPublishError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'LinkedinPublishError'
    this.status = status
  }
}

export interface LinkedinPublishResult {
  /** A still-queued Publer entry was deleted and replaced. */
  replaced: boolean
  postIds: string[]
  jobId: string
}

/**
 * Publish a LinkedIn post to Publer immediately.
 *
 * - Attached posts (cm_blog_ref) require the parent blog to be published (else 409)
 *   and are sent text-only with the fresh blog URL appended, so LinkedIn unfurls it
 *   into a link-preview card (og:image + clickable title + source). No media is
 *   attached — a photo would suppress the unfurl and show a bare image instead.
 * - Idempotent: an already-published Publer entry blocks (409); a still-queued one
 *   is deleted and replaced.
 * - The Storyblok story stays draft-only; only cm_publer_* fields are written.
 *
 * @param storyId numeric Storyblok story id of the linkedin_post.
 */
export async function publishLinkedinNow(storyId: string): Promise<LinkedinPublishResult> {
  if (!isLinkedinPublerConfigured()) {
    throw new LinkedinPublishError(
      'Publer/LinkedIn not configured (need PUBLER_API_KEY, PUBLER_WORKSPACE_ID, PUBLER_LINKEDIN_ACCOUNT_ID)',
      500,
    )
  }

  const story = await getLinkedinPostById(storyId)
  if (!story) throw new LinkedinPublishError('LinkedIn post not found', 404)

  const content = story.content || {}
  const text: string = content.linkedin_text || ''
  if (!text.trim()) throw new LinkedinPublishError('LinkedIn text is empty — nothing to publish', 400)

  const blogUuid: string | undefined = content.cm_blog_ref || undefined
  const isAttached = !!blogUuid

  // Hard publish guard (MICM-12 AK6): attached post requires a published parent blog.
  let blogUrl: string | undefined
  if (isAttached) {
    const blog = await resolveBlogStoryByUuid(blogUuid!)
    if (!blog) throw new LinkedinPublishError('Parent blog not found — cannot resolve link', 400)
    const preview = buildBlogLinkPreview(blogUuid!, blog)
    if (!preview.published) {
      throw new LinkedinPublishError(
        'Parent blog is not published yet. Publish the blog first, then publish to LinkedIn.',
        409,
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
      existingIds.map(async (pid) => ({ pid, state: await getPublerPostState(pid).catch(() => 'unknown') })),
    )
    if (states.some((s) => isPublishedState(s.state))) {
      throw new LinkedinPublishError(
        'This post is already published on LinkedIn. Reset it before publishing again.',
        409,
      )
    }
    const queued = states.filter((s) => isQueuedState(s.state))
    for (const { pid } of queued) {
      await deletePublerPost(pid)
      replaced = true
    }
  }

  // Media by post kind:
  // - Standalone → attach its own image as a photo (no link, so no unfurl to lose).
  // - Attached → NO media: a text-only ('status') post lets LinkedIn unfurl the
  //   appended blog URL into a preview card (og:image + clickable title + source).
  //   Attaching the image as a photo would suppress that card and show a bare image.
  const mediaUrl = isAttached ? undefined : content.linkedin_image?.filename || undefined
  const finalText = formatForLinkedIn(text, blogUrl)

  const { jobId, postIds } = await scheduleLinkedinPost({
    text: finalText,
    accountId: getLinkedinAccountId()!,
    mediaUrl,
    mediaName: `linkedin-${story.slug || storyId}`,
  })

  // Persist real post ids + timestamp; story stays draft-only (MICM-12 AK4).
  await updateLinkedinPost(storyId, {
    cm_publer_post_ids: postIds.length ? postIds.join(',') : jobId,
    cm_publer_published_at: new Date().toISOString(),
  })

  return { replaced, postIds, jobId }
}
