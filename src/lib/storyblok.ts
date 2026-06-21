import StoryblokClient from 'storyblok-js-client'
import type { ISbStoriesParams } from '@storyblok/react'

// Create Storyblok client with public token (read-only)
export function getStoryblokApi() {
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN
  
  if (!token) {
    throw new Error('NEXT_PUBLIC_STORYBLOK_TOKEN is not defined')
  }
  
  return new StoryblokClient({
    accessToken: token,
    region: 'eu',
    cache: {
      type: 'none'
    }
  })
}

function mergeStoriesById(stories: any[]): any[] {
  const byUuid = new Map<string, any>()
  for (const s of stories) {
    if (s?.uuid && !byUuid.has(String(s.uuid))) {
      byUuid.set(String(s.uuid), s)
    }
  }
  return [...byUuid.values()].sort((a, b) => {
    const da = a?.content?.date || a?.created_at || ''
    const db = b?.content?.date || b?.created_at || ''
    return new Date(db).getTime() - new Date(da).getTime()
  })
}

// Fetch all blog and article entries (folders b/ and a/)
export async function fetchBlogPosts(options?: {
  perPage?: number
  page?: number
  searchQuery?: string
  /** Restrict to a `content.date` window (inclusive of the whole year), e.g. "2026-01-01". */
  dateFrom?: string
  dateTo?: string
  filters?: {
    contentComplete?: boolean
    socialmedia?: boolean
  }
}) {
  const storyblokApi = getStoryblokApi()
  const perPage = options?.perPage || 100
  const page = options?.page || 1

  const baseFilter: Record<string, unknown> = {}
  if (options?.filters?.contentComplete !== undefined) {
    baseFilter.cm_content_complete = {
      is: options.filters.contentComplete
    }
  }
  // Date-range pushdown (MICM: year view). `content.date` is a Storyblok field,
  // so the year filter runs in the query — only that year's stories come back.
  if (options?.dateFrom || options?.dateTo) {
    const dateFilter: Record<string, string> = {}
    if (options?.dateFrom) dateFilter['gt-date'] = options.dateFrom
    if (options?.dateTo) dateFilter['lt-date'] = options.dateTo
    baseFilter.date = dateFilter
  }

  const cacheOpt: { cache: RequestCache } = {
    cache: process.env.NEXT_PUBLIC_STORYBLOK_DISABLECACHING ? 'no-cache' : 'default',
  }

  const [blogResult, articleResult] = await Promise.all([
    storyblokApi.get('cdn/stories', {
      version: 'draft',
      starts_with: 'b/',
      filter_query: {
        component: { in: 'blog' },
        ...baseFilter,
      },
      per_page: perPage,
      page,
      sort_by: 'content.date:desc',
    } as ISbStoriesParams, cacheOpt),
    storyblokApi.get('cdn/stories', {
      version: 'draft',
      starts_with: 'a/',
      filter_query: {
        component: { in: 'article' },
        ...baseFilter,
      },
      per_page: perPage,
      page,
      sort_by: 'content.date:desc',
    } as ISbStoriesParams, cacheOpt),
  ])

  const blogStories = blogResult.data?.stories || []
  const articleStories = articleResult.data?.stories || []
  const stories = mergeStoriesById([...blogStories, ...articleStories])

  return { stories, total: stories.length }
}

/**
 * Merge Management-API publish flags into CDN (draft) stories (MICM).
 *
 * The CDN draft response carries content but not reliable publish state; the
 * Management API is authoritative for `published` / `unpublished_changes`
 * (`published_at` persists after an unpublish, so it must not be used). Single
 * source for this merge — used by `GET /api/posts` and the list view.
 */
export function mergeStoriesWithPublishFlags(cdnStories: any[], mgmtStories: any[]): any[] {
  if (cdnStories.length === 0) return mgmtStories
  if (mgmtStories.length === 0) return cdnStories

  const byUuid = new Map<string, any>()
  const byId = new Map<string, any>()
  const bySlug = new Map<string, any>()
  for (const s of mgmtStories) {
    if (s?.uuid) byUuid.set(String(s.uuid), s)
    if (s?.id) byId.set(String(s.id), s)
    if (s?.slug) bySlug.set(String(s.slug), s)
  }

  return cdnStories.map((s: any) => {
    const m =
      byUuid.get(String(s.uuid || '')) ||
      byId.get(String(s.id || '')) ||
      bySlug.get(String(s.slug || ''))
    if (!m) return s
    return {
      ...s,
      published: m.published ?? s.published,
      published_at: m.published_at ?? s.published_at,
      unpublished_changes: m.unpublished_changes ?? s.unpublished_changes,
    }
  })
}

/**
 * Earliest year that has a blog/article post (by `content.date`), for the year
 * picker. Cheap: one ascending `per_page: 1` query per folder — no full scan.
 */
export async function fetchEarliestPostYear(): Promise<number | null> {
  const storyblokApi = getStoryblokApi()
  const cacheOpt: { cache: RequestCache } = {
    cache: process.env.NEXT_PUBLIC_STORYBLOK_DISABLECACHING ? 'no-cache' : 'default',
  }
  const earliestIn = async (startsWith: string, component: string): Promise<string | null> => {
    const res = await storyblokApi.get('cdn/stories', {
      version: 'draft',
      starts_with: startsWith,
      filter_query: { component: { in: component } },
      per_page: 1,
      page: 1,
      sort_by: 'content.date:asc',
    } as ISbStoriesParams, cacheOpt)
    return res.data?.stories?.[0]?.content?.date || null
  }
  const [blogDate, articleDate] = await Promise.all([
    earliestIn('b/', 'blog').catch(() => null),
    earliestIn('a/', 'article').catch(() => null),
  ])
  const years = [blogDate, articleDate]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getFullYear())
    .filter((y) => Number.isFinite(y))
  return years.length ? Math.min(...years) : null
}

// Fetch a single blog or article post by slug (tries b/ then a/)
export async function fetchSinglePost(slug: string) {
  const storyblokApi = getStoryblokApi()

  const params: ISbStoriesParams = {
    version: 'draft',
  }

  const cacheOpt: { cache: RequestCache } = {
    cache: process.env.NEXT_PUBLIC_STORYBLOK_DISABLECACHING ? 'no-cache' : 'default',
  }

  for (const prefix of ['b', 'a'] as const) {
    try {
      const { data } = await storyblokApi.getStory(`${prefix}/${slug}`, params, cacheOpt)
      if (data?.story) return data.story
    } catch {
      // try next prefix
    }
  }

  throw new Error(`Story not found: ${slug}`)
}

// Fetch blog post by UUID
export async function fetchPostByUuid(uuid: string) {
  const storyblokApi = getStoryblokApi()
  
  const { data } = await storyblokApi.get('cdn/stories', {
    by_uuids: uuid,
    version: 'draft',
  })
  
  return data.stories[0]
}

// ─── LinkedIn posts read side (MICM-8, Variante C) ─────────────────────────
// LinkedIn posts live in the `linkedin/` folder, component `linkedin_post`,
// draft-only. They are read via the CDN draft API (full content in one call).
// Kept separate from the blog list — no mixing of folders/components.

/** Fetch all linkedin_post stories (folder `linkedin/`). */
export async function fetchLinkedinPosts(options?: { perPage?: number; page?: number }) {
  const storyblokApi = getStoryblokApi()
  const perPage = options?.perPage || 100
  const page = options?.page || 1

  const cacheOpt: { cache: RequestCache } = {
    cache: process.env.NEXT_PUBLIC_STORYBLOK_DISABLECACHING ? 'no-cache' : 'default',
  }

  const result = await storyblokApi.get('cdn/stories', {
    version: 'draft',
    starts_with: 'linkedin/',
    filter_query: { component: { in: 'linkedin_post' } },
    per_page: perPage,
    page,
    sort_by: 'created_at:desc',
  } as ISbStoriesParams, cacheOpt)

  const stories = result.data?.stories || []
  return { stories, total: stories.length }
}

/** Find the LinkedIn posts attached to a given blog story (MICM-8 AK6a): cm_blog_ref == blog UUID. */
export async function fetchLinkedinPostsByBlogUuid(blogUuid: string) {
  if (!blogUuid) return []
  const storyblokApi = getStoryblokApi()

  const cacheOpt: { cache: RequestCache } = {
    cache: process.env.NEXT_PUBLIC_STORYBLOK_DISABLECACHING ? 'no-cache' : 'default',
  }

  const result = await storyblokApi.get('cdn/stories', {
    version: 'draft',
    starts_with: 'linkedin/',
    filter_query: {
      component: { in: 'linkedin_post' },
      // `is` is Storyblok's empty/null/boolean operator — with a string value it is
      // silently ignored and the field is NOT filtered (every blog would then see
      // ALL LinkedIn posts). String equality requires `in`.
      cm_blog_ref: { in: blogUuid },
    },
    per_page: 100,
  } as ISbStoriesParams, cacheOpt)

  return result.data?.stories || []
}

// Get statistics for dashboard
export async function fetchStatistics() {
  const allPosts = await fetchBlogPosts({ perPage: 1000 })
  const stories = allPosts.stories || []

  return {
    totalPosts: stories.length,
    contentComplete: stories.filter((s: { content?: { cm_content_complete?: boolean } }) =>
      s.content?.cm_content_complete
    ).length,
    published: stories.filter((s: { published_at?: string }) => !!s.published_at).length,
    publishedPubler: stories.filter((s: { content?: { cm_socialmedia?: boolean } }) =>
      s.content?.cm_socialmedia
    ).length,
  }
}
