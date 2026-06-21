import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getSettings, updateSettings, saveScheduleTemplates } from '@/lib/settings-storage'

/**
 * GET /api/settings
 * Get current settings
 */
export async function GET() {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const settings = await getSettings()
    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/settings
 * Update settings
 */
export async function PATCH(request: Request) {
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { settings } = body

    if (!settings) {
      return NextResponse.json(
        { error: 'settings object is required' },
        { status: 400 }
      )
    }

    // Schedules are template-only from the editor: merge them server-side so live
    // slotInstances are preserved (MICM-32), never round-tripped from the stale client.
    const { schedules, ...rest } = settings
    let updatedSettings = await updateSettings(rest)
    if (Array.isArray(schedules)) {
      const merged = await saveScheduleTemplates(schedules)
      updatedSettings = { ...updatedSettings, schedules: merged }
    }

    return NextResponse.json({ settings: updatedSettings })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
