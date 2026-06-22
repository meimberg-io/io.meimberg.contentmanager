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
        completed: story.published === true,
        timestamp: story.published_at || undefined,
        color: getPublishedColor(story),
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
  // `published` is the authoritative current state. `published_at` must NOT be used
  // here: Storyblok keeps it set after an unpublish (it equals first_published_at),
  // so a previously-published-then-unpublished story would wrongly read as published.
  const isPublished = story.published === true
  if (!isPublished) {
    return 'red' // Not published (draft or unpublished)
  }
  if (story.unpublished_changes) {
    return 'yellow' // Published but has unpublished changes
  }
  return 'green' // Published and up to date
}

/**
 * Unified publishing-pipeline color for the Content axis (MICM-37).
 *
 * Folds field-completeness + scheduler + publish state into ONE four-phase axis,
 * mirroring the LinkedIn axis (which `buildLinkedinStatusByBlog` already produces
 * as gray → yellow → blue → green):
 *   - red    = required content fields missing
 *   - yellow = content present/complete, not yet scheduled ("in Arbeit")
 *   - blue   = scheduled for publishing (queued, not live yet)
 *   - green  = published (live on the website)
 *
 * `contentColor` is the field-completeness color from `getContentCompleteColor`
 * (green = manually confirmed, yellow = all fields filled, red = missing). For the
 * pipeline both green and yellow mean "content there" → yellow; the manual-confirm
 * distinction is intentionally dropped here.
 */
export function getContentPipelineColor(args: {
  contentColor: 'green' | 'yellow' | 'red' | 'gray' | 'blue'
  published: boolean
  scheduled: boolean
}): 'red' | 'yellow' | 'blue' | 'green' {
  if (args.published) return 'green'
  if (args.scheduled) return 'blue'
  return args.contentColor === 'red' ? 'red' : 'yellow'
}
