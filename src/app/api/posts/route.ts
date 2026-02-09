import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { createPost, updatePost, deletePost, fetchBlogPostsManagement } from '@/lib/storyblok-management'
import { fetchBlogPosts } from '@/lib/storyblok'

/**
 * GET /api/posts
 * Fetch all blog entries (via Management API for publish status)
 * Protected: Requires authentication
 */
export async function GET(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('perPage') || '100')

    // Fetch content (CDN) + publish metadata (Management) in parallel.
    // This avoids rate-limit loops while keeping list status accurate.
    const [cdnResult, mgmtResult] = await Promise.allSettled([
      fetchBlogPosts({ page, perPage }),
      fetchBlogPostsManagement({ page, perPage }),
    ])

    const cdnStories = cdnResult.status === 'fulfilled' ? (cdnResult.value?.stories || []) : []
    const mgmtStories = mgmtResult.status === 'fulfilled' ? mgmtResult.value : []

    if (cdnResult.status === 'rejected') {
      console.warn('[API /api/posts] CDN fetch failed:', cdnResult.reason?.message || cdnResult.reason)
    }
    if (mgmtResult.status === 'rejected') {
      console.warn('[API /api/posts] Management fetch failed (continuing with CDN data):', mgmtResult.reason?.message || mgmtResult.reason)
    }

    // If CDN is unavailable, fall back to management list (better than empty list)
    let stories = cdnStories
    if (stories.length === 0 && mgmtStories.length > 0) {
      stories = mgmtStories
    } else if (stories.length > 0 && mgmtStories.length > 0) {
      // Merge publish metadata from management into CDN stories by UUID/ID/slug
      const byUuid = new Map<string, any>()
      const byId = new Map<string, any>()
      const bySlug = new Map<string, any>()
      for (const s of mgmtStories) {
        if (s?.uuid) byUuid.set(String(s.uuid), s)
        if (s?.id) byId.set(String(s.id), s)
        if (s?.slug) bySlug.set(String(s.slug), s)
      }

      stories = stories.map((s: any) => {
        const m =
          byUuid.get(String(s.uuid || '')) ||
          byId.get(String(s.id || '')) ||
          bySlug.get(String(s.slug || ''))

        if (!m) return s

        return {
          ...s,
          // Ensure publish flags reflect management state when available
          published: m.published ?? s.published,
          published_at: m.published_at ?? s.published_at,
          unpublished_changes: m.unpublished_changes ?? s.unpublished_changes,
        }
      })
    }

    return NextResponse.json({
      posts: stories,
      total: stories.length,
      page,
      perPage
    })
  } catch (error: any) {
    console.error('[API /api/posts] Error:', error.message)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch posts'
    }, { status: 500 })
  }
}

/**
 * POST /api/posts
 * Create a new blog post entry
 * Protected: Requires authentication + uses Management Token
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const result = await createPost({
      name: body.name,
      pagetitle: body.pagetitle || '',
      pageintro: body.pageintro || '',
      date: body.date || new Date().toISOString().split('T')[0],
      abstract: body.abstract || '',
      teasertitle: body.teasertitle || '',
      readmoretext: body.readmoretext || '',
      cm_source_raw: body.source_raw || '',
      cm_source_summarized: body.source_summarized || '',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/posts
 * Update an existing blog post entry
 */
export async function PATCH(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, slug: newSlug, ...updates } = body
    
    const options: { storyName?: string; slug?: string } = {}
    if (updates.pagetitle) options.storyName = updates.pagetitle
    if (newSlug) options.slug = newSlug
    
    const result = await updatePost(id, updates, Object.keys(options).length ? options : undefined)
    
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/posts
 * Delete a blog post entry
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
