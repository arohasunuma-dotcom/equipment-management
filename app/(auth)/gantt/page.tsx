import { createAdminClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/projects/StatusBadge'
import type { Project } from '@/types/projects'

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function GanttPage() {
  const supabase = await createAdminClient()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, status, shooting_date, delivery_date, assigned_editor:users(id, name)')
    .not('status', 'in', '("cancelled")')
    .not('shooting_date', 'is', null)
    .order('shooting_date', { ascending: true })
    .limit(50)

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 text-sm">
        データの取得に失敗しました: {error.message}
      </div>
    )
  }

  type GanttProject = { id: string; title: string; status: Project['status']; shooting_date: string; delivery_date?: string | null }
  const validProjects = (projects ?? []).filter(
    (p): p is typeof p & { shooting_date: string } => typeof p.shooting_date === 'string' && p.shooting_date.length > 0
  ) as GanttProject[]

  // 表示範囲: 最も早い撮影日 〜 最も遅い納品日（またはshooting_date+30日）
  if (validProjects.length === 0) {
    return (
      <div className="space-y-4 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900">ガントチャート <span className="text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-1">Beta</span></h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center text-gray-400 italic">
          撮影日が設定された案件がありません
        </div>
      </div>
    )
  }

  const allDates = validProjects.flatMap((p) => {
    const dates: Date[] = [new Date(p.shooting_date)]
    if (p.delivery_date) dates.push(new Date(p.delivery_date))
    return dates
  })

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
  // 前後に余白を追加
  minDate.setDate(minDate.getDate() - 3)
  maxDate.setDate(maxDate.getDate() + 7)

  const totalDays = daysBetween(minDate, maxDate)

  // 月ラベル用
  const monthLabels: { label: string; offsetDays: number; spanDays: number }[] = []
  const cursor = new Date(minDate)
  cursor.setDate(1)
  while (cursor <= maxDate) {
    const start = Math.max(0, daysBetween(minDate, cursor))
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const end = Math.min(totalDays, daysBetween(minDate, nextMonth))
    monthLabels.push({
      label: `${cursor.getFullYear()}/${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      offsetDays: start,
      spanDays: end - start,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = daysBetween(minDate, today)
  const todayPct = Math.max(0, Math.min(100, (todayOffset / totalDays) * 100))

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">ガントチャート</h1>
        <span className="text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Beta</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* ヘッダー行: 月ラベル */}
            <div className="flex border-b border-gray-100">
              <div className="w-56 shrink-0 px-4 py-2 text-xs text-gray-500 font-medium border-r border-gray-100">案件名</div>
              <div className="flex-1 relative h-8">
                {monthLabels.map((m) => (
                  <div
                    key={m.label}
                    className="absolute top-0 h-full flex items-center px-2 border-r border-gray-100 text-xs text-gray-400 overflow-hidden"
                    style={{
                      left: `${(m.offsetDays / totalDays) * 100}%`,
                      width: `${(m.spanDays / totalDays) * 100}%`,
                    }}
                  >
                    {m.label}
                  </div>
                ))}
                {/* 今日ライン */}
                {todayOffset >= 0 && todayOffset <= totalDays && (
                  <div
                    className="absolute top-0 h-full w-px bg-red-400 z-10"
                    style={{ left: `${todayPct}%` }}
                  />
                )}
              </div>
            </div>

            {/* 案件行 */}
            {validProjects.map((project, idx) => {
              const startDate = new Date(project.shooting_date)
              const endDate = project.delivery_date ? new Date(project.delivery_date) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)

              const startOffset = Math.max(0, daysBetween(minDate, startDate))
              const durationDays = Math.max(1, daysBetween(startDate, endDate))
              const leftPct = (startOffset / totalDays) * 100
              const widthPct = Math.min(100 - leftPct, (durationDays / totalDays) * 100)

              return (
                <div
                  key={project.id}
                  className={`flex items-center border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  style={{ height: '44px' }}
                >
                  <div className="w-56 shrink-0 px-4 border-r border-gray-100 flex items-center gap-2">
                    <a
                      href={`/projects/${project.id}`}
                      className="text-xs text-gray-700 hover:text-blue-600 truncate transition-colors"
                    >
                      {project.title}
                    </a>
                  </div>
                  <div className="flex-1 relative h-full flex items-center">
                    {/* 今日ライン（バー行） */}
                    {todayOffset >= 0 && todayOffset <= totalDays && (
                      <div
                        className="absolute top-0 h-full w-px bg-red-300 z-10 opacity-50"
                        style={{ left: `${todayPct}%` }}
                      />
                    )}
                    <div
                      className="absolute h-6 rounded-full flex items-center px-2 min-w-[4px] overflow-hidden"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: project.status === 'completed' ? '#86efac'
                          : project.status === 'editing' || project.status === 'fix_editing' ? '#c4b5fd'
                          : project.status === 'fb_waiting' || project.status === 're_fb_waiting' ? '#fde68a'
                          : '#93c5fd',
                      }}
                    >
                      <span className="text-[10px] font-medium text-gray-700 truncate">{project.title}</span>
                    </div>
                  </div>
                  <div className="w-28 shrink-0 px-2 flex justify-end">
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-4 flex-wrap text-xs text-gray-500">
          <span className="font-medium">凡例:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-block" />撮影〜その他</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-300 inline-block" />編集中</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-300 inline-block" />FB待ち</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-300 inline-block" />完了</span>
          <span className="flex items-center gap-1"><span className="w-px h-3 bg-red-400 inline-block" />今日</span>
          <span className="ml-auto text-gray-400">期間: 撮影日〜納品日（未設定の場合+14日）</span>
        </div>
      </div>
    </div>
  )
}
