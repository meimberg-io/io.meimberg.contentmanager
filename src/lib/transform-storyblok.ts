/**
 * Transform Storyblok story data to our BlogPost type
 */

import { BlogPost, LinkedinPost } from '@/types'

export function transformStoryblokBlog(story: any): BlogPost {
  const content = story.content || {}

  const component = content.component
  const contentType =
    component === 'article' ? 'article' : 'blog'
  const blogBodyVariant =
    contentType === 'blog'
      ? content.cm_blog_variant === 'short'
        ? 'short'
        : 'long'
      : undefined

  return {
    id: story.uuid,
    storyblokId: String(story.id),
    slug: story.slug || '',
    contentType,
    blogBodyVariant,
    // Blog content fields
    pagetitle: content.pagetitle || '',
    pageintro: content.pageintro || '',
    date: content.date || '',
    headerpicture: content.headerpicture?.filename || undefined,
    teasertitle: content.teasertitle || '',
    teaserimage: content.teaserimage?.filename || undefined,
    readmoretext: content.readmoretext || '',
    abstract: content.abstract || '',
    hasBody: Array.isArray(content.body) && content.body.length > 0,
    body: Array.isArray(content.body) ? content.body : [],
    // Source material
    sourceRaw: content.cm_source_raw || undefined,
    sourceSummarized: content.cm_source_summarized || undefined,
    origin: ['import', 'create', 'mcp'].includes(content.cm_origin) ? content.cm_origin : undefined,
    intakePending: content.cm_intake_pending === true || undefined,
    aiHint: content.cm_ai_hint || undefined,
    imagePrompt: content.cm_image_prompt || undefined,
    // Status
    status: {
      contentComplete: {
        completed: !!content.cm_content_complete,
        timestamp: content.cm_content_confirmed_at,
        color: getContentCompleteColor(content),
      },
      published: {
        completed: story.published === true || !!story.published_at,
        timestamp: story.published_at || undefined,
        color: getPublishedColor(story),
      },
      publishedPubler: {
        completed: !!content.cm_socialmedia,
        timestamp: content.cm_publer_published_at,
        color: content.cm_socialmedia ? 'green' : 'gray',
      },
    },
    // Publer
    publerPostIds: content.cm_publer_post_ids
      ? content.cm_publer_post_ids.split(',').map((id: string) => id.trim()).filter(Boolean)
      : undefined,
    // Timestamps
    createdAt: story.created_at,
    lastModified: story.updated_at || story.created_at,
  }
}

/**
 * Transform a Storyblok `linkedin_post` story into our LinkedinPost type (MICM-8).
 * Kept separate from the blog transform — no mixing of folders/components.
 */
export function transformStoryblokLinkedin(story: any): LinkedinPost {
  const content = story.content || {}

  const linkedinText = content.linkedin_text || ''
  const blogParentUuid = content.cm_blog_ref || undefined
  const publishedLinkedIn = !!content.cm_publer_published_at

  return {
    id: story.uuid,
    storyblokId: String(story.id),
    slug: story.slug || '',
    name: story.name || '',
    linkedinText,
    linkedinImage: content.linkedin_image?.filename || undefined,
    sourceRaw: content.cm_source_raw || undefined,
    sourceSummarized: content.cm_source_summarized || undefined,
    aiHint: content.cm_ai_hint || undefined,
    imagePrompt: content.cm_image_prompt || undefined,
    tags: content.cm_tags
      ? content.cm_tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : undefined,
    origin: content.cm_origin === 'import' || content.cm_origin === 'create' ? content.cm_origin : undefined,
    blogParentUuid,
    status: {
      contentComplete: {
        completed: !!content.cm_content_complete,
        timestamp: content.cm_content_confirmed_at || undefined,
        color: getLinkedinContentCompleteColor(content),
      },
      publishedLinkedIn: {
        completed: publishedLinkedIn,
        timestamp: content.cm_publer_published_at || undefined,
        // Activated in MICM-12 (Publer); gray placeholder until then.
        color: publishedLinkedIn ? 'green' : 'gray',
      },
    },
    publerPostIds: content.cm_publer_post_ids
      ? content.cm_publer_post_ids.split(',').map((id: string) => id.trim()).filter(Boolean)
      : undefined,
    publerPublishedAt: content.cm_publer_published_at || undefined,
    // Publer slot label (MICM-13). Empty (legacy/older posts) → "Standard", the
    // first DEFAULT_PUBLER_LABELS entry. Literal here to keep this transform free
    // of the server-only settings module (it's imported client-side too).
    publerLabel: content.cm_publer_label || 'Standard',
    createdAt: story.created_at,
    lastModified: story.updated_at || story.created_at,
  }
}

/**
 * Content-complete color for LinkedIn posts (MICM-10 definition):
 * green = manually confirmed; yellow = text present but unconfirmed; red = no text.
 * Unlike blog there is no 9-field criterion — a LinkedIn post has only the text field.
 */
function getLinkedinContentCompleteColor(content: any): 'green' | 'yellow' | 'red' | 'gray' {
  if (content?.cm_content_complete) {
    return 'green'
  }
  if (content?.linkedin_text && String(content.linkedin_text).trim()) {
    return 'yellow'
  }
  return 'red'
}

function getContentCompleteColor(content: any): 'green' | 'yellow' | 'red' | 'gray' {
  if (content?.cm_content_complete) {
    return 'green' // Confirmed complete
  }

  // Check required content fields (teaserimage is optional — not generated by the workflow)
  const hasPagetitle = !!content?.pagetitle
  const hasPageintro = !!content?.pageintro
  const hasTeasertitle = !!content?.teasertitle
  const hasAbstract = !!content?.abstract
  const hasReadmoretext = !!content?.readmoretext
  const hasDate = !!content?.date
  const hasHeaderpicture = !!content?.headerpicture?.filename
  const hasBody = Array.isArray(content?.body) && content.body.length > 0

  if (
    hasPagetitle && hasPageintro && hasTeasertitle && hasAbstract &&
    hasReadmoretext && hasDate && hasHeaderpicture && hasBody
  ) {
    return 'yellow' // All fields filled but not confirmed
  }

  return 'red' // Missing content
}

function getPublishedColor(story: any): 'green' | 'yellow' | 'red' | 'gray' {
  // Storyblok Management API: published_at is set when the story has been published
  const isPublished = story.published === true || !!story.published_at
  if (!isPublished) {
    return 'red' // Not published (draft)
  }
  if (story.unpublished_changes) {
    return 'yellow' // Published but has unpublished changes
  }
  return 'green' // Published and up to date
}
