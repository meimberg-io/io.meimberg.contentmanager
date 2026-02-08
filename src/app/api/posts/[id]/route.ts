import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { fetchSinglePostManagement } from '@/lib/storyblok-management'

/**
 * GET /api/posts/[id]
 * Fetch a single blog post by slug (via Management API for full content + publish status)
 * Protected: Requires authentication
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { id: slug } = await params
    const story = await fetchSinglePostManagement(slug)

    if (!story) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ story })
  } catch (error: any) {
    console.error('[API /api/posts/[id]] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch post' },
      { status: 500 }
    )
  }
}
