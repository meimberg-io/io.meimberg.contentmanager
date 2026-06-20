import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { revokeMcpToken } from '@/lib/mcp-tokens'

export const runtime = 'nodejs'

/**
 * DELETE /api/settings/tokens/[id] — revoke (hard-delete) an MCP token. (MICM-31)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { id } = await params
    await revokeMcpToken(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Revoke MCP token error:', error)
    const status = error.message === 'Token nicht gefunden' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
