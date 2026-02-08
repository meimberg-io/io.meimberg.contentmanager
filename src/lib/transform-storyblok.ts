/**
 * Transform Storyblok story data to our BlogPost type
 */

import { BlogPost } from '@/types'

export function transformStoryblokBlog(story: any): BlogPost {
  const content = story.content || {}

  return {
    id: story.uuid,
    storyblokId: String(story.id),
    slug: story.slug || '',
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

function getContentCompleteColor(content: any): 'green' | 'yellow' | 'red' | 'gray' {
  if (content?.cm_content_complete) {
    return 'green' // Confirmed complete
  }

  // Check all 9 required fields
  const hasPagetitle = !!content?.pagetitle
  const hasPageintro = !!content?.pageintro
  const hasTeasertitle = !!content?.teasertitle
  const hasAbstract = !!content?.abstract
  const hasTeaserimage = !!content?.teaserimage?.filename
  const hasReadmoretext = !!content?.readmoretext
  const hasDate = !!content?.date
  const hasHeaderpicture = !!content?.headerpicture?.filename
  const hasBody = Array.isArray(content?.body) && content.body.length > 0

  if (
    hasPagetitle && hasPageintro && hasTeasertitle && hasAbstract &&
    hasTeaserimage && hasReadmoretext && hasDate && hasHeaderpicture && hasBody
  ) {
    return 'yellow' // All fields filled but not confirmed
  }

  return 'red' // Missing content
}

function getPublishedColor(story: any): 'green' | 'yellow' | 'red' | 'gray' {
  if (story.published !== true) {
    return 'red' // Not published (draft or unpublished)
  }
  if (story.unpublished_changes) {
    return 'yellow' // Published but has unpublished changes
  }
  return 'green' // Published and up to date
}
