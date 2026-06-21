/**
 * Scheduler tick engine (MICM-17 + MICM-20 robustness; MICM-32 instance model).
 *
 * Pure, session-free logic that the cron endpoint (MICM-16) and the admin
 * "run now" button call. Per schedule it fires EVERY due slot instance — each at
 * its OWN derived date — not "one per tick".
 *
 * Design (MICM-32):
 *  - Due = `slotInstances` with `status = pending`, bound to a current slot, whose
 *    derived time (`instanceDate`) is <= now. Processed ascending by date.
 *  - Idempotency is status-based: a published/failed/skipped instance is never
 *    re-selected. No `lastFiredAt`, no `latestOccurrence` backdating.
 *  - A missed slot (cron outage) fires on the next tick at its planned — possibly
 *    past — derived date: deliberate, plan-based backdating, never onto "some" past slot.
 *  - Orphaned instances (slot deleted / never bound) are skipped entirely — never
 *    published, never silently dropped.
 *  - Coupled blog: publish the blog first, then its attached, content-complete
 *    LinkedIn posts (the 409 guard passes because the blog is live).
 *
 * Robustness (MICM-20):
 *  - Technical publish failure → keep the instance `pending`, increment errorCount;
 *    after RETRY_CAP consecutive failures the instance becomes `failed`.
 *  - Partial coupled failure (blog live, an attached LinkedIn post fails) → the blog
 *    instance is `published`; each failed LinkedIn post becomes an orphaned `failed`
 *    instance ("neu zuordnen").
 *  - Story published manually or deleted → instance `skipped`.
 *  - Read-modify-write against a FRESH config read to minimise clobbering concurrent
 *    UI edits (single-user tool — best-effort, no hard lock).
 */

import type { Schedule, Slot, SlotInstance } from '@/types'
import { getSettings, updateSettings } from '@/lib/settings-storage'
import { publishPost, getStoryIdByUuid, resolveBlogStoryByUuid } from '@/lib/storyblok-management'
import { fetchLinkedinPostsByBlogUuid } from '@/lib/storyblok'
import { publishLinkedinNow } from '@/lib/linkedin-publish'
import { instanceDate, ymdInZone } from '@/lib/schedule-time'

/** Consecutive technical failures before an instance is marked failed. */
const RETRY_CAP = 3

const DEFAULT_TZ = 'Europe/Berlin'

export interface TickEntryResult {
  scheduleId: string
  scheduleName: string
  fired: boolean
  occurrence?: string
  entry?: SlotInstance
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

/** A target an instance points at — enough for publish + staleness checks. */
type PublishTarget = Pick<SlotInstance, 'storyUuid' | 'typ'>

/**
 * Run one scheduler tick. Idempotent via per-instance status. Persists schedule
 * changes once at the end.
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
    const tz = schedule.timezone || DEFAULT_TZ
    const slotById = new Map<string, Slot>(schedule.slots.map((s) => [s.id, s]))

    // Due instances: pending, slot-bound (a missing slot = orphan → dropped here),
    // derived time already reached. Ascending so each fires in plan order.
    const due = schedule.slotInstances
      .filter((i) => i.status === 'pending')
      .map((i) => ({ inst: i, slot: i.slotId ? slotById.get(i.slotId) : undefined }))
      .filter((x): x is { inst: SlotInstance; slot: Slot } => !!x.slot)
      .map((x) => ({ inst: x.inst, date: instanceDate(x.slot, x.inst.weekStart, tz) }))
      .filter((x) => x.date.getTime() <= now.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (due.length === 0) {
      results.push({ ...base, fired: false, note: 'keine fällige Instanz' })
      continue
    }

    for (const { inst, date } of due) {
      const occIso = date.toISOString()

      // Story published manually or deleted → skip (generalised pruneStaleHeads, MICM-20 AK4).
      if (await isPublishedOrMissing(inst)) {
        inst.status = 'skipped'
        changed = true
        results.push({ ...base, fired: false, occurrence: occIso, entry: inst, note: 'übersprungen (bereits veröffentlicht/gelöscht)' })
        continue
      }

      const outcome = await publishEntry(inst, date, tz)

      if (outcome.ok) {
        inst.status = 'published'
        delete inst.errorCount
        delete inst.lastError
        delete inst.lastErrorAt
        changed = true
        if (outcome.failedAttached.length > 0) {
          for (const f of outcome.failedAttached) {
            schedule.slotInstances.push({
              id: `orphan-${f.storyUuid}`,
              slotId: null,
              weekStart: inst.weekStart,
              storyUuid: f.storyUuid,
              typ: 'linkedin',
              status: 'failed',
              errorCount: RETRY_CAP,
              lastError: f.error,
              lastErrorAt: now.toISOString(),
            })
          }
          results.push({
            ...base,
            fired: true,
            occurrence: occIso,
            entry: inst,
            ok: true,
            error: `Blog live, ${outcome.failedAttached.length} LinkedIn-Post(s) fehlgeschlagen → neu zuordnen`,
          })
        } else {
          results.push({ ...base, fired: true, occurrence: occIso, entry: inst, ok: true })
        }
        continue
      }

      // Technical failure → retry next tick up to RETRY_CAP, then mark failed (MICM-20 AK1/AK2).
      inst.errorCount = (inst.errorCount || 0) + 1
      inst.lastError = outcome.error
      inst.lastErrorAt = now.toISOString()
      changed = true

      if (inst.errorCount >= RETRY_CAP) {
        inst.status = 'failed'
        results.push({
          ...base,
          fired: false,
          occurrence: occIso,
          entry: inst,
          ok: false,
          error: `${outcome.error} (Cap erreicht → fehlgeschlagen)`,
        })
      } else {
        // Leave pending → retried next tick.
        results.push({
          ...base,
          fired: false,
          occurrence: occIso,
          entry: inst,
          ok: false,
          error: `${outcome.error} (Versuch ${inst.errorCount}/${RETRY_CAP})`,
        })
      }
    }
  }

  if (changed) await updateSettings({ schedules })
  return { ranAt: now.toISOString(), results }
}

/** True if the instance's story is already published or deleted (MICM-20 AK4). */
async function isPublishedOrMissing(entry: PublishTarget): Promise<boolean> {
  try {
    const story = await resolveBlogStoryByUuid(entry.storyUuid)
    if (!story) return true // deleted
    const c = story.content || {}
    if (entry.typ === 'linkedin') return !!c.cm_publer_published_at
    // `published` only: a story unpublished after a prior publish keeps published_at
    // set, but is NOT live — it must stay schedulable so the engine re-publishes it.
    return story.published === true
  } catch {
    return false // on resolve error keep the instance (safer than dropping)
  }
}

/**
 * Publish one instance's story. For a blog/article, publishes the story and then
 * fires its attached, content-complete LinkedIn posts in the same slot (coupling,
 * MICM-14). Returns an outcome rather than throwing so the caller can retry/mark failed.
 */
async function publishEntry(entry: PublishTarget, occ: Date, tz: string): Promise<PublishOutcome> {
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
    // Couldn't list attached posts — the blog is live, so don't fail the instance.
  }
  return { ok: true, failedAttached }
}
