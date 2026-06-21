/**
 * Shared types + helpers for the two "Geplant" views — the per-track grid
 * (MICM-19) and the merged month calendar (MICM-34). Client-safe: imports only
 * `@/types` and the pure `schedule-time` math, no server modules.
 *
 * `PlanInstance`/`PlanSchedule` mirror the `GET /api/schedule` response shape —
 * keep the field names in sync with `src/app/api/schedule/route.ts`.
 */
import type { Slot, ScheduleEntryType, SlotInstanceStatus } from '@/types'

export interface PlanInstance {
  instanceId: string
  storyUuid: string
  typ: ScheduleEntryType
  status: SlotInstanceStatus
  slotId: string | null
  weekStart: string
  isOrphan: boolean
  /** Derived publish instant (ISO) — null only for orphans. */
  date: string | null
  errorCount?: number
  lastError?: string
  title: string
  slug: string
  storyId: string
  exists: boolean
  published: boolean
}

export interface PlanSchedule {
  id: string
  name: string
  timezone: string
  horizonWeeks: number
  slots: Slot[]
  instances: PlanInstance[]
}

export const DEFAULT_TZ = 'Europe/Berlin'

/** JS `Date.getDay()` convention: 0 = Sonntag … 6 = Samstag. */
export const WEEKDAY_SHORT: Record<number, string> = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 0: 'So' }
export const TYP_LABEL: Record<ScheduleEntryType, string> = { blog: 'Blog', article: 'Artikel', linkedin: 'LinkedIn' }

export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
/** Stable sort key: Monday-first weekday, then time-of-day. */
export const slotSortKey = (s: Slot): number => ((s.weekday + 6) % 7) * 10000 + timeToMinutes(s.time)
export const cellKey = (slotId: string, weekStart: string) => `${slotId}__${weekStart}`

/** Only pending/failed instances are actionable (movable / swap target). */
export const isLive = (i: PlanInstance) => i.status === 'pending' || i.status === 'failed'

/** Link to the entry's editor, or null if the story no longer exists. */
export function entryHref(e: PlanInstance): string | null {
  if (!e.exists) return null
  if (e.typ === 'linkedin') return e.storyId ? `/linkedin/${e.storyId}` : null
  return e.slug ? `/posts/${e.slug}` : null
}

/** POST /api/schedule/move — shared by both views; throws on failure. */
export async function moveInstance(
  scheduleId: string,
  instanceId: string,
  slotId: string,
  weekStart: string,
): Promise<void> {
  const res = await fetch('/api/schedule/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduleId, instanceId, slotId, weekStart }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Verschieben fehlgeschlagen')
}

/**
 * Per-track colour palette for the merged calendar. Class strings are literal so
 * Tailwind's JIT picks them up; `trackColor` indexes by the schedule's position.
 */
export interface TrackColor {
  dot: string
  chip: string
  ring: string
}
export const TRACK_PALETTE: TrackColor[] = [
  { dot: 'bg-blue-400', chip: 'border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25', ring: 'ring-blue-400' },
  { dot: 'bg-violet-400', chip: 'border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/25', ring: 'ring-violet-400' },
  { dot: 'bg-emerald-400', chip: 'border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25', ring: 'ring-emerald-400' },
  { dot: 'bg-amber-400', chip: 'border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25', ring: 'ring-amber-400' },
  { dot: 'bg-pink-400', chip: 'border-pink-500/40 bg-pink-500/15 hover:bg-pink-500/25', ring: 'ring-pink-400' },
  { dot: 'bg-cyan-400', chip: 'border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25', ring: 'ring-cyan-400' },
]
export const trackColor = (index: number): TrackColor => TRACK_PALETTE[((index % TRACK_PALETTE.length) + TRACK_PALETTE.length) % TRACK_PALETTE.length]
