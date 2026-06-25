/**
 * LinkedIn ↔ Blog link/preview helpers (MICM-11).
 *
 * Resolves the public blog URL for an attached LinkedIn post and derives the
 * Open-Graph preview (title + image) from the blog story — using the SAME fields
 * the public website (io.meimberg.www) emits as OG tags (pagetitle/teasertitle,
 * headerpicture/teaserimage), so the editor preview matches what LinkedIn renders.
 *
 * The blog URL is intentionally NOT written into linkedin_text — it is appended
 * fresh at publish time (MICM-12), so the slug never goes stale.
 */

/** Public base host for blog URLs. Configurable via env, no hardcode scattered. */
export const PUBLIC_BASE_HOST = (process.env.WWW_PUBLIC_BASE_URL || 'https://www.meimberg.io').replace(/\/+$/, '')

/** Strip HTML tags + collapse whitespace (mirrors www metadata.stripHtml). */
function stripHtml(input?: string): string {
  if (!input) return ''
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Clamp to a max length on a word boundary, ellipsis suffix (mirrors www metadata.clamp). */
function clamp(input: string, max: number): string {
  if (input.length <= max) return input
  const truncated = input.slice(0, max + 1)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated.slice(0, max)).trimEnd() + '…'
}

/** Build the public blog URL from a Storyblok full_slug (e.g. "b/my-post" → host + "/b/my-post"). */
export function buildBlogUrl(fullSlug: string): string {
  return `${PUBLIC_BASE_HOST}/${String(fullSlug || '').replace(/^\/+/, '')}`
}

/** Open-Graph-style preview of a parent blog, for the LinkedIn editor card + MICM-12. */
export interface BlogLinkPreview {
  uuid: string
  slug: string
  fullSlug: string
  contentType: 'blog' | 'article'
  title: string
  /** OG description (abstract/pageintro), for the LinkedIn link-share card. */
  description?: string
  imageUrl?: string
  url: string
  /** Whether the blog story is published (link/unfurl only works once published). */
  published: boolean
}

/**
 * Build the blog link preview from a resolved Storyblok blog story.
 * Uses full_slug from the story (not reconstructed) so b/ vs a/ and slug changes
 * are reflected correctly (MICM-11 AK1).
 */
export function buildBlogLinkPreview(uuid: string, blogStory: any): BlogLinkPreview {
  const content = blogStory?.content || {}
  const contentType: 'blog' | 'article' = content.component === 'article' ? 'article' : 'blog'
  const fullSlug: string = blogStory?.full_slug || `${contentType === 'article' ? 'a' : 'b'}/${blogStory?.slug || ''}`
  // `published` only — not `published_at` (Storyblok keeps published_at after an
  // unpublish, so it would falsely report an unpublished blog as live / unfurlable).
  const published = blogStory?.published === true

  return {
    uuid,
    slug: blogStory?.slug || '',
    fullSlug,
    contentType,
    // OG title: pagetitle, fallback teasertitle (matches www deriveTitle).
    title: content.pagetitle || content.teasertitle || blogStory?.name || blogStory?.slug || '',
    // OG description: abstract, fallback pageintro (matches www deriveDescription).
    description: clamp(stripHtml(content.abstract || content.pageintro || ''), 160) || undefined,
    // OG image: headerpicture, fallback teaserimage (matches www selectOgImage).
    imageUrl: content.headerpicture?.filename || content.teaserimage?.filename || undefined,
    url: buildBlogUrl(fullSlug),
    published,
  }
}

/**
 * Build a link preview from the Management *list* endpoint's top-level fields only —
 * the list omits nested `content`, so there is NO OG image here. Used for the LinkedIn
 * list's parent markers, which render just title + slug; the full-content preview
 * (with image) comes from buildBlogLinkPreview for the single-post editor card.
 * Batches many parents into one `by_uuids` request instead of two requests per parent.
 */
export function buildBlogLinkPreviewFromListMeta(meta: {
  uuid: string
  slug: string
  fullSlug: string
  name: string
  published: boolean
}): BlogLinkPreview {
  const contentType: 'blog' | 'article' = meta.fullSlug.startsWith('a/') ? 'article' : 'blog'
  const fullSlug = meta.fullSlug || `${contentType === 'article' ? 'a' : 'b'}/${meta.slug}`
  return {
    uuid: meta.uuid,
    slug: meta.slug,
    fullSlug,
    contentType,
    title: meta.name || meta.slug || '',
    imageUrl: undefined,
    url: buildBlogUrl(fullSlug),
    published: meta.published,
  }
}
