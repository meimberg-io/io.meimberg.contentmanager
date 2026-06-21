import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings } from '@/lib/settings-storage'
import { resolveBlogStoryByUuid } from '@/lib/storyblok-management'
import type { Schedule, ScheduleQueueEntry } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface StoryMeta {
  title: string
  slug: string
  storyId: string
  exists: boolean
  published: boolean
}

/**
 * GET /api/schedule — the editorial plan for the "Geplant" view (MICM-19 + MICM-20).
 * Returns each schedule with its queue + sidelined entries, enriched with title +
 * slug + numeric id + exists/published flags (resolved once per unique story) and
 * any error state. Projected dates are computed client-side from the slots.
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

    const uuids = Array.from(
      new Set(schedules.flatMap((s) => [...s.queue, ...(s.sidelined || [])].map((e) => e.storyUuid))),
    )
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
          const published = isLinkedin
            ? !!c.cm_publer_published_at
            : story.published === true
          meta.set(uuid, { title, slug: story.slug || '', storyId: String(story.id || ''), exists: true, published })
        } catch {
          meta.set(uuid, { title: '(unbekannt)', slug: '', storyId: '', exists: false, published: false })
        }
      }),
    )

    const fallback: StoryMeta = { title: '', slug: '', storyId: '', exists: false, published: false }
    const enrich = (e: ScheduleQueueEntry) => ({
      storyUuid: e.storyUuid,
      typ: e.typ,
      errorCount: e.errorCount || 0,
      lastError: e.lastError,
      lastErrorAt: e.lastErrorAt,
      ...(meta.get(e.storyUuid) || { ...fallback, title: e.storyUuid }),
    })

    const out = schedules.map((s) => ({
      id: s.id,
      name: s.name,
      timezone: s.timezone,
      slots: s.slots,
      entries: s.queue.map(enrich),
      sidelined: (s.sidelined || []).map(enrich),
    }))

    return NextResponse.json({ schedules: out })
  } catch (error: any) {
    console.error('[schedule GET]', error?.message)
    return NextResponse.json({ error: error?.message || 'Plan konnte nicht geladen werden' }, { status: 500 })
  }
}
