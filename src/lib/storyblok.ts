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
