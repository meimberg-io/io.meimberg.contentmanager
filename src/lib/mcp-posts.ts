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
  updatePost,
  updateLinkedinPost,
  type BlogPostData,
  type LinkedinPostData,
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
export async function buildScheduledMap(): Promise<Map<string, string | null>> {
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

/** Input for the MCP `update_post` write tool (MICM-26). */
export interface UpdatePostInput {
  id?: string
  slug?: string
  /** Story name/title (all types). */
  name?: string
  // blog / article content fields
  pagetitle?: string
  pageintro?: string
  abstract?: string
  teasertitle?: string
  readmoretext?: string
  /** Full raw Storyblok body block array (blog/article). */
  body?: unknown[]
  // linkedin content fields
  linkedin_text?: string
  /** LinkedIn categorization tags → stored comma-separated in cm_tags. */
  tags?: string[]
}

/** Result of a successful `update_post`. */
export interface UpdatePostResult {
  id: string
  slug: string
  name: string
  type: PostType
  /** Storyblok native publish state after the edit (linkedin: always false/draft). */
  published: boolean
  /** True if the edit was republished to keep an already-live post live. */
  republished: boolean
  editorUrl: string
}

/** Content fields that only exist on blog/article posts. */
const BLOG_ARTICLE_FIELDS = [
  'pagetitle',
  'pageintro',
  'abstract',
  'teasertitle',
  'readmoretext',
  'body',
] as const
/** Content fields that only exist on LinkedIn posts. */
const LINKEDIN_FIELDS = ['linkedin_text', 'tags'] as const

/** Reject a body that is not a Storyblok block array (array of objects each with a string component). */
function assertValidBody(body: unknown): asserts body is Record<string, unknown>[] {
  if (!Array.isArray(body)) {
    throw new Error('Feld „body" muss ein Array von Storyblok-Blöcken sein.')
  }
  body.forEach((block, i) => {
    if (!block || typeof block !== 'object' || typeof (block as Record<string, unknown>).component !== 'string') {
      throw new Error(
        `Feld „body": Block #${i} ist kein gültiger Storyblok-Block (Objekt mit string-„component" erwartet).`,
      )
    }
  })
}

/**
 * Edit an existing post (blog/article/linkedin) and save it back (MICM-26).
 *
 * Only supplied fields change (merge over the existing content). Publish state is
 * preserved: an already-published blog/article is republished with the edit, a
 * draft stays a draft. LinkedIn "published" is a Publer concept — edits only save
 * the Storyblok draft, nothing is (re-)pushed to Publer.
 *
 * Throws (the caller maps it to an MCP error) on: missing id/slug, post not found,
 * fields not matching the post type, invalid body, or nothing to update.
 */
export async function updatePostFromMcp(input: UpdatePostInput): Promise<UpdatePostResult> {
  if (!input.id && !input.slug) {
    throw new Error('Bitte id oder slug angeben.')
  }

  let story: any = null
  if (input.id) {
    try {
      story = await getPostById(input.id)
    } catch {
      story = null
    }
  }
  if (!story && input.slug) {
    story = await fetchSinglePostManagement(input.slug)
  }
  if (!story) {
    throw new Error(`Kein Post gefunden für ${input.id ? `id=${input.id}` : `slug=${input.slug}`}.`)
  }

  const type = typeOf(story)
  const storyId = String(story.id)

  const blogArticleGiven = BLOG_ARTICLE_FIELDS.filter((f) => input[f] !== undefined)
  const linkedinGiven = LINKEDIN_FIELDS.filter((f) => input[f] !== undefined)

  if (type === 'linkedin' && blogArticleGiven.length) {
    throw new Error(`LinkedIn-Post: Felder ${blogArticleGiven.join(', ')} gelten nur für Blog/Artikel.`)
  }
  if (type !== 'linkedin' && linkedinGiven.length) {
    throw new Error(`Blog/Artikel: Felder ${linkedinGiven.join(', ')} gelten nur für LinkedIn-Posts.`)
  }

  if (input.body !== undefined) assertValidBody(input.body)

  if (input.name === undefined && blogArticleGiven.length === 0 && linkedinGiven.length === 0) {
    throw new Error('Keine Felder zum Aktualisieren angegeben.')
  }

  let updated: any
  let republished = false

  if (type === 'linkedin') {
    const data: Partial<LinkedinPostData> = {}
    if (input.linkedin_text !== undefined) data.linkedin_text = input.linkedin_text
    if (input.tags !== undefined) data.cm_tags = input.tags.join(', ')
    const options: { storyName?: string } = {}
    if (input.name !== undefined) options.storyName = input.name
    const res = await updateLinkedinPost(storyId, data, options)
    updated = res?.story
  } else {
    const data: Partial<BlogPostData> = {}
    if (input.pagetitle !== undefined) data.pagetitle = input.pagetitle
    if (input.pageintro !== undefined) data.pageintro = input.pageintro
    if (input.abstract !== undefined) data.abstract = input.abstract
    if (input.teasertitle !== undefined) data.teasertitle = input.teasertitle
    if (input.readmoretext !== undefined) data.readmoretext = input.readmoretext
    if (input.body !== undefined) data.body = input.body as any[]
    // Preserve publish state: republish only if the story is currently live.
    republished = story.published === true
    const options: { storyName?: string; publish?: boolean } = { publish: republished }
    if (input.name !== undefined) options.storyName = input.name
    const res = await updatePost(storyId, data, options)
    updated = res?.story
  }

  const slug = updated?.slug ?? story.slug
  return {
    id: storyId,
    slug,
    name: updated?.name ?? story.name,
    type,
    published: type === 'linkedin' ? false : updated?.published === true,
    republished,
    editorUrl: editorUrlForSlug(slug),
  }
}
