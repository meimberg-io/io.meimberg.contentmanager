import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings, updateSettings } from '@/lib/settings-storage'
import type { Schedule } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/schedule/reorder — reorder one schedule's queue (MICM-19).
 * Body: { scheduleId, orderedUuids: string[] }. Targeted read-modify-write so it
 * doesn't clobber other schedules or lastFiredAt. Entries not present in the
 * supplied order (e.g. a concurrent add) are preserved at the end.
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { scheduleId, orderedUuids } = await request.json()
    if (!scheduleId || !Array.isArray(orderedUuids)) {
      return NextResponse.json({ error: 'scheduleId und orderedUuids[] erforderlich' }, { status: 400 })
    }

    const settings = await getSettings()
    const schedules: Schedule[] = Array.isArray(settings.schedules)
      ? JSON.parse(JSON.stringify(settings.schedules))
      : []

    const target = schedules.find((s) => s.id === scheduleId)
    if (!target) return NextResponse.json({ error: 'Schedule nicht gefunden' }, { status: 404 })

    const byUuid = new Map(target.queue.map((e) => [e.storyUuid, e]))
    const reordered: typeof target.queue = []
    for (const uuid of orderedUuids as string[]) {
      const entry = byUuid.get(uuid)
      if (entry) {
        reordered.push(entry)
        byUuid.delete(uuid)
      }
    }
    // Preserve any leftover entries (not in the supplied order) in their original order.
    for (const entry of target.queue) {
      if (byUuid.has(entry.storyUuid)) reordered.push(entry)
    }
    target.queue = reordered

    await updateSettings({ schedules })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[schedule/reorder]', error?.message)
    return NextResponse.json({ error: error?.message || 'Reorder fehlgeschlagen' }, { status: 500 })
  }
}
