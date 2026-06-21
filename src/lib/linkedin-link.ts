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
    // OG image: headerpicture, fallback teaserimage (matches www selectOgImage).
    imageUrl: content.headerpicture?.filename || content.teaserimage?.filename || undefined,
    url: buildBlogUrl(fullSlug),
    published,
  }
}
