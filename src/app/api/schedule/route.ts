import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings } from '@/lib/settings-storage'
import { resolveStoryMetaByUuids, getPostById } from '@/lib/storyblok-management'
import { instanceDate, SCHEDULE_HORIZON_WEEKS } from '@/lib/schedule-time'
import { isOrphan } from '@/lib/scheduler/normalize'
import type { Schedule, SlotInstance } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_TZ = 'Europe/Berlin'

interface StoryMeta {
  title: string
  slug: string
  storyId: string
  exists: boolean
  published: boolean
}

/**
 * GET /api/schedule — the editorial plan for the "Geplant" view (MICM-19 / MICM-32).
 * Returns each schedule's slot template (with ids) + the display horizon + its
 * persisted slot instances, enriched with title/slug/numeric id/exists/published
 * (resolved once per unique story), the DERIVED publish date, status and orphan flag.
 * The client derives the empty future slots from `slots` × `horizonWeeks`.
 */
export async function GET() {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const settings = await getSettings()
    const schedules: Schedule[] = Array.isArray(settings.schedules) ? settings.schedules : []

    const uuids = Array.from(new Set(schedules.flatMap((s) => s.slotInstances.map((i) => i.storyUuid))))

    // ONE batched existence/meta lookup for every instance. The old code
    // fired two Management-API requests PER uuid inside an unbounded Promise.all,
    // which blew past Storyblok's ~5 req/s limit and made a 429'd lookup of a *live*
    // story render identically to a real deletion — the phantom "(gelöscht)" flicker.
    // A uuid absent from this map is genuinely deleted; if the lookup itself throws we
    // let it bubble to the 500 handler rather than fabricate deletions.
    const metaByUuid = await resolveStoryMetaByUuids(uuids)

    // LinkedIn instances are draft-only in Storyblok (native `published` is always
    // false); their real publish state lives in the content field cm_publer_published_at,
    // which the list endpoint omits. Enrich only those — sequentially + spaced — and
    // fall back to the list meta on failure. Never downgrade to "(gelöscht)".
    const linkedinUuids = Array.from(
      new Set(
        schedules.flatMap((s) =>
          s.slotInstances.filter((i) => i.typ === 'linkedin').map((i) => i.storyUuid),
        ),
      ),
    ).filter((u) => metaByUuid.has(u))
    const linkedinExtra = new Map<string, { published: boolean; title?: string }>()
    for (const uuid of linkedinUuids) {
      const m = metaByUuid.get(uuid)
      if (!m?.id) continue
      try {
        const story = await getPostById(m.id)
        const c = story?.content || {}
        linkedinExtra.set(uuid, {
          published: !!c.cm_publer_published_at,
          title: c.pagetitle || c.teasertitle || undefined,
        })
      } catch {
        // keep list-meta fallback
      }
      await new Promise((r) => setTimeout(r, 200))
    }

    const metaFor = (uuid: string, typ: SlotInstance['typ']): StoryMeta => {
      const m = metaByUuid.get(uuid)
      // Absent from the authoritative batched response → genuinely deleted.
      if (!m) return { title: '(gelöscht)', slug: '', storyId: '', exists: false, published: false }
      const extra = linkedinExtra.get(uuid)
      return {
        title: extra?.title || m.name || m.slug || uuid,
        slug: m.slug,
        storyId: m.id,
        exists: true,
        published: typ === 'linkedin' ? extra?.published ?? false : m.published,
      }
    }

    const out = schedules.map((s) => {
      const tz = s.timezone || DEFAULT_TZ
      const slotById = new Map(s.slots.map((sl) => [sl.id, sl]))
      const enrich = (i: SlotInstance) => {
        const orphan = isOrphan(i, s)
        const slot = i.slotId ? slotById.get(i.slotId) : undefined
        return {
          instanceId: i.id,
          storyUuid: i.storyUuid,
          typ: i.typ,
          status: i.status,
          slotId: i.slotId,
          weekStart: i.weekStart,
          isOrphan: orphan,
          date: !orphan && slot ? instanceDate(slot, i.weekStart, tz).toISOString() : null,
          errorCount: i.errorCount || 0,
          lastError: i.lastError,
          lastErrorAt: i.lastErrorAt,
          ...metaFor(i.storyUuid, i.typ),
        }
      }
      return {
        id: s.id,
        name: s.name,
        timezone: tz,
        horizonWeeks: SCHEDULE_HORIZON_WEEKS,
        slots: s.slots,
        instances: s.slotInstances.map(enrich),
      }
    })

    return NextResponse.json({ schedules: out })
  } catch (error: any) {
    console.error('[schedule GET]', error?.message)
    return NextResponse.json({ error: error?.message || 'Plan konnte nicht geladen werden' }, { status: 500 })
  }
}
