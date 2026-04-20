'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ProjectWithRelations, ProjectStatus, WorkType, ShootingType, Task, StaffMemberRef } from '@/types/projects'
import { isWithin2BusinessDays, getToday } from '@/lib/businessDays'
import { StatusBadge } from '@/components/projects/StatusBadge'
import { WORK_TYPE_LABELS, WORK_TYPE_COLORS, SHOOTING_TYPE_LABELS, PROJECT_TYPE_LABELS } from '@/lib/projectConstants'

type TabKey = 'all' | 'active' | 'completed' | 'delayed' | 'deleted'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全件' },
  { key: 'active', label: '進行中' },
  { key: 'completed', label: '完了' },
  { key: 'delayed', label: '⚠ 遅延' },
  { key: 'deleted', label: '削除済み' },
]

const ACTIVE_STATUSES: ProjectStatus[] = [
  'shooting_scheduled',
  'shooting_done',
  'editing',
  'fb_responded',
  'fix_editing',
  're_fb_waiting',
]

// 撮影準備チェックリスト項目
const CHECKLIST_KEYS = [
  'kickoff_done',
  'calendar_done',
  'rental_car_done',
  'hotel_done',
  'transport_reservation_done',
  'equipment_reservation_done',
] as const

type ChecklistKey = (typeof CHECKLIST_KEYS)[number]

function calcChecklistProgress(project: ProjectWithRelations) {
  const done = CHECKLIST_KEYS.filter((k) => project[k as ChecklistKey]).length
  return { done, total: CHECKLIST_KEYS.length, pct: Math.round((done / CHECKLIST_KEYS.length) * 100) }
}

// 編集タスク進捗（15工程）
const EDITING_STEPS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

function calcEditingProgress(tasks: Task[] | undefined) {
  if (!tasks || tasks.length === 0) return null
  const relevant = tasks.filter((t) => EDITING_STEPS.has(t.step_order))
  if (relevant.length === 0) return null
  const done = relevant.filter((t) => t.status === 'done').length
  return { done, total: relevant.length, pct: Math.round((done / relevant.length) * 100) }
}

function sortByDate(projects: ProjectWithRelations[]): ProjectWithRelations[] {
  return [...projects].sort((a, b) => {
    const getDate = (p: ProjectWithRelations) =>
      p.work_type === 'editing_only' ? (p.delivery_date ?? null) : (p.shooting_date ?? null)
    const da = getDate(a)
    const db = getDate(b)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })
}

// ─── 遅延判定 ────────────────────────────────────────────────────────────────

function isProjectDelayed(project: ProjectWithRelations): boolean {
  if (project.status === 'completed' || project.status === 'cancelled') return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (project.work_type === 'shooting_only') {
    if (!project.shooting_date || project.status !== 'shooting_scheduled') return false
    const shootingDate = new Date(project.shooting_date + 'T00:00:00')
    const alertFrom = new Date(shootingDate)
    alertFrom.setDate(alertFrom.getDate() - 2)
    if (today < alertFrom) return false
    return CHECKLIST_KEYS.some((k) => !project[k as ChecklistKey])
  }

  // editing_only / shooting_and_editing: 期限超過タスクがあるか
  const tasks = project.tasks as Task[] | undefined
  if (!tasks || tasks.length === 0) return false
  return tasks.some((t) => {
    if (!t.due_date) return false
    if (t.status === 'done' || t.status === 'skipped') return false
    return new Date(t.due_date + 'T00:00:00') < today
  })
}

// 2営業日以内に期限が迫っている未完タスクがあるか
function isProjectWarning(project: ProjectWithRelations): boolean {
  if (project.status === 'completed' || project.status === 'cancelled') return false
  if (isProjectDelayed(project)) return false // 遅延済みは赤なので黄色不要
  const today = getToday()
  const tasks = project.tasks as Task[] | undefined
  if (!tasks) return false
  return tasks.some((t) => {
    if (!t.due_date) return false
    if (t.status === 'done' || t.status === 'skipped') return false
    return isWithin2BusinessDays(t.due_date, today)
  })
}

function filterProjects(projects: ProjectWithRelations[], tab: TabKey): ProjectWithRelations[] {
  if (tab === 'deleted') return projects

  let filtered: ProjectWithRelations[]
  if (tab === 'all') filtered = projects
  else if (tab === 'completed') filtered = projects.filter((p) => p.status === 'completed')
  else if (tab === 'delayed') filtered = projects.filter(isProjectDelayed)
  else filtered = projects.filter((p) => ACTIVE_STATUSES.includes(p.status))

  if (tab === 'all' || tab === 'active') {
    const shooting = sortByDate(filtered.filter((p) =>
      p.work_type === 'shooting_only' || p.work_type === 'shooting_and_editing'
    ))
    const editingOnly = sortByDate(filtered.filter((p) => p.work_type === 'editing_only'))
    const rest = filtered.filter((p) => !p.work_type)
    return [...shooting, ...editingOnly, ...rest]
  }
  return filtered
}

function isWithinTwoMonths(dateStr: string): boolean {
  const date = new Date(dateStr)
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  return date >= twoMonthsAgo
}

// ─── ページ本体 ───────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsPageInner />
    </Suspense>
  )
}

function ProjectsPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [deletedProjects, setDeletedProjects] = useState<ProjectWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [deletedLoading, setDeletedLoading] = useState(false)
  const [deletedLoaded, setDeletedLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)

  const rawTab = searchParams.get('tab') as TabKey | null
  const activeTab: TabKey = rawTab && TABS.some((t) => t.key === rawTab) ? rawTab : 'all'

  const setActiveTab = useCallback((tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  useEffect(() => {
    setLoading(true)
    fetch('/api/projects')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        const data: ProjectWithRelations[] = json.data ?? json ?? []
        setProjects(data)
      })
      .catch((err: Error) => { setError(err.message) })
      .finally(() => setLoading(false))
  }, [])

  // 削除済みタブが選ばれたら一度だけ取得
  useEffect(() => {
    if (activeTab !== 'deleted' || deletedLoaded) return
    setDeletedLoading(true)
    fetch('/api/projects?deleted=true')
      .then((res) => res.json())
      .then((json) => {
        setDeletedProjects(json.data ?? [])
        setDeletedLoaded(true)
      })
      .finally(() => setDeletedLoading(false))
  }, [activeTab, deletedLoaded])

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`「${title}」を削除しますか？2ヶ月以内であれば元に戻せます。`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // アクティブリストから除外
        setProjects((prev) => prev.filter((p) => p.id !== id))
        // 削除済みリストを再取得させる
        setDeletedLoaded(false)
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleRestore = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`「${title}」を元に戻しますか？`)) return
    setRestoring(id)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: null }),
      })
      if (res.ok) {
        setDeletedProjects((prev) => prev.filter((p) => p.id !== id))
        // アクティブリストに反映させるため再取得
        const refreshed = await fetch('/api/projects').then((r) => r.json())
        setProjects(refreshed.data ?? [])
      }
    } finally {
      setRestoring(null)
    }
  }

  const handleMemoSave = async (id: string, memo: string) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo: memo.trim() || null }),
    })
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, memo: memo.trim() || null } : p))
  }

  const displayed = activeTab === 'deleted'
    ? deletedProjects
    : filterProjects(projects, activeTab)

  const isLoadingCurrent = activeTab === 'deleted' ? deletedLoading : loading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">案件一覧</h2>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </Link>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => {
          const count = tab.key === 'deleted'
            ? deletedProjects.length
            : filterProjects(projects, tab.key).length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? tab.key === 'delayed'
                    ? 'bg-red-50 text-red-700 shadow-sm'
                    : 'bg-white text-gray-900 shadow-sm'
                  : tab.key === 'delayed'
                    ? 'text-red-500 hover:text-red-700'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {!loading && (tab.key !== 'deleted' || deletedLoaded) && (
                <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-gray-500' : 'text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoadingCurrent && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
          データの取得に失敗しました: {error}
        </div>
      )}

      {!isLoadingCurrent && !error && displayed.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 italic">
          案件がありません
        </div>
      )}

      {!isLoadingCurrent && !error && displayed.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              deleting={deleting}
              restoring={restoring}
              activeTab={activeTab}
              delayed={isProjectDelayed(project)}
              warning={isProjectWarning(project)}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onMemoSave={handleMemoSave}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── プロジェクトカード ────────────────────────────────────────────────────────

function ProjectCard({
  project,
  deleting,
  restoring,
  activeTab,
  delayed,
  warning,
  onDelete,
  onRestore,
  onMemoSave,
}: {
  project: ProjectWithRelations
  deleting: string | null
  restoring: string | null
  activeTab: TabKey
  delayed: boolean
  warning: boolean
  onDelete: (e: React.MouseEvent, id: string, title: string) => void
  onRestore: (e: React.MouseEvent, id: string, title: string) => void
  onMemoSave: (id: string, memo: string) => void
}) {
  const [memo, setMemo] = useState(project.memo ?? '')
  const memoRef = useRef(project.memo ?? '')

  const isDeleted = activeTab === 'deleted'
  const canRestore = isDeleted && project.deleted_at != null && isWithinTwoMonths(project.deleted_at)

  const tasks = project.tasks as Task[] | undefined
  const isShootingProject = project.work_type === 'shooting_only' || project.work_type === 'shooting_and_editing'
  const checklistProg = isShootingProject ? calcChecklistProgress(project) : null
  const editingProg = project.work_type !== 'shooting_only' ? calcEditingProgress(tasks) : null
  const showProgress = checklistProg !== null || editingProg !== null

  const handleMemoBlur = () => {
    if (memo !== memoRef.current) {
      memoRef.current = memo
      onMemoSave(project.id, memo)
    }
  }

  return (
    <div className={`relative group bg-white rounded-2xl shadow-sm border hover:shadow-md transition-all flex flex-col ${
      delayed
        ? 'border-2 border-red-500 bg-red-50/40 hover:border-red-600'
        : warning
        ? 'border-2 border-yellow-400 bg-yellow-50/30 hover:border-yellow-500'
        : 'border border-gray-100 hover:border-blue-200'
    }`}>
      {/* クリッカブル領域 */}
      <Link href={`/projects/${project.id}`} className="block p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 pr-6">
            {project.title}
          </h4>
          <StatusBadge status={project.status} className="shrink-0" />
        </div>

        {/* バッジ */}
        <div className="flex flex-wrap gap-1 mb-2">
          {project.work_type && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WORK_TYPE_COLORS[project.work_type as WorkType]}`}>
              {WORK_TYPE_LABELS[project.work_type as WorkType]}
            </span>
          )}
          {project.shooting_type && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {SHOOTING_TYPE_LABELS[project.shooting_type as ShootingType]}
            </span>
          )}
          {project.type && project.work_type !== 'shooting_only' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {PROJECT_TYPE_LABELS[project.type]}
            </span>
          )}
        </div>

        {/* 日付・担当者 */}
        <div className="space-y-1 text-xs text-gray-500">
          {project.client && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {project.client.name}
            </div>
          )}
          {project.shooting_date && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              撮影: {project.shooting_date}
            </div>
          )}
          {project.delivery_date && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              納期: {project.delivery_date}
            </div>
          )}
          {project.director && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium" style={{ fontSize: '10px' }}>DIR</span>
              {(project.director as StaffMemberRef).name}
            </div>
          )}
          {project.editor_member && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium" style={{ fontSize: '10px' }}>EDI</span>
              {(project.editor_member as StaffMemberRef).name}
            </div>
          )}
          {project.cameraman && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium" style={{ fontSize: '10px' }}>CAM</span>
              {(project.cameraman as StaffMemberRef).name}
            </div>
          )}
          {isDeleted && project.deleted_at && (
            <div className="flex items-center gap-1.5 text-red-400 mt-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              削除: {new Date(project.deleted_at).toLocaleDateString('ja-JP')}
              {!canRestore && ' (復元期限切れ)'}
            </div>
          )}
        </div>
      </Link>

      {/* タスク進捗 */}
      {showProgress && (
        <div
          className="px-5 pb-3 space-y-1.5"
          onClick={(e) => e.preventDefault()}
        >
          <div className="border-t border-gray-50 pt-3 space-y-1.5">
            {checklistProg !== null && (
              <ProgressBar
                label="撮影準備"
                done={checklistProg.done}
                total={checklistProg.total}
                pct={checklistProg.pct}
                color="bg-amber-400"
              />
            )}
            {editingProg !== null && (
              <ProgressBar
                label="編集"
                done={editingProg.done}
                total={editingProg.total}
                pct={editingProg.pct}
                color="bg-blue-400"
              />
            )}
          </div>
        </div>
      )}

      {/* 自由記述欄 */}
      {!isDeleted && (
        <div
          className="px-5 pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={showProgress ? '' : 'border-t border-gray-50 pt-3'}>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onBlur={handleMemoBlur}
              placeholder="メモを入力..."
              rows={2}
              className="w-full text-xs text-gray-600 placeholder-gray-300 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-blue-300 focus:bg-white rounded-lg px-2.5 py-2 resize-none focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* ボタン */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {isDeleted ? (
          canRestore && (
            <button
              onClick={(e) => onRestore(e, project.id, project.title)}
              disabled={restoring === project.id}
              className="p-1.5 rounded-lg bg-white text-gray-300 hover:text-green-600 hover:bg-green-50 shadow-sm border border-gray-100 disabled:opacity-50"
              title="元に戻す"
            >
              {restoring === project.id ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              )}
            </button>
          )
        ) : (
          <button
            onClick={(e) => onDelete(e, project.id, project.title)}
            disabled={deleting === project.id}
            className="p-1.5 rounded-lg bg-white text-gray-300 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100 disabled:opacity-50"
            title="削除"
          >
            {deleting === project.id ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── 進捗バー ─────────────────────────────────────────────────────────────────

function ProgressBar({
  label, done, total, pct, color,
}: {
  label: string
  done: number
  total: number
  pct: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-6 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{done}/{total}</span>
    </div>
  )
}
