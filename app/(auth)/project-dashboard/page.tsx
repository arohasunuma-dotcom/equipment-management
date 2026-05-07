import { createAdminClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/projects/StatusBadge'
import { ProjectStatus } from '@/types/projects'
import Link from 'next/link'
import { getToday, addBusinessDays, isWithin2BusinessDays } from '@/lib/businessDays'
import { MemoEditor } from '@/components/projects/MemoEditor'
import { YtAccountMemoEditor } from '@/components/youtube/YtAccountMemoEditor'

const YT_MILESTONE_LABELS: Record<string, string> = {
  script_draft: '撮影台本初稿',
  script_fb: '台本FB',
  script_client: '台本先方提出',
  shooting: '撮影日',
  footage_share: '撮影素材共有',
  internal_draft: '社内初稿',
  internal_fb: '社内FB',
  client_first_draft: '先方初稿提出',
  client_fb: '先方FB',
  internal_v2: '社内第２稿',
  client_revision: '修正稿提出',
  client_final: '先方最終確認',
  owner_check: 'お施主様チェック',
  delivery: '納品日',
  thumbnail: 'サムネ作成日',
}

function getWeekRange(): { start: string; end: string } {
  // JST (UTC+9) で今日の曜日・日付を計算
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayJST = nowJST.toISOString().split('T')[0] // YYYY-MM-DD in JST
  const dayOfWeek = nowJST.getUTCDay() // UTCDay of JST-adjusted date
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const base = new Date(todayJST + 'T00:00:00Z')
  const monday = new Date(base)
  monday.setUTCDate(base.getUTCDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(monday), end: fmt(sunday) }
}

export default async function ProjectDashboardPage() {
  const supabase = await createAdminClient()

  const todayStr = getToday()
  const warningCutoff = addBusinessDays(todayStr, 2)
  const twoDaysLaterStr = warningCutoff // 撮影準備チェック用（後方互換）

  const weekRange = getWeekRange()

  const [thisWeekResult, thisWeekBatchResult, shootingDelayedResult, overdueTasksResult, warningTasksResult, youtubeSchedulesResult] = await Promise.all([
    // projects.shooting_date ベース
    supabase
      .from('projects')
      .select('id, title, shooting_date, status, memo, client:clients(name), assigned_editor:users!assigned_editor_id(name)')
      .gte('shooting_date', weekRange.start)
      .lte('shooting_date', weekRange.end)
      .is('deleted_at', null)
      .order('shooting_date', { ascending: true }),

    // task_batches.shooting_date ベース（projects.shooting_dateがNULLの場合の補完）
    supabase
      .from('task_batches')
      .select('shooting_date, project:projects!project_id(id, title, status, memo, deleted_at, client:clients(name), assigned_editor:users!assigned_editor_id(name))')
      .gte('shooting_date', weekRange.start)
      .lte('shooting_date', weekRange.end),

    // 撮影準備チェック未完了（撮影あり案件・撮影日が2営業日以内または超過）
    supabase
      .from('projects')
      .select('id, title, shooting_date, work_type, status, memo, kickoff_done, calendar_done, rental_car_done, hotel_done, transport_reservation_done, equipment_reservation_done, client:clients(name)')
      .in('work_type', ['shooting_only', 'shooting_and_editing'])
      .eq('status', 'shooting_scheduled')
      .lte('shooting_date', twoDaysLaterStr)
      .is('deleted_at', null),

    // タスク期限超過（編集あり）
    supabase
      .from('tasks')
      .select('id, title, due_date, project:projects!project_id(id, title, work_type, status, memo, deleted_at, client:clients(name))')
      .lt('due_date', todayStr)
      .not('status', 'in', '("done","skipped")')
      .order('due_date', { ascending: true }),

    // タスク期限が迫っている（2営業日以内・今日以降）
    supabase
      .from('tasks')
      .select('id, title, due_date, project:projects!project_id(id, title, work_type, status, memo, deleted_at, client:clients(name))')
      .gte('due_date', todayStr)
      .lte('due_date', warningCutoff)
      .not('status', 'in', '("done","skipped")')
      .order('due_date', { ascending: true }),

    // YouTubeマイルストーン（長尺・未投稿）
    supabase
      .from('youtube_schedules')
      .select('id, content_type, post_date, milestones, youtube_account_id, account:youtube_accounts!youtube_account_id(id, channel_name, notes)')
      .not('status', 'eq', 'posted')
      .eq('video_length', 'long')
      .not('milestones', 'is', null),
  ])

  // projects.shooting_date と task_batches.shooting_date を統合（重複排除）
  type WeekProject = { id: string; title: string; shooting_date: string | null; status: string; memo: string | null; client: { name: string } | null; assigned_editor: { name: string } | null }
  const weekProjectMap = new Map<string, WeekProject>()

  for (const p of (thisWeekResult.data ?? [])) {
    const client = (p.client as unknown) as { name: string } | null
    const editor = (p.assigned_editor as unknown) as { name: string } | null
    weekProjectMap.set(p.id, { id: p.id, title: p.title, shooting_date: p.shooting_date, status: p.status, memo: (p as unknown as { memo?: string | null }).memo ?? null, client, assigned_editor: editor })
  }

  type BatchRow = { shooting_date: string | null; project: { id: string; title: string; status: string; memo?: string | null; deleted_at: string | null; client: { name: string } | null; assigned_editor: { name: string } | null } | null }
  for (const row of (thisWeekBatchResult.data ?? []) as unknown as BatchRow[]) {
    const proj = Array.isArray(row.project) ? (row.project as unknown as BatchRow['project'][])[0] ?? null : row.project
    if (!proj || proj.deleted_at) continue
    if (!weekProjectMap.has(proj.id)) {
      const client = (proj.client as unknown) as { name: string } | null
      const editor = (proj.assigned_editor as unknown) as { name: string } | null
      weekProjectMap.set(proj.id, { id: proj.id, title: proj.title, shooting_date: row.shooting_date, status: proj.status, memo: proj.memo ?? null, client, assigned_editor: editor })
    }
  }

  const thisWeekProjects = Array.from(weekProjectMap.values()).sort((a, b) =>
    (a.shooting_date ?? '').localeCompare(b.shooting_date ?? '')
  )

  // 撮影準備チェック未完了のものだけ抽出
  const shootingCheckIncomplete = (shootingDelayedResult.data ?? []).filter((p) =>
    !p.kickoff_done || !p.calendar_done || !p.rental_car_done || !p.hotel_done || !p.transport_reservation_done || !p.equipment_reservation_done
  )
  // 撮影日超過（撮影日 < 今日）→ 赤
  const shootingOverdueProjects = shootingCheckIncomplete.filter((p) => (p.shooting_date ?? '') < todayStr)
  // 撮影日2営業日以内（今日 ≤ 撮影日 ≤ warningCutoff）→ 黄色
  const shootingWarningProjects = shootingCheckIncomplete.filter(
    (p) => (p.shooting_date ?? '') >= todayStr && (p.shooting_date ?? '') <= warningCutoff
  )

  // タスク期限超過（削除済み案件を除外し、プロジェクト単位でまとめる）
  type OverdueTaskRow = {
    id: string; title: string; due_date: string
    project: { id: string; title: string; work_type: string; status: string; memo?: string | null; deleted_at: string | null; client: { name: string } | null } | null
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

  // YouTubeマイルストーン超過・警告（アカウント単位でまとめる）
  type YtScheduleRow = {
    id: string; content_type: string; post_date: string | null; milestones: Record<string, { date: string | null; done: boolean }> | null
    youtube_account_id: string
    account: { id: string; channel_name: string; notes?: string | null } | null
  }
  const ytRows = (youtubeSchedulesResult.data ?? []) as unknown as YtScheduleRow[]
  const ytOverdueByAccount = new Map<string, { channel_name: string; notes: string | null; items: { content_type: string; post_date: string | null; milestone: string; date: string }[] }>()
  const ytWarningByAccount = new Map<string, { channel_name: string; notes: string | null; items: { content_type: string; post_date: string | null; milestone: string; date: string }[] }>()

  for (const row of ytRows) {
    const account = Array.isArray(row.account) ? (row.account as unknown as { id: string; channel_name: string; notes?: string | null }[])[0] ?? null : row.account
    if (!account || !row.milestones) continue
    const accountId = row.youtube_account_id

    for (const [key, ms] of Object.entries(row.milestones)) {
      if (!ms?.date || ms.done) continue
      const item = { content_type: row.content_type, post_date: row.post_date, milestone: key, date: ms.date }
      if (ms.date < todayStr) {
        if (!ytOverdueByAccount.has(accountId)) ytOverdueByAccount.set(accountId, { channel_name: account.channel_name, notes: account.notes ?? null, items: [] })
        ytOverdueByAccount.get(accountId)!.items.push(item)
      } else if (isWithin2BusinessDays(ms.date, todayStr)) {
        if (!ytWarningByAccount.has(accountId)) ytWarningByAccount.set(accountId, { channel_name: account.channel_name, notes: account.notes ?? null, items: [] })
        ytWarningByAccount.get(accountId)!.items.push(item)
      }
    }
  }
  const ytOverdueAccounts = Array.from(ytOverdueByAccount.entries()).map(([id, v]) => ({ id, ...v }))
  const ytWarningAccounts = Array.from(ytWarningByAccount.entries()).map(([id, v]) => ({ id, ...v }))

  const totalDelayed = shootingOverdueProjects.length + overdueProjects.length + ytOverdueAccounts.length

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
            {/* 撮影準備超過（撮影日が過ぎているのにチェック未完了） */}
            {shootingOverdueProjects.map((project) => {
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
                <div key={project.id} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-red-500">
                  <Link href={`/projects/${project.id}`} className="flex items-start gap-4 hover:opacity-80 transition-opacity">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">撮影準備超過</span>
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
                  <MemoEditor projectId={project.id} initialMemo={(project as unknown as { memo?: string | null }).memo ?? null} />
                </div>
              )
            })}

            {/* タスク期限超過 */}
            {overdueProjects.map(({ project, tasks }) => {
              const client = (project?.client as unknown) as { name: string } | null
              return (
                <div key={project?.id} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-red-500">
                  <Link href={`/projects/${project?.id}`} className="flex items-start gap-4 hover:opacity-80 transition-opacity">
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
                  {project?.id && <MemoEditor projectId={project.id} initialMemo={project.memo ?? null} />}
                </div>
              )
            })}

            {/* YouTubeマイルストーン超過 */}
            {ytOverdueAccounts.map(({ id, channel_name, notes, items }) => (
              <div key={`yt-overdue-${id}`} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-red-500">
                <Link href="/youtube" className="flex items-start gap-4 hover:opacity-80 transition-opacity">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">YouTube期限超過</span>
                      <span className="text-xs text-gray-500">{channel_name}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{channel_name}</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {items.slice(0, 3).map((it) => `${YT_MILESTONE_LABELS[it.milestone] ?? it.milestone}（${it.date}）`).join('・')}
                      {items.length > 3 && ` 他${items.length - 3}件`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700 mt-1">{items.length}件</span>
                </Link>
                <YtAccountMemoEditor accountId={id} initialNotes={notes} />
              </div>
            ))}
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
            <span className="ml-2 text-sm font-normal text-gray-500">({warningProjects.length + ytWarningAccounts.length + shootingWarningProjects.length}件)</span>
          </h3>
        </div>

        {warningProjects.length === 0 && ytWarningAccounts.length === 0 && shootingWarningProjects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 italic">
            期限が迫っている案件はありません
          </div>
        ) : (
          <div className="space-y-3">
            {/* 撮影準備未完了（撮影日2営業日以内） */}
            {shootingWarningProjects.map((project) => {
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
                <div key={project.id} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-yellow-400">
                  <Link href={`/projects/${project.id}`} className="flex items-start gap-4 hover:opacity-80 transition-opacity">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">撮影準備未完了</span>
                        {client && <span className="text-xs text-gray-500">{client.name}</span>}
                      </div>
                      <p className="text-sm font-bold text-gray-900">{project.title}</p>
                      <p className="text-xs text-yellow-700 mt-0.5">未完了: {missingItems}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-500">撮影日</p>
                      <p className="text-sm font-semibold text-gray-800">{project.shooting_date}</p>
                    </div>
                  </Link>
                  <MemoEditor projectId={project.id} initialMemo={(project as unknown as { memo?: string | null }).memo ?? null} />
                </div>
              )
            })}
            {warningProjects.map(({ project, tasks }) => {
              const client = (project?.client as unknown) as { name: string } | null
              return (
                <div key={project?.id} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-yellow-400">
                  <Link href={`/projects/${project?.id}`} className="flex items-start gap-4 hover:opacity-80 transition-opacity">
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
                  {project?.id && <MemoEditor projectId={project.id} initialMemo={project.memo ?? null} />}
                </div>
              )
            })}

            {/* YouTubeマイルストーン警告 */}
            {ytWarningAccounts.map(({ id, channel_name, notes, items }) => (
              <div key={`yt-warning-${id}`} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-yellow-400">
                <Link href="/youtube" className="flex items-start gap-4 hover:opacity-80 transition-opacity">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">YouTube期限間近</span>
                      <span className="text-xs text-gray-500">{channel_name}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{channel_name}</p>
                    <p className="text-xs text-yellow-700 mt-0.5">
                      {items.slice(0, 3).map((it) => `${YT_MILESTONE_LABELS[it.milestone] ?? it.milestone}（${it.date}）`).join('・')}
                      {items.length > 3 && ` 他${items.length - 3}件`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 mt-1">{items.length}件</span>
                </Link>
                <YtAccountMemoEditor accountId={id} initialNotes={notes} />
              </div>
            ))}
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
              {thisWeekProjects.map((project, i) => (
                <div key={project.id} className={`px-6 py-4 ${i !== thisWeekProjects.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <Link href={`/projects/${project.id}`} className="flex items-center justify-between hover:opacity-80 transition-opacity">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-gray-900">{project.title}</span>
                      <span className="text-xs text-gray-400">
                        {project.client?.name ?? '—'}
                        {project.assigned_editor ? ` / ${project.assigned_editor.name}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={project.status as ProjectStatus} />
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        {project.shooting_date}
                      </span>
                    </div>
                  </Link>
                  <MemoEditor projectId={project.id} initialMemo={project.memo} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
