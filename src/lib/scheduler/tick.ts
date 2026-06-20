/**
 * Scheduler tick engine (MICM-17).
 *
 * Pure, session-free logic that the cron endpoint (MICM-16) and the admin
 * "run now" button call. Per schedule it finds the most recent due slot
 * (Europe/Berlin, DST-correct), and if the queue is non-empty publishes the
 * queue head, removes it, and advances `lastFiredAt`.
 *
 * Design decisions (Epic MICM-14):
 *  - Max 1 publish per schedule per tick.
 *  - "Gepaced fortsetzen": older missed slots are NOT replayed — only the most
 *    recent due slot is acted on, so an outage shifts the series, no burst.
 *  - Empty queue at a due slot → the slot lapses (lastFiredAt advances).
 *  - Coupled blog: publish the blog first, then fire its attached, content-complete
 *    LinkedIn posts (the 409 guard then passes because the blog is live).
 *
 * Failure handling here is intentionally minimal (leave the item at the head, do
 * not advance lastFiredAt → retried next tick). Retry caps, sidelining, pruning and
 * alerting are added in MICM-20.
 */

import type { Schedule, ScheduleQueueEntry } from '@/types'
import { getSettings, updateSettings } from '@/lib/settings-storage'
import { publishPost, getStoryIdByUuid } from '@/lib/storyblok-management'
import { fetchLinkedinPostsByBlogUuid } from '@/lib/storyblok'
import { publishLinkedinNow } from '@/lib/linkedin-publish'

const DEFAULT_TZ = 'Europe/Berlin'

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** JS getDay(): 0 = Sunday … 6 = Saturday. */
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
 * The most recent slot occurrence at or before `now`, across all of a schedule's
 * weekly slots. Returns null if the schedule has no slots.
 */
export function latestOccurrence(now: Date, schedule: Schedule): Date | null {
  const tz = schedule.timezone || DEFAULT_TZ
  if (!schedule.slots?.length) return null

  const bn = zonedParts(now, tz)
  // Anchor at local noon "today" so day-by-day iteration stays on stable calendar days.
  const anchor = Date.UTC(bn.year, bn.month - 1, bn.day, 12, 0, 0)

  let best: number | null = null
  for (const slot of schedule.slots) {
    const [h, m] = slot.time.split(':').map(Number)
    for (let dayBack = 0; dayBack <= 7; dayBack++) {
      const dp = zonedParts(new Date(anchor - dayBack * 86_400_000), tz)
      if (dp.weekday !== slot.weekday) continue
      const occ = zonedWallClockToUtc(dp.year, dp.month, dp.day, h || 0, m || 0, tz).getTime()
      if (occ <= now.getTime()) {
        if (best === null || occ > best) best = occ
        break // most recent occurrence for this slot found
      }
    }
  }
  return best === null ? null : new Date(best)
}

export interface TickEntryResult {
  scheduleId: string
  scheduleName: string
  fired: boolean
  occurrence?: string
  entry?: ScheduleQueueEntry
  ok?: boolean
  error?: string
  note?: string
}

export interface TickResult {
  ranAt: string
  results: TickEntryResult[]
}

/**
 * Run one scheduler tick. Idempotent: re-running within the same slot window does
 * nothing (guarded by `lastFiredAt`). Persists schedule changes once at the end.
 */
export async function runScheduleTick(now: Date = new Date()): Promise<TickResult> {
  const settings = await getSettings()
  // Deep-clone so we never mutate the (cached) config object in place.
  const schedules: Schedule[] = Array.isArray(settings.schedules)
    ? JSON.parse(JSON.stringify(settings.schedules))
    : []

  const results: TickEntryResult[] = []
  let changed = false

  for (const schedule of schedules) {
    const base = { scheduleId: schedule.id, scheduleName: schedule.name }
    const occ = latestOccurrence(now, schedule)

    if (!occ) {
      results.push({ ...base, fired: false, note: 'no due slot' })
      continue
    }

    const lastFired = schedule.lastFiredAt ? new Date(schedule.lastFiredAt).getTime() : 0
    if (occ.getTime() <= lastFired) {
      results.push({ ...base, fired: false, note: 'already processed' })
      continue
    }

    // A slot is due. Gepaced: act on the most recent due slot only, max 1 publish/tick.
    if (schedule.queue.length === 0) {
      schedule.lastFiredAt = occ.toISOString()
      changed = true
      results.push({ ...base, fired: false, occurrence: occ.toISOString(), note: 'queue empty, slot lapsed' })
      continue
    }

    const entry = schedule.queue[0]
    try {
      await publishEntry(entry)
      schedule.queue = schedule.queue.slice(1)
      schedule.lastFiredAt = occ.toISOString()
      changed = true
      results.push({ ...base, fired: true, occurrence: occ.toISOString(), entry, ok: true })
    } catch (err: any) {
      // Leave the item at the head, do NOT advance lastFiredAt → retried next tick.
      // Retry cap / sidelining / alerting is added in MICM-20.
      results.push({
        ...base,
        fired: false,
        occurrence: occ.toISOString(),
        entry,
        ok: false,
        error: err?.message || String(err),
      })
    }
  }

  if (changed) {
    await updateSettings({ schedules })
  }

  return { ranAt: now.toISOString(), results }
}

/**
 * Publish one queue entry. For a blog/article, publishes the story and then fires
 * its attached, content-complete LinkedIn posts in the same slot (coupling, MICM-14).
 */
async function publishEntry(entry: ScheduleQueueEntry): Promise<void> {
  const numericId = await getStoryIdByUuid(entry.storyUuid)
  if (!numericId) throw new Error(`Story not found for uuid ${entry.storyUuid}`)

  if (entry.typ === 'linkedin') {
    await publishLinkedinNow(String(numericId))
    return
  }

  // blog | article: blog first (now live → the LinkedIn 409 guard passes), then
  // fire all attached LinkedIn posts that are marked content-complete.
  await publishPost(String(numericId))

  const attached = await fetchLinkedinPostsByBlogUuid(entry.storyUuid)
  for (const li of attached) {
    if (li?.content?.cm_content_complete === true && li?.id) {
      await publishLinkedinNow(String(li.id))
    }
  }
}
