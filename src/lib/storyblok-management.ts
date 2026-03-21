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
  // Origin (import / create / manual)
  cm_origin?: 'import' | 'create'
  // Status fields
  cm_content_complete?: boolean
  cm_content_confirmed_at?: string
  cm_socialmedia?: boolean
  cm_publer_published_at?: string
  cm_publer_post_ids?: string
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

  const storyUpdate: Record<string, any> = {
    content: mergedContent
  }

  if (options?.storyName) {
    storyUpdate.name = options.storyName
  }
  if (options?.slug) {
    storyUpdate.slug = options.slug
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
export async function publishPost(storyId: string) {
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
 * Get a story by ID (for merging updates)
 */
async function getPostById(storyId: string) {
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
 * Fetch a single blog post by slug via Management API (includes full content + publish status).
 * Two-step: resolve slug → ID via list endpoint, then fetch full story by ID.
 * The list endpoint does not return full nested content (e.g. body blocks).
 */
export async function fetchSinglePostManagement(slug: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  for (const prefix of ['b', 'a'] as const) {
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

  const [blogRes, articleRes] = await Promise.all([
    managementFetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?starts_with=b/&per_page=${perPage}&page=${page}&sort_by=content.date:desc`,
      { headers }
    ),
    managementFetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?starts_with=a/&per_page=${perPage}&page=${page}&sort_by=content.date:desc`,
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

/**
 * Generate a slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
