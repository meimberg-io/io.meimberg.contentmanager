/**
 * AI Content Generation for Blog Posts
 * 
 * Uses AI models to generate blog content from Plaud source material.
 * Prompts are loaded from settings (editable in the app) with fallback to defaults.
 * Supports: OpenAI, Anthropic Claude, Google AI (Gemini)
 */

import { callAI } from './ai-provider'
import { DEFAULT_PROMPTS, type AiPrompts } from './settings-storage'

interface BlogGenerationOptions {
  sourceRaw?: string
  sourceSummarized?: string
  prompt?: string       // Override prompt (from settings)
  hint?: string         // Additional hint from user
  modelId?: string
  existingContent?: Record<string, string>
}

function buildSourceContext(sourceRaw?: string, sourceSummarized?: string): string {
  let context = ''
  if (sourceSummarized) {
    context += `## Zusammenfassung / Summary:\n${sourceSummarized}\n\n`
  }
  if (sourceRaw) {
    context += `## Rohtranskription / Raw Transcription:\n${sourceRaw}\n\n`
  }
  return context
}

function buildFullPrompt(
  sourceRaw: string | undefined,
  sourceSummarized: string | undefined,
  prompt: string,
  hint?: string,
  extraContext?: string
): string {
  const sourceContext = buildSourceContext(sourceRaw, sourceSummarized)
  let fullPrompt = `${sourceContext}\n${prompt}`
  if (extraContext) {
    fullPrompt += `\n\n${extraContext}`
  }
  if (hint) {
    fullPrompt += `\n\nZusätzliche Hinweise: ${hint}`
  }
  return fullPrompt
}

/**
 * Generate a page title from source material
 */
export async function generatePageTitle(options: BlogGenerationOptions): Promise<string> {
  const prompt = options.prompt || DEFAULT_PROMPTS.pagetitle
  const fullPrompt = buildFullPrompt(options.sourceRaw, options.sourceSummarized, prompt, options.hint)
  const response = await callAI({ prompt: fullPrompt, modelId: options.modelId })
  return response.trim().replace(/^["']|["']$/g, '')
}

/**
 * Generate an abstract/teaser from source material
 */
export async function generateAbstract(options: BlogGenerationOptions): Promise<string> {
  const prompt = options.prompt || DEFAULT_PROMPTS.abstract
  const fullPrompt = buildFullPrompt(options.sourceRaw, options.sourceSummarized, prompt, options.hint)
  const response = await callAI({ prompt: fullPrompt, modelId: options.modelId })
  return response.trim()
}

/**
 * Generate a page intro from source material
 */
export async function generatePageIntro(options: BlogGenerationOptions): Promise<string> {
  const prompt = options.prompt || DEFAULT_PROMPTS.pageintro
  const extraContext = options.existingContent?.pagetitle
    ? `Der Titel des Posts ist: "${options.existingContent.pagetitle}"`
    : undefined
  const fullPrompt = buildFullPrompt(options.sourceRaw, options.sourceSummarized, prompt, options.hint, extraContext)
  const response = await callAI({ prompt: fullPrompt, modelId: options.modelId })
  return response.trim()
}

/**
 * Generate a teaser title from source material
 */
export async function generateTeaserTitle(options: BlogGenerationOptions): Promise<string> {
  const prompt = options.prompt || DEFAULT_PROMPTS.teasertitle
  const fullPrompt = buildFullPrompt(options.sourceRaw, options.sourceSummarized, prompt, options.hint)
  const response = await callAI({ prompt: fullPrompt, modelId: options.modelId })
  return response.trim().replace(/^["']|["']$/g, '')
}

/**
 * Generate "Read More" text
 */
export async function generateReadMoreText(options: BlogGenerationOptions): Promise<string> {
  const prompt = options.prompt || DEFAULT_PROMPTS.readmoretext
  const fullPrompt = buildFullPrompt(options.sourceRaw, options.sourceSummarized, prompt, options.hint)
  const response = await callAI({ prompt: fullPrompt, modelId: options.modelId })
  return response.trim().replace(/^["']|["']$/g, '')
}

/**
 * Generate body article content from source material.
 * Returns a richtext block ready to be inserted into the body array.
 */
export async function generateBody(options: BlogGenerationOptions): Promise<any> {
  const prompt = options.prompt || DEFAULT_PROMPTS.body
  const extraContext = options.existingContent?.pagetitle
    ? `Der Titel des Posts ist: "${options.existingContent.pagetitle}"`
    : undefined
  const fullPrompt = buildFullPrompt(options.sourceRaw, options.sourceSummarized, prompt, options.hint, extraContext)
  const response = await callAI({ prompt: fullPrompt, modelId: options.modelId })
  const markdown = response.trim()

  // Convert markdown to ProseMirror JSON for Storyblok/TipTap
  const prosemirrorDoc = markdownToProsemirror(markdown)
  return prosemirrorDoc
}

/**
 * Convert markdown text to TipTap/ProseMirror-compatible JSON document.
 * Uses camelCase node types as required by TipTap's StarterKit.
 * Handles headings, bold, italic, links, lists, blockquotes, and horizontal rules.
 */
function markdownToProsemirror(markdown: string): any {
  const lines = markdown.split('\n')
  const content: any[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Headings (# to ####) — map # to h2 since h1 is the page title
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      let level = headingMatch[1].length
      if (level === 1) level = 2 // promote # to h2 (h1 = page title)
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineMarks(headingMatch[2].trim()),
      })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].substring(2))
        i++
      }
      content.push({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: parseInlineMarks(quoteLines.join(' ')),
        }],
      })
      continue
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: any[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, '')
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(itemText),
          }],
        })
        i++
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: any[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, '')
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(itemText),
          }],
        })
        i++
      }
      content.push({ type: 'orderedList', attrs: { start: 1 }, content: items })
      continue
    }

    // Empty line = skip
    if (line.trim() === '') {
      i++
      continue
    }

    // Regular paragraph – collect consecutive non-empty, non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,4}\s/) &&
      !lines[i].startsWith('> ') &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^\*\*\*+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }

    if (paraLines.length > 0) {
      content.push({
        type: 'paragraph',
        content: parseInlineMarks(paraLines.join(' ')),
      })
    }
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph' })
  }

  return { type: 'doc', content }
}

/**
 * Parse inline markdown marks (bold, italic, links) into ProseMirror text nodes.
 */
function parseInlineMarks(text: string): any[] {
  const nodes: any[] = []
  // Regex that matches **bold**, *italic*, and [linktext](url)
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // Plain text before the match
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index)
      if (plain) nodes.push({ type: 'text', text: plain })
    }

    if (match[2]) {
      // **bold**
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'bold' }],
      })
    } else if (match[3]) {
      // *italic*
      nodes.push({
        type: 'text',
        text: match[3],
        marks: [{ type: 'italic' }],
      })
    } else if (match[4] && match[5]) {
      // [linktext](url)
      nodes.push({
        type: 'text',
        text: match[4],
        marks: [{
          type: 'link',
          attrs: {
            href: match[5],
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
          },
        }],
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    if (remaining) nodes.push({ type: 'text', text: remaining })
  }

  // If nothing was parsed, return at least a single text node
  if (nodes.length === 0 && text) {
    nodes.push({ type: 'text', text })
  }

  return nodes
}

/**
 * Generate all content fields from source material
 */
export async function generateAllFromSource(
  sourceRaw: string,
  sourceSummarized: string,
  hint?: string,
  modelId?: string,
  customPrompt?: string
): Promise<{
  pagetitle: string
  pageintro: string
  teasertitle: string
  abstract: string
  readmoretext: string
}> {
  const prompt = customPrompt || DEFAULT_PROMPTS.generateAll
  const fullPrompt = buildFullPrompt(sourceRaw, sourceSummarized, prompt, hint)

  const response = await callAI({ prompt: fullPrompt, modelId })
  
  // Parse JSON from response, handling potential markdown code blocks
  const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  try {
    const parsed = JSON.parse(jsonStr)
    return {
      pagetitle: parsed.pagetitle || '',
      pageintro: parsed.pageintro || '',
      teasertitle: parsed.teasertitle || '',
      abstract: parsed.abstract || '',
      readmoretext: parsed.readmoretext || '',
    }
  } catch {
    console.error('Failed to parse AI response as JSON:', jsonStr)
    throw new Error('AI returned invalid JSON. Please try again.')
  }
}
