/**
 * Storyblok Management API Client
 * 
 * SECURITY: This file uses STORYBLOK_MANAGEMENT_TOKEN which has WRITE access.
 * - MUST ONLY be imported in server-side API routes
 * - NEVER import in client components
 * - Token is stored server-side only and never exposed to browser
 */

const MANAGEMENT_API_BASE = 'https://mapi.storyblok.com/v1'
const SPACE_ID = process.env.STORYBLOK_SPACE_ID || '330326'
const MANAGEMENT_TOKEN = process.env.STORYBLOK_MANAGEMENT_TOKEN

if (!MANAGEMENT_TOKEN) {
  console.warn('STORYBLOK_MANAGEMENT_TOKEN is not set. Write operations will fail.')
}

const WWW_REVALIDATE_URL = process.env.WWW_REVALIDATE_URL

async function revalidateWww() {
  if (!WWW_REVALIDATE_URL) return
  try {
    const res = await fetch(WWW_REVALIDATE_URL, { method: 'POST' })
    if (!res.ok) {
      console.warn(`[revalidateWww] ${res.status} ${res.statusText}`)
    } else {
      console.log('[revalidateWww] Cache invalidated')
    }
  } catch (err) {
    console.warn('[revalidateWww] Failed:', err)
  }
}

const RATE_LIMIT_RETRIES = 2
const RATE_LIMIT_DELAY_MS = 1800

/** Fetch Storyblok Management API with retry on 429 (rate limit). */
async function managementFetch(url: string, init?: RequestInit): Promise<Response> {
  let lastRes: Response | undefined
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    lastRes = await fetch(url, init)
    if (lastRes.status !== 429) return lastRes
    if (attempt === RATE_LIMIT_RETRIES) {
      const body = await lastRes.text()
      throw new Error(body || lastRes.statusText)
    }
    const retryAfter = lastRes.headers.get('Retry-After')
    const delayMs = retryAfter
      ? Math.min(parseInt(retryAfter, 10) * 1000, 5000)
      : RATE_LIMIT_DELAY_MS
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return lastRes!
}

export interface BlogPostData {
  // Content fields
  pagetitle?: string
  pageintro?: string
  date?: string
  headerpicture?: any  // StoryblokAsset
  teasertitle?: string
  teaserimage?: any    // StoryblokAsset
  readmoretext?: string
  abstract?: string
  body?: any[]
  // Source material
  cm_source_raw?: string
  cm_source_summarized?: string
  cm_ai_hint?: string
  cm_image_prompt?: string
  // Origin (import / create / mcp / manual)
  cm_origin?: 'import' | 'create' | 'mcp'
  /** MICM-22: untyped intake created via MCP; cleared in the editor once a type is chosen. */
  cm_intake_pending?: boolean
  // Status fields
  cm_content_complete?: boolean
  cm_content_confirmed_at?: string
  cm_socialmedia?: boolean
  cm_publer_published_at?: string
  cm_publer_post_ids?: string
  /** Blog only: welcher Body-Prompt (Short/Long); kein Einfluss auf Story-Typ */
  cm_blog_variant?: 'short' | 'long'
}

/** Ensure asset objects have fieldtype so Storyblok accepts them; avoid sending partial assets or raw URLs. */
function ensureAssetField(obj: any): any {
  if (obj == null) return obj
  if (typeof obj === 'string' && obj) return { filename: obj, fieldtype: 'asset' }
  if (typeof obj !== 'object') return obj
  if (obj.fieldtype === 'asset') return obj
  if (obj.filename) return { ...obj, fieldtype: 'asset' }
  return obj
}

/** Normalize content before sending to Storyblok so all asset fields are valid. */
function sanitizeContentForStoryblok(content: Record<string, any>): void {
  content.headerpicture = ensureAssetField(content.headerpicture)
  content.teaserimage = ensureAssetField(content.teaserimage)
  if (Array.isArray(content.body)) {
    content.body = content.body.map((block: any) => {
      if (block.component === 'picture' && block.image) {
        return { ...block, image: ensureAssetField(block.image) }
      }
      return block
    })
  }
}

/**
 * Get the blog folder ID (or create it if it doesn't exist)
 */
async function getBlogFolderId(): Promise<number> {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  // Try to find existing blog folder
  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?with_slug=b&is_folder=true`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    const data = await response.json()
    const folder = data.stories?.find((s: any) => s.is_folder && s.slug === 'b')
    if (folder) {
      return folder.id
    }
  }

  // If not found, create it
  const createResponse = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories`,
    {
      method: 'POST',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story: {
          name: 'blog',
          slug: 'b',
          is_folder: true
        }
      })
    }
  )

  if (!createResponse.ok) {
    throw new Error('Failed to create blog folder')
  }

  const createData = await createResponse.json()
  return createData.story.id
}

export type CmContentType = 'blog' | 'article'

/**
 * Get the articles folder ID (slug `a`) or create it if missing
 */
async function getArticleFolderId(): Promise<number> {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?with_slug=a&is_folder=true`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    const data = await response.json()
    const folder = data.stories?.find((s: any) => s.is_folder && s.slug === 'a')
    if (folder) {
      return folder.id
    }
  }

  const createResponse = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories`,
    {
      method: 'POST',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story: {
          name: 'articles',
          slug: 'a',
          is_folder: true
        }
      })
    }
  )

  if (!createResponse.ok) {
    throw new Error('Failed to create articles folder')
  }

  const createData = await createResponse.json()
  return createData.story.id
}

async function getFolderIdForContentType(type: CmContentType): Promise<number> {
  return type === 'article' ? getArticleFolderId() : getBlogFolderId()
}

/**
 * Get the LinkedIn folder ID (slug `linkedin`) or create it if missing.
 * LinkedIn posts (component `linkedin_post`) live in their own folder, separate
 * from blog (`b`) and article (`a`). Created idempotently, analogous to
 * getBlogFolderId(). Draft-only: linkedin_post stories are never published to
 * the public website (see MICM-7).
 */
export async function getLinkedinFolderId(): Promise<number> {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?with_slug=linkedin&is_folder=true`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    const data = await response.json()
    const folder = data.stories?.find((s: any) => s.is_folder && s.slug === 'linkedin')
    if (folder) {
      return folder.id
    }
  }

  const createResponse = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories`,
    {
      method: 'POST',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story: {
          name: 'linkedin',
          slug: 'linkedin',
          is_folder: true
        }
      })
    }
  )

  if (!createResponse.ok) {
    throw new Error('Failed to create linkedin folder')
  }

  const createData = await createResponse.json()
  return createData.story.id
}

function storyComponentFromType(type: CmContentType): 'blog' | 'article' {
  return type === 'article' ? 'article' : 'blog'
}

/**
 * Create a new blog or article story in Storyblok
 * Note: Created as draft (not published)
 */
export async function createPost(
  data: BlogPostData & { name: string; contentType?: CmContentType }
) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const contentType: CmContentType = data.contentType ?? 'blog'
  const parentId = await getFolderIdForContentType(contentType)
  const component = storyComponentFromType(contentType)
  const { contentType: _ct, name, ...contentFields } = data as BlogPostData & {
    name: string
    contentType?: CmContentType
  }

  const requestBody = {
    story: {
      name,
      slug: generateSlug(name),
      content: {
        component,
        ...contentFields
      },
      parent_id: parentId
    }
    // No publish: 1 — created as draft
  }

  console.log(`Creating Storyblok ${contentType}:`, name)

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories`,
    {
      method: 'POST',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.error('Storyblok create story failed:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
    })
    throw new Error(`Failed to create post: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

/**
 * Update an existing blog or article story
 * Saves as draft (does NOT auto-publish)
 */
export async function updatePost(
  storyId: string,
  data: Partial<BlogPostData>,
  options?: { storyName?: string; slug?: string; contentType?: CmContentType }
) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const currentStory = await getPostById(storyId)

  const currentComponent: CmContentType =
    currentStory.content?.component === 'article' ? 'article' : 'blog'
  const targetType = options?.contentType ?? currentComponent

  const mergedContent: Record<string, any> = {
    ...currentStory.content,
    ...data,
  }
  mergedContent.component = storyComponentFromType(targetType)
  sanitizeContentForStoryblok(mergedContent)
  if (mergedContent.component === 'article') {
    delete mergedContent.cm_blog_variant
  }

  const storyUpdate: Record<string, any> = {
    content: mergedContent
  }

  if (options?.storyName) {
    storyUpdate.name = options.storyName
  }
  if (options?.slug) {
    storyUpdate.slug = clampSlugForStoryblok(options.slug)
  }
  if (targetType !== currentComponent) {
    storyUpdate.parent_id = await getFolderIdForContentType(targetType)
  }
  
  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story: storyUpdate,
        // No publish: 1 — save as draft only
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to update post: ${error.error || response.statusText}`)
  }

  return await response.json()
}

/**
 * Delete a blog post story
 */
export async function deletePost(storyId: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
      }
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to delete post: ${error.error || response.statusText}`)
  }

  return { success: true }
}

/**
 * Publish a blog post in Storyblok
 */
export async function publishPost(storyId: string, opts?: { overrideDate?: string }) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  // Get current story and publish it
  const currentStory = await getPostById(storyId)
  
  // Sanitize content before publishing — Storyblok rejects blank required fields and needs valid assets
  const content = { ...currentStory.content }
  if (Array.isArray(content.body)) {
    content.body = content.body.map((block: any) => {
      if (block.component === 'picture') {
        return {
          ...block,
          spacing: block.spacing || 'default',
          style: block.style || 'normal',
          image: ensureAssetField(block.image),
        }
      }
      return block
    })
  }
  content.headerpicture = ensureAssetField(content.headerpicture)
  content.teaserimage = ensureAssetField(content.teaserimage)

  // The scheduler sets the publish date to the slot date so RSS/sorting use the real
  // publication date instead of the (identical) creation date (MICM-30).
  if (opts?.overrideDate) content.date = opts.overrideDate

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        story: {
          content,
        },
        publish: 1
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to publish post: ${error.error || response.statusText}`)
  }

  await revalidateWww()
  return await response.json()
}

/**
 * Unpublish a blog post in Storyblok
 */
export async function unpublishPost(storyId: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}/unpublish`,
    {
      method: 'GET',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
      }
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to unpublish post: ${error.error || response.statusText}`)
  }

  await revalidateWww()
  return { success: true }
}

/**
 * Get a story by ID (full content incl. body + publish flags).
 * Used for merging updates and by the MCP read tools (MICM-23).
 */
export async function getPostById(storyId: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
      }
    }
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    console.error(`[getPostById] Storyblok ${response.status} for story ${storyId}:`, errorBody)
    throw new Error(`Failed to fetch story (${response.status}): ${errorBody || response.statusText}`)
  }

  const data = await response.json()
  return data.story
}

/**
 * Fetch a single blog, article or linkedin post by slug via Management API
 * (includes full content + publish status). Two-step: resolve slug → ID via the
 * list endpoint, then fetch the full story by ID (the list endpoint returns no
 * nested content). Tries the blog (`b/`), article (`a/`) and linkedin (`linkedin/`) folders.
 */
export async function fetchSinglePostManagement(slug: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  for (const prefix of ['b', 'a', 'linkedin'] as const) {
    const response = await managementFetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?by_slugs=${prefix}/${slug}`,
      {
        headers: {
          'Authorization': MANAGEMENT_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`Failed to fetch post (${response.status}): ${errorBody || response.statusText}`)
    }

    const data = await response.json()
    const story = (data.stories || [])[0]
    if (story) {
      return await getPostById(String(story.id))
    }
  }

  return null
}

/**
 * Fetch blog posts via Management API (list endpoint).
 * Keep this lightweight to avoid Storyblok rate limits on list page.
 */
export async function fetchBlogPostsManagement(options?: {
  perPage?: number
  page?: number
  /** Restrict to a `content.date` window (year view) — keeps the fetch bounded. */
  dateFrom?: string
  dateTo?: string
}) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const perPage = options?.perPage || 100
  const page = options?.page || 1

  const headers = {
    'Authorization': MANAGEMENT_TOKEN,
    'Content-Type': 'application/json'
  } as const

  // Optional date-range pushdown (year view), mirrors the CDN filter_query.
  const dateParams = [
    options?.dateFrom ? `&filter_query[date][gt-date]=${encodeURIComponent(options.dateFrom)}` : '',
    options?.dateTo ? `&filter_query[date][lt-date]=${encodeURIComponent(options.dateTo)}` : '',
  ].join('')

  const [blogRes, articleRes] = await Promise.all([
    managementFetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?starts_with=b/&per_page=${perPage}&page=${page}&sort_by=content.date:desc${dateParams}`,
      { headers }
    ),
    managementFetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?starts_with=a/&per_page=${perPage}&page=${page}&sort_by=content.date:desc${dateParams}`,
      { headers }
    ),
  ])

  if (!blogRes.ok) {
    throw new Error(`Failed to fetch blog posts: ${blogRes.statusText}`)
  }
  if (!articleRes.ok) {
    throw new Error(`Failed to fetch article posts: ${articleRes.statusText}`)
  }

  const blogData = await blogRes.json()
  const articleData = await articleRes.json()
  const blogStories = blogData.stories || []
  const articleStories = articleData.stories || []

  const byId = new Map<number, any>()
  for (const s of [...blogStories, ...articleStories]) {
    if (s?.id != null && !byId.has(s.id)) {
      byId.set(s.id, s)
    }
  }

  return [...byId.values()].sort((a, b) => {
    const da = a?.content?.date || a?.created_at || ''
    const db = b?.content?.date || b?.created_at || ''
    return new Date(db).getTime() - new Date(da).getTime()
  })
}

// ─── LinkedIn posts (MICM-8, Variante C) ──────────────────────────────────
// LinkedIn posts are a separate entity: component `linkedin_post`, folder
// `linkedin/`, draft-only (never published to the public website). They either
// stand alone or reference a blog story via cm_blog_ref (blog story UUID).
// The blog/article path above is intentionally left untouched.

export interface LinkedinPostData {
  linkedin_text?: string
  linkedin_image?: any // StoryblokAsset
  /** Blog story UUID this post is attached to. Empty = standalone. */
  cm_blog_ref?: string
  cm_source_raw?: string
  cm_source_summarized?: string
  cm_ai_hint?: string
  /** DALL-E image prompt (standalone posts). */
  cm_image_prompt?: string
  /** Comma-separated categorization tags (Content-Manager-internal). */
  cm_tags?: string
  cm_origin?: 'import' | 'create'
  cm_content_complete?: boolean
  cm_content_confirmed_at?: string
  cm_publer_published_at?: string
  cm_publer_post_ids?: string
  /** Publer label = posting slot/series (MICM-13). */
  cm_publer_label?: string
}

/** Resolve a story by its UUID via the Management API (list endpoint). Returns the numeric id or null. */
export async function getStoryIdByUuid(uuid: string): Promise<number | null> {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }
  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?by_uuids=${encodeURIComponent(uuid)}`,
    { headers: { 'Authorization': MANAGEMENT_TOKEN, 'Content-Type': 'application/json' } }
  )
  if (!response.ok) return null
  const data = await response.json()
  const story = (data.stories || [])[0]
  return story?.id ?? null
}

/**
 * Resolve the parent blog story for a LinkedIn post by blog UUID (MICM-8 AK6b).
 * Returns the full blog story (incl. content, full_slug, publish status) or null.
 * Consumed by MICM-11 (URL + OG preview) and MICM-12 (publish guard).
 */
export async function resolveBlogStoryByUuid(uuid: string) {
  if (!uuid) return null
  const id = await getStoryIdByUuid(uuid)
  if (!id) return null
  try {
    return await getPostById(String(id))
  } catch {
    return null
  }
}

/**
 * Create a new linkedin_post story (draft-only). When attached to a blog
 * (blogParentUuid set), cm_blog_ref is filled with the blog UUID and the blog's
 * source material is mirrored into the new story (MICM-8 AK5 + AK8).
 */
export async function createLinkedinPost(
  data: LinkedinPostData & { name: string; blogParentUuid?: string }
) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const parentId = await getLinkedinFolderId()
  const { name, blogParentUuid, ...contentFields } = data

  // Mirror source material from the parent blog for attached posts.
  let mirroredSource: Partial<LinkedinPostData> = {}
  if (blogParentUuid) {
    const blog = await resolveBlogStoryByUuid(blogParentUuid)
    if (blog) {
      mirroredSource = {
        cm_source_raw: blog.content?.cm_source_raw,
        cm_source_summarized: blog.content?.cm_source_summarized,
      }
    }
  }

  // Drop undefined keys: callers pass `cm_source_*: undefined` for attached
  // posts (no client-supplied source), and a spread of those would clobber the
  // mirrored blog source with undefined. Only real values may override the mirror.
  const definedContentFields = Object.fromEntries(
    Object.entries(contentFields).filter(([, v]) => v !== undefined)
  )
  const content: Record<string, any> = {
    component: 'linkedin_post',
    // Default Publer slot (MICM-13); overridden if the caller passed cm_publer_label.
    cm_publer_label: 'Standard',
    ...mirroredSource,
    ...definedContentFields,
    ...(blogParentUuid ? { cm_blog_ref: blogParentUuid } : {}),
  }
  content.linkedin_image = ensureAssetField(content.linkedin_image)

  // The name is often non-unique (e.g. "LinkedIn: <blog title>" for every post
  // attached to the same blog), so the deterministic slug collides on the 2nd+
  // create. Retry with an incrementing suffix instead of dead-ending on
  // Storyblok's "Slug ... already taken" error.
  const baseSlug = generateSlug(name)
  const MAX_SLUG_ATTEMPTS = 20
  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = attempt === 1 ? baseSlug : clampSlugForStoryblok(`${baseSlug}-${attempt}`)
    const response = await managementFetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories`,
      {
        method: 'POST',
        headers: { 'Authorization': MANAGEMENT_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: { name, slug, content, parent_id: parentId },
          // No publish: 1 — draft only
        }),
      }
    )

    if (response.ok) {
      return await response.json()
    }

    const error = await response.json().catch(() => ({}))
    lastError = error
    if (!isSlugTakenError(error)) {
      throw new Error(`Failed to create LinkedIn post: ${JSON.stringify(error)}`)
    }
    // Slug collision → try the next suffix.
  }

  throw new Error(`Failed to create LinkedIn post: ${JSON.stringify(lastError)}`)
}

/** True if a Storyblok create error is the "Slug ... already taken" validation. */
function isSlugTakenError(error: unknown): boolean {
  const slugErrors = (error as { slug?: unknown })?.slug
  return Array.isArray(slugErrors) && slugErrors.some((m) => /already taken/i.test(String(m)))
}

/**
 * Update an existing linkedin_post story (draft-only). Merges into existing content.
 */
export async function updateLinkedinPost(
  storyId: string,
  data: Partial<LinkedinPostData>,
  options?: { storyName?: string; slug?: string }
) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const currentStory = await getPostById(storyId)

  const mergedContent: Record<string, any> = {
    ...currentStory.content,
    ...data,
    component: 'linkedin_post',
  }
  mergedContent.linkedin_image = ensureAssetField(mergedContent.linkedin_image)

  const storyUpdate: Record<string, any> = { content: mergedContent }
  if (options?.storyName) storyUpdate.name = options.storyName
  if (options?.slug) storyUpdate.slug = clampSlugForStoryblok(options.slug)

  const response = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
    {
      method: 'PUT',
      headers: { 'Authorization': MANAGEMENT_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ story: storyUpdate }),
      // No publish: 1 — draft only
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to update LinkedIn post: ${error.error || response.statusText}`)
  }

  return await response.json()
}

/**
 * Fetch a single linkedin_post story by numeric story ID (full content + publish status).
 * Authoritative single read (used by the detail page and the AI/Publer write paths).
 */
export async function getLinkedinPostById(storyId: string) {
  return await getPostById(storyId)
}

/**
 * Upload an asset (image) to Storyblok
 */
export async function uploadAsset(file: File | Buffer, filename: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const sanitizedFilename = filename
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^-a-zA-Z0-9.]/g, '')
    .toLowerCase()

  const requestBody = {
    filename: sanitizedFilename,
    size: ""
  }

  const signResponse = await managementFetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/assets`,
    {
      method: 'POST',
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  )

  if (!signResponse.ok) {
    const errorText = await signResponse.text()
    throw new Error(`Failed to get signed upload URL: ${signResponse.status} ${errorText}`)
  }

  const signData = await signResponse.json()
  
  const formData = new FormData()
  Object.entries(signData.fields).forEach(([key, value]) => {
    formData.append(key, value as string)
  })
  
  if (file instanceof Buffer) {
    const uint8Array = new Uint8Array(file)
    const blob = new Blob([uint8Array], { type: 'image/jpeg' })
    formData.append('file', blob, sanitizedFilename)
  } else {
    formData.append('file', file as File)
  }

  const uploadResponse = await fetch(signData.post_url, {
    method: 'POST',
    body: formData
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`Failed to upload asset: ${uploadResponse.status} ${errorText}`)
  }

  const rawUrl = signData.pretty_url
  
  if (!rawUrl) {
    throw new Error('Storyblok API did not return pretty_url')
  }
  
  const assetUrl = rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl
  
  return {
    id: signData.id,
    filename: assetUrl,
    publicUrl: assetUrl
  }
}

/** Storyblok validates story slug max length */
const STORYBLOK_SLUG_MAX_LENGTH = 250

/**
 * Normalize for URL slug and clamp to Storyblok limit.
 */
function generateSlug(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (s.length > STORYBLOK_SLUG_MAX_LENGTH) {
    s = s.slice(0, STORYBLOK_SLUG_MAX_LENGTH).replace(/-+$/g, '')
  }
  return s || `post-${Date.now()}`
}

function clampSlugForStoryblok(slug: string): string {
  let s = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/^-+|-+$/g, '')
  if (s.length > STORYBLOK_SLUG_MAX_LENGTH) {
    s = s.slice(0, STORYBLOK_SLUG_MAX_LENGTH).replace(/-+$/g, '')
  }
  return s || `post-${Date.now()}`
}
