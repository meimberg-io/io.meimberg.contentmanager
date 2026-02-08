import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { fetchNewEmails } from '@/lib/mail-inbox'

/**
 * GET /api/import/emails
 * Fetch list of unread emails from the blog inbox
 */
export async function GET() {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const emails = await fetchNewEmails()
    return NextResponse.json({ emails })
  } catch (error: any) {
    console.error('[API /api/import/emails] Error:', error.message)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch emails' 
    }, { status: 500 })
  }
}
