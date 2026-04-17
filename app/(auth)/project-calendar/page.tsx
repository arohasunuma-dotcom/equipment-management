import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface CalendarItem {
  projectId: string
  projectTitle: string
  clientName: string | null
  areaText: string | null
  batchName?: string
  date: string
}

function buildCalendar(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()

  const weeks: (Date | null)[][] = []
  let currentWeek: (Date | null)[] = Array(startDow).fill(null)

  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d))
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = [] }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }
  return weeks
}

type PageProps = { searchParams: Promise<{ year?: string; month?: string }> }

export default async function ProjectCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const now = new Date()

  const year  = parseInt(params.year  ?? String(now.getFullYear()), 10)
  const monthNum = parseInt(params.month ?? String(now.getMonth() + 1), 10)
  const month = monthNum - 1

  const firstOfMonth = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const lastOfMonth  = `${year}-${String(monthNum).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

  const prevDate  = new Date(year, month - 1, 1)
  const nextDate  = new Date(year, month + 1, 1)
  const prevHref  = `?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`
  const nextHref  = `?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`

  const supabase = await createAdminClient()

  const [
    { data: shootingProjects },
    { data: batchShootings },
    { data: shootingDateTasks },
  ] = await Promise.all([
    // 1. 撮影のみ案件（projects.shooting_date）
    supabase
      .from('projects')
      .select('id, title, work_type, shooting_date, client:clients(id, name, areas)')
      .eq('work_type', 'shooting_only')
      .not('status', 'in', '("cancelled")')
      .is('deleted_at', null)
      .gte('shooting_date', firstOfMonth)
      .lte('shooting_date', lastOfMonth)
      .order('shooting_date', { ascending: true }),

    // 2. 撮影＋編集案件のバッチ撮影日（task_batches.shooting_date）
    supabase
      .from('task_batches')
      .select('id, name, shooting_date, project:projects!project_id(id, title, work_type, status, deleted_at, client:clients(id, name, areas))')
      .not('shooting_date', 'is', null)
      .gte('shooting_date', firstOfMonth)
      .lte('shooting_date', lastOfMonth)
      .order('shooting_date', { ascending: true }),

    // 3. 「撮影日」タスクの due_date（batch.shooting_date 未設定の場合のフォールバック）
    supabase
      .from('tasks')
      .select('id, due_date, batch_id, project:projects!project_id(id, title, work_type, status, deleted_at, client:clients(id, name, areas))')
      .eq('title', '撮影日')
      .not('due_date', 'is', null)
      .gte('due_date', firstOfMonth)
      .lte('due_date', lastOfMonth),
  ])

  const dayItemsMap = new Map<string, CalendarItem[]>()
  const addItem = (date: string, item: CalendarItem) => {
    if (!dayItemsMap.has(date)) dayItemsMap.set(date, [])
    dayItemsMap.get(date)!.push(item)
  }

  type RawClient = { id: string; name: string; areas: string[] | null } | { id: string; name: string; areas: string[] | null }[] | null
  const resolveClient = (raw: RawClient) => {
    const c = Array.isArray(raw) ? raw[0] ?? null : raw
    return {
      clientName: c?.name ?? null,
      areaText: c && c.areas && c.areas.length > 0 ? c.areas.join('・') : null,
    }
  }

  type RawProjectRef = { id: string; title: string; work_type: string; status: string; deleted_at: string | null; client: RawClient }
  const resolveRawProject = (raw: RawProjectRef | RawProjectRef[] | null): RawProjectRef | null =>
    Array.isArray(raw) ? raw[0] ?? null : raw

  // 1. 撮影のみ案件の撮影日
  for (const p of (shootingProjects ?? []) as { id: string; title: string; shooting_date: string | null; client: RawClient }[]) {
    if (!p.shooting_date) continue
    const { clientName, areaText } = resolveClient(p.client)
    addItem(p.shooting_date, { projectId: p.id, projectTitle: p.title, clientName, areaText, date: p.shooting_date })
  }

  // 2. バッチ単位の撮影日（batch.shooting_date）
  // batch_idをセットとして記録し、タスクフォールバックの重複を防ぐ
  const batchIdsWithShootingDate = new Set<string>()
  type RawBatchShooting = { id: string; name: string; shooting_date: string | null; project: RawProjectRef | RawProjectRef[] | null }
  for (const b of (batchShootings ?? []) as unknown as RawBatchShooting[]) {
    if (!b.shooting_date) continue
    const rawProject = resolveRawProject(b.project)
    if (!rawProject || rawProject.status === 'cancelled' || rawProject.deleted_at != null) continue
    batchIdsWithShootingDate.add(b.id)
    const { clientName, areaText } = resolveClient(rawProject.client)
    addItem(b.shooting_date, { projectId: rawProject.id, projectTitle: rawProject.title, clientName, areaText, batchName: b.name, date: b.shooting_date })
  }

  // 3. 「撮影日」タスクの due_date（batch.shooting_date が未設定のバッチのフォールバック）
  type RawTaskRow = { id: string; due_date: string | null; batch_id: string | null; project: RawProjectRef | RawProjectRef[] | null }
  for (const t of (shootingDateTasks ?? []) as unknown as RawTaskRow[]) {
    if (!t.due_date) continue
    // すでに batch.shooting_date で登録済みのバッチはスキップ
    if (t.batch_id && batchIdsWithShootingDate.has(t.batch_id)) continue
    const rawProject = resolveRawProject(t.project)
    if (!rawProject || rawProject.status === 'cancelled' || rawProject.deleted_at != null) continue
    const { clientName, areaText } = resolveClient(rawProject.client)
    addItem(t.due_date, { projectId: rawProject.id, projectTitle: rawProject.title, clientName, areaText, date: t.due_date })
  }

  const weeks = buildCalendar(year, month)
  const todayStr = now.getFullYear() === year && now.getMonth() === month
    ? `${year}-${String(monthNum).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    : ''
  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">撮影カレンダー</h1>
        <div className="flex items-center gap-3">
          {/* 月ナビゲーション */}
          <div className="flex items-center gap-1">
            <Link
              href={prevHref}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              aria-label="前の月"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg min-w-[6rem] text-center">
              {year}年{monthNum}月
            </span>
            <Link
              href={nextHref}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              aria-label="次の月"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className={`py-2 text-center text-xs font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-50 last:border-b-0">
            {week.map((date, di) => {
              if (!date) return <div key={di} className="min-h-[96px] bg-gray-50/50 border-r border-gray-50 last:border-r-0" />

              const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              const items = dayItemsMap.get(dateStr) ?? []
              const isToday = dateStr === todayStr
              const isSun = di === 0
              const isSat = di === 6

              return (
                <div key={di} className={`min-h-[96px] p-1.5 border-r border-gray-50 last:border-r-0 ${items.length > 0 ? 'bg-blue-50/30' : ''}`}>
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-slate-800 text-white'
                    : isSun ? 'text-red-500'
                    : isSat ? 'text-blue-500'
                    : 'text-gray-700'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 2).map((item, i) => (
                      <a
                        key={i}
                        href={`/projects/${item.projectId}`}
                        className="block rounded px-1.5 py-1 bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                        title={[item.clientName, item.areaText, item.projectTitle, item.batchName].filter(Boolean).join(' / ')}
                      >
                        {item.clientName && (
                          <p className="text-[9px] font-semibold leading-tight truncate opacity-90">
                            {item.clientName}
                            {item.areaText && <span className="opacity-75">　{item.areaText}</span>}
                          </p>
                        )}
                        <p className="text-[10px] leading-tight truncate">{item.projectTitle}</p>
                        {item.batchName && (
                          <p className="text-[9px] leading-tight truncate opacity-80">{item.batchName}</p>
                        )}
                      </a>
                    ))}
                    {items.length > 2 && (
                      <p className="text-[10px] text-gray-400 pl-1">+{items.length - 2}件</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
