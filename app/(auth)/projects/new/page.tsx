'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Client, WorkType, Outsourcer } from '@/types/projects'
import { WORK_TYPE_LABELS, SHOOTING_TYPE_LABELS, EDITING_PROJECT_TYPE_LABELS } from '@/lib/projectConstants'

interface StaffMember { id: string; name: string }
interface BatchEntry {
  name: string
  due_date: string
  shooting_date: string
  outsourcer_id: string
  outsourcer_amount: string
  shooting_type: string
  format: string
  cameraman_ids: string[]
  type: string
  editor_member_id: string
}

function emptyBatch(): BatchEntry {
  return { name: '', due_date: '', shooting_date: '', outsourcer_id: '', outsourcer_amount: '', shooting_type: '', format: '', cameraman_ids: [], type: '', editor_member_id: '' }
}

// ─── ラジオグループ ────────────────────────────────────────────────────────────

function RadioGroup<T extends string>({
  label, name, value, options, onChange, required,
}: {
  label: string; name: string; value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-3 flex-wrap">
        {options.map((o) => (
          <label key={o.value}
            className={`flex items-center justify-center px-4 py-2.5 border rounded-xl text-sm cursor-pointer transition-all ${
              value === o.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value}
              onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function MemberSelect({ label, value, members, onChange }: {
  label: string; value: string; members: StaffMember[]; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
        <option value="">未選択</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  )
}

// ─── タスクセット入力セクション ────────────────────────────────────────────────

function BatchSection({ entries, outsourcers, staffMembers, workType, onAdd, onRemove, onUpdate, onToggleCameraman }: {
  entries: BatchEntry[]
  outsourcers: Outsourcer[]
  staffMembers: StaffMember[]
  workType: WorkType
  onAdd: () => void
  onRemove: (idx: number) => void
  onUpdate: (idx: number, field: keyof BatchEntry, value: string) => void
  onToggleCameraman: (idx: number, id: string) => void
}) {
  const editingOutsourcers = outsourcers.filter((o) => o.type === 'editing')
  const hasShooting = workType === 'shooting_only' || workType === 'shooting_and_editing'
  const hasEditing = workType !== 'shooting_only'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          タスクセット
          <span className="ml-1.5 text-xs font-normal text-gray-400">（動画ごとに追加）</span>
        </label>
        <button type="button" onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          追加
        </button>
      </div>
      {entries.length === 0 ? (
        <button type="button" onClick={onAdd}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
          + タスクセットを追加
        </button>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
              {/* 名前（全幅） */}
              <input type="text" value={entry.name}
                onChange={(e) => onUpdate(idx, 'name', e.target.value)}
                placeholder={`動画${idx + 1}（例: ルームツアー①）`}
                required
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* 撮影日・締日・削除 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-gray-500 shrink-0">撮影日</span>
                  <input type="date" value={entry.shooting_date}
                    onChange={(e) => onUpdate(idx, 'shooting_date', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-gray-500 shrink-0">締日</span>
                  <input type="date" value={entry.due_date}
                    onChange={(e) => onUpdate(idx, 'due_date', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button type="button" onClick={() => onRemove(idx)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 撮影種別・フォーマット */}
              {hasShooting && (
                <div className="flex gap-2">
                  <select value={entry.shooting_type} onChange={(e) => onUpdate(idx, 'shooting_type', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">撮影種別</option>
                    {Object.entries(SHOOTING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select value={entry.format} onChange={(e) => onUpdate(idx, 'format', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">フォーマット</option>
                    <option value="landscape">横型</option>
                    <option value="portrait">縦型</option>
                  </select>
                </div>
              )}

              {/* カメラマン */}
              {hasShooting && staffMembers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">カメラマン</p>
                  <div className="flex flex-wrap gap-1">
                    {staffMembers.map((m) => {
                      const selected = entry.cameraman_ids.includes(m.id)
                      return (
                        <button key={m.id} type="button" onClick={() => onToggleCameraman(idx, m.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                            selected ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}>
                          {selected && '✓ '}{m.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 動画種別・編集者 */}
              {hasEditing && (
                <div className="flex gap-2">
                  <select value={entry.type} onChange={(e) => onUpdate(idx, 'type', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">動画種別</option>
                    {Object.entries(EDITING_PROJECT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select value={entry.editor_member_id} onChange={(e) => onUpdate(idx, 'editor_member_id', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">編集者</option>
                    {staffMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* 外注者・金額 */}
              {editingOutsourcers.length > 0 && hasEditing && (
                <div className="flex items-center gap-2">
                  <select value={entry.outsourcer_id} onChange={(e) => onUpdate(idx, 'outsourcer_id', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">外注者（任意）</option>
                    {editingOutsourcers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm text-gray-500">¥</span>
                    <input type="number" min={0} step={1000} value={entry.outsourcer_amount}
                      onChange={(e) => onUpdate(idx, 'outsourcer_amount', e.target.value)}
                      placeholder="0"
                      className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={onAdd}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
            + もう一つ追加
          </button>
        </div>
      )}
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const router = useRouter()

  const [workType, setWorkType] = useState<WorkType>('shooting_and_editing')
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [shootingDate, setShootingDate] = useState('')
  const [directorId, setDirectorId] = useState('')
  const [notes, setNotes] = useState('')
  const [titleError, setTitleError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([])

  const [clients, setClients] = useState<Client[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [outsourcers, setOutsourcers] = useState<Outsourcer[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/staff-members').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/outsourcers').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([c, s, o]) => {
      setClients(c.data ?? [])
      setStaffMembers(s.data ?? [])
      setOutsourcers(o.data ?? [])
    }).finally(() => setLoadingMaster(false))
  }, [])

  function handleWorkTypeChange(wt: WorkType) {
    setWorkType(wt)
    setBatchEntries([])
  }

  function addBatchEntry() { setBatchEntries((prev) => [...prev, emptyBatch()]) }
  function removeBatchEntry(idx: number) { setBatchEntries((prev) => prev.filter((_, i) => i !== idx)) }
  function updateBatchEntry(idx: number, field: keyof BatchEntry, value: string) {
    setBatchEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }
  function toggleBatchCameraman(idx: number, id: string) {
    setBatchEntries((prev) => prev.map((e, i) => {
      if (i !== idx) return e
      const ids = e.cameraman_ids.includes(id) ? e.cameraman_ids.filter((x) => x !== id) : [...e.cameraman_ids, id]
      return { ...e, cameraman_ids: ids }
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setTitleError('タイトルは必須です'); return }
    setTitleError('')
    setSubmitting(true)
    setServerError(null)

    const hasEditing = workType !== 'shooting_only'
    const validBatches = hasEditing
      ? batchEntries.filter((b) => b.name.trim()).map((b) => ({
          name: b.name.trim(),
          due_date: b.due_date || null,
          shooting_date: b.shooting_date || null,
          outsourcer_id: b.outsourcer_id || null,
          outsourcer_amount: b.outsourcer_amount ? parseInt(b.outsourcer_amount, 10) : null,
          shooting_type: b.shooting_type || null,
          format: b.format || null,
          cameraman_ids: b.cameraman_ids.length > 0 ? b.cameraman_ids : null,
          type: b.type || null,
          editor_member_id: b.editor_member_id || null,
        }))
      : undefined

    const body = {
      title: title.trim(),
      client_id: clientId || null,
      type: 'other',
      work_type: workType,
      format: 'landscape',
      shooting_date: workType === 'shooting_only' ? (shootingDate || null) : null,
      director_id: hasEditing ? (directorId || null) : null,
      notes: notes.trim() || null,
      batches: validBatches,
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`)
      const id: string = json?.data?.id ?? json?.id
      router.push(id ? `/projects/${id}` : '/projects')
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : '送信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const hasShootingComponent = workType === 'shooting_only' || workType === 'shooting_and_editing'
  const hasEditingComponent = workType !== 'shooting_only'

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-800">新規案件作成</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{serverError}</div>
        )}

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input type="text" value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError('') }}
            placeholder="例: 〇〇様ルームツアー"
            className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              titleError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          />
          {titleError && <p className="mt-1 text-xs text-red-600">{titleError}</p>}
        </div>

        {/* クライアント */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">クライアント</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}
            disabled={loadingMaster}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50">
            <option value="">未選択</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* 案件タイプ */}
        <RadioGroup
          label="案件タイプ" name="work_type" value={workType}
          options={Object.entries(WORK_TYPE_LABELS).map(([value, label]) => ({ value: value as WorkType, label }))}
          onChange={handleWorkTypeChange}
          required
        />

        {/* 撮影のみ: 撮影日 */}
        {hasShootingComponent && workType === 'shooting_only' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">撮影日</label>
            <input type="date" value={shootingDate} onChange={(e) => setShootingDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
          </div>
        )}

        {/* 編集系: ディレクター */}
        {hasEditingComponent && (
          <MemberSelect label="ディレクター" value={directorId} members={staffMembers} onChange={setDirectorId} />
        )}

        {/* タスクセット（編集あり） */}
        {hasEditingComponent && (
          <BatchSection
            entries={batchEntries}
            outsourcers={outsourcers}
            staffMembers={staffMembers}
            workType={workType}
            onAdd={addBatchEntry}
            onRemove={removeBatchEntry}
            onUpdate={updateBatchEntry}
            onToggleCameraman={toggleBatchCameraman}
          />
        )}

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">備考</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="補足事項があれば記入"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            キャンセル
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            {submitting ? '作成中...' : '案件を作成'}
          </button>
        </div>
      </form>
    </div>
  )
}
