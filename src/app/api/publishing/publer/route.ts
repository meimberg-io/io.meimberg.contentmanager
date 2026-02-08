import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { updatePost } from '@/lib/storyblok-management'
import { 
  getPubAccounts,
  formatPostForChannel,
  createScheduledPosts,
  pollJobStatus,
  isPublerFullyConfigured,
  type PubChannel,
  type PostPublishData
} from '@/lib/publer'

/**
 * POST /api/publishing/publer
 * Publish blog post to Publer (social media scheduler)
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (!isPublerFullyConfigured()) {
    return NextResponse.json({ error: 'Publer not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { 
      storyId, 
      imageUrl, 
      channels,
      title,
      caption,
      tags,
      linkUrl,
      scheduling
    } = body

    console.log('[Publer] Starting publish for story:', storyId)
    console.log('[Publer] Channels:', channels)

    // Get accounts to map channels to account IDs
    const accounts = await getPubAccounts()
    console.log('[Publer] Available accounts:', accounts.map(a => `${a.platform}:${a.id}`))

    // Build post data for formatting
    const postData: PostPublishData = {
      title: title || '',
      caption: caption || '',
      tags: tags || [],
      linkUrl,
      imageUrl
    }

    // Build posts array
    const posts: Array<{ channelPost: any; accountId: string }> = []
    
    for (const channel of channels as PubChannel[]) {
      const account = accounts.find(a => a.platform.toLowerCase() === channel)
      if (!account) {
        console.warn(`[Publer] No account found for channel: ${channel}`)
        continue
      }

      const channelPost = formatPostForChannel(channel, postData)

      if (channel === 'instagram' && linkUrl) {
        channelPost.linkInBio = linkUrl
      }

      if (channel === 'pinterest' && linkUrl) {
        channelPost.link = linkUrl
        channelPost.title = title
        if (account.defaultBoard) {
          channelPost.boardId = account.defaultBoard
        }
      }

      posts.push({
        channelPost,
        accountId: account.id
      })
    }

    if (posts.length === 0) {
      return NextResponse.json({ 
        error: 'No valid accounts found for selected channels' 
      }, { status: 400 })
    }

    // Create scheduled posts
    const result = await createScheduledPosts({
      posts,
      imageUrl,
      imageName: title,
      autoSchedule: true,
      scheduleRange: { startHour: 9, endHour: 21 }
    })

    console.log('[Publer] Schedule job ID:', result.jobId)

    // Poll the scheduling job
    const jobResult = await pollJobStatus(result.jobId, 15)

    if (jobResult?.payload?.failures) {
      const failures = jobResult.payload.failures
      const failedAccounts = Object.values(failures).flat() as any[]
      if (failedAccounts.length > 0) {
        const errorMsg = failedAccounts.map((f: any) => `${f.provider}: ${f.message}`).join('; ')
        throw new Error(`Scheduling failed: ${errorMsg}`)
      }
    }
    if (jobResult?.payload?.error || jobResult?.error) {
      throw new Error(jobResult.payload?.error || jobResult.error || 'Scheduling failed')
    }

    // Update Storyblok
    await updatePost(storyId, {
      cm_socialmedia: true,
      cm_publer_post_ids: result.jobId,
      cm_publer_published_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      channelCount: posts.length,
      message: `Successfully scheduled ${posts.length} posts on Publer`
    })
  } catch (error: any) {
    console.error('[Publer] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
