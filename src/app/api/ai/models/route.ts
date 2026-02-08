import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getAvailableModels, getAvailableProviders, AI_MODELS, DEFAULT_MODEL } from '@/lib/ai-provider'

/**
 * GET /api/ai/models
 * Get available AI models based on configured API keys
 */
export async function GET() {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const availableModels = getAvailableModels()
    const availableProviders = getAvailableProviders()
    
    return NextResponse.json({
      models: availableModels,
      allModels: AI_MODELS,
      providers: availableProviders,
      defaultModel: DEFAULT_MODEL
    })
  } catch (error: any) {
    console.error('Get AI models error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
