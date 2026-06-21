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
import { transformStoryblokBlog, transformStoryblokLinkedin } from './transform-storyblok'
import { buildLinkedinStatusByBlog } from './linkedin-status'
import { buildScheduledMap } from './mcp-posts'
import type { StatusCheck } from '@/types'

const NO_LINKEDIN: StatusCheck = { completed: false, color: 'gray' }

export interface PostListParams {
  /** `unpublished` or a 4-digit year. */
  view?: string
  /** Serialized status filters ("r"/"y"/"g" combined), like the URL params. */
  content?: string | null
  published?: string | null
  linkedin?: string | null
  q?: string | null
}

interface StatusFilter { red: boolean; yellow: boolean; green: boolean }
type DimColorCounts = { red: number; yellow: number; green: number }

export interface PostListResult {
  posts: any[]
  counts: { contentComplete: DimColorCounts; published: DimColorCounts; linkedin: DimColorCounts }
  availableYears: number[]
  total: number
  view: string
}

function parseFilter(param?: string | null): StatusFilter {
  return {
    red: !!param && param.includes('r'),
    yellow: !!param && param.includes('y'),
    green: !!param && param.includes('g'),
  }
}

/** Same semantics as the old client filter: 'blue' (scheduled) groups with yellow; 'gray' with red. */
function matchesStatusFilter(color: string, filter: StatusFilter): boolean {
  if (!filter.red && !filter.yellow && !filter.green) return true
  if (filter.green && color === 'green') return true
  if (filter.yellow && (color === 'yellow' || color === 'blue')) return true
  if (filter.red && (color === 'red' || color === 'gray')) return true
  return false
}

const dimColor = (post: any, key: 'contentComplete' | 'published' | 'linkedin'): string =>
  key === 'linkedin' ? post.linkedinStatus.color : post.status[key].color

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
    return {
      ...post,
      scheduledAt: scheduledMap.get(post.id) ?? undefined,
      linkedinStatus: linkedinStatusMap[post.id] ?? NO_LINKEDIN,
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
    contentComplete: parseFilter(params.content),
    published: parseFilter(params.published),
    linkedin: parseFilter(params.linkedin),
  }

  // Per-dimension counts: over the view set + search + the OTHER dimension filters
  // (not the counted dimension itself) — same semantics as the previous client logic.
  const countFor = (key: 'contentComplete' | 'published' | 'linkedin'): DimColorCounts => {
    const counted = posts.filter((p) => {
      if (!matchesSearch(p)) return false
      for (const k of ['contentComplete', 'published', 'linkedin'] as const) {
        if (k === key) continue
        if (!matchesStatusFilter(dimColor(p, k), filters[k])) return false
      }
      return true
    })
    let red = 0, yellow = 0, green = 0
    for (const p of counted) {
      const c = dimColor(p, key)
      if (c === 'green') green++
      else if (c === 'yellow' || c === 'blue') yellow++
      else red++
    }
    return { red, yellow, green }
  }
  const counts = {
    contentComplete: countFor('contentComplete'),
    published: countFor('published'),
    linkedin: countFor('linkedin'),
  }

  // Final filtered list: search + all three status filters.
  const filtered = posts.filter(
    (p) =>
      matchesSearch(p) &&
      matchesStatusFilter(dimColor(p, 'contentComplete'), filters.contentComplete) &&
      matchesStatusFilter(dimColor(p, 'published'), filters.published) &&
      matchesStatusFilter(dimColor(p, 'linkedin'), filters.linkedin),
  )

  const currentYear = new Date().getFullYear()
  const from = earliestYear ?? currentYear
  const availableYears: number[] = []
  for (let y = currentYear; y >= from; y--) availableYears.push(y)

  return { posts: filtered, counts, availableYears, total: filtered.length, view }
}
