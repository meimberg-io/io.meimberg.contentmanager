/**
 * Schedule migration to the relational SlotInstance model (MICM-32).
 *
 * Idempotent + pure → safe to run on every settings read. The legacy shape had a
 * positional `queue` + `lastFiredAt` + a `sidelined` bucket; the new shape has
 * stable-id `slots` + `slotInstances` (the concrete date is derived, never frozen).
 *
 * Backfilled slot ids are DETERMINISTIC (`slot-<weekday>-<time>`, unique per schedule
 * via `validateSchedules`) so repeated reads never churn the ids that instances
 * reference — making lazy "persist on first natural write" safe. Already-normalized
 * schedules pass through unchanged.
 */

import type { Schedule, Slot, SlotInstance, ScheduleEntryType } from '@/types'
import { weekStartOf } from '@/lib/schedule-time'

const DEFAULT_TZ = 'Europe/Berlin'

/** True if the instance is not bound to a current slot of its schedule → "neu zuordnen". */
export function isOrphan(inst: Pick<SlotInstance, 'slotId'>, schedule: Pick<Schedule, 'slots'>): boolean {
  return inst.slotId == null || !schedule.slots.some((s) => s.id === inst.slotId)
}

interface LegacySlot {
  id?: string
  weekday: number
  time: string
}
interface LegacyEntry {
  storyUuid: string
  typ: ScheduleEntryType
  errorCount?: number
  lastError?: string
  lastErrorAt?: string
}
interface LegacySchedule {
  id: string
  name: string
  timezone?: string
  slots?: LegacySlot[]
  slotInstances?: SlotInstance[]
  queue?: LegacyEntry[]
  lastFiredAt?: string | null
  sidelined?: LegacyEntry[]
}

const stableSlotId = (s: LegacySlot): string => s.id || `slot-${s.weekday}-${s.time}`

/** A legacy queue/sidelined entry → an orphaned "neu zuordnen" instance (no slot binding). */
function toOrphanInstance(e: LegacyEntry, now: Date, tz: string): SlotInstance {
  return {
    id: `orphan-${e.storyUuid}`,
    slotId: null,
    weekStart: weekStartOf(now, tz),
    storyUuid: e.storyUuid,
    typ: e.typ,
    status: 'pending',
    // errorCount/lastError intentionally dropped: migrated entries await manual
    // reassignment, so no stale "Fehler (n)" badge.
  }
}

/** Upgrade persisted schedules to the SlotInstance model. Idempotent; pure. */
export function normalizeSchedules(raw: unknown, now: Date = new Date()): Schedule[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s: LegacySchedule): Schedule => {
    const tz = s.timezone || DEFAULT_TZ
    const slots: Slot[] = (s.slots || []).map((sl) => ({ id: stableSlotId(sl), weekday: sl.weekday, time: sl.time }))

    const instances: SlotInstance[] = Array.isArray(s.slotInstances) ? [...s.slotInstances] : []
    // One-time conversion of the legacy buckets (gone after the first write back).
    for (const e of [...(s.queue || []), ...(s.sidelined || [])]) {
      if (!instances.some((i) => i.storyUuid === e.storyUuid)) instances.push(toOrphanInstance(e, now, tz))
    }

    return { id: s.id, name: s.name, timezone: tz, slots, slotInstances: instances }
  })
}
