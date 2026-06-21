import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings, updateSettings } from '@/lib/settings-storage'
import { resolveBlogStoryByUuid } from '@/lib/storyblok-management'
import { fetchLinkedinPostsByBlogUuid } from '@/lib/storyblok'
import { nextFreeFutureSlot, instanceDate, weekStartOf } from '@/lib/schedule-time'
import type { Schedule, ScheduleEntryType } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_TZ = 'Europe/Berlin'

/** True if the story (any component) is marked content-complete. */
async function isComplete(uuid: string): Promise<boolean> {
  const story = await resolveBlogStoryByUuid(uuid)
  return story?.content?.cm_content_complete === true
}

/**
 * POST /api/schedule/assign — bind a post to a schedule's slot (MICM-18 / MICM-32).
 * Body: { storyUuid, typ, scheduleId, slotId?, weekStart? }. Content-complete gate: the
 * post (and, for a coupled blog, every attached LinkedIn post) must be content-complete.
 * Without slotId/weekStart the next free future slot is auto-picked; with both, the slot
 * is validated and used. A post lives in at most one instance, so it is first removed
 * from every schedule.
 */
export async function POST(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const { storyUuid, typ, scheduleId, slotId, weekStart } = await request.json()
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

    const settings = await getSettings({ fresh: true })
    const schedules: Schedule[] = Array.isArray(settings.schedules)
      ? JSON.parse(JSON.stringify(settings.schedules))
      : []

    const target = schedules.find((s) => s.id === scheduleId)
    if (!target) return NextResponse.json({ error: 'Schedule nicht gefunden' }, { status: 404 })
    const tz = target.timezone || DEFAULT_TZ

    // A post lives in at most one instance: drop it everywhere, then bind to target.
    for (const s of schedules) s.slotInstances = s.slotInstances.filter((i) => i.storyUuid !== storyUuid)

    let chosenSlotId: string
    let chosenWeekStart: string

    if (slotId && weekStart) {
      // Manual override: validate the slot exists and weekStart is a real Monday.
      const slot = target.slots.find((s) => s.id === slotId)
      if (!slot) return NextResponse.json({ error: 'Slot nicht gefunden' }, { status: 400 })
      if (weekStartOf(instanceDate(slot, weekStart, tz), tz) !== weekStart) {
        return NextResponse.json({ error: 'weekStart muss ein Montagsdatum (YYYY-MM-DD) sein' }, { status: 400 })
      }
      const occupied = target.slotInstances.some(
        (i) => i.slotId === slotId && i.weekStart === weekStart && (i.status === 'pending' || i.status === 'failed'),
      )
      if (occupied) return NextResponse.json({ error: 'Slot ist bereits belegt' }, { status: 409 })
      chosenSlotId = slotId
      chosenWeekStart = weekStart
    } else {
      // Auto: next free future slot of the track.
      const free = nextFreeFutureSlot(target, new Date())
      if (!free) {
        return NextResponse.json({ error: 'Kein freier Slot im Planungshorizont' }, { status: 409 })
      }
      chosenSlotId = free.slotId
      chosenWeekStart = free.weekStart
    }

    target.slotInstances.push({
      id: crypto.randomUUID(),
      slotId: chosenSlotId,
      weekStart: chosenWeekStart,
      storyUuid,
      typ: typ as ScheduleEntryType,
      status: 'pending',
    })

    await updateSettings({ schedules })
    return NextResponse.json({ ok: true, scheduleId: target.id })
  } catch (error: any) {
    console.error('[schedule/assign POST]', error?.message)
    return NextResponse.json({ error: error?.message || 'Einplanen fehlgeschlagen' }, { status: 500 })
  }
}

/**
 * DELETE /api/schedule/assign — remove a post's instance from any schedule (MICM-18 /
 * MICM-32). Body: { storyUuid }. Drops orphaned ("neu zuordnen") instances too. The
 * post stays an unchanged draft.
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

    const settings = await getSettings({ fresh: true })
    const schedules: Schedule[] = Array.isArray(settings.schedules)
      ? JSON.parse(JSON.stringify(settings.schedules))
      : []

    let removed = false
    for (const s of schedules) {
      const before = s.slotInstances.length
      s.slotInstances = s.slotInstances.filter((i) => i.storyUuid !== storyUuid)
      if (s.slotInstances.length !== before) removed = true
    }

    if (removed) await updateSettings({ schedules })
    return NextResponse.json({ ok: true, removed })
  } catch (error: any) {
    console.error('[schedule/assign DELETE]', error?.message)
    return NextResponse.json({ error: error?.message || 'Entfernen fehlgeschlagen' }, { status: 500 })
  }
}
