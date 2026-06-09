import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import {
  createLinkedinPost,
  updateLinkedinPost,
  deletePost,
  resolveBlogStoryByUuid,
  type LinkedinPostData,
} from '@/lib/storyblok-management'
import { fetchLinkedinPosts, fetchLinkedinPostsByBlogUuid } from '@/lib/storyblok'
import { transformStoryblokLinkedin } from '@/lib/transform-storyblok'
import { buildBlogLinkPreview, type BlogLinkPreview } from '@/lib/linkedin-link'
import type { LinkedinPost } from '@/types'

/**
 * GET /api/linkedin
 * - `?blogUuid=<uuid>` → LinkedIn posts attached to that blog (MICM-8 AK6a),
 *   plus the resolved `parent` blog link preview (MICM-11).
 * - otherwise → full LinkedIn list + a `parents` map (blog UUID → blog link preview)
 *   so the list can render parent markers linking to the blog detail (MICM-10 AK2).
 * Protected: Requires authentication.
 */
export async function GET(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const blogUuid = searchParams.get('blogUuid')

    if (blogUuid) {
      const stories = await fetchLinkedinPostsByBlogUuid(blogUuid)
      const posts: LinkedinPost[] = stories.map(transformStoryblokLinkedin)
      const blog = await resolveBlogStoryByUuid(blogUuid)
      const parent: BlogLinkPreview | null = blog ? buildBlogLinkPreview(blogUuid, blog) : null
      return NextResponse.json({ posts, total: posts.length, parent })
    }

    const { stories } = await fetchLinkedinPosts()
    const posts: LinkedinPost[] = stories.map(transformStoryblokLinkedin)

    // Resolve unique parent blog UUIDs → link preview for parent markers.
    const uniqueParentUuids = [
      ...new Set(posts.map((p) => p.blogParentUuid).filter((u): u is string => !!u)),
    ]
    const parents: Record<string, BlogLinkPreview> = {}
    await Promise.all(
      uniqueParentUuids.map(async (uuid) => {
        const blog = await resolveBlogStoryByUuid(uuid)
        if (blog) {
          parents[uuid] = buildBlogLinkPreview(uuid, blog)
        }
      })
    )

    return NextResponse.json({ posts, total: posts.length, parents })
  } catch (error: any) {
    console.error('[API /api/linkedin] GET error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to fetch LinkedIn posts' }, { status: 500 })
  }
}

/**
 * POST /api/linkedin
 * Create a new linkedin_post story (standalone or attached to a blog).
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const blogParentUuid: string | undefined = body.blogParentUuid || undefined

    const name: string =
      body.name ||
      (blogParentUuid ? 'LinkedIn-Post' : `LinkedIn-Post ${new Date().toISOString().split('T')[0]}`)

    const result = await createLinkedinPost({
      name,
      blogParentUuid,
      linkedin_text: body.linkedin_text || '',
      cm_source_raw: body.cm_source_raw || undefined,
      cm_source_summarized: body.cm_source_summarized || undefined,
      cm_ai_hint: body.cm_ai_hint || undefined,
      cm_origin: body.cm_origin === 'import' ? 'import' : 'create',
      cm_publer_label: body.cm_publer_label || undefined,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API /api/linkedin] POST error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/linkedin
 * Update an existing linkedin_post story (draft-only).
 */
export async function PATCH(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, slug, name, ...rest } = body
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Whitelist persisted fields (LinkedinPostData).
    const allowed: (keyof LinkedinPostData)[] = [
      'linkedin_text',
      'linkedin_image',
      'cm_blog_ref',
      'cm_source_raw',
      'cm_source_summarized',
      'cm_ai_hint',
      'cm_image_prompt',
      'cm_tags',
      'cm_origin',
      'cm_content_complete',
      'cm_content_confirmed_at',
      'cm_publer_published_at',
      'cm_publer_post_ids',
      'cm_publer_label',
    ]
    const updates: Partial<LinkedinPostData> = {}
    for (const key of allowed) {
      if (key in rest) {
        ;(updates as Record<string, unknown>)[key] = rest[key]
      }
    }

    const options: { storyName?: string; slug?: string } = {}
    if (name) options.storyName = name
    if (slug) options.slug = slug

    const result = await updateLinkedinPost(id, updates, Object.keys(options).length ? options : undefined)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API /api/linkedin] PATCH error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/linkedin?id=<storyId>
 * Delete a linkedin_post story (deletePost is component-agnostic).
 */
export async function DELETE(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }
    await deletePost(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API /api/linkedin] DELETE error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
