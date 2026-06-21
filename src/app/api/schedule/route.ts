import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings } from '@/lib/settings-storage'
import { resolveBlogStoryByUuid } from '@/lib/storyblok-management'
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
    const meta = new Map<string, StoryMeta>()

    await Promise.all(
      uuids.map(async (uuid) => {
        try {
          const story = await resolveBlogStoryByUuid(uuid)
          if (!story) {
            meta.set(uuid, { title: '(gelöscht)', slug: '', storyId: '', exists: false, published: false })
            return
          }
          const c = story.content || {}
          const isLinkedin = c.component === 'linkedin_post'
          const title = c.pagetitle || c.teasertitle || story.name || story.slug || uuid
          const published = isLinkedin ? !!c.cm_publer_published_at : story.published === true
          meta.set(uuid, { title, slug: story.slug || '', storyId: String(story.id || ''), exists: true, published })
        } catch {
          meta.set(uuid, { title: '(unbekannt)', slug: '', storyId: '', exists: false, published: false })
        }
      }),
    )

    const fallback: StoryMeta = { title: '', slug: '', storyId: '', exists: false, published: false }

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
          ...(meta.get(i.storyUuid) || { ...fallback, title: i.storyUuid }),
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
