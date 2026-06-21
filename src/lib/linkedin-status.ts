import { LinkedinPost, StatusCheck } from '@/types'

/**
 * Aggregate the LinkedIn status per blog parent from a list of LinkedIn posts.
 *
 * A blog's "LinkedIn dot" reflects its attached LinkedIn post(s):
 *   gray = none attached, yellow = in progress, blue = scheduled, green = published.
 * With multiple attachments the least-done wins (yellow > blue > green) so the blog
 * stays in the worklist until every attached post is published.
 *
 * `isScheduled` decides the blue state (a LinkedIn post queued for publishing) — pass
 * a predicate over the LinkedIn post UUID, since the schedule lives outside this data.
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
    const color: StatusCheck['color'] = lp.status?.publishedLinkedIn?.completed
      ? 'green'
      : isScheduled(lp.id)
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
