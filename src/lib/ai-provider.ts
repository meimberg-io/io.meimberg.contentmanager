/**
 * AI Provider Abstraction
 * 
 * Unified interface for multiple AI providers with vision capabilities:
 * - OpenAI (GPT-6 Astra, GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna)
 * - Anthropic Claude (Claude Opus 5, Claude Fable 5.1, Claude Sonnet 5, Claude Haiku 4.5)
 * - Google AI (Gemini 3.1 Pro, Gemini 3.8 Flash, Gemini 3.5 Flash-Lite)
 *
 * Updated 2026-09-09 from official model docs (platform.openai.com,
 * platform.claude.com, ai.google.dev) — see Slack thread for source pull.
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
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', provider: 'openai', supportsVision: true },
  { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', provider: 'openai', supportsVision: true },
  { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', provider: 'openai', supportsVision: true },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', provider: 'openai', supportsVision: true },
  // Anthropic Claude
  { id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'anthropic', supportsVision: true },
  { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', provider: 'anthropic', supportsVision: true },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'anthropic', supportsVision: true },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic', supportsVision: true },
  // Google AI (Gemini)
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google', supportsVision: true },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'google', supportsVision: true },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', provider: 'google', supportsVision: true },
]

export const DEFAULT_MODEL = 'gpt-5.6-terra'

/**
 * Hard cap on generated tokens, applied to every provider.
 *
 * 4096 (the previous value) truncated long articles mid-sentence — a German
 * blog body of ~2000 words already hits it, and `optimizeText` on a full
 * document hits it even sooner because the whole article is re-emitted.
 * All current models here allow far more (up to 128K), but these calls are
 * non-streaming plain `fetch`, so the ceiling is bounded by request timeouts
 * rather than by the models: 16000 is the largest value that comfortably
 * completes in one HTTP request.
 *
 * Note that on models which think by default (Claude Opus 5, Sonnet 5,
 * Fable 5.1, and the OpenAI reasoning models) the thinking/reasoning tokens
 * are drawn from this same budget, so a long article has less room than the
 * number suggests.  Running out is no longer silent — the extract helpers
 * below throw when the budget is exhausted before any text is emitted.
 */
const MAX_OUTPUT_TOKENS = 16000

/**
 * Extract the assistant text from an OpenAI chat-completions response.
 *
 * Throws rather than returning '' on an empty completion: an empty string
 * travels silently all the way into the editor, where `markdownToProsemirror`
 * turns it into a single blank block that looks like a successful generation.
 */
export function extractOpenAIText(data: any): string {
  const choice = data?.choices?.[0]
  const content = choice?.message?.content
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.filter((p: any) => p?.type === 'text').map((p: any) => p.text).join('')
        : ''

  if (text) return text

  console.error('[OpenAI] Empty completion. Full response:', JSON.stringify(data, null, 2))

  if (choice?.finish_reason === 'length') {
    throw new Error(
      `OpenAI hit the ${MAX_OUTPUT_TOKENS} token limit before producing any text. ` +
      `On reasoning models the reasoning tokens count toward this limit.`
    )
  }
  if (choice?.finish_reason === 'content_filter') {
    throw new Error('OpenAI blocked the response (content filter)')
  }
  throw new Error(`OpenAI returned an empty response (finish_reason: ${choice?.finish_reason ?? 'unknown'})`)
}

/**
 * Extract the assistant text from an Anthropic messages response.
 *
 * The response is a list of content blocks, and the text is NOT reliably the
 * first one: on models with extended thinking enabled by default (Claude Opus 5,
 * Sonnet 5, Fable 5.1) the first block is a `thinking` block with no `.text`,
 * so reading `content[0].text` silently yields '' and the generated article is
 * thrown away.  Concatenate every text block instead — citations also split a
 * single answer across several of them.
 */
export function extractAnthropicText(data: any): string {
  const blocks: any[] = Array.isArray(data?.content) ? data.content : []
  const text = blocks
    .filter((b) => b?.type === 'text')
    .map((b) => b.text ?? '')
    .join('')

  if (text) return text

  console.error('[Anthropic] No text block in response. Full response:', JSON.stringify(data, null, 2))

  if (data?.stop_reason === 'refusal') {
    throw new Error(
      `Anthropic declined the request (${data?.stop_details?.category ?? 'unknown'})`
    )
  }
  if (data?.stop_reason === 'max_tokens') {
    throw new Error(
      `Anthropic hit the ${MAX_OUTPUT_TOKENS} token limit before producing any text. ` +
      `Thinking tokens count toward this limit.`
    )
  }
  throw new Error(
    `Anthropic returned no text block (stop_reason: ${data?.stop_reason ?? 'unknown'}, ` +
    `blocks: ${blocks.map((b) => b?.type).join(', ') || 'none'})`
  )
}

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
      max_completion_tokens: MAX_OUTPUT_TOKENS
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return extractOpenAIText(data)
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
      max_tokens: MAX_OUTPUT_TOKENS,
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
  return extractAnthropicText(data)
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
          maxOutputTokens: MAX_OUTPUT_TOKENS
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
