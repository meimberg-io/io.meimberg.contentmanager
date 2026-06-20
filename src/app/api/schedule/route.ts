import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings } from '@/lib/settings-storage'
import { resolveBlogStoryByUuid } from '@/lib/storyblok-management'
import type { Schedule } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/schedule — the editorial plan for the "Geplant" view (MICM-19).
 * Returns each schedule with its queue entries enriched with title + slug +
 * numeric id + exists/published flags (resolved once per unique story). Projected
 * dates are computed client-side from the slots.
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

    const uuids = Array.from(new Set(schedules.flatMap((s) => s.queue.map((e) => e.storyUuid))))
    const meta = new Map<string, { title: string; slug: string; storyId: string; exists: boolean; published: boolean }>()

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
            : story.published === true || !!story.published_at
          meta.set(uuid, { title, slug: story.slug || '', storyId: String(story.id || ''), exists: true, published })
        } catch {
          meta.set(uuid, { title: '(unbekannt)', slug: '', storyId: '', exists: false, published: false })
        }
      }),
    )

    const out = schedules.map((s) => ({
      id: s.id,
      name: s.name,
      timezone: s.timezone,
      slots: s.slots,
      entries: s.queue.map((e) => ({
        storyUuid: e.storyUuid,
        typ: e.typ,
        ...(meta.get(e.storyUuid) || { title: e.storyUuid, slug: '', storyId: '', exists: false, published: false }),
      })),
    }))

    return NextResponse.json({ schedules: out })
  } catch (error: any) {
    console.error('[schedule GET]', error?.message)
    return NextResponse.json({ error: error?.message || 'Plan konnte nicht geladen werden' }, { status: 500 })
  }
}
