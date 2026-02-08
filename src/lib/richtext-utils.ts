/**
 * Utilities for Storyblok richtext: convert to/from plain text.
 * Used for rich text field conversions in the content manager.
 */

type SbNode = { type?: string; text?: string; content?: SbNode[] }

/**
 * Extract plain text from a Storyblok richtext document.
 */
export function richtextToPlainText(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return ''
  const node = doc as SbNode
  if (node.text) return node.text
  if (!Array.isArray(node.content) || node.content.length === 0) return ''
  const blockTypes = ['paragraph', 'heading', 'blockquote', 'list_item', 'ordered_list', 'bullet_list']
  return node.content
    .map((c) => richtextToPlainText(c))
    .filter(Boolean)
    .join(blockTypes.includes(node.type || '') ? '\n\n' : ' ')
    .trim()
}

/**
 * Wrap plain text in a minimal Storyblok richtext document.
 * Paragraphs (double newline) become separate blocks.
 */
export function plainTextToRichtext(text: string): { type: 'doc'; content: SbNode[] } {
  if (!text || !text.trim()) {
    return { type: 'doc', content: [] }
  }
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const content: SbNode[] = paragraphs.map((p) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: p.replace(/\n/g, ' ') }]
  }))
  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: text.replace(/\n/g, ' ') }] })
  }
  return { type: 'doc', content }
}
