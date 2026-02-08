import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { uploadAsset } from '@/lib/storyblok-management'

/**
 * POST /api/posts/upload
 * Upload a file (image/video) to Storyblok assets
 * Protected: Requires authentication
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadAsset(buffer, file.name)

    return NextResponse.json({
      id: result.id,
      filename: result.filename,
      publicUrl: result.publicUrl,
    })
  } catch (error: any) {
    console.error('[API /api/posts/upload] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
