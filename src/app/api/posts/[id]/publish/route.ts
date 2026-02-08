import { NextRequest, NextResponse } from 'next/server'
import { publishPost, unpublishPost } from '@/lib/storyblok-management'
import { requireAuth } from '@/lib/auth-guard'

/**
 * POST /api/posts/[id]/publish
 * Publish a blog post in Storyblok
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await publishPost(id)
    return NextResponse.json({ 
      success: true, 
      published_at: result.story?.published_at 
    })
  } catch (error: any) {
    console.error('Failed to publish post:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to publish post' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/posts/[id]/publish
 * Unpublish a blog post in Storyblok
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  const { id } = await params

  try {
    await unpublishPost(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to unpublish post:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to unpublish post' },
      { status: 500 }
    )
  }
}
