/**
 * Read-side assembly for the MCP read tools `list_posts` / `get_post` (MICM-23).
 *
 * Server-only — pulls content from the CDN draft API and publish flags from the
 * Management API (same path as `GET /api/posts`), derives status via the shared
 * transforms, and stamps the editor deep link + the scheduler "Geplant" flag.
 * Never import this client-side (it reaches the management-token write path).
 */

import { fetchBlogPosts, fetchLinkedinPosts } from './storyblok'
import {
  fetchBlogPostsManagement,
  getPostById,
  fetchSinglePostManagement,
} from './storyblok-management'
import { transformStoryblokBlog, transformStoryblokLinkedin } from './transform-storyblok'
import { getSettings } from './settings-storage'
import { instanceDate, ymdInZone } from './schedule-time'
import type { Schedule } from '@/types'

const SCHEDULE_DEFAULT_TZ = 'Europe/Berlin'

export type PostType = 'blog' | 'article' | 'linkedin'

/** One entry in the `list_posts` result — the post plus its derived status. */
export interface PostListEntry {
  /** Numeric Storyblok story id (as string — consistent with create_draft). */
  id: string
  /** Storyblok story UUID (stable across slug/folder changes; used for scheduling). */
  uuid: string
  /** Story name (the title supplied on creation). */
  name: string
  slug: string
  type: PostType
  /** MCP intake without a chosen content type yet (cm_intake_pending). */
  intake_pending: boolean
  origin: 'import' | 'create' | 'mcp' | null
  contentComplete: { confirmed: boolean; color: 'green' | 'yellow' | 'red' | 'gray' }
  /** Blog/Article: Storyblok publish state. LinkedIn: Publer publish state. */
  published: { isPublished: boolean; publishedAt: string | null; hasUnpublishedChanges: boolean }
  /** True if the story has a pending, slot-bound instance (the "Geplant" list state, MICM-30/32). */
  scheduled: boolean
  /** Derived slot publish date (YYYY-MM-DD) when scheduled; null otherwise. */
  scheduledFor: string | null
  date: string
  createdAt: string
  updatedAt: string
  /** Deep link into the editor (same convention as create_draft). */
  editorUrl: string
}

/** Full single-post view returned by `get_post`: list fields plus the content. */
export interface PostDetail extends PostListEntry {
  sourceRaw: string | null
  sourceSummarized: string | null
  aiHint: string | null
  imagePrompt: string | null
  // Blog / Article content
  pagetitle?: string
  pageintro?: string
  abstract?: string
  teasertitle?: string
  readmoretext?: string
  headerpicture?: string | null
  teaserimage?: string | null
  /** Full raw Storyblok block array (E2). */
  body?: unknown[]
  // LinkedIn content
  linkedinText?: string
  linkedinImage?: string | null
  tags?: string[]
  blogParentUuid?: string | null
}

/** Build the editor deep link for a story slug. Falls back to a relative path. */
export function editorUrlForSlug(slug: string): string {
  const base = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/+$/, '')
  return base ? `${base}/posts/${slug}` : `/posts/${slug}`
}

function typeOf(story: any): PostType {
  const component = story?.content?.component
  if (component === 'article') return 'article'
  if (component === 'linkedin_post') return 'linkedin'
  return 'blog'
}

/**
 * storyUuid -> derived publish date for every pending, slot-bound instance across
 * all schedules (MICM-30/32). Orphaned ("neu zuordnen") and already-fired/failed
 * instances are not "scheduled".
 */
async function buildScheduledMap(): Promise<Map<string, string | null>> {
  const settings = await getSettings()
  const schedules: Schedule[] = Array.isArray(settings.schedules) ? settings.schedules : []
  const map = new Map<string, string | null>()
  for (const schedule of schedules) {
    const tz = schedule.timezone || SCHEDULE_DEFAULT_TZ
    const slotById = new Map(schedule.slots.map((s) => [s.id, s]))
    for (const inst of schedule.slotInstances) {
      if (inst.status !== 'pending') continue
      const slot = inst.slotId ? slotById.get(inst.slotId) : undefined
      if (!slot) continue // orphan — not "geplant" with a date
      map.set(inst.storyUuid, ymdInZone(instanceDate(slot, inst.weekStart, tz), tz))
    }
  }
  return map
}

function toEntry(story: any, scheduledMap: Map<string, string | null>): PostListEntry {
  const type = typeOf(story)
  const uuid = String(story.uuid || '')
  const scheduled = scheduledMap.has(uuid)
  const scheduledFor = scheduledMap.get(uuid) ?? null

  if (type === 'linkedin') {
    const t = transformStoryblokLinkedin(story)
    return {
      id: t.storyblokId,
      uuid,
      name: t.name,
      slug: t.slug,
      type,
      intake_pending: false,
      origin: t.origin ?? null,
      contentComplete: {
        confirmed: t.status.contentComplete.completed,
        // 'blue' (scheduled) only ever applies to the LinkedIn dot, never to content-complete.
        color: t.status.contentComplete.color as 'green' | 'yellow' | 'red' | 'gray',
      },
      published: {
        isPublished: t.status.publishedLinkedIn.completed,
        publishedAt: t.status.publishedLinkedIn.timestamp ?? null,
        hasUnpublishedChanges: false,
      },
      scheduled,
      scheduledFor,
      date: story.content?.date || '',
      createdAt: t.createdAt,
      updatedAt: t.lastModified,
      editorUrl: editorUrlForSlug(t.slug),
    }
  }

  const t = transformStoryblokBlog(story)
  return {
    id: t.storyblokId,
    uuid,
    name: story.name || t.pagetitle || t.slug,
    slug: t.slug,
    type,
    intake_pending: !!t.intakePending,
    origin: t.origin ?? null,
    contentComplete: {
      confirmed: t.status.contentComplete.completed,
      // 'blue' (scheduled) only ever applies to the LinkedIn dot, never to content-complete.
      color: t.status.contentComplete.color as 'green' | 'yellow' | 'red' | 'gray',
    },
    published: {
      isPublished: t.status.published.completed,
      publishedAt: t.status.published.timestamp ?? null,
      // transform marks "published but with unpublished changes" as yellow.
      hasUnpublishedChanges: t.status.published.color === 'yellow',
    },
    scheduled,
    scheduledFor,
    date: t.date || '',
    createdAt: t.createdAt,
    updatedAt: t.lastModified,
    editorUrl: editorUrlForSlug(t.slug),
  }
}

function toDetail(story: any, scheduledMap: Map<string, string | null>): PostDetail {
  const entry = toEntry(story, scheduledMap)

  if (entry.type === 'linkedin') {
    const t = transformStoryblokLinkedin(story)
    return {
      ...entry,
      sourceRaw: t.sourceRaw ?? null,
      sourceSummarized: t.sourceSummarized ?? null,
      aiHint: t.aiHint ?? null,
      imagePrompt: t.imagePrompt ?? null,
      linkedinText: t.linkedinText,
      linkedinImage: t.linkedinImage ?? null,
      tags: t.tags ?? [],
      blogParentUuid: t.blogParentUuid ?? null,
    }
  }

  const t = transformStoryblokBlog(story)
  return {
    ...entry,
    sourceRaw: t.sourceRaw ?? null,
    sourceSummarized: t.sourceSummarized ?? null,
    aiHint: t.aiHint ?? null,
    imagePrompt: t.imagePrompt ?? null,
    pagetitle: t.pagetitle,
    pageintro: t.pageintro,
    abstract: t.abstract,
    teasertitle: t.teasertitle,
    readmoretext: t.readmoretext,
    headerpicture: t.headerpicture ?? null,
    teaserimage: t.teaserimage ?? null,
    body: t.body,
  }
}

/**
 * Blog + article stories with publish flags merged in. Content comes from the
 * CDN draft API (full content incl. body, drafts included); the Management list
 * returns no content, only the publish flags we overlay by UUID. Same approach
 * as GET /api/posts.
 */
async function loadBlogArticleStories(): Promise<any[]> {
  const [cdnRes, mgmtRes] = await Promise.allSettled([
    fetchBlogPosts({ perPage: 100 }),
    fetchBlogPostsManagement({ perPage: 100 }),
  ])
  const cdn = cdnRes.status === 'fulfilled' ? cdnRes.value?.stories || [] : []
  const mgmt = mgmtRes.status === 'fulfilled' ? mgmtRes.value || [] : []

  if (cdn.length === 0) return mgmt // degraded (no content) but better than empty
  if (mgmt.length === 0) return cdn

  const byUuid = new Map<string, any>()
  for (const m of mgmt) if (m?.uuid) byUuid.set(String(m.uuid), m)

  return cdn.map((s: any) => {
    const m = byUuid.get(String(s.uuid))
    if (!m) return s
    return {
      ...s,
      published: m.published ?? s.published,
      published_at: m.published_at ?? s.published_at,
      unpublished_changes: m.unpublished_changes ?? s.unpublished_changes,
    }
  })
}

/** LinkedIn stories (CDN draft — full content, incl. the Publer publish marker). */
async function loadLinkedinStories(): Promise<any[]> {
  try {
    const res = await fetchLinkedinPosts({ perPage: 100 })
    return res?.stories || []
  } catch {
    return []
  }
}

export interface ListPostsFilter {
  types?: PostType[]
  intake_pending?: boolean
  published?: boolean
}

/** All posts (blog + article + linkedin) with status, optionally filtered. */
export async function listPosts(filter?: ListPostsFilter): Promise<PostListEntry[]> {
  const [scheduledMap, blogArticle, linkedin] = await Promise.all([
    buildScheduledMap(),
    loadBlogArticleStories(),
    loadLinkedinStories(),
  ])

  let entries = [...blogArticle, ...linkedin].map((s) => toEntry(s, scheduledMap))

  if (filter?.types?.length) {
    const allowed = new Set(filter.types)
    entries = entries.filter((e) => allowed.has(e.type))
  }
  if (typeof filter?.intake_pending === 'boolean') {
    entries = entries.filter((e) => e.intake_pending === filter.intake_pending)
  }
  if (typeof filter?.published === 'boolean') {
    entries = entries.filter((e) => e.published.isPublished === filter.published)
  }

  entries.sort(
    (a, b) =>
      new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime(),
  )
  return entries
}

/** A single post with full content + status. Returns null if neither id nor slug resolves. */
export async function getPost(args: { id?: string; slug?: string }): Promise<PostDetail | null> {
  let story: any = null

  if (args.id) {
    try {
      story = await getPostById(args.id)
    } catch {
      story = null
    }
  }
  if (!story && args.slug) {
    story = await fetchSinglePostManagement(args.slug)
  }
  if (!story) return null

  const scheduledMap = await buildScheduledMap()
  return toDetail(story, scheduledMap)
}
