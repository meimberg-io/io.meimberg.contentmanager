import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getLinkedinPostById, resolveBlogStoryByUuid } from '@/lib/storyblok-management'

/**
 * GET /api/linkedin/[id]
 * Fetch a single linkedin_post story by numeric story ID (full content).
 * Also resolves the parent blog (if attached) so the detail page can link to it.
 * Protected: Requires authentication.
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
    const { id } = await params
    const story = await getLinkedinPostById(id)
    if (!story) {
      return NextResponse.json({ error: 'LinkedIn post not found' }, { status: 404 })
    }

    let parent: { uuid: string; slug: string; contentType: 'blog' | 'article'; title: string } | null = null
    const blogUuid = story.content?.cm_blog_ref
    if (blogUuid) {
      const blog = await resolveBlogStoryByUuid(blogUuid)
      if (blog) {
        parent = {
          uuid: blogUuid,
          slug: blog.slug || '',
          contentType: blog.content?.component === 'article' ? 'article' : 'blog',
          title: blog.content?.pagetitle || blog.name || blog.slug || '',
        }
      }
    }

    return NextResponse.json({ story, parent })
  } catch (error: any) {
    console.error('[API /api/linkedin/[id]] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to fetch LinkedIn post' }, { status: 500 })
  }
}
