import { LinkedinPost, StatusCheck } from '@/types'

/**
 * Aggregate the LinkedIn status per blog parent from a list of LinkedIn posts.
 *
 * A blog's "LinkedIn dot" reflects its attached LinkedIn post(s):
 *   gray = none attached, yellow = in progress, blue = scheduled, green = published.
 * With multiple attachments the least-done wins (yellow > blue > green) so the blog
 * stays in the worklist until every attached post is published.
 *
 * `isScheduled(uuid)` reports whether a story UUID has a pending schedule slot.
 * Blue (scheduled) follows the scheduler coupling (MICM-14): an attached LinkedIn
 * post is published in its PARENT BLOG's slot, but only if it is content-complete
 * (the tick fires only those). So it's blue when the parent blog is scheduled and
 * the post is content-complete — or when the post itself has a standalone schedule.
 *
 * Blogs with no attached LinkedIn post are simply absent from the map; callers treat
 * the missing entry as gray ("not destined for LinkedIn").
 */
export function buildLinkedinStatusByBlog(
  linkedinPosts: LinkedinPost[],
  isScheduled: (uuid: string) => boolean = () => false,
): Record<string, StatusCheck> {
  const byParent: Record<string, StatusCheck['color'][]> = {}
  for (const lp of linkedinPosts) {
    if (!lp.blogParentUuid) continue
    // Coupled posts ride along with the parent blog's slot (content-complete only);
    // a standalone schedule on the post's own UUID also counts.
    const scheduled =
      isScheduled(lp.id) ||
      (isScheduled(lp.blogParentUuid) && !!lp.status?.contentComplete?.completed)
    const color: StatusCheck['color'] = lp.status?.publishedLinkedIn?.completed
      ? 'green'
      : scheduled
        ? 'blue'
        : 'yellow'
    ;(byParent[lp.blogParentUuid] ||= []).push(color)
  }

  const map: Record<string, StatusCheck> = {}
  for (const [parentUuid, colors] of Object.entries(byParent)) {
    const color: StatusCheck['color'] = colors.includes('yellow')
      ? 'yellow'
      : colors.includes('blue')
        ? 'blue'
        : 'green'
    map[parentUuid] = { completed: color === 'green', color }
  }
  return map
}
