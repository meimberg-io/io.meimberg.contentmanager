/**
 * Schedule time math (MICM-14 / MICM-32) — pure and client-safe (only `Intl`, no
 * server imports).
 *
 * Concrete publish dates are *derived* from `slot.weekday + slot.time + weekStart`
 * in the schedule's IANA timezone (DST-correct). There is no frozen date and no
 * queue-position projection anymore — `instanceDate` is the single source of truth
 * for "when does this instance go out", shared by the engine, the routes and the UI.
 */

import type { Schedule, Slot } from '@/types'

const DEFAULT_TZ = 'Europe/Berlin'

/** How many weeks ahead the editorial plan + auto-assign consider (MICM-32). */
export const SCHEDULE_HORIZON_WEEKS = 8

const pad2 = (n: number): string => String(n).padStart(2, '0')

// JS getDay(): 0 = Sunday … 6 = Saturday.
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
}

/** Wall-clock parts of `instant` in the given IANA timezone. */
function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  })
  const parts = dtf.formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
  let hour = parseInt(get('hour'), 10)
  if (hour === 24) hour = 0 // some engines emit "24" at midnight
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  }
}

/** Offset of `timeZone` from UTC (ms east of UTC) at the given instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0)
  const instMinute = Math.floor(instant.getTime() / 60000) * 60000
  return asUtc - instMinute
}

/** Convert a wall-clock time in `timeZone` to the corresponding UTC instant (DST-correct). */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  // Estimate the offset from the naive guess, then refine once to settle DST edges.
  let real = naiveUtc - tzOffsetMs(new Date(naiveUtc), timeZone)
  real = naiveUtc - tzOffsetMs(new Date(real), timeZone)
  return new Date(real)
}

/**
 * ISO date ("YYYY-MM-DD") of the Monday of the week `instant` falls in, in `tz`.
 * Monday-first (not ISO calendar weeks — deliberate, MICM-32). JS getDay() has
 * Sunday = 0, so it is remapped to ISO (Mon = 1 … Sun = 7) before stepping back.
 */
export function weekStartOf(instant: Date, timeZone: string = DEFAULT_TZ): string {
  const p = zonedParts(instant, timeZone)
  const isoDow = p.weekday === 0 ? 7 : p.weekday
  const back = isoDow - 1
  // Step whole days from the local-noon anchor so DST (23h/25h) never crosses a date.
  const anchorNoonUtc = Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0)
  const monday = zonedParts(new Date(anchorNoonUtc - back * 86_400_000), timeZone)
  return `${monday.year}-${pad2(monday.month)}-${pad2(monday.day)}`
}

/** The `weekStart` (Monday "YYYY-MM-DD") that is `weeks` weeks after the given one. */
function addWeeks(weekStart: string, weeks: number, timeZone: string): string {
  const [y, mo, d] = weekStart.split('-').map(Number)
  const noonUtc = Date.UTC(y, mo - 1, d, 12, 0, 0)
  return weekStartOf(new Date(noonUtc + weeks * 7 * 86_400_000), timeZone)
}

/**
 * The concrete UTC instant of `slot` (weekday + time) within the week beginning
 * `weekStart`, in `tz` (DST-correct). The single source of truth for an instance's
 * publish date — every caller (engine, routes, UI) goes through here, never re-deriving.
 */
export function instanceDate(
  slot: Pick<Slot, 'weekday' | 'time'>,
  weekStart: string,
  timeZone: string = DEFAULT_TZ,
): Date {
  const [y, mo, d] = weekStart.split('-').map(Number)
  const [h, m] = slot.time.split(':').map(Number)
  const isoTargetDow = slot.weekday === 0 ? 7 : slot.weekday
  // Re-derive the target day's Y/M/D in tz (it can cross a month/DST boundary),
  // then build the real instant from its wall-clock time.
  const mondayNoonUtc = Date.UTC(y, mo - 1, d, 12, 0, 0)
  const dayParts = zonedParts(new Date(mondayNoonUtc + (isoTargetDow - 1) * 86_400_000), timeZone)
  return zonedWallClockToUtc(dayParts.year, dayParts.month, dayParts.day, h || 0, m || 0, timeZone)
}

/**
 * Every template slot × every week in `[thisWeek .. +horizonWeeks)` as derived
 * rows, ascending by date. Empty + occupied alike — the caller subtracts what is
 * already occupied. Used by the editorial-plan grid and auto-assign.
 */
export function deriveUpcomingSlots(
  schedule: Pick<Schedule, 'slots' | 'timezone'>,
  now: Date,
  horizonWeeks: number = SCHEDULE_HORIZON_WEEKS,
): { slotId: string; weekStart: string; date: Date }[] {
  const tz = schedule.timezone || DEFAULT_TZ
  if (!schedule.slots?.length || horizonWeeks <= 0) return []
  const base = weekStartOf(now, tz)
  const out: { slotId: string; weekStart: string; date: Date }[] = []
  for (let w = 0; w < horizonWeeks; w++) {
    const weekStart = addWeeks(base, w, tz)
    for (const slot of schedule.slots) {
      out.push({ slotId: slot.id, weekStart, date: instanceDate(slot, weekStart, tz) })
    }
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime())
  return out
}

/**
 * The first derived slot strictly after `now` not occupied by a live instance
 * (`pending` or `failed` — both hold the slot). null if the horizon is full.
 */
export function nextFreeFutureSlot(
  schedule: Pick<Schedule, 'slots' | 'timezone' | 'slotInstances'>,
  now: Date,
  horizonWeeks: number = SCHEDULE_HORIZON_WEEKS,
): { slotId: string; weekStart: string; date: Date } | null {
  const occupied = new Set(
    (schedule.slotInstances || [])
      .filter((i) => i.status === 'pending' || i.status === 'failed')
      .map((i) => `${i.slotId}__${i.weekStart}`),
  )
  for (const s of deriveUpcomingSlots(schedule, now, horizonWeeks)) {
    if (s.date.getTime() <= now.getTime()) continue
    if (occupied.has(`${s.slotId}__${s.weekStart}`)) continue
    return s
  }
  return null
}

/** Format an instant as "YYYY-MM-DD" in the given timezone (matches the blog `date` field). */
export function ymdInZone(date: Date, timeZone: string = DEFAULT_TZ): string {
  // en-CA renders ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
