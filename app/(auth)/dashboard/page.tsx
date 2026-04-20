import { createAdminClient } from '@/lib/supabase/server'
import { getToday, addBusinessDays, isWithin2BusinessDays } from '@/lib/businessDays'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createAdminClient()
  const today = getToday()
  const warningCutoff = addBusinessDays(today, 2)

  // ── 機材・貸出 ──────────────────────────────────────────────────────────────
  const { data: allEquipment } = await supabase.from('equipment').select('id, is_active')
  const activeEquipment = allEquipment?.filter(e => e.is_active) ?? []

  const { data: allRentals } = await supabase
    .from('rentals')
    .select('id, status, renter_name, end_date, created_at, purpose, rental_equipment(equipment_id, equipment:equipment(name))')
  const activeRentals = allRentals?.filter(r => r.status === 'active') ?? []
  const overdueRentals = allRentals?.filter(r => r.status === 'overdue') ?? []
  const availableCount = Math.max(0, activeEquipment.length - activeRentals.length)
  const recentActivity = [...(allRentals ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  // ── YouTube マイルストーン アラート ─────────────────────────────────────────
  const { data: ytSchedules } = await supabase
    .from('youtube_schedules')
    .select('youtube_account_id, content_type, post_date, milestones, account:youtube_accounts!youtube_account_id(id, channel_name)')
    .not('status', 'eq', 'posted')
    .eq('video_length', 'long')
    .not('milestones', 'is', null)

  type MilestoneAlertItem = { channel: string; title: string; milestoneLabel: string; date: string; accountId: string; kind: 'overdue' | 'warning' }

  const MILESTONE_LABELS: Record<string, string> = {
    script_draft: '撮影台本初稿', script_fb: '台本FB', script_client: '台本先方提出',
    shooting: '撮影日', footage_share: '撮影素材共有', internal_draft: '社内初稿',
    internal_fb: '社内FB', client_first_draft: '先方初稿提出', client_fb: '先方FB',
    internal_v2: '社内第２稿', client_revision: '修正稿提出', client_final: '先方最終確認',
    owner_check: 'お施主様チェック', delivery: '納品日', thumbnail: 'サムネ作成日',
  }

  const ytAlertItems: MilestoneAlertItem[] = []
  const overdueAccountSet = new Map<string, string>() // accountId → channel_name

  for (const s of ytSchedules ?? []) {
    const accountRaw = Array.isArray(s.account) ? s.account[0] : s.account
    const account = accountRaw as { id: string; channel_name: string } | null
    if (!account) continue
    const milestones = (s.milestones ?? {}) as Record<string, { date: string | null; done: boolean }>
    const title = (s.content_type as string | null) ?? (s.post_date ? `投稿日: ${s.post_date}` : '（タイトルなし）')

    for (const [key, ms] of Object.entries(milestones)) {
      if (!ms?.date || ms.done) continue
      if (ms.date < today) {
        overdueAccountSet.set(account.id, account.channel_name)
        ytAlertItems.push({ channel: account.channel_name, title, milestoneLabel: MILESTONE_LABELS[key] ?? key, date: ms.date, accountId: account.id, kind: 'overdue' })
      } else if (isWithin2BusinessDays(ms.date, today)) {
        ytAlertItems.push({ channel: account.channel_name, title, milestoneLabel: MILESTONE_LABELS[key] ?? key, date: ms.date, accountId: account.id, kind: 'warning' })
      }
    }
  }

  // ── 案件タスク 期限アラート ──────────────────────────────────────────────────
  type TaskAlertItem = { projectId: string; projectTitle: string; taskTitle: string; dueDate: string; kind: 'overdue' | 'warning' }
  const taskAlertItems: TaskAlertItem[] = []

  const { data: alertTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, status, project:projects!project_id(id, title, deleted_at, status)')
    .not('status', 'in', '("done","skipped")')
    .not('due_date', 'is', null)
    .lte('due_date', warningCutoff)

  for (const t of alertTasks ?? []) {
    const proj = (Array.isArray(t.project) ? t.project[0] : t.project) as { id: string; title: string; deleted_at: string | null; status: string } | null
    if (!proj || proj.deleted_at || proj.status === 'completed' || proj.status === 'cancelled') continue
    if (!t.due_date) continue
    const kind = (t.due_date as string) < today ? 'overdue' : 'warning'
    taskAlertItems.push({ projectId: proj.id, projectTitle: proj.title, taskTitle: t.title as string, dueDate: t.due_date as string, kind })
  }

  // 黄色案件（warning のみ、プロジェクト単位に集約）
  const warningProjectMap = new Map<string, { id: string; title: string; tasks: { title: string; dueDate: string }[] }>()
  for (const t of taskAlertItems.filter(t => t.kind === 'warning')) {
    if (!warningProjectMap.has(t.projectId)) {
      warningProjectMap.set(t.projectId, { id: t.projectId, title: t.projectTitle, tasks: [] })
    }
    warningProjectMap.get(t.projectId)!.tasks.push({ title: t.taskTitle, dueDate: t.dueDate })
  }
  const warningProjects = Array.from(warningProjectMap.values())

  const allAlertItems = [...ytAlertItems.map(i => ({ ...i, type: 'youtube' as const })), ...taskAlertItems.map(i => ({ ...i, type: 'project' as const }))]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'overdue' ? -1 : 1
      const da = a.type === 'youtube' ? (a as MilestoneAlertItem & { type: 'youtube' }).date : (a as TaskAlertItem & { type: 'project' }).dueDate
      const db = b.type === 'youtube' ? (b as MilestoneAlertItem & { type: 'youtube' }).date : (b as TaskAlertItem & { type: 'project' }).dueDate
      return da.localeCompare(db)
    })

  const stats = [
    { label: '総機材数', value: activeEquipment.length, color: 'bg-indigo-500', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { label: '貸出中', value: activeRentals.length, color: 'bg-green-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: '在庫あり', value: availableCount, color: 'bg-blue-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: '返却遅延', value: overdueRentals.length, color: 'bg-red-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ]

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">概要</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${stat.color} p-3 rounded-xl text-white`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* YouTube 期限超過アカウント */}
      {overdueAccountSet.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-bold text-red-800">YouTube 期限超過アカウント</h3>
          </div>
          <div className="px-6 py-3 flex flex-wrap gap-2">
            {Array.from(overdueAccountSet.entries()).map(([id, name]) => (
              <Link
                key={id}
                href={`/youtube?account_id=${id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-full text-sm font-medium transition-colors border border-red-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 黄色案件一覧 */}
      {warningProjects.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-yellow-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <h3 className="font-bold text-yellow-800">期限が迫っている案件</h3>
            <span className="ml-auto text-xs text-yellow-600 font-medium">{warningProjects.length}件</span>
          </div>
          <div className="divide-y divide-yellow-100">
            {warningProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-start justify-between gap-4 px-6 py-3 hover:bg-yellow-100 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {p.tasks.map((t, i) => (
                      <span key={i} className="text-xs text-yellow-700">
                        {t.title} <span className="text-yellow-500">({t.dueDate})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* YouTube・案件タスク 詳細アラートリスト */}
      {allAlertItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-bold text-gray-800">アラート詳細</h3>
            <span className="text-xs text-gray-400 font-normal">（2営業日以内・超過含む）</span>
          </div>
          <div className="divide-y divide-gray-50">
            {allAlertItems.map((item, i) => {
              const isOverdue = item.kind === 'overdue'
              if (item.type === 'youtube') {
                const yt = item as MilestoneAlertItem & { type: 'youtube' }
                return (
                  <div key={`yt-${i}`} className={`px-6 py-3 flex items-center justify-between gap-4 ${isOverdue ? 'bg-red-50/60' : 'bg-yellow-50/40'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${isOverdue ? 'bg-red-100 text-red-600 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                        YouTube
                      </span>
                      <Link href={`/youtube?account_id=${yt.accountId}`} className="text-sm text-gray-800 hover:text-blue-600 truncate transition-colors">
                        {yt.channel} — {yt.title}
                      </Link>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-gray-500">{yt.milestoneLabel}</span>
                      <span className={`ml-2 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-yellow-700'}`}>{yt.date}</span>
                    </div>
                  </div>
                )
              } else {
                const proj = item as TaskAlertItem & { type: 'project' }
                return (
                  <div key={`task-${i}`} className={`px-6 py-3 flex items-center justify-between gap-4 ${isOverdue ? 'bg-red-50/60' : 'bg-yellow-50/40'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${isOverdue ? 'bg-red-100 text-red-600 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                        案件
                      </span>
                      <Link href={`/projects/${proj.projectId}`} className="text-sm text-gray-800 hover:text-blue-600 truncate transition-colors">
                        {proj.projectTitle} — {proj.taskTitle}
                      </Link>
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-yellow-700'}`}>{proj.dueDate}</span>
                  </div>
                )
              }
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">最近の貸出履歴</h3>
          </div>
          <div>
            {recentActivity.map((activity, i) => {
              const names = (activity as any).rental_equipment?.map((re: any) => re.equipment?.name).filter(Boolean) ?? []
              return (
                <div key={activity.id} className={`px-6 py-4 flex items-center justify-between ${i !== recentActivity.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold flex flex-wrap gap-1">
                      {names.map((n: string, idx: number) => (
                        <span key={idx} className="bg-gray-50 px-1 py-0.5 rounded text-[10px] border border-gray-200">{n}</span>
                      ))}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">{activity.renter_name} - {activity.purpose}</span>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    {activity.end_date}
                  </div>
                </div>
              )
            })}
            {recentActivity.length === 0 && (
              <div className="p-10 text-center text-gray-400 italic">貸出データがありません</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">機材管理をスマートに。</h3>
            <p className="text-slate-400 mb-6">
              機材一覧から機材を登録し、貸出管理でスケジュールを把握しましょう。削除済みの機材は自動的に貸出候補から除外されます。
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300 font-medium">システム正常稼働中</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  )
}
