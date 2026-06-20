import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { listMcpTokens, createMcpToken } from '@/lib/mcp-tokens'

// crypto (randomBytes/createHash) needs the Node.js runtime.
export const runtime = 'nodejs'

/**
 * GET /api/settings/tokens — list MCP tokens (masked, no hashes). (MICM-31)
 */
export async function GET() {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const tokens = await listMcpTokens()
    return NextResponse.json({ tokens })
  } catch (error: any) {
    console.error('List MCP tokens error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/settings/tokens — create a token. Body: { name }.
 * Returns the plaintext exactly once; only the hash is stored. (MICM-31)
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name : ''
    if (!name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { token, plaintext } = await createMcpToken(name)
    return NextResponse.json({ token, plaintext }, { status: 201 })
  } catch (error: any) {
    console.error('Create MCP token error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
