import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { requireAuth } from '@/lib/auth-guard'
import { runScheduleTick } from '@/lib/scheduler/tick'

// Needs the Node.js runtime (crypto + the management-token publish path).
export const runtime = 'nodejs'
// Mutating trigger — never cache.
export const dynamic = 'force-dynamic'

/** Constant-time string compare (hash both to equal-length buffers first). */
function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * POST /api/cron/tick — run one scheduler tick (MICM-16).
 *
 * Two auth modes:
 *  - Headless cron (ansible-managed on the server): `Authorization: Bearer <CRON_SECRET>`.
 *  - Admin "run now" button: a logged-in session (requireAuth) — no secret needed.
 *
 * The path is intentionally NOT under any middleware-protected prefix
 * (/api/posts, /api/linkedin, /api/publishing, /api/import, /api/ai), so the bearer
 * path is reachable without a NextAuth session; this handler is the only gate.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization') || ''
  const bearerOk = !!secret && constantTimeEquals(authHeader, `Bearer ${secret}`)

  if (!bearerOk) {
    // Fall back to session auth (admin "run now" button).
    try {
      await requireAuth()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await runScheduleTick()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Scheduler] tick failed:', error?.message)
    return NextResponse.json({ error: error?.message || 'tick failed' }, { status: 500 })
  }
}
