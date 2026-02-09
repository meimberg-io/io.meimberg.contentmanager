import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { 
  generatePageTitle, 
  generateAbstract, 
  generatePageIntro,
  generateTeaserTitle,
  generateReadMoreText,
  generateAllFromSource,
  generateBody,
  optimizeText,
} from '@/lib/openai'
import { updatePost } from '@/lib/storyblok-management'
import { getSettings } from '@/lib/settings-storage'
import { isModelAvailable, DEFAULT_MODEL } from '@/lib/ai-provider'

/**
 * POST /api/ai/generate
 * Generate AI content for a blog post
 * Protected: Requires authentication
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      storyId, 
      type, 
      sourceRaw, 
      sourceSummarized, 
      hint, 
      modelId: requestModelId,
      existingContent,
      text: optimizeInputText,
      instruction: optimizeInstruction,
      isFullDocument,
    } = body
    // type: 'pagetitle' | 'abstract' | 'pageintro' | 'teasertitle' | 'readmoretext' | 'all' | 'body' | 'optimize'

    // Get settings (model + prompts)
    const settings = await getSettings()
    let modelId = requestModelId || settings.aiModel || DEFAULT_MODEL
    
    if (!isModelAvailable(modelId)) {
      console.warn(`Configured model ${modelId} not available, falling back to ${DEFAULT_MODEL}`)
      modelId = DEFAULT_MODEL
      if (!isModelAvailable(modelId)) {
        return NextResponse.json({ 
          error: 'No AI provider configured. Please set up at least one API key (OpenAI, Anthropic, or Google AI).' 
        }, { status: 500 })
      }
    }

    // Get the stored prompt for this type (if any)
    const storedPrompts = settings.aiPrompts || {}

    const genOptions = {
      sourceRaw,
      sourceSummarized,
      hint,
      modelId,
      existingContent,
      prompt: '', // will be set per type
    }

    let result: any = {}

    switch (type) {
      case 'pagetitle':
        genOptions.prompt = storedPrompts.pagetitle || ''
        result.pagetitle = await generatePageTitle(genOptions)
        break
      
      case 'abstract':
        genOptions.prompt = storedPrompts.abstract || ''
        result.abstract = await generateAbstract(genOptions)
        break
      
      case 'pageintro':
        genOptions.prompt = storedPrompts.pageintro || ''
        result.pageintro = await generatePageIntro(genOptions)
        break
      
      case 'teasertitle':
        genOptions.prompt = storedPrompts.teasertitle || ''
        result.teasertitle = await generateTeaserTitle(genOptions)
        break
      
      case 'readmoretext':
        genOptions.prompt = storedPrompts.readmoretext || ''
        result.readmoretext = await generateReadMoreText(genOptions)
        break
      
      case 'body':
        if (!sourceRaw && !sourceSummarized) {
          return NextResponse.json({ 
            error: 'Source material is required for body generation' 
          }, { status: 400 })
        }
        genOptions.prompt = storedPrompts.body || ''
        result.bodyContent = await generateBody(genOptions)
        break

      case 'all':
        if (!sourceRaw && !sourceSummarized) {
          return NextResponse.json({ 
            error: 'Source material (sourceRaw or sourceSummarized) is required for "Generate All"' 
          }, { status: 400 })
        }
        result = await generateAllFromSource(
          sourceRaw || '', 
          sourceSummarized || '', 
          hint, 
          modelId,
          storedPrompts.generateAll || ''
        )
        break

      case 'optimize':
        if (!optimizeInputText) {
          return NextResponse.json({ error: 'Text to optimize is required' }, { status: 400 })
        }
        if (!optimizeInstruction) {
          return NextResponse.json({ error: 'Optimization instruction is required' }, { status: 400 })
        }
        result = await optimizeText({
          text: optimizeInputText,
          instruction: optimizeInstruction,
          isFullDocument: !!isFullDocument,
          modelId,
        })
        break
      
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Update Storyblok if storyId provided
    if (storyId) {
      const updateData: any = {}
      
      if (result.pagetitle !== undefined) updateData.pagetitle = result.pagetitle
      if (result.abstract !== undefined) updateData.abstract = result.abstract
      if (result.pageintro !== undefined) updateData.pageintro = result.pageintro
      if (result.teasertitle !== undefined) updateData.teasertitle = result.teasertitle
      if (result.readmoretext !== undefined) updateData.readmoretext = result.readmoretext
      
      if (Object.keys(updateData).length > 0) {
        await updatePost(storyId, updateData)
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
      modelUsed: modelId,
      message: `Successfully generated ${type}`
    })
  } catch (error: any) {
    console.error('[AI Generate] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
