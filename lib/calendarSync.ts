import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCalendarEvents } from './googleCalendar'
import type { Project } from '@/types/projects'

export async function syncCalendarEvents(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<number> {
  const events = await fetchCalendarEvents(startDate, endDate)

  if (events.length === 0) {
    return 0
  }

  // Fetch all projects to find title matches
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title')

  if (projectsError) {
    console.error('[calendarSync] Failed to fetch projects:', projectsError)
  }

  const projectList: Pick<Project, 'id' | 'title'>[] = projects ?? []

  // Build upsert rows
  const rows = events.map((event) => {
    const matchedProject = projectList.find((p) =>
      event.summary.includes(p.title),
    )

    return {
      google_event_id: event.id,
      project_id: matchedProject?.id ?? null,
      title: event.summary,
      start_datetime: event.start,
      end_datetime: event.end,
      synced_at: new Date().toISOString(),
    }
  })

  const { error: upsertError } = await supabase
    .from('calendar_events')
    .upsert(rows, { onConflict: 'google_event_id' })

  if (upsertError) {
    console.error('[calendarSync] upsert failed:', upsertError)
    return 0
  }

  return rows.length
}
