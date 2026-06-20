/**
 * Scheduler tick engine (MICM-17).
 *
 * Pure, session-free logic that the cron endpoint (MICM-16) and the admin
 * "run now" button call. Per schedule it finds the most recent due slot
 * (Europe/Berlin, DST-correct, via schedule-time), and if the queue is non-empty
 * publishes the queue head, removes it, and advances `lastFiredAt`.
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
import { latestOccurrence } from '@/lib/schedule-time'

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
