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
  // Status fields
  cm_content_complete?: boolean
  cm_content_confirmed_at?: string
  cm_socialmedia?: boolean
  cm_publer_published_at?: string
  cm_publer_post_ids?: string
}

/**
 * Get the blog folder ID (or create it if it doesn't exist)
 */
async function getBlogFolderId(): Promise<number> {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  // Try to find existing blog folder
  const response = await fetch(
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
  const createResponse = await fetch(
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

/**
 * Create a new blog post story in Storyblok
 * Note: Created as draft (not published)
 */
export async function createPost(data: BlogPostData & { name: string }) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const blogFolderId = await getBlogFolderId()

  const requestBody = {
    story: {
      name: data.name,
      slug: generateSlug(data.name),
      content: {
        component: 'blog',
        ...data
      },
      parent_id: blogFolderId
    }
    // No publish: 1 — created as draft
  }

  console.log('Creating Storyblok blog post:', data.name)

  const response = await fetch(
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
 * Update an existing blog post story
 * Saves as draft (does NOT auto-publish)
 */
export async function updatePost(
  storyId: string, 
  data: Partial<BlogPostData>,
  options?: { storyName?: string; slug?: string }
) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  // First, get the current story to merge with updates
  const currentStory = await getPostById(storyId)
  
  // Build merged content
  const mergedContent: Record<string, any> = {
    ...currentStory.content,
    ...data,
  }
  
  // Build story update object
  const storyUpdate: Record<string, any> = {
    content: mergedContent
  }
  
  if (options?.storyName) {
    storyUpdate.name = options.storyName
  }
  if (options?.slug) {
    storyUpdate.slug = options.slug
  }
  
  const response = await fetch(
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

  const response = await fetch(
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
  
  // Sanitize content before publishing — Storyblok rejects blank required fields
  const content = { ...currentStory.content }
  if (Array.isArray(content.body)) {
    content.body = content.body.map((block: any) => {
      if (block.component === 'picture') {
        return {
          ...block,
          spacing: block.spacing || 'default',
          style: block.style || 'normal',
        }
      }
      return block
    })
  }
  
  const response = await fetch(
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

  return await response.json()
}

/**
 * Unpublish a blog post in Storyblok
 */
export async function unpublishPost(storyId: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const response = await fetch(
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

  return { success: true }
}

/**
 * Get a story by ID (for merging updates)
 */
async function getPostById(storyId: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const response = await fetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch story')
  }

  const data = await response.json()
  return data.story
}

/**
 * Fetch a single blog post by slug via Management API (includes full content + publish status)
 */
export async function fetchSinglePostManagement(slug: string) {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  // Search by full slug (folder/slug)
  const response = await fetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?by_slugs=b/${slug}`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to search for post: ${response.statusText}`)
  }

  const data = await response.json()
  const story = (data.stories || [])[0]
  
  if (!story) {
    return null
  }

  // Fetch full story by ID (list endpoint may not include content)
  const fullStory = await getPostById(String(story.id))
  return fullStory
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

  const response = await fetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?starts_with=b/&per_page=${perPage}&page=${page}&sort_by=created_at:desc`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch blog posts: ${response.statusText}`)
  }

  const data = await response.json()
  return data.stories || []
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

  const signResponse = await fetch(
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
