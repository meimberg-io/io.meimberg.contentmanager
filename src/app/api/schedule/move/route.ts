import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings, updateSettings } from '@/lib/settings-storage'
import { instanceDate, weekStartOf } from '@/lib/schedule-time'
import type { Schedule } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_TZ = 'Europe/Berlin'

/**
 * POST /api/schedule/move — move a slot instance to (slotId, weekStart) (MICM-32).
 * Body: { scheduleId, instanceId, slotId, weekStart }. If the target is occupied by a
 * live (pending/failed) instance, the two assignments are SWAPPED. Replaces the old
 * positional reorder route. Atomic: both mutations happen before the single write.
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { scheduleId, instanceId, slotId, weekStart } = await request.json()
    if (!scheduleId || !instanceId || !slotId || !weekStart) {
      return NextResponse.json({ error: 'scheduleId, instanceId, slotId und weekStart sind erforderlich' }, { status: 400 })
    }

    const settings = await getSettings({ fresh: true })
    const schedules: Schedule[] = Array.isArray(settings.schedules)
      ? JSON.parse(JSON.stringify(settings.schedules))
      : []

    const target = schedules.find((s) => s.id === scheduleId)
    if (!target) return NextResponse.json({ error: 'Schedule nicht gefunden' }, { status: 404 })
    const tz = target.timezone || DEFAULT_TZ

    const inst = target.slotInstances.find((i) => i.id === instanceId)
    if (!inst) return NextResponse.json({ error: 'Instanz nicht gefunden' }, { status: 404 })

    const slot = target.slots.find((s) => s.id === slotId)
    if (!slot) return NextResponse.json({ error: 'Slot nicht gefunden' }, { status: 400 })
    if (weekStartOf(instanceDate(slot, weekStart, tz), tz) !== weekStart) {
      return NextResponse.json({ error: 'weekStart muss ein Montagsdatum (YYYY-MM-DD) sein' }, { status: 400 })
    }

    // Swap with any live occupant of the target slot/week (Drag auf belegten Slot = tauschen).
    const occupant = target.slotInstances.find(
      (i) =>
        i.id !== inst.id &&
        i.slotId === slotId &&
        i.weekStart === weekStart &&
        (i.status === 'pending' || i.status === 'failed'),
    )
    if (occupant) {
      occupant.slotId = inst.slotId
      occupant.weekStart = inst.weekStart
    }
    inst.slotId = slotId
    inst.weekStart = weekStart
    // Rescheduling a failed instance re-arms it (→ pending, error fields cleared) so the
    // engine fires it again — otherwise "drag to reschedule" silently leaves it dead (MICM-35).
    if (inst.status === 'failed') {
      inst.status = 'pending'
      delete inst.errorCount
      delete inst.lastError
      delete inst.lastErrorAt
    }

    await updateSettings({ schedules })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[schedule/move]', error?.message)
    return NextResponse.json({ error: error?.message || 'Verschieben fehlgeschlagen' }, { status: 500 })
  }
}
