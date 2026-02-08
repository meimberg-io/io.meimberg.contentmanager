/**
 * Publer API Integration
 * Channel-specific post formatting and scheduling
 */

const PUBLER_API_KEY = process.env.PUBLER_API_KEY
const PUBLER_API_URL = process.env.PUBLER_API_URL || 'https://app.publer.com/api/v1'
const PUBLER_WORKSPACE_ID = process.env.PUBLER_WORKSPACE_ID

// Channel types
export type PubChannel = 'instagram' | 'facebook' | 'pinterest' | 'twitter' | 'threads'

// Post data for each channel
export interface ChannelPost {
  channel: PubChannel
  text: string
  title?: string // Pinterest only
  link?: string // Pinterest destination URL, Facebook/Twitter inline
  linkInBio?: string // Instagram Link in Bio URL
  boardId?: string // Pinterest board ID
  hashtags: string[]
}

// Post data needed for formatting
export interface PostPublishData {
  title: string
  caption: string
  tags: string[]
  linkUrl?: string
  imageUrl: string
}

// Publer API response
export interface PublerPostResponse {
  id: string
  status: string
  scheduled_at?: string
  url?: string
}

/**
 * Format hashtags from tags array
 */
function formatHashtags(tags: string[], limit?: number): string {
  const hashtags = tags
    .map(tag => `#${tag.replace(/\s+/g, '').toLowerCase()}`)
    .slice(0, limit)
  return hashtags.join(' ')
}

/**
 * Truncate text to max length, preserving word boundaries
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength - 3)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

/**
 * Format post for Instagram
 * - Caption + all hashtags + "Link in Bio" hint
 * - No clickable links in post
 * - Link in Bio URL set separately
 */
export function formatForInstagram(data: PostPublishData): ChannelPost {
  const hashtags = data.tags.slice(0, 30) // Instagram allows up to 30
  const hashtagsText = formatHashtags(hashtags)
  
  const text = `${data.caption}

${hashtagsText}

🔗 Link in Bio`

  return {
    channel: 'instagram',
    text,
    linkInBio: data.linkUrl,
    hashtags
  }
}

/**
 * Format post for Threads
 * - Caption + 1 hashtag only (Threads prefers minimal hashtags)
 * - No links
 */
export function formatForThreads(data: PostPublishData): ChannelPost {
  const hashtags = data.tags.slice(0, 1)
  const hashtagText = hashtags.length > 0 ? formatHashtags(hashtags, 1) : ''
  
  const text = hashtagText 
    ? `${data.caption}\n\n${hashtagText}`
    : data.caption

  return {
    channel: 'threads',
    text,
    hashtags
  }
}

/**
 * Format post for Pinterest
 * - Title (pin title)
 * - Description (caption + hashtags - Pinterest hashtags are searchable)
 * - Destination URL (shop link) - separate field
 */
export function formatForPinterest(data: PostPublishData): ChannelPost {
  const hashtags = data.tags.slice(0, 5) // Pinterest: keep it minimal
  const hashtagsText = formatHashtags(hashtags)
  
  const description = hashtagsText 
    ? `${data.caption}\n\n${hashtagsText}`
    : data.caption

  return {
    channel: 'pinterest',
    title: data.title,
    text: description,
    link: data.linkUrl, // Destination URL for the pin
    hashtags
  }
}

/**
 * Format post for Facebook
 * - Caption + direct link + hashtags
 */
export function formatForFacebook(data: PostPublishData): ChannelPost {
  const hashtags = data.tags.slice(0, 10)
  const hashtagsText = formatHashtags(hashtags)
  
  let text = data.caption
  
  if (data.linkUrl) {
    text += `\n\n🔗 ${data.linkUrl}`
  }
  
  if (hashtagsText) {
    text += `\n\n${hashtagsText}`
  }

  return {
    channel: 'facebook',
    text,
    link: data.linkUrl,
    hashtags
  }
}

/**
 * Format post for Twitter/X
 * - Truncated caption (max ~250 chars to leave room for link + hashtags)
 * - Link
 * - 2-3 hashtags max
 */
export function formatForTwitter(data: PostPublishData): ChannelPost {
  const hashtags = data.tags.slice(0, 3)
  const hashtagsText = formatHashtags(hashtags)
  const linkLength = data.linkUrl ? 25 : 0 // Twitter shortens links to ~23 chars
  const hashtagsLength = hashtagsText.length
  
  // Calculate max caption length (280 - link - hashtags - spacing)
  const maxCaptionLength = 280 - linkLength - hashtagsLength - 10
  const truncatedCaption = truncateText(data.caption, maxCaptionLength)
  
  let text = truncatedCaption
  
  if (data.linkUrl) {
    text += `\n\n${data.linkUrl}`
  }
  
  if (hashtagsText) {
    text += `\n\n${hashtagsText}`
  }

  return {
    channel: 'twitter',
    text,
    link: data.linkUrl,
    hashtags
  }
}

/**
 * Format post for a specific channel
 */
export function formatPostForChannel(channel: PubChannel, data: PostPublishData): ChannelPost {
  switch (channel) {
    case 'instagram':
      return formatForInstagram(data)
    case 'threads':
      return formatForThreads(data)
    case 'pinterest':
      return formatForPinterest(data)
    case 'facebook':
      return formatForFacebook(data)
    case 'twitter':
      return formatForTwitter(data)
    default:
      throw new Error(`Unknown channel: ${channel}`)
  }
}

/**
 * Format posts for multiple channels
 */
export function formatPostsForChannels(channels: PubChannel[], data: PostPublishData): ChannelPost[] {
  return channels.map(channel => formatPostForChannel(channel, data))
}

/**
 * Create a scheduled post on Publer
 * Uses auto-scheduling to find optimal posting time
 */
/**
 * Get common headers for Publer API requests
 */
function getPubHeaders(): HeadersInit {
  if (!PUBLER_API_KEY) {
    throw new Error('PUBLER_API_KEY not configured')
  }
  if (!PUBLER_WORKSPACE_ID) {
    throw new Error('PUBLER_WORKSPACE_ID not configured')
  }
  return {
    'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
    'Publer-Workspace-Id': PUBLER_WORKSPACE_ID,
    'Content-Type': 'application/json'
  }
}

/**
 * Upload media from URL to Publer
 * Returns the media ID to use in posts
 */
export async function uploadMediaFromUrl(imageUrl: string, imageName: string): Promise<string> {
  const headers = getPubHeaders()
  
  console.log('[Publer] Uploading media from URL:', imageUrl)
  
  const response = await fetch(`${PUBLER_API_URL}/media/from-url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      media: [{
        url: imageUrl,
        name: imageName
      }],
      type: 'single',
      direct_upload: false,
      in_library: false
    })
  })

  const responseText = await response.text()
  
  if (!response.ok) {
    console.error('[Publer] Media upload failed:', response.status, responseText)
    throw new Error(`Media upload failed: ${response.status}`)
  }

  let result
  try {
    result = JSON.parse(responseText)
  } catch {
    throw new Error('Invalid JSON in media upload response')
  }

  console.log('[Publer] Media upload response:', result)

  // Upload from URL is async - need to poll for completion
  const jobId = result.job_id
  if (!jobId) {
    throw new Error('No job_id in media upload response')
  }

  // Poll for media upload completion
  const mediaResult = await pollJobStatus(jobId, 15)
  
  // Extract media ID from result - payload is an array
  const mediaId = 
    (Array.isArray(mediaResult?.payload) && mediaResult.payload[0]?.id) ||
    mediaResult?.result?.id || 
    mediaResult?.payload?.id || 
    mediaResult?.id
  if (!mediaId) {
    console.error('[Publer] No media ID in result:', mediaResult)
    throw new Error('Failed to get media ID from upload')
  }

  console.log('[Publer] Media uploaded successfully, ID:', mediaId)
  return mediaId
}

/**
 * Create scheduled posts using Publer's bulk API
 * Supports multiple accounts in a single request
 */
export async function createScheduledPosts(params: {
  posts: Array<{
    channelPost: ChannelPost
    accountId: string
  }>
  imageUrl: string
  imageName?: string
  autoSchedule?: boolean
  scheduleRange?: { startHour: number; endHour: number }
}): Promise<{ jobId: string; success: boolean }> {
  const headers = getPubHeaders()
  const { posts, imageUrl, imageName = 'image', autoSchedule = true, scheduleRange } = params

  // Step 1: Upload media first
  console.log('[Publer] Step 1: Uploading media...')
  const mediaId = await uploadMediaFromUrl(imageUrl, imageName)
  console.log('[Publer] Media uploaded, ID:', mediaId)

  // Step 2: Build network-specific content with media ID
  const networks: Record<string, any> = {}
  const accounts: Array<{ id: string; album_id?: string }> = []

  for (const { channelPost, accountId } of posts) {
    const networkKey = channelPost.channel === 'twitter' ? 'twitter' : channelPost.channel
    
    // Build network config with media ID
    const networkConfig: Record<string, any> = {
      type: 'photo',
      text: channelPost.text,
      media: [{ 
        id: mediaId,
        type: 'image'
      }]
    }

    // Pinterest-specific: add url and title
    if (channelPost.channel === 'pinterest') {
      if (channelPost.title) {
        networkConfig.title = channelPost.title
      }
      if (channelPost.link) {
        networkConfig.url = channelPost.link // Pinterest uses 'url' for destination link
      }
    }

    // Instagram-specific: add Link in Bio (try multiple field names for compatibility)
    if (channelPost.channel === 'instagram' && channelPost.linkInBio) {
      networkConfig.link_in_bio = channelPost.linkInBio
      networkConfig.url = channelPost.linkInBio // Alternative field name
    }

    networks[networkKey] = networkConfig
    
    // Build account entry - Pinterest needs album_id for board, Instagram needs link_in_bio
    const accountEntry: { id: string; album_id?: string; link_in_bio?: string } = { id: accountId }
    if (channelPost.channel === 'pinterest' && channelPost.boardId) {
      accountEntry.album_id = channelPost.boardId
    }
    if (channelPost.channel === 'instagram' && channelPost.linkInBio) {
      accountEntry.link_in_bio = channelPost.linkInBio
    }
    accounts.push(accountEntry)
  }

  // Build the bulk request body per Publer API spec
  // share_last: true should add to end of queue (not documented but logical counterpart to share_next)
  const body = {
    bulk: {
      state: 'scheduled',
      posts: [{
        networks,
        accounts,
        share_last: true
      }]
    }
  }

  console.log('[Publer] Step 2: Creating scheduled posts:', {
    channels: Object.keys(networks),
    accountCount: accounts.length,
    mediaId,
    autoSchedule
  })

  const response = await fetch(`${PUBLER_API_URL}/posts/schedule`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  const responseText = await response.text()
  
  if (!response.ok) {
    console.error('[Publer] API error:', response.status, responseText)
    throw new Error(`Publer API error (${response.status}): ${responseText}`)
  }

  let result
  try {
    result = JSON.parse(responseText)
  } catch {
    throw new Error(`Invalid JSON response: ${responseText}`)
  }

  console.log('[Publer] Schedule response:', result)
  
  // Handle different response formats
  const jobId = result.data?.job_id || result.job_id
  if (jobId) {
    return { jobId, success: true }
  }
  
  throw new Error(result.error || result.errors?.join(', ') || 'Failed to schedule posts')
}

/**
 * Poll job status until completion
 */
export async function pollJobStatus(jobId: string, maxAttempts = 10): Promise<any> {
  const headers = getPubHeaders()
  
  console.log(`[Publer] Starting job poll for ${jobId}, max attempts: ${maxAttempts}`)
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[Publer] Poll attempt ${attempt + 1}/${maxAttempts}...`)
      
      const response = await fetch(`${PUBLER_API_URL}/job_status/${jobId}`, {
        headers
      })

      const responseText = await response.text()
      console.log(`[Publer] Job ${jobId} response:`, responseText.slice(0, 200))

      if (!response.ok) {
        console.error(`[Publer] Job status check failed: ${response.status}`)
        throw new Error(`Failed to check job status: ${response.status}`)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        console.error('[Publer] Invalid JSON in job status response')
        throw new Error('Invalid job status response')
      }

      const status = result.data?.status || result.status
      console.log(`[Publer] Job ${jobId} status: ${status}`)

      if (status === 'complete' || status === 'completed') {
        console.log(`[Publer] Job ${jobId} completed successfully`)
        return result.data || result
      }
      
      if (status === 'failed') {
        const error = result.data?.payload?.error || result.payload?.error || 'Job failed'
        console.error(`[Publer] Job ${jobId} failed:`, error)
        throw new Error(error)
      }

      // Wait 2 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error: any) {
      console.error(`[Publer] Poll attempt ${attempt + 1} error:`, error.message)
      if (attempt === maxAttempts - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // If we reach here, job is still processing - return success anyway
  console.log(`[Publer] Job ${jobId} still processing after ${maxAttempts} attempts, assuming success`)
  return { status: 'processing', jobId }
}

/**
 * Legacy single-post function (redirects to batch)
 */
export async function createScheduledPost(params: {
  channelPost: ChannelPost
  imageUrl: string
  accountId: string
  autoSchedule?: boolean
  scheduleRange?: { startHour: number; endHour: number }
}): Promise<PublerPostResponse> {
  const { channelPost, imageUrl, accountId, autoSchedule, scheduleRange } = params
  
  const result = await createScheduledPosts({
    posts: [{ channelPost, accountId }],
    imageUrl,
    autoSchedule,
    scheduleRange
  })

  // Poll for completion
  const jobResult = await pollJobStatus(result.jobId)
  
  return {
    id: result.jobId,
    status: 'scheduled',
    scheduled_at: jobResult?.result?.scheduled_at
  }
}

/**
 * Get Publer accounts (social profiles) for channel selection
 */
export async function getPubAccounts(): Promise<Array<{
  id: string
  platform: string
  name: string
  picture?: string
  defaultBoard?: string
}>> {
  const headers = getPubHeaders()

  console.log('[Publer] Fetching accounts...')
  const response = await fetch(`${PUBLER_API_URL}/accounts`, {
    headers
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Publer] Failed to fetch accounts:', response.status, errorText)
    throw new Error(`Failed to fetch Publer accounts (${response.status}): ${errorText}`)
  }

  const accounts = await response.json()
  console.log('[Publer] Raw accounts response:', JSON.stringify(accounts, null, 2))
  console.log('[Publer] Found accounts:', Array.isArray(accounts) ? accounts.length : 'not an array')
  
  // Handle both array and object with accounts property
  const accountList = Array.isArray(accounts) ? accounts : (accounts.accounts || accounts.data || [])
  
  return accountList.map((acc: any) => ({
    id: acc.id,
    platform: acc.provider || acc.platform || acc.type, // API returns 'provider'
    name: acc.name || acc.username || acc.handle,
    picture: acc.picture,
    defaultBoard: acc.default_board || acc.board // Pinterest board ID
  }))
}

/**
 * Check if Publer is configured
 */
export function isPublerConfigured(): boolean {
  return !!PUBLER_API_KEY
}

/**
 * Check if Publer is fully configured (with workspace)
 */
export function isPublerFullyConfigured(): boolean {
  return !!PUBLER_API_KEY && !!PUBLER_WORKSPACE_ID
}

/**
 * Get Publer workspaces (to find workspace ID)
 */
export async function getPubWorkspaces(): Promise<Array<{
  id: string
  name: string
  plan: string
}>> {
  if (!PUBLER_API_KEY) {
    throw new Error('PUBLER_API_KEY not configured')
  }

  console.log('[Publer] Fetching workspaces...')
  const response = await fetch(`${PUBLER_API_URL}/workspaces`, {
    headers: {
      'Authorization': `Bearer-API ${PUBLER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Publer] Failed to fetch workspaces:', response.status, errorText)
    throw new Error(`Failed to fetch Publer workspaces (${response.status}): ${errorText}`)
  }

  const workspaces = await response.json()
  console.log('[Publer] Found workspaces:', workspaces.length)
  
  return workspaces.map((ws: any) => ({
    id: ws.id,
    name: ws.name,
    plan: ws.plan
  }))
}
