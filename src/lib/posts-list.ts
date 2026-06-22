/**
 * Server-side assembly for the posts list view (MICM: server-side filtering).
 *
 * The list page does NOT fetch the full dataset and filter in the browser
 * (see the `frontend-data-rules` OS rule). Instead this module — called by
 * `GET /api/posts/list` — fetches a bounded set, derives status, joins the
 * attached LinkedIn posts + schedule, filters, counts, and returns only the
 * resulting set. Server-only (Management-token path); never import client-side.
 *
 * View model (single-select, mutually exclusive):
 *  - `unpublished` → all not-yet-published blog/article posts (the worklist).
 *  - a year (e.g. `2026`) → all posts of that year, pushed down to Storyblok via
 *    a `content.date` range query (bounded — no pagination needed).
 */

import { fetchBlogPosts, fetchLinkedinPosts, fetchEarliestPostYear, mergeStoriesWithPublishFlags } from './storyblok'
import { fetchBlogPostsManagement } from './storyblok-management'
import { transformStoryblokBlog, transformStoryblokLinkedin, getContentPipelineColor } from './transform-storyblok'
import { buildLinkedinStatusByBlog } from './linkedin-status'
import { buildScheduledMap } from './mcp-posts'
import type { StatusCheck } from '@/types'

const NO_LINKEDIN: StatusCheck = { completed: false, color: 'gray' }

export interface PostListParams {
  /** `unpublished` or a 4-digit year. */
  view?: string
  /** Serialized status filters ("r"/"y"/"b"/"g" combined), like the URL params. */
  content?: string | null
  linkedin?: string | null
  q?: string | null
}

/** One filter per phase. `red` is the leftmost "fehlt/keiner" slot (matches red OR gray). */
interface StatusFilter { red: boolean; yellow: boolean; blue: boolean; green: boolean }
type DimColorCounts = { red: number; yellow: number; blue: number; green: number }

export interface PostListResult {
  posts: any[]
  counts: { content: DimColorCounts; linkedin: DimColorCounts }
  availableYears: number[]
  total: number
  view: string
}

function parseFilter(param?: string | null): StatusFilter {
  return {
    red: !!param && param.includes('r'),
    yellow: !!param && param.includes('y'),
    blue: !!param && param.includes('b'),
    green: !!param && param.includes('g'),
  }
}

/**
 * Match a phase color against the active filter (MICM-37 four-phase pipeline).
 * The leftmost `red` slot is the "fehlt/keiner" phase and matches both `red`
 * (Content: required fields missing) and `gray` (LinkedIn: no post attached).
 */
function matchesStatusFilter(color: string, filter: StatusFilter): boolean {
  if (!filter.red && !filter.yellow && !filter.blue && !filter.green) return true
  if (filter.green && color === 'green') return true
  if (filter.blue && color === 'blue') return true
  if (filter.yellow && color === 'yellow') return true
  if (filter.red && (color === 'red' || color === 'gray')) return true
  return false
}

const dimColor = (post: any, key: 'content' | 'linkedin'): string =>
  key === 'linkedin' ? post.linkedinStatus.color : post.contentColor

/** Fetch blog/article stories with publish flags merged, optionally restricted to a year. */
async function fetchMergedStories(year?: number): Promise<any[]> {
  const range = year
    ? { dateFrom: `${year - 1}-12-31`, dateTo: `${year + 1}-01-01` }
    : {}
  const [cdn, mgmt] = await Promise.allSettled([
    fetchBlogPosts({ perPage: 100, ...range }),
    fetchBlogPostsManagement({ perPage: 100, ...range }),
  ])
  const cdnStories = cdn.status === 'fulfilled' ? (cdn.value?.stories || []) : []
  const mgmtStories = mgmt.status === 'fulfilled' ? mgmt.value : []
  return mergeStoriesWithPublishFlags(cdnStories, mgmtStories)
}

export async function getPostListView(params: PostListParams): Promise<PostListResult> {
  const rawView = (params.view || 'unpublished').trim()
  const yearMatch = /^\d{4}$/.test(rawView) ? parseInt(rawView, 10) : null
  const view = yearMatch ? String(yearMatch) : 'unpublished'

  // Bounded fetch: year view → date-range pushdown; unpublished → all (drafts are few).
  const [stories, linkedinRes, scheduledMap, earliestYear] = await Promise.all([
    fetchMergedStories(yearMatch ?? undefined),
    fetchLinkedinPosts().catch(() => ({ stories: [] as any[] })),
    buildScheduledMap().catch(() => new Map<string, string | null>()),
    fetchEarliestPostYear().catch(() => null),
  ])

  // LinkedIn join: blog UUID -> attached-post status (gray/yellow/blue/green).
  const linkedinPosts = (linkedinRes.stories || []).map(transformStoryblokLinkedin)
  const linkedinStatusMap = buildLinkedinStatusByBlog(linkedinPosts, (uuid) => scheduledMap.has(uuid))

  let posts = stories.map((story: any) => {
    const post = transformStoryblokBlog(story)
    const scheduledAt = scheduledMap.get(post.id) ?? undefined
    return {
      ...post,
      scheduledAt,
      linkedinStatus: linkedinStatusMap[post.id] ?? NO_LINKEDIN,
      // Unified content pipeline phase (MICM-37): fields + scheduler + publish → one axis.
      contentColor: getContentPipelineColor({
        contentColor: post.status.contentComplete.color,
        published: post.status.published.completed,
        scheduled: !!scheduledAt,
      }),
    }
  })

  // View filter: unpublished = not currently live on the website.
  if (!yearMatch) {
    posts = posts.filter((p) => !p.status.published.completed)
  }

  // Search.
  const q = (params.q || '').toLowerCase().trim()
  const matchesSearch = (p: any) =>
    !q ||
    p.pagetitle.toLowerCase().includes(q) ||
    p.abstract.toLowerCase().includes(q) ||
    p.teasertitle.toLowerCase().includes(q)

  const filters = {
    content: parseFilter(params.content),
    linkedin: parseFilter(params.linkedin),
  }

  // Per-dimension counts: over the view set + search + the OTHER dimension filter
  // (not the counted dimension itself) — same semantics as the previous client logic.
  const countFor = (key: 'content' | 'linkedin'): DimColorCounts => {
    const counted = posts.filter((p) => {
      if (!matchesSearch(p)) return false
      for (const k of ['content', 'linkedin'] as const) {
        if (k === key) continue
        if (!matchesStatusFilter(dimColor(p, k), filters[k])) return false
      }
      return true
    })
    let red = 0, yellow = 0, blue = 0, green = 0
    for (const p of counted) {
      const c = dimColor(p, key)
      if (c === 'green') green++
      else if (c === 'blue') blue++
      else if (c === 'yellow') yellow++
      else red++ // red (Content) or gray (LinkedIn) → "fehlt/keiner" slot
    }
    return { red, yellow, blue, green }
  }
  const counts = {
    content: countFor('content'),
    linkedin: countFor('linkedin'),
  }

  // Final filtered list: search + both pipeline filters.
  const filtered = posts.filter(
    (p) =>
      matchesSearch(p) &&
      matchesStatusFilter(dimColor(p, 'content'), filters.content) &&
      matchesStatusFilter(dimColor(p, 'linkedin'), filters.linkedin),
  )

  const currentYear = new Date().getFullYear()
  const from = earliestYear ?? currentYear
  const availableYears: number[] = []
  for (let y = currentYear; y >= from; y--) availableYears.push(y)

  return { posts: filtered, counts, availableYears, total: filtered.length, view }
}
