import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { createPost, updatePost, deletePost, fetchBlogPostsManagement } from '@/lib/storyblok-management'

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
    
    // Use Management API to get publish status
    const stories = await fetchBlogPostsManagement({ page, perPage })
    
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
    const { id, ...updates } = body
    
    const options = updates.pagetitle ? { storyName: updates.pagetitle } : undefined
    
    const result = await updatePost(id, updates, options)
    
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
