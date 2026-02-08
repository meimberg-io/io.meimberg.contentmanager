import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { fetchEmailWithAttachments, deleteEmail } from '@/lib/mail-inbox'
import { createPost } from '@/lib/storyblok-management'

/**
 * POST /api/import/process
 * Import selected email(s) as blog posts
 * Body: { emailIds: string[] }
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const emailIds: string[] = body.emailIds || body.uids // support both for compat

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'No email IDs provided' }, { status: 400 })
    }

    const results: Array<{
      emailId: string
      success: boolean
      postId?: string
      slug?: string
      error?: string
    }> = []

    for (const emailId of emailIds) {
      try {
        // Fetch email with attachments
        const email = await fetchEmailWithAttachments(String(emailId))

        // Extract source material from attachments
        // Expect two text attachments: raw transcription and summary
        let sourceRaw = ''
        let sourceSummarized = ''

        if (email.attachments.length >= 2) {
          // Try to identify which is raw and which is summary
          // Convention: first is transcription, second is summary
          // (We can refine this later based on actual Plaud file formats)
          sourceRaw = email.attachments[0].content
          sourceSummarized = email.attachments[1].content
        } else if (email.attachments.length === 1) {
          // Only one attachment - treat as raw transcription
          sourceRaw = email.attachments[0].content
        }

        // If no attachments, use email body as source
        if (!sourceRaw && email.body) {
          sourceRaw = email.body
        }

        // Create blog post in Storyblok
        const postName = email.subject || `Blog Post ${new Date().toISOString().split('T')[0]}`
        
        const result = await createPost({
          name: postName,
          pagetitle: '',
          pageintro: '',
          date: email.date.split('T')[0], // Just the date part
          abstract: '',
          teasertitle: '',
          readmoretext: '',
          cm_source_raw: sourceRaw,
          cm_source_summarized: sourceSummarized,
        })

        // TODO: Re-enable after testing is complete
        // Delete email after successful import
        // await deleteEmail(String(emailId))

        // Rate limit delay for Storyblok
        await new Promise(resolve => setTimeout(resolve, 200))

        results.push({
          emailId: String(emailId),
          success: true,
          postId: result.story?.uuid,
          slug: result.story?.slug,
        })
      } catch (error: any) {
        console.error(`Failed to import email ${emailId}:`, error)
        results.push({
          emailId: String(emailId),
          success: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('[API /api/import/process] Error:', error.message)
    return NextResponse.json({ 
      error: error.message || 'Failed to process emails' 
    }, { status: 500 })
  }
}
