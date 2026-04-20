import { createAdminClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/projects/StatusBadge'
import { ProjectStatus } from '@/types/projects'
import Link from 'next/link'
import { getToday, addBusinessDays } from '@/lib/businessDays'

function getWeekRange(): { start: string; end: string } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(monday), end: fmt(sunday) }
}

export default async function ProjectDashboardPage() {
  const supabase = await createAdminClient()

  const todayStr = getToday()
  const warningCutoff = addBusinessDays(todayStr, 2)
  const twoDaysLaterStr = warningCutoff // 撮影準備チェック用（後方互換）

  const [thisWeekResult, shootingDelayedResult, overdueTasksResult, warningTasksResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, shooting_date, status, client:clients(name), assigned_editor:users!assigned_editor_id(name)')
      .gte('shooting_date', getWeekRange().start)
      .lte('shooting_date', getWeekRange().end)
      .is('deleted_at', null)
      .order('shooting_date', { ascending: true }),

    // 撮影準備遅延（撮影のみ・2日以内）
    supabase
      .from('projects')
      .select('id, title, shooting_date, work_type, status, kickoff_done, calendar_done, rental_car_done, hotel_done, transport_reservation_done, equipment_reservation_done, client:clients(name)')
      .eq('work_type', 'shooting_only')
      .eq('status', 'shooting_scheduled')
      .lte('shooting_date', twoDaysLaterStr)
      .is('deleted_at', null),

    // タスク期限超過（編集あり）
    supabase
      .from('tasks')
      .select('id, title, due_date, project:projects!project_id(id, title, work_type, status, deleted_at, client:clients(name))')
      .lt('due_date', todayStr)
      .not('status', 'in', '("done","skipped")')
      .order('due_date', { ascending: true }),

    // タスク期限が迫っている（2営業日以内・今日以降）
    supabase
      .from('tasks')
      .select('id, title, due_date, project:projects!project_id(id, title, work_type, status, deleted_at, client:clients(name))')
      .gte('due_date', todayStr)
      .lte('due_date', warningCutoff)
      .not('status', 'in', '("done","skipped")')
      .order('due_date', { ascending: true }),
  ])

  const thisWeekProjects = thisWeekResult.data ?? []

  // 撮影準備遅延（チェックリスト未完了のもの）
  const shootingDelayedProjects = (shootingDelayedResult.data ?? []).filter((p) =>
    !p.kickoff_done || !p.calendar_done || !p.rental_car_done || !p.hotel_done || !p.transport_reservation_done || !p.equipment_reservation_done
  )

  // タスク期限超過（削除済み案件を除外し、プロジェクト単位でまとめる）
  type OverdueTaskRow = {
    id: string; title: string; due_date: string
    project: { id: string; title: string; work_type: string; status: string; deleted_at: string | null; client: { name: string } | null } | null
  }
  const overdueTaskRows = (overdueTasksResult.data ?? []) as unknown as OverdueTaskRow[]
  const overdueByProject = new Map<string, { project: OverdueTaskRow['project']; tasks: { title: string; due_date: string }[] }>()
  for (const row of overdueTaskRows) {
    const proj = Array.isArray(row.project) ? (row.project as unknown as OverdueTaskRow['project'][])[0] ?? null : row.project
    if (!proj || proj.deleted_at || proj.work_type === 'shooting_only') continue
    if (!overdueByProject.has(proj.id)) overdueByProject.set(proj.id, { project: proj, tasks: [] })
    overdueByProject.get(proj.id)!.tasks.push({ title: row.title, due_date: row.due_date })
  }
  const overdueProjects = Array.from(overdueByProject.values())

  // 期限が迫っている案件（2営業日以内）
  const warningTaskRows = (warningTasksResult.data ?? []) as unknown as OverdueTaskRow[]
  const warningByProject = new Map<string, { project: OverdueTaskRow['project']; tasks: { title: string; due_date: string }[] }>()
  for (const row of warningTaskRows) {
    const proj = Array.isArray(row.project) ? (row.project as unknown as OverdueTaskRow['project'][])[0] ?? null : row.project
    if (!proj || proj.deleted_at || proj.work_type === 'shooting_only') continue
    if (proj.status === 'completed' || proj.status === 'cancelled') continue
    if (!warningByProject.has(proj.id)) warningByProject.set(proj.id, { project: proj, tasks: [] })
    warningByProject.get(proj.id)!.tasks.push({ title: row.title, due_date: row.due_date })
  }
  const warningProjects = Array.from(warningByProject.values())

  const totalDelayed = shootingDelayedProjects.length + overdueProjects.length

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">案件ダッシュボード</h2>

      {/* 遅れている案件 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-500 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            遅れている案件
            <span className="ml-2 text-sm font-normal text-gray-500">({totalDelayed}件)</span>
          </h3>
        </div>

        {totalDelayed === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 italic">
            遅れている案件はありません
          </div>
        ) : (
          <div className="space-y-3">
            {/* 撮影準備遅延 */}
            {shootingDelayedProjects.map((project) => {
              const client = (project.client as unknown) as { name: string } | null
              const missingItems = [
                !project.kickoff_done && 'キックオフMTG',
                !project.calendar_done && 'カレンダー記入',
                !project.rental_car_done && 'レンタカー',
                !project.hotel_done && 'ホテル',
                !project.transport_reservation_done && '飛行機・新幹線',
                !project.equipment_reservation_done && '機材予約',
              ].filter(Boolean).join('・')
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-start gap-4 bg-white p-5 rounded-2xl shadow-sm border-2 border-red-500 hover:border-red-600 hover:shadow-md transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">撮影準備未完了</span>
                      {client && <span className="text-xs text-gray-500">{client.name}</span>}
                    </div>
                    <p className="text-sm font-bold text-gray-900">{project.title}</p>
                    <p className="text-xs text-red-600 mt-0.5">未完了: {missingItems}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-500">撮影日</p>
                    <p className="text-sm font-semibold text-gray-800">{project.shooting_date}</p>
                  </div>
                </Link>
              )
            })}

            {/* タスク期限超過 */}
            {overdueProjects.map(({ project, tasks }) => {
              const client = (project?.client as unknown) as { name: string } | null
              return (
                <Link
                  key={project?.id}
                  href={`/projects/${project?.id}`}
                  className="flex items-start gap-4 bg-white p-5 rounded-2xl shadow-sm border-2 border-red-500 hover:border-red-600 hover:shadow-md transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">タスク期限超過</span>
                      {client && <span className="text-xs text-gray-500">{client.name}</span>}
                    </div>
                    <p className="text-sm font-bold text-gray-900">{project?.title}</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {tasks.slice(0, 3).map((t) => `${t.title}（${t.due_date}）`).join('・')}
                      {tasks.length > 3 && ` 他${tasks.length - 3}件`}
                    </p>
                  </div>
                  <StatusBadge status={project?.status as ProjectStatus} className="shrink-0 mt-1" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 期限が迫っている案件 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-yellow-400 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            期限が迫っている案件
            <span className="ml-2 text-sm font-normal text-gray-500">({warningProjects.length}件)</span>
          </h3>
        </div>

        {warningProjects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 italic">
            期限が迫っている案件はありません
          </div>
        ) : (
          <div className="space-y-3">
            {warningProjects.map(({ project, tasks }) => {
              const client = (project?.client as unknown) as { name: string } | null
              return (
                <Link
                  key={project?.id}
                  href={`/projects/${project?.id}`}
                  className="flex items-start gap-4 bg-white p-5 rounded-2xl shadow-sm border-2 border-yellow-400 hover:border-yellow-500 hover:shadow-md transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">タスク期限間近</span>
                      {client && <span className="text-xs text-gray-500">{client.name}</span>}
                    </div>
                    <p className="text-sm font-bold text-gray-900">{project?.title}</p>
                    <p className="text-xs text-yellow-700 mt-0.5">
                      {tasks.slice(0, 3).map((t) => `${t.title}（${t.due_date}）`).join('・')}
                      {tasks.length > 3 && ` 他${tasks.length - 3}件`}
                    </p>
                  </div>
                  <StatusBadge status={project?.status as ProjectStatus} className="shrink-0 mt-1" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 今週の撮影予定 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-500 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            今週の撮影予定
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({getWeekRange().start} 〜 {getWeekRange().end})
            </span>
          </h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {thisWeekProjects.length === 0 ? (
            <div className="p-10 text-center text-gray-400 italic">今週の撮影予定はありません</div>
          ) : (
            <div>
              {thisWeekProjects.map((project, i) => {
                const client = (project.client as unknown) as { name: string } | null
                const editor = (project.assigned_editor as unknown) as { name: string } | null
                return (
                  <a
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      i !== thisWeekProjects.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-gray-900">{project.title}</span>
                      <span className="text-xs text-gray-400">
                        {client?.name ?? '—'}
                        {editor ? ` / ${editor.name}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={project.status as ProjectStatus} />
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        {project.shooting_date}
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
