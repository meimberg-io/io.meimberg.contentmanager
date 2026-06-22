import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getPostListView } from '@/lib/posts-list'

/**
 * GET /api/posts/list
 * Server-side filtered list view for the posts page (MICM: server-side filtering).
 * Filtering, the LinkedIn join and counts run on the server; the client receives
 * only the resulting set. Distinct from `GET /api/posts` (raw stories, dashboard).
 * Protected: requires authentication.
 */
export async function GET(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const result = await getPostListView({
      view: searchParams.get('scope') || undefined,
      content: searchParams.get('content'),
      linkedin: searchParams.get('linkedin'),
      q: searchParams.get('q'),
    })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API /api/posts/list] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to fetch posts' }, { status: 500 })
  }
}
