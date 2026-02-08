import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getPubAccounts, isPublerFullyConfigured, isPublerConfigured } from '@/lib/publer'

/**
 * GET /api/publishing/publer/accounts
 * Get connected Publer accounts (social profiles)
 */
export async function GET() {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // Check configuration
  if (!isPublerConfigured()) {
    console.log('[Publer Accounts] API key not configured')
    return NextResponse.json({ 
      error: 'Publer API key not configured',
      accounts: [] 
    })
  }

  if (!isPublerFullyConfigured()) {
    console.log('[Publer Accounts] Workspace ID not configured')
    return NextResponse.json({ 
      error: 'Publer workspace not configured',
      accounts: [] 
    })
  }

  try {
    console.log('[Publer Accounts] Fetching accounts...')
    const accounts = await getPubAccounts()
    console.log('[Publer Accounts] Found:', accounts.length)
    
    return NextResponse.json({
      accounts,
      count: accounts.length
    })
  } catch (error: any) {
    console.error('[Publer Accounts] Error:', error.message)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch accounts',
      accounts: []
    }, { status: 500 })
  }
}
