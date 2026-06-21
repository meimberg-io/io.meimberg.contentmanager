/**
 * Scheduler tick engine (MICM-17 + MICM-20 robustness).
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
 * Robustness (MICM-20):
 *  - Technical publish failure → keep the item at the head, increment errorCount,
 *    do NOT advance lastFiredAt → retried next tick. After RETRY_CAP consecutive
 *    failures the item is moved to `sidelined` and the schedule continues.
 *  - Partial coupled failure (blog live, an attached LinkedIn post fails) → the blog
 *    entry leaves the queue (blog is live), the failed LinkedIn post is sidelined.
 *  - Pruning: heads whose story was published manually or deleted are dropped.
 *  - Read-modify-write against a FRESH config read to minimise clobbering concurrent
 *    UI edits (single-user tool — best-effort, no hard lock).
 */

import type { Schedule, ScheduleQueueEntry } from '@/types'
import { getSettings, updateSettings } from '@/lib/settings-storage'
import { publishPost, getStoryIdByUuid, resolveBlogStoryByUuid } from '@/lib/storyblok-management'
import { fetchLinkedinPostsByBlogUuid } from '@/lib/storyblok'
import { publishLinkedinNow } from '@/lib/linkedin-publish'
import { latestOccurrence, ymdInZone } from '@/lib/schedule-time'

/** Consecutive technical failures before an item is moved to the sidelined bucket. */
const RETRY_CAP = 3

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

type PublishOutcome =
  | { ok: true; failedAttached: { storyUuid: string; error: string }[] }
  | { ok: false; error: string }

/**
 * Run one scheduler tick. Idempotent: re-running within the same slot window does
 * nothing (guarded by `lastFiredAt`). Persists schedule changes once at the end.
 */
export async function runScheduleTick(now: Date = new Date()): Promise<TickResult> {
  // Fresh read so the read-modify-write below works against current data (MICM-20 AK6).
  const settings = await getSettings({ fresh: true })
  const schedules: Schedule[] = Array.isArray(settings.schedules)
    ? JSON.parse(JSON.stringify(settings.schedules))
    : []

  const results: TickEntryResult[] = []
  let changed = false

  for (const schedule of schedules) {
    const base = { scheduleId: schedule.id, scheduleName: schedule.name }
    if (!Array.isArray(schedule.sidelined)) schedule.sidelined = []

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

    // Prune heads whose story was published manually or deleted (MICM-20 AK4).
    if (await pruneStaleHeads(schedule)) changed = true

    if (schedule.queue.length === 0) {
      schedule.lastFiredAt = occ.toISOString()
      changed = true
      results.push({ ...base, fired: false, occurrence: occ.toISOString(), note: 'queue empty, slot lapsed' })
      continue
    }

    const entry = schedule.queue[0]
    const outcome = await publishEntry(entry, occ, schedule.timezone || 'Europe/Berlin')

    if (outcome.ok) {
      schedule.queue = schedule.queue.slice(1)
      schedule.lastFiredAt = occ.toISOString()
      changed = true
      if (outcome.failedAttached.length > 0) {
        for (const f of outcome.failedAttached) {
          schedule.sidelined.push({
            storyUuid: f.storyUuid,
            typ: 'linkedin',
            errorCount: RETRY_CAP,
            lastError: f.error,
            lastErrorAt: now.toISOString(),
          })
        }
        results.push({
          ...base,
          fired: true,
          occurrence: occ.toISOString(),
          entry,
          ok: true,
          error: `Blog live, ${outcome.failedAttached.length} LinkedIn-Post(s) fehlgeschlagen → beiseitegelegt`,
        })
      } else {
        results.push({ ...base, fired: true, occurrence: occ.toISOString(), entry, ok: true })
      }
      continue
    }

    // Technical failure → retry next tick up to RETRY_CAP, then sideline (MICM-20 AK1/AK2).
    entry.errorCount = (entry.errorCount || 0) + 1
    entry.lastError = outcome.error
    entry.lastErrorAt = now.toISOString()
    changed = true

    if (entry.errorCount >= RETRY_CAP) {
      schedule.queue = schedule.queue.slice(1)
      schedule.sidelined.push(entry)
      schedule.lastFiredAt = occ.toISOString()
      results.push({
        ...base,
        fired: false,
        occurrence: occ.toISOString(),
        entry,
        ok: false,
        error: `${outcome.error} (Cap erreicht → beiseitegelegt)`,
      })
    } else {
      // Leave at head; do NOT advance lastFiredAt → retried next tick.
      results.push({
        ...base,
        fired: false,
        occurrence: occ.toISOString(),
        entry,
        ok: false,
        error: `${outcome.error} (Versuch ${entry.errorCount}/${RETRY_CAP})`,
      })
    }
  }

  if (changed) await updateSettings({ schedules })
  return { ranAt: now.toISOString(), results }
}

/** Drop queue heads whose story is already published or deleted (MICM-20 AK4). */
async function pruneStaleHeads(schedule: Schedule): Promise<boolean> {
  let pruned = false
  while (schedule.queue.length > 0) {
    if (!(await isPublishedOrMissing(schedule.queue[0]))) break
    schedule.queue = schedule.queue.slice(1)
    pruned = true
  }
  return pruned
}

async function isPublishedOrMissing(entry: ScheduleQueueEntry): Promise<boolean> {
  try {
    const story = await resolveBlogStoryByUuid(entry.storyUuid)
    if (!story) return true // deleted
    const c = story.content || {}
    if (entry.typ === 'linkedin') return !!c.cm_publer_published_at
    // `published` only: a story unpublished after a prior publish keeps published_at
    // set, but is NOT live — it must stay queued so the scheduler re-publishes it.
    return story.published === true
  } catch {
    return false // on resolve error keep the entry (safer than dropping)
  }
}

/**
 * Publish one queue entry. For a blog/article, publishes the story and then fires
 * its attached, content-complete LinkedIn posts in the same slot (coupling, MICM-14).
 * Returns an outcome rather than throwing so the caller can apply retry/sideline.
 */
async function publishEntry(entry: ScheduleQueueEntry, occ: Date, tz: string): Promise<PublishOutcome> {
  let numericId: number | null
  try {
    numericId = await getStoryIdByUuid(entry.storyUuid)
  } catch (e: any) {
    return { ok: false, error: e?.message || 'ID-Auflösung fehlgeschlagen' }
  }
  if (!numericId) return { ok: false, error: `Story nicht gefunden (uuid ${entry.storyUuid})` }

  if (entry.typ === 'linkedin') {
    try {
      await publishLinkedinNow(String(numericId))
      return { ok: true, failedAttached: [] }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'LinkedIn-Publish fehlgeschlagen' }
    }
  }

  // blog | article: publish the story first (so the LinkedIn 409 guard passes).
  // Set the publish date to the slot date (MICM-30) so RSS/sorting get real dates.
  try {
    await publishPost(String(numericId), { overrideDate: ymdInZone(occ, tz) })
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Blog-Publish fehlgeschlagen' }
  }

  // Blog is live. Fire attached, content-complete LinkedIn posts; collect failures.
  const failedAttached: { storyUuid: string; error: string }[] = []
  try {
    const attached = await fetchLinkedinPostsByBlogUuid(entry.storyUuid)
    for (const li of attached) {
      if (li?.content?.cm_content_complete === true && li?.id) {
        try {
          await publishLinkedinNow(String(li.id))
        } catch (e: any) {
          failedAttached.push({ storyUuid: li.uuid || String(li.id), error: e?.message || 'LinkedIn-Publish fehlgeschlagen' })
        }
      }
    }
  } catch {
    // Couldn't list attached posts — the blog is live, so don't fail the entry.
  }
  return { ok: true, failedAttached }
}
