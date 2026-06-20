import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings, updateSettings } from '@/lib/settings-storage'
import { resolveBlogStoryByUuid } from '@/lib/storyblok-management'
import { fetchLinkedinPostsByBlogUuid } from '@/lib/storyblok'
import type { Schedule, ScheduleEntryType } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** True if the story (any component) is marked content-complete. */
async function isComplete(uuid: string): Promise<boolean> {
  const story = await resolveBlogStoryByUuid(uuid)
  return story?.content?.cm_content_complete === true
}

/**
 * POST /api/schedule/assign — add a post to a schedule's queue (MICM-18).
 * Body: { storyUuid, typ, scheduleId }. Content-complete gate: the post (and, for a
 * coupled blog, every attached LinkedIn post) must be content-complete. A post lives
 * in at most one queue, so it is first removed from any other schedule.
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { storyUuid, typ, scheduleId } = await request.json()
    if (!storyUuid || !typ || !scheduleId) {
      return NextResponse.json({ error: 'storyUuid, typ und scheduleId sind erforderlich' }, { status: 400 })
    }

    // Content-complete gate (MICM-18).
    if (!(await isComplete(storyUuid))) {
      return NextResponse.json({ error: "Beitrag ist nicht als 'content complete' markiert." }, { status: 409 })
    }
    // Coupled blog: all attached LinkedIn posts must be complete too.
    if (typ !== 'linkedin') {
      const attached = await fetchLinkedinPostsByBlogUuid(storyUuid)
      const incomplete = attached.filter((p: any) => p?.content?.cm_content_complete !== true)
      if (incomplete.length > 0) {
        return NextResponse.json(
          { error: `Angehängte(r) LinkedIn-Post(s) noch nicht 'content complete' (${incomplete.length}). Erst dort abschließen.` },
          { status: 409 },
        )
      }
    }

    const settings = await getSettings()
    const schedules: Schedule[] = Array.isArray(settings.schedules)
      ? JSON.parse(JSON.stringify(settings.schedules))
      : []

    const target = schedules.find((s) => s.id === scheduleId)
    if (!target) return NextResponse.json({ error: 'Schedule nicht gefunden' }, { status: 404 })

    // A post lives in at most one queue: drop it everywhere, then append to target.
    for (const s of schedules) s.queue = s.queue.filter((e) => e.storyUuid !== storyUuid)
    target.queue.push({ storyUuid, typ: typ as ScheduleEntryType })

    await updateSettings({ schedules })
    return NextResponse.json({ ok: true, scheduleId: target.id })
  } catch (error: any) {
    console.error('[schedule/assign POST]', error?.message)
    return NextResponse.json({ error: error?.message || 'Einplanen fehlgeschlagen' }, { status: 500 })
  }
}

/**
 * DELETE /api/schedule/assign — remove a post from any schedule queue (MICM-18).
 * Body: { storyUuid }. The post stays an unchanged draft.
 */
export async function DELETE(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { storyUuid } = await request.json()
    if (!storyUuid) return NextResponse.json({ error: 'storyUuid erforderlich' }, { status: 400 })

    const settings = await getSettings()
    const schedules: Schedule[] = Array.isArray(settings.schedules)
      ? JSON.parse(JSON.stringify(settings.schedules))
      : []

    let removed = false
    for (const s of schedules) {
      const before = s.queue.length
      s.queue = s.queue.filter((e) => e.storyUuid !== storyUuid)
      if (s.queue.length !== before) removed = true
    }

    if (removed) await updateSettings({ schedules })
    return NextResponse.json({ ok: true, removed })
  } catch (error: any) {
    console.error('[schedule/assign DELETE]', error?.message)
    return NextResponse.json({ error: error?.message || 'Entfernen fehlgeschlagen' }, { status: 500 })
  }
}
