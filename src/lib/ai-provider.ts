/**
 * AI Provider Abstraction
 * 
 * Unified interface for multiple AI providers with vision capabilities:
 * - OpenAI (GPT-4o, GPT-4o Mini)
 * - Anthropic Claude (Claude Opus 4, Claude Sonnet 4, Claude Haiku 3.5)
 * - Google AI (Gemini 2.5 Flash, Gemini 2.5 Pro)
 */

export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  supportsVision: boolean
}

// Available models with vision support
export const AI_MODELS: AIModel[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', supportsVision: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', supportsVision: true },
  // Anthropic Claude
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', supportsVision: true },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', supportsVision: true },
  { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', provider: 'anthropic', supportsVision: true },
  // Google AI (Gemini) - Updated model names
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', supportsVision: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', supportsVision: true },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'google', supportsVision: true },
]

export const DEFAULT_MODEL = 'gpt-4o'

// API Keys from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = []
  if (OPENAI_API_KEY) providers.push('openai')
  if (ANTHROPIC_API_KEY) providers.push('anthropic')
  if (GOOGLE_AI_API_KEY) providers.push('google')
  return providers
}

/**
 * Get available models based on configured API keys
 */
export function getAvailableModels(): AIModel[] {
  const providers = getAvailableProviders()
  return AI_MODELS.filter(model => providers.includes(model.provider))
}

/**
 * Check if a specific model is available
 */
export function isModelAvailable(modelId: string): boolean {
  const model = AI_MODELS.find(m => m.id === modelId)
  if (!model) return false
  return getAvailableProviders().includes(model.provider)
}

/**
 * Get provider for a model ID
 */
export function getProviderForModel(modelId: string): AIProvider | null {
  const model = AI_MODELS.find(m => m.id === modelId)
  return model?.provider || null
}

interface CallAIOptions {
  prompt: string
  imageUrl?: string
  modelId?: string
}

/**
 * Call AI - routes to appropriate provider
 * Supports both text-only and image+text calls
 */
export async function callAI(options: CallAIOptions): Promise<string> {
  const modelId = options.modelId || DEFAULT_MODEL
  const model = AI_MODELS.find(m => m.id === modelId)
  
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`)
  }
  
  if (!isModelAvailable(modelId)) {
    throw new Error(`Model ${modelId} is not available. Please configure the ${model.provider.toUpperCase()} API key.`)
  }
  
  switch (model.provider) {
    case 'openai':
      return callOpenAI(options.prompt, options.imageUrl, modelId)
    case 'anthropic':
      return callAnthropic(options.prompt, options.imageUrl, modelId)
    case 'google':
      return callGoogleAI(options.prompt, options.imageUrl, modelId)
    default:
      throw new Error(`Unsupported provider: ${model.provider}`)
  }
}

/**
 * OpenAI API call
 */
async function callOpenAI(prompt: string, imageUrl: string | undefined, model: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const content: any[] = [{ type: 'text', text: prompt }]
  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content
        }
      ],
      max_completion_tokens: 4096
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Anthropic Claude API call
 */
async function callAnthropic(prompt: string, imageUrl: string | undefined, model: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const contentParts: any[] = []

  // Add image if provided
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const mediaType = contentType.split(';')[0] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    contentParts.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Image
      }
    })
  }

  contentParts.push({ type: 'text', text: prompt })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: contentParts
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

/**
 * Google AI (Gemini) API call
 */
async function callGoogleAI(prompt: string, imageUrl: string | undefined, model: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not configured')
  }

  const parts: any[] = []

  // Add image if provided
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const mimeType = contentType.split(';')[0]

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Image
      }
    })
  }

  parts.push({ text: prompt })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: 4096
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Google AI API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  
  // Check for blocked content or empty response
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Google AI blocked response: ${data.promptFeedback.blockReason}`)
  }
  
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  
  if (!text) {
    console.error('[Google AI] Empty response. Full response:', JSON.stringify(data, null, 2))
    
    // Check if there's a finish reason indicating an issue
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason && finishReason !== 'STOP') {
      throw new Error(`Google AI response issue: ${finishReason}`)
    }
    
    throw new Error('Google AI returned empty response')
  }
  
  return text
}
