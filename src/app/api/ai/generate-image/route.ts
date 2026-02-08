import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { generateImagePrompt, generateHeaderImage } from '@/lib/openai'
import { uploadAsset } from '@/lib/storyblok-management'
import { getSettings } from '@/lib/settings-storage'
import { isModelAvailable, DEFAULT_MODEL } from '@/lib/ai-provider'

/**
 * POST /api/ai/generate-image
 * 
 * Two modes:
 * 1. action: 'prompt'  — Generate a DALL-E prompt from source material
 * 2. action: 'image'   — Generate image from a DALL-E prompt, return base64
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'prompt') {
      // Generate a DALL-E prompt from source material
      const { sourceRaw, sourceSummarized, hint, modelId: requestModelId } = body

      const settings = await getSettings()
      let modelId = requestModelId || settings.aiModel || DEFAULT_MODEL
      if (!isModelAvailable(modelId)) modelId = DEFAULT_MODEL

      const storedPrompts = settings.aiPrompts || {}

      const imagePrompt = await generateImagePrompt({
        sourceRaw,
        sourceSummarized,
        hint,
        modelId,
        prompt: storedPrompts.headerImage || '',
      })

      return NextResponse.json({ success: true, imagePrompt })
    }

    if (action === 'image') {
      // Generate the image with DALL-E
      const { dallePrompt } = body

      if (!dallePrompt) {
        return NextResponse.json({ error: 'dallePrompt is required' }, { status: 400 })
      }

      const result = await generateHeaderImage(dallePrompt)

      return NextResponse.json({
        success: true,
        base64: result.base64,
      })
    }

    if (action === 'upload') {
      // Upload a base64 image to Storyblok and return the asset URL
      const { base64, filename } = body

      if (!base64) {
        return NextResponse.json({ error: 'base64 image data is required' }, { status: 400 })
      }

      const buffer = Buffer.from(base64, 'base64')
      const fname = filename || `header-${Date.now()}.png`
      const asset = await uploadAsset(buffer, fname)

      return NextResponse.json({
        success: true,
        assetUrl: asset.filename,
        assetId: asset.id,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: prompt, image, or upload' }, { status: 400 })
  } catch (error: any) {
    console.error('[AI Generate Image] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
