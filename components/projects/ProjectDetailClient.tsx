'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/projects/StatusBadge'
import type {
  ProjectWithRelations, Task, TaskBatch, TaskStatus, ProjectStatus, ProjectOutsourcer, Outsourcer,
  ShootingType, VideoFormat, ProjectType,
} from '@/types/projects'
import { TASK_STATUS_LABELS, STATUS_LABELS, SHOOTING_TYPE_LABELS, EDITING_PROJECT_TYPE_LABELS } from '@/lib/projectConstants'
import { calculateTaskSchedule } from '@/lib/taskTemplates'

interface StaffMember { id: string; name: string }
interface Props { project: ProjectWithRelations; outsourcers?: Outsourcer[]; staffMembers?: StaffMember[] }

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending:     'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done:        'bg-green-100 text-green-700',
  skipped:     'bg-slate-100 text-slate-500',
}

const ALL_STATUS_OPTIONS: ProjectStatus[] = [
  'shooting_scheduled', 'shooting_done', 'editing', 'fb_waiting',
  'fb_responded', 'fix_editing', 're_fb_waiting', 'completed', 'cancelled',
]

// ─── バッチ内タスクリスト ────────────────────────────────────────────────────

function BatchTaskList({
  projectId,
  batchId,
  batchDueDate,
  tasks,
  onStatusChange,
  onHoursChange,
  updatingId,
  scheduledDates,
  onScheduleCascade,
}: {
  projectId: string
  batchId: string
  batchDueDate?: string | null
  tasks: Task[]
  onStatusChange: (task: Task, status: TaskStatus) => void
  onHoursChange?: (taskId: string, hours: number | null) => void
  updatingId: string | null
  scheduledDates?: Record<number, string | null>
  onScheduleCascade?: (dates: Record<number, string | null>) => void
}) {
  const [taskDueDates, setTaskDueDates] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const t of tasks) { if (t.due_date) m[t.id] = t.due_date }
    return m
  })
  const [taskHours, setTaskHours] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const t of tasks) { if (t.actual_hours != null) m[t.id] = String(t.actual_hours) }
    return m
  })
  const dueDateRefs = useRef<Record<string, string>>({})
  const hoursRefs = useRef<Record<string, string>>({})

  // 撮影日変更時のスケジュール自動更新を反映
  useEffect(() => {
    if (!scheduledDates) return
    setTaskDueDates((prev) => {
      const next = { ...prev }
      for (const task of tasks) {
        if (task.step_order in scheduledDates) {
          const d = scheduledDates[task.step_order]
          next[task.id] = d ?? ''
          dueDateRefs.current[task.id] = d ?? ''
        }
      }
      return next
    })
  }, [scheduledDates, tasks])

  const handleTaskDueDateChange = (taskId: string, value: string) => {
    setTaskDueDates((prev) => ({ ...prev, [taskId]: value }))
    if (value === (dueDateRefs.current[taskId] ?? '')) return
    dueDateRefs.current[taskId] = value
    fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date: value || null }),
    })
    // 社内初稿（step 7）変更時は全工程を自動再計算
    const task = tasks.find((t) => t.id === taskId)
    if (task?.step_order === 7 && value && onScheduleCascade) {
      fetch(`/api/projects/${projectId}/task-batches/${batchId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_date: value, due_date: batchDueDate ?? null }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.data?.taskSchedule) {
            onScheduleCascade(json.data.taskSchedule)
            toast.success('全工程のスケジュールを保存しました')
          }
        })
    }
  }

  const handleHoursBlur = async (taskId: string, value: string) => {
    if (value === (hoursRefs.current[taskId] ?? '')) return
    hoursRefs.current[taskId] = value
    const hours = value.trim() ? parseFloat(value) : null
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_hours: hours }),
    })
    onHoursChange?.(taskId, hours)
  }

  const sorted = [...tasks].sort((a, b) => a.step_order - b.step_order)
  const doneCount = sorted.filter((t) => t.status === 'done').length

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueTasks = sorted.filter((t) => {
    if (!t.due_date || t.status === 'done' || t.status === 'skipped') return false
    return new Date(t.due_date + 'T00:00:00') < today
  })

  return (
    <div>
      {overdueTasks.length > 0 && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-xs text-red-600 font-medium">
            期限超過 {overdueTasks.length}件: {overdueTasks.map((t) => t.title).join('・')}
          </span>
        </div>
      )}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all"
            style={{ width: sorted.length > 0 ? `${Math.round((doneCount / sorted.length) * 100)}%` : '0%' }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">{doneCount}/{sorted.length}</span>
      </div>
      <ul className="divide-y divide-gray-50">
        {sorted.map((task) => {
          const isOverdue = !!task.due_date
            && task.status !== 'done'
            && task.status !== 'skipped'
            && new Date(task.due_date + 'T00:00:00') < today
          return (
          <li key={task.id} className={`px-4 py-2.5 space-y-1.5 ${isOverdue ? 'bg-red-50/50' : ''}`}>
            {/* 1行目: 番号 + タイトル */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{task.step_order}.</span>
              <p className={`text-sm flex-1 min-w-0 ${
                task.status === 'done' ? 'text-gray-400 line-through' : isOverdue ? 'text-red-700 font-medium' : 'text-gray-900'
              }`}>
                {isOverdue && <span className="mr-1">⚠</span>}{task.title}
              </p>
            </div>
            {/* 2行目: 締日 + ステータス */}
            <div className="flex items-center gap-2 pl-7">
              <input
                type="date"
                value={taskDueDates[task.id] ?? ''}
                onChange={(e) => handleTaskDueDateChange(task.id, e.target.value)}
                className={`text-xs border rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-0 ${
                  isOverdue ? 'border-red-300 text-red-700' : 'border-gray-300 text-gray-800'
                }`}
              />
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
                disabled={updatingId === task.id}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 shrink-0"
              >
                {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            {/* 3行目: 稼働時間 */}
            <div className="flex items-center gap-1.5 pl-7">
              <span className="text-xs text-gray-400">⏱</span>
              <input
                type="number"
                min={0}
                max={999}
                step={0.5}
                value={taskHours[task.id] ?? ''}
                onChange={(e) => setTaskHours((prev) => ({ ...prev, [task.id]: e.target.value }))}
                onBlur={(e) => handleHoursBlur(task.id, e.target.value)}
                placeholder="0"
                className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">h</span>
            </div>
          </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── バッチヘッダー ──────────────────────────────────────────────────────────

function BatchHeader({
  batch,
  projectId,
  taskCount,
  outsourcers,
  staffMembers,
  workType,
  onUpdate,
  onDelete,
  onDeliver,
  onTaskDatesUpdated,
}: {
  batch: TaskBatch
  projectId: string
  taskCount: number
  outsourcers: Outsourcer[]
  staffMembers: StaffMember[]
  workType: string
  onUpdate: (id: string, fields: Partial<TaskBatch>) => void
  onDelete: (id: string) => void
  onDeliver: (id: string, deliveredAt: string | null) => void
  onTaskDatesUpdated?: (batchId: string, dates: Record<number, string | null>) => void
}) {
  const [name, setName] = useState(batch.name)
  const [dueDate, setDueDate] = useState(batch.due_date ?? '')
  const [batchShootingDate, setBatchShootingDate] = useState(batch.shooting_date ?? '')
  const [outsourcerId, setOutsourcerId] = useState(batch.outsourcer_id ?? '')
  const [outsourcerAmount, setOutsourcerAmount] = useState(
    batch.outsourcer_amount != null ? String(batch.outsourcer_amount) : ''
  )
  const [shootingType, setShootingType] = useState<string>(batch.shooting_type ?? '')
  const [format, setFormat] = useState<string>(batch.format ?? '')
  const [cameramanIds, setCameramanIds] = useState<string[]>(batch.cameraman_ids ?? [])
  const [batchType, setBatchType] = useState<string>(batch.type ?? '')
  const [editorMemberId, setEditorMemberId] = useState(batch.editor_member_id ?? '')
  const nameRef = useRef(batch.name)
  const dueDateRef = useRef(batch.due_date ?? '')
  const batchShootingDateRef = useRef(batch.shooting_date ?? '')
  const outsourcerIdRef = useRef(batch.outsourcer_id ?? '')
  const outsourcerAmountRef = useRef(batch.outsourcer_amount != null ? String(batch.outsourcer_amount) : '')
  const [deleting, setDeleting] = useState(false)
  const [delivering, setDelivering] = useState(false)

  const savePatch = async (patch: Record<string, unknown>) => {
    const res = await fetch(`/api/projects/${projectId}/task-batches/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (res.ok) onUpdate(batch.id, json.data)
  }

  const handleNameBlur = () => {
    if (name === nameRef.current) return
    nameRef.current = name
    savePatch({ name: name || batch.name })
  }

  const handleDueDateChange = (value: string) => {
    setDueDate(value)
    if (value === dueDateRef.current) return
    dueDateRef.current = value
    savePatch({ due_date: value || null })
  }

  const saveBatchShootingDate = async (value: string) => {
    if (value === batchShootingDateRef.current) return
    batchShootingDateRef.current = value
    const shootingDate = value || null
    const res = await fetch(`/api/projects/${projectId}/task-batches/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shooting_date: shootingDate }),
    })
    const json = await res.json()
    if (res.ok) {
      onUpdate(batch.id, json.data)
      if (onTaskDatesUpdated) {
        // APIが返した taskSchedule を優先、なければクライアント側で再計算
        const schedule: Record<number, string | null> = json.taskSchedule
          ?? (shootingDate
              ? calculateTaskSchedule(shootingDate, dueDate || null)
              : Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i + 1, null]))
            )
        onTaskDatesUpdated(batch.id, schedule)
      }
    }
  }

  const handleBatchShootingDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBatchShootingDate(value)
    saveBatchShootingDate(value)
  }

  const handleOutsourcerChange = (newId: string) => {
    setOutsourcerId(newId)
    outsourcerIdRef.current = newId
    savePatch({ outsourcer_id: newId || null })
  }

  const handleShootingTypeChange = (v: string) => { setShootingType(v); savePatch({ shooting_type: v || null }) }
  const handleFormatChange = (v: string) => { setFormat(v); savePatch({ format: v || null }) }
  const handleBatchTypeChange = (v: string) => { setBatchType(v); savePatch({ type: v || null }) }
  const handleEditorMemberChange = (v: string) => { setEditorMemberId(v); savePatch({ editor_member_id: v || null }) }
  const toggleCameraman = (id: string) => {
    const next = cameramanIds.includes(id) ? cameramanIds.filter((x) => x !== id) : [...cameramanIds, id]
    setCameramanIds(next)
    savePatch({ cameraman_ids: next })
  }

  const handleAmountBlur = () => {
    if (outsourcerAmount === outsourcerAmountRef.current) return
    outsourcerAmountRef.current = outsourcerAmount
    savePatch({ outsourcer_amount: outsourcerAmount ? parseInt(outsourcerAmount, 10) : null })
  }

  const handleDelete = async () => {
    if (!confirm(`「${name}」のタスクセットを削除しますか？`)) return
    setDeleting(true)
    await fetch(`/api/projects/${projectId}/task-batches/${batch.id}`, { method: 'DELETE' })
    onDelete(batch.id)
  }

  const handleDeliver = async () => {
    if (!confirm(`「${name}」の納品を完了しますか？`)) return
    setDelivering(true)
    const res = await fetch(`/api/projects/${projectId}/task-batches/${batch.id}/deliver`, { method: 'POST' })
    const json = await res.json()
    if (res.ok) onDeliver(batch.id, json.data.delivered_at)
    setDelivering(false)
  }

  const handleUndoDeliver = async () => {
    if (!confirm(`「${name}」の納品を取り消しますか？`)) return
    setDelivering(true)
    const res = await fetch(`/api/projects/${projectId}/task-batches/${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivered_at: null }),
    })
    const json = await res.json()
    if (res.ok) onDeliver(batch.id, null)
    setDelivering(false)
  }

  const editingOutsourcers = outsourcers.filter((o) => o.type === 'editing')
  const isDelivered = !!batch.delivered_at

  return (
    <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-slate-50 space-y-2">
      {/* 1行目: 名前（全幅） */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleNameBlur}
        className="w-full text-sm font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none"
      />
      {/* 2行目: タスク数・締日・削除 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
          {taskCount}件
        </span>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs text-gray-500 shrink-0">締日</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => handleDueDateChange(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded disabled:opacity-50 shrink-0" title="削除">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 2行目: 撮影日（撮影＋編集のみ） */}
      {workType === 'shooting_and_editing' && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 shrink-0">撮影日</span>
          <input
            type="date"
            value={batchShootingDate}
            onChange={handleBatchShootingDateChange}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
          />
        </div>
      )}

      {/* 撮影種別・フォーマット（撮影あり） */}
      {(workType === 'shooting_only' || workType === 'shooting_and_editing') && (
        <div className="flex items-center gap-2">
          <select value={shootingType} onChange={(e) => handleShootingTypeChange(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">撮影種別</option>
            {(Object.entries(SHOOTING_TYPE_LABELS) as [ShootingType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select value={format} onChange={(e) => handleFormatChange(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">フォーマット</option>
            <option value="landscape">横型</option>
            <option value="portrait">縦型</option>
          </select>
        </div>
      )}

      {/* 3行目: カメラマン（撮影あり） */}
      {(workType === 'shooting_only' || workType === 'shooting_and_editing') && staffMembers.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">カメラマン</p>
          <div className="flex flex-wrap gap-1">
            {staffMembers.map((m) => {
              const selected = cameramanIds.includes(m.id)
              return (
                <button key={m.id} type="button" onClick={() => toggleCameraman(m.id)}
                  className={`px-2 py-0.5 rounded text-xs border transition-all ${
                    selected ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {selected && '✓ '}{m.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4行目: 動画種別・編集者（編集あり） */}
      {(workType === 'editing_only' || workType === 'shooting_and_editing') && (
        <div className="flex items-center gap-2">
          <select value={batchType} onChange={(e) => handleBatchTypeChange(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">動画種別</option>
            {(Object.entries(EDITING_PROJECT_TYPE_LABELS) as [ProjectType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select value={editorMemberId} onChange={(e) => handleEditorMemberChange(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">編集者</option>
            {staffMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      {/* 外注者・金額・納品完了 */}
      {editingOutsourcers.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={outsourcerId}
            onChange={(e) => handleOutsourcerChange(e.target.value)}
            disabled={isDelivered}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 min-w-0"
          >
            <option value="">外注者なし</option>
            {editingOutsourcers.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">¥</span>
            <input
              type="number" min={0} step={1000}
              value={outsourcerAmount}
              onChange={(e) => setOutsourcerAmount(e.target.value)}
              onBlur={handleAmountBlur}
              disabled={isDelivered}
              placeholder="0"
              className="w-24 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
            />
          </div>
          {isDelivered ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                納品済み {new Date(batch.delivered_at!).toLocaleDateString('ja-JP')}
              </span>
              <button
                onClick={handleUndoDeliver}
                disabled={delivering}
                className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                title="納品を取り消す"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            </div>
          ) : outsourcerId ? (
            <button
              onClick={handleDeliver}
              disabled={delivering}
              className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {delivering ? '処理中...' : '納品完了'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ─── タスク初期化ボタン ────────────────────────────────────────────────────────

function InitTasksButton({
  projectId,
  batchId,
  onCreated,
}: {
  projectId: string
  batchId: string
  onCreated: (tasks: Task[]) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/task-batches/${batchId}/init-tasks`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? 'タスクの生成に失敗しました')
        return
      }
      onCreated(json.data.tasks ?? [])
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 text-center space-y-2">
      <p className="text-sm text-gray-400 italic">タスクがありません</p>
      <button
        onClick={handleInit}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
        {loading ? '生成中...' : 'タスクを生成'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── 動画フィードバックセクション ────────────────────────────────────────────

function VideoFeedbackSection() {
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const handleOpen = () => {
    const base = 'https://video-feedback-alpha.vercel.app/'
    const url = youtubeUrl.trim()
      ? `${base}?url=${encodeURIComponent(youtubeUrl.trim())}`
      : base
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        <h2 className="font-semibold text-gray-800">動画フィードバック</h2>
      </div>
      <div className="px-6 py-4 space-y-3">
        <p className="text-xs text-gray-500">YouTubeのURLを入力してフィードバックアプリを開きます</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 min-w-0"
          />
          <button
            onClick={handleOpen}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            レビューを開く
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function ProjectDetailClient({ project, outsourcers: outsourcersProp = [], staffMembers: staffMembersProp = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusError, setStatusError] = useState<string | null>(null)
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null)
  const [autoStatusMsg, setAutoStatusMsg] = useState<string | null>(null)
  const [outsourcers, setOutsourcers] = useState<ProjectOutsourcer[]>(
    (project.project_outsourcers ?? []) as ProjectOutsourcer[]
  )
  const [deliveringId, setDeliveringId] = useState<string | null>(null)
  const [batches, setBatches] = useState<(TaskBatch & { tasks: Task[] })[]>(
    () => (project.task_batches ?? []).map((b) => ({
      ...b,
      tasks: (b.tasks ?? []) as Task[],
    }))
  )
  // バッチIDごとのスケジュール日程（撮影日変更時に自動計算）
  const [batchScheduledDates, setBatchScheduledDates] = useState<Record<string, Record<number, string | null>>>({})
  const [addingBatch, setAddingBatch] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchDue, setNewBatchDue] = useState('')
  const [newBatchShootingDate, setNewBatchShootingDate] = useState('')
  const [newBatchDraftDate, setNewBatchDraftDate] = useState('')
  const [creatingBatch, setCreatingBatch] = useState(false)

  const [revenue, setRevenue] = useState<number | null>(project.revenue ?? null)
  const revenueInputRef = useRef<string>(project.revenue != null ? String(project.revenue) : '')

  const handleRevenueBlur = (value: string) => {
    const num = value.trim() ? parseInt(value.replace(/,/g, ''), 10) : null
    if (num === revenue) return
    setRevenue(num)
    patchProject({ revenue: num })
  }

  const [directorId, setDirectorId] = useState(project.director_id ?? '')

  const [shootingFields, setShootingFields] = useState({
    shooting_location:             project.shooting_location ?? '',
    model_name:                    project.model_name ?? '',
    kickoff_done:                  project.kickoff_done,
    calendar_done:                 project.calendar_done,
    rental_car_done:               project.rental_car_done,
    hotel_done:                    project.hotel_done,
    transport_reservation_done:    project.transport_reservation_done,
    equipment_reservation_done:    project.equipment_reservation_done,
  })
  const [projectShootingDate, setProjectShootingDate] = useState(project.shooting_date ?? '')
  const [projectCameramanIds, setProjectCameramanIds] = useState<string[]>(project.cameraman_ids ?? [])
  const [addingShootingOs, setAddingShootingOs] = useState(false)
  const [newShootingOsId, setNewShootingOsId] = useState('')
  const [newShootingOsAmount, setNewShootingOsAmount] = useState('')
  const [shootingDeliveringId, setShootingDeliveringId] = useState<string | null>(null)

  const handleStatusChange = (newStatus: ProjectStatus) => {
    setStatusError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        const json = await res.json()
        if (!res.ok || json.error) {
          setStatusError(json.error?.message ?? 'ステータス更新に失敗しました')
          return
        }
        router.refresh()
      } catch {
        setStatusError('ネットワークエラーが発生しました')
      }
    })
  }

  const handleTaskStatusChange = async (task: Task, newStatus: TaskStatus) => {
    setTaskUpdating(task.id)
    setAutoStatusMsg(null)
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { console.error('タスク更新失敗', json); return }
      if (newStatus === 'done') {
        setAutoStatusMsg(`「${task.title}」を完了しました`)
        setTimeout(() => setAutoStatusMsg(null), 3000)
      }
      // バッチ内タスクを楽観的更新
      setBatches((prev) => prev.map((b) => ({
        ...b,
        tasks: b.tasks.map((t) => t.id === task.id ? { ...t, status: newStatus } : t),
      })))
    } catch {
      console.error('ネットワークエラー')
    } finally {
      setTaskUpdating(null)
    }
  }

  const patchProject = async (patch: Record<string, unknown>) => {
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  const handleShootingBool = (key: 'kickoff_done' | 'calendar_done' | 'rental_car_done' | 'hotel_done' | 'transport_reservation_done' | 'equipment_reservation_done', value: boolean) => {
    setShootingFields((prev) => ({ ...prev, [key]: value }))
    patchProject({ [key]: value })
  }

  const handleDirectorChange = (id: string) => {
    setDirectorId(id)
    patchProject({ director_id: id || null })
  }

  const handleShootingDateChange = (value: string) => {
    setProjectShootingDate(value)
    patchProject({ shooting_date: value || null })
  }

  const handleShootingLocationBlur = (value: string) => {
    setShootingFields((prev) => ({ ...prev, shooting_location: value }))
    patchProject({ shooting_location: value.trim() || null })
  }

  const handleModelNameBlur = (value: string) => {
    setShootingFields((prev) => ({ ...prev, model_name: value }))
    patchProject({ model_name: value.trim() || null })
  }

  const handleToggleProjectCameraman = (id: string) => {
    const next = projectCameramanIds.includes(id)
      ? projectCameramanIds.filter((x) => x !== id)
      : [...projectCameramanIds, id]
    setProjectCameramanIds(next)
    patchProject({ cameraman_ids: next, cameraman_id: next[0] ?? null })
  }

  const shootingProjectOutsourcers = outsourcers.filter(
    (o) => (o.outsourcer as { type?: string } | null)?.type === 'shooting'
  )
  const availableShootingOutsourcers = outsourcersProp.filter((o) => o.type === 'shooting')

  const handleAddShootingOs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newShootingOsId || !newShootingOsAmount) return
    const existing = outsourcers.map((o) => ({ outsourcer_id: o.outsourcer_id, amount: o.amount }))
    const updated = [...existing, { outsourcer_id: newShootingOsId, amount: parseInt(newShootingOsAmount, 10) }]
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outsourcers: updated }),
    })
    if (res.ok) {
      router.refresh()
    }
    setNewShootingOsId('')
    setNewShootingOsAmount('')
    setAddingShootingOs(false)
  }

  const handleRemoveShootingOs = async (poId: string) => {
    if (!confirm('外注撮影者を削除しますか？')) return
    const updated = outsourcers
      .filter((o) => o.id !== poId)
      .map((o) => ({ outsourcer_id: o.outsourcer_id, amount: o.amount }))
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outsourcers: updated }),
    })
    if (res.ok) setOutsourcers((prev) => prev.filter((o) => o.id !== poId))
  }

  const handleDeliverShootingOs = async (poId: string) => {
    setShootingDeliveringId(poId)
    try {
      const res = await fetch(`/api/project-outsourcers/${poId}/deliver`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setOutsourcers((prev) =>
          prev.map((o) => o.id === poId ? { ...o, delivered_at: json.data.delivered_at } : o)
        )
      }
    } finally {
      setShootingDeliveringId(null)
    }
  }

  const handleDeliver = async (outsourcerId: string) => {
    setDeliveringId(outsourcerId)
    try {
      const res = await fetch(`/api/project-outsourcers/${outsourcerId}/deliver`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || json.error) return
      setOutsourcers((prev) =>
        prev.map((o) => o.id === outsourcerId ? { ...o, delivered_at: json.data.delivered_at } : o)
      )
    } finally {
      setDeliveringId(null)
    }
  }

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBatchName.trim()) return
    setCreatingBatch(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/task-batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBatchName.trim(), due_date: newBatchDue || null, shooting_date: newBatchShootingDate || null }),
      })
      const json = await res.json()
      if (!res.ok || json.error) return

      // 社内初稿日が設定されていればスケジュールを一括保存
      let tasks: Task[] = json.data.tasks ?? []
      if (newBatchDraftDate && json.data?.id) {
        const rRes = await fetch(`/api/projects/${project.id}/task-batches/${json.data.id}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_date: newBatchDraftDate, due_date: newBatchDue || null }),
        })
        if (rRes.ok) {
          const rJson = await rRes.json()
          const schedule: Record<number, string> = rJson.data?.taskSchedule ?? {}
          tasks = tasks.map((t) => ({ ...t, due_date: schedule[t.step_order] ?? t.due_date ?? null }))
        }
      }

      setBatches((prev) => [...prev, { ...json.data, tasks }])
      setNewBatchName('')
      setNewBatchDue('')
      setNewBatchShootingDate('')
      setNewBatchDraftDate('')
      setAddingBatch(false)
      if (newBatchDraftDate) toast.success('スケジュールを保存しました')
      // ルーターキャッシュを無効化して次回ナビゲーション時に最新データを取得
      router.refresh()
    } finally {
      setCreatingBatch(false)
    }
  }

  const handleBatchUpdate = (id: string, fields: Partial<TaskBatch>) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, ...fields } : b))
  }

  const handleBatchDelete = (id: string) => {
    setBatches((prev) => prev.filter((b) => b.id !== id))
  }

  const handleBatchDeliver = (id: string, deliveredAt: string | null) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, delivered_at: deliveredAt ?? undefined } : b))
  }

  const handleTaskDatesUpdated = (batchId: string, dates: Record<number, string | null>) => {
    setBatchScheduledDates((prev) => ({ ...prev, [batchId]: dates }))
  }

  const handleTaskHoursChange = (taskId: string, hours: number | null) => {
    setBatches((prev) => prev.map((b) => ({
      ...b,
      tasks: b.tasks.map((t) => t.id === taskId ? { ...t, actual_hours: hours } : t),
    })))
  }

  const handleTasksCreated = (batchId: string, tasks: Task[]) => {
    setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, tasks } : b))
    // ルーターキャッシュを無効化して次回ナビゲーション時に最新データを取得
    router.refresh()
  }

  const isShootingProject = project.work_type === 'shooting_only' || project.work_type === 'shooting_and_editing'

  return (
    <div className="space-y-6">
      {/* 自動ステータス更新通知 */}
      {autoStatusMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {autoStatusMsg} — ステータスを自動更新しました
        </div>
      )}

      {/* ステータス変更セレクト */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-medium text-blue-700 mb-3">ステータスを変更</p>
        <select
          value={project.status}
          onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
          disabled={isPending}
          className="w-full sm:w-auto text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {ALL_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {statusError && <p className="mt-2 text-sm text-red-600">{statusError}</p>}
      </div>

      {/* 売上・利益サマリー */}
      {(() => {
        const shootingCost = outsourcers.reduce((sum, o) => sum + (o.amount ?? 0), 0)
        const editingCost = batches.reduce((sum, b) => sum + (b.outsourcer_amount ?? 0), 0)
        const totalCost = shootingCost + editingCost
        const profit = revenue !== null ? revenue - totalCost : null
        const margin = revenue && revenue > 0 && profit !== null ? Math.round((profit / revenue) * 100) : null
        const isProfit = profit !== null && profit >= 0
        const totalHours = batches.reduce((sum, b) => sum + b.tasks.reduce((s, t) => s + (t.actual_hours ?? 0), 0), 0)
        const effectiveRate = totalHours > 0 && revenue !== null ? Math.round((revenue - totalCost) / totalHours) : null

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">売上・利益</h2>
              {margin !== null && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  margin >= 50 ? 'bg-green-100 text-green-700' :
                  margin >= 20 ? 'bg-yellow-100 text-yellow-700' :
                  margin >= 0  ? 'bg-orange-100 text-orange-700' :
                                 'bg-red-100 text-red-700'
                }`}>
                  利益率 {margin}%
                </span>
              )}
            </div>
            <div className="px-6 py-5">
              {/* 売上入力 */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">売上（クライアントへの請求額）</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">¥</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    defaultValue={revenue ?? ''}
                    onChange={(e) => { revenueInputRef.current = e.target.value }}
                    onBlur={(e) => handleRevenueBlur(e.target.value)}
                    placeholder="0"
                    className="flex-1 text-lg font-bold border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300 transition-colors"
                  />
                </div>
              </div>

              {/* 稼働時間サマリー */}
              {totalHours > 0 && (
                <div className="mb-4 flex items-center gap-4 px-4 py-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏱</span>
                    <div>
                      <p className="text-xs text-gray-500">総稼働時間</p>
                      <p className="text-lg font-bold text-gray-900">{totalHours.toFixed(1)}<span className="text-sm font-normal text-gray-500 ml-0.5">h</span></p>
                    </div>
                  </div>
                  {effectiveRate !== null && (
                    <>
                      <div className="w-px h-10 bg-gray-200" />
                      <div>
                        <p className="text-xs text-gray-500">実質時給（売上−外注費 ÷ 時間）</p>
                        <p className={`text-lg font-bold ${effectiveRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          ¥{effectiveRate.toLocaleString()}<span className="text-sm font-normal text-gray-500 ml-0.5">/h</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 3列サマリー */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">外注コスト</p>
                  <p className="text-lg font-bold text-gray-800">
                    ¥{totalCost.toLocaleString()}
                  </p>
                  {(shootingCost > 0 || editingCost > 0) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {shootingCost > 0 && `撮影 ¥${shootingCost.toLocaleString()}`}
                      {shootingCost > 0 && editingCost > 0 && ' + '}
                      {editingCost > 0 && `編集 ¥${editingCost.toLocaleString()}`}
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-3 text-center ${
                  profit === null ? 'bg-gray-50' :
                  isProfit ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">利益</p>
                  <p className={`text-lg font-bold ${
                    profit === null ? 'text-gray-400' :
                    isProfit ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {profit === null ? '—' : `${profit >= 0 ? '' : '-'}¥${Math.abs(profit).toLocaleString()}`}
                  </p>
                  {margin !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${
                      isProfit ? 'text-green-600' : 'text-red-600'
                    }`}>{margin}%</p>
                  )}
                </div>
                <div className={`rounded-xl p-3 text-center ${revenue !== null ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">売上</p>
                  <p className={`text-lg font-bold ${revenue !== null ? 'text-blue-700' : 'text-gray-400'}`}>
                    {revenue !== null ? `¥${revenue.toLocaleString()}` : '未設定'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ディレクター（編集あり案件） */}
      {project.work_type !== 'shooting_only' && staffMembersProp.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 shrink-0">ディレクター</label>
          <select
            value={directorId}
            onChange={(e) => handleDirectorChange(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="">未選択</option>
            {staffMembersProp.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 撮影準備チェック */}
      {isShootingProject && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">撮影準備チェック</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">撮影場所</label>
              <input
                type="text"
                value={shootingFields.shooting_location}
                onChange={(e) => setShootingFields((prev) => ({ ...prev, shooting_location: e.target.value }))}
                onBlur={(e) => handleShootingLocationBlur(e.target.value)}
                placeholder="撮影場所を入力"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">モデル</label>
              <input
                type="text"
                value={shootingFields.model_name}
                onChange={(e) => setShootingFields((prev) => ({ ...prev, model_name: e.target.value }))}
                onBlur={(e) => handleModelNameBlur(e.target.value)}
                placeholder="モデル名を入力"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 撮影日（撮影のみ） */}
            {project.work_type === 'shooting_only' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">撮影日</label>
                <input
                  type="date"
                  value={projectShootingDate}
                  onChange={(e) => handleShootingDateChange(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* カメラマン複数選択（撮影のみ） */}
            {project.work_type === 'shooting_only' && staffMembersProp.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-2 block">カメラマン（複数選択可）</label>
                <div className="flex flex-wrap gap-2">
                  {staffMembersProp.map((m) => {
                    const selected = projectCameramanIds.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleToggleProjectCameraman(m.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {selected && '✓ '}{m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'kickoff_done',                label: 'キックオフMTG済み' },
                { key: 'calendar_done',               label: 'カレンダーへの情報記入済み' },
                { key: 'rental_car_done',             label: 'レンタカー予約済み' },
                { key: 'hotel_done',                  label: 'ホテル予約済み' },
                { key: 'transport_reservation_done',  label: '飛行機・新幹線予約済み' },
                { key: 'equipment_reservation_done',  label: '機材予約済み' },
              ] as const).map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    shootingFields[key]
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={shootingFields[key]}
                    onChange={(e) => handleShootingBool(key, e.target.checked)}
                    className="w-4 h-4 accent-green-600 shrink-0"
                  />
                  <span className="text-sm font-medium">{label}</span>
                  {shootingFields[key] && (
                    <svg className="w-4 h-4 text-green-500 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 外注撮影者（撮影のみ） */}
      {project.work_type === 'shooting_only' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">外注撮影者</h2>
            {!addingShootingOs && (
              <button
                onClick={() => setAddingShootingOs(true)}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </button>
            )}
          </div>

          {/* 追加フォーム */}
          {addingShootingOs && availableShootingOutsourcers.length > 0 && (
            <form onSubmit={handleAddShootingOs} className="px-6 py-4 bg-blue-50 border-b border-blue-100 space-y-3">
              <p className="text-sm font-medium text-blue-700">外注撮影者を追加</p>
              <div className="flex gap-3 flex-wrap">
                <select
                  value={newShootingOsId}
                  onChange={(e) => setNewShootingOsId(e.target.value)}
                  required
                  className="flex-1 min-w-40 text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">外注者を選択</option>
                  {availableShootingOutsourcers.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">¥</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={newShootingOsAmount}
                    onChange={(e) => setNewShootingOsAmount(e.target.value)}
                    required
                    placeholder="金額"
                    className="w-32 text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingShootingOs(false); setNewShootingOsId(''); setNewShootingOsAmount('') }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}

          {shootingProjectOutsourcers.length === 0 && !addingShootingOs ? (
            <div className="px-6 py-8 text-center text-gray-400 italic text-sm">外注撮影者がいません</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {shootingProjectOutsourcers.map((o) => {
                const isDelivered = !!o.delivered_at
                return (
                  <li key={o.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {(o.outsourcer as { name?: string } | null)?.name ?? '不明'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">¥{o.amount.toLocaleString()}</p>
                      {isDelivered && (
                        <p className="text-xs text-green-600 mt-0.5">
                          納品済み: {new Date(o.delivered_at!).toLocaleDateString('ja-JP')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isDelivered ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                          納品完了
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeliverShootingOs(o.id)}
                          disabled={shootingDeliveringId === o.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {shootingDeliveringId === o.id ? '処理中...' : '納品完了'}
                        </button>
                      )}
                      {!isDelivered && (
                        <button
                          onClick={() => handleRemoveShootingOs(o.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* タスクバッチ（編集あり案件） */}
      {project.work_type !== 'shooting_only' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">タスク</h2>
            <button
              onClick={() => setAddingBatch(true)}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              タスクセットを追加
            </button>
          </div>

          {/* 新規バッチ追加フォーム */}
          {addingBatch && (
            <form
              onSubmit={handleAddBatch}
              className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3"
            >
              <p className="text-sm font-medium text-blue-700">新しいタスクセット</p>
              <input
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="動画名（例: 動画①）"
                required
                className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">社内初稿日</span>
                  <input
                    type="date"
                    value={newBatchDraftDate}
                    onChange={(e) => setNewBatchDraftDate(e.target.value)}
                    className="text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">締日</span>
                  <input
                    type="date"
                    value={newBatchDue}
                    onChange={(e) => setNewBatchDue(e.target.value)}
                    className="text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {newBatchDraftDate && (
                <p className="text-xs text-blue-600">
                  📅 社内初稿日を基準に全16工程のスケジュールを自動設定します
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingBatch}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creatingBatch ? '作成中...' : '作成'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingBatch(false); setNewBatchName(''); setNewBatchDue(''); setNewBatchShootingDate(''); setNewBatchDraftDate('') }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}

          {batches.length === 0 && !addingBatch && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400 italic text-sm">
              タスクセットがありません。「タスクセットを追加」から作成してください。
            </div>
          )}

          {/* 横スクロール */}
          {batches.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-none w-80"
                >
                  <BatchHeader
                    batch={batch}
                    projectId={project.id}
                    taskCount={batch.tasks.length}
                    outsourcers={outsourcersProp}
                    staffMembers={staffMembersProp}
                    workType={project.work_type}
                    onUpdate={handleBatchUpdate}
                    onDelete={handleBatchDelete}
                    onDeliver={handleBatchDeliver}
                    onTaskDatesUpdated={handleTaskDatesUpdated}
                  />
                  {batch.tasks.length > 0 ? (
                    <BatchTaskList
                      projectId={project.id}
                      batchId={batch.id}
                      batchDueDate={batch.due_date ?? null}
                      tasks={batch.tasks}
                      onStatusChange={handleTaskStatusChange}
                      onHoursChange={handleTaskHoursChange}
                      updatingId={taskUpdating}
                      scheduledDates={batchScheduledDates[batch.id]}
                      onScheduleCascade={(dates) => handleTaskDatesUpdated(batch.id, dates)}
                    />
                  ) : (
                    <InitTasksButton
                      projectId={project.id}
                      batchId={batch.id}
                      onCreated={(tasks) => handleTasksCreated(batch.id, tasks)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 外注者・納品管理 */}
      {project.work_type !== 'shooting_only' && outsourcers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">外注者・納品管理</h2>
          </div>
          <ul className="divide-y divide-gray-50">
            {outsourcers.map((o) => {
              const outsourcerName = (o.outsourcer as { name?: string } | null)?.name ?? '不明'
              const isDelivered = !!o.delivered_at
              return (
                <li key={o.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{outsourcerName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">¥{o.amount.toLocaleString()}</p>
                    {isDelivered && (
                      <p className="text-xs text-green-600 mt-0.5">
                        納品済み: {new Date(o.delivered_at!).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                  {isDelivered ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 shrink-0">
                      納品完了
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDeliver(o.id)}
                      disabled={deliveringId === o.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {deliveringId === o.id ? '処理中...' : '納品完了'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 動画フィードバック */}
      <VideoFeedbackSection />
    </div>
  )
}
