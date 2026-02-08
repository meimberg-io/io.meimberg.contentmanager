import StoryblokClient from 'storyblok-js-client'
import type { ISbStoriesParams } from '@storyblok/react'

// Create Storyblok client with public token (read-only)
export function getStoryblokApi() {
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN
  
  if (!token) {
    throw new Error('NEXT_PUBLIC_STORYBLOK_TOKEN is not defined')
  }
  
  return new StoryblokClient({
    accessToken: token,
    region: 'eu',
    cache: {
      type: 'none'
    }
  })
}

// Fetch all blog entries
export async function fetchBlogPosts(options?: {
  perPage?: number
  page?: number
  searchQuery?: string
  filters?: {
    contentComplete?: boolean
    socialmedia?: boolean
  }
}) {
  const storyblokApi = getStoryblokApi()
  
  const params: ISbStoriesParams = {
    version: 'draft', // Always use draft to see unpublished posts too
    starts_with: 'b/',
    filter_query: {
      component: {
        in: 'blog'
      }
    },
    per_page: options?.perPage || 100,
    page: options?.page || 1,
    sort_by: 'created_at:desc'
  }

  // Add filters if provided
    if (options?.filters) {
    if (options.filters.contentComplete !== undefined) {
      params.filter_query = {
        ...params.filter_query,
        cm_content_complete: {
          is: options.filters.contentComplete
        }
      }
    }
  }

  const { data } = await storyblokApi.get('cdn/stories', params, { 
    cache: process.env.NEXT_PUBLIC_STORYBLOK_DISABLECACHING ? 'no-cache' : 'default' 
  })
  
  return data
}

// Fetch a single blog post by slug
export async function fetchSinglePost(slug: string) {
  const storyblokApi = getStoryblokApi()
  
  const params: ISbStoriesParams = {
    version: 'draft', // Always draft so we can see unpublished content
  }

  const { data } = await storyblokApi.getStory(`b/${slug}`, params, { 
    cache: process.env.NEXT_PUBLIC_STORYBLOK_DISABLECACHING ? 'no-cache' : 'default' 
  })
  
  return data.story
}

// Fetch blog post by UUID
export async function fetchPostByUuid(uuid: string) {
  const storyblokApi = getStoryblokApi()
  
  const { data } = await storyblokApi.get('cdn/stories', {
    by_uuids: uuid,
    version: 'draft',
  })
  
  return data.stories[0]
}

// Get statistics for dashboard
export async function fetchStatistics() {
  const allPosts = await fetchBlogPosts({ perPage: 1000 })
  const stories = allPosts.stories || []

  return {
    totalPosts: stories.length,
    contentComplete: stories.filter((s: any) => s.content.cm_content_complete).length,
    published: stories.filter((s: any) => !!s.published_at).length,
    publishedPubler: stories.filter((s: any) => s.content.cm_socialmedia).length,
  }
}
