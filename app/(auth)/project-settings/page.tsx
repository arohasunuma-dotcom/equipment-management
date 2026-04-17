'use client'

import { useEffect, useState } from 'react'
import type { AppSetting } from '@/types/projects'
import { OUTSOURCER_TYPE_LABELS } from '@/lib/projectConstants'

type Tab = 'members' | 'outsourcers' | 'clients' | 'youtube' | 'thresholds'

interface StaffMember {
  id: string
  name: string
  slack_id?: string | null
  is_active: boolean
  created_at: string
}

interface OutsourcerItem {
  id: string
  name: string
  type: 'shooting' | 'editing'
  notes?: string | null
  is_active: boolean
  created_at: string
}

interface ClientItem {
  id: string
  name: string
  areas: string[]
  created_at: string
}

const AREA_OPTIONS = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜',
  '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫',
  '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎',
  '熊本', '大分', '宮崎', '鹿児島', '沖縄',
]

export default function ProjectSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('members')

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">案件設定</h1>

      {/* タブ */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {([
            { key: 'members', label: 'メンバー' },
            { key: 'outsourcers', label: '外注者' },
            { key: 'clients', label: 'クライアント' },
            { key: 'youtube', label: 'YouTubeアカウント' },
            { key: 'thresholds', label: '閾値設定' },
          ] as { key: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-800 text-slate-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'members' && <MembersTab />}
      {activeTab === 'outsourcers' && <OutsourcersTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'youtube' && <YoutubeAccountsTab />}
      {activeTab === 'thresholds' && <ThresholdsTab />}
    </div>
  )
}

// ─── メンバータブ ───────────────────────────────────────────────────────────

function MembersTab() {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 追加フォーム
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formSlackId, setFormSlackId] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // 編集
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlackId, setEditSlackId] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/staff-members')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error.message)
        else setMembers(json.data ?? [])
      })
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/staff-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, slack_id: formSlackId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setFormError(json.error?.message ?? '登録に失敗しました'); return }
      setFormName('')
      setFormSlackId('')
      setShowForm(false)
      setMembers((prev) => [...prev, json.data])
    } catch {
      setFormError('ネットワークエラーが発生しました')
    } finally {
      setFormSubmitting(false)
    }
  }

  const startEdit = (m: StaffMember) => {
    setEditingId(m.id)
    setEditName(m.name)
    setEditSlackId(m.slack_id ?? '')
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const handleEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault()
    setEditError(null)
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/staff-members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, slack_id: editSlackId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setEditError(json.error?.message ?? '更新に失敗しました'); return }
      setMembers((prev) => prev.map((m) => m.id === id ? json.data : m))
      setEditingId(null)
    } catch {
      setEditError('ネットワークエラーが発生しました')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/staff-members/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) { alert(json.error?.message ?? '削除に失敗しました'); return }
      setMembers((prev) => prev.filter((m) => m.id !== id))
    } catch {
      alert('ネットワークエラーが発生しました')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingPlaceholder />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">メンバー一覧</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{members.length}名</span>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(null) }}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            追加
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="px-6 py-4 bg-blue-50 border-b border-blue-100 space-y-3">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">名前 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="例：田中 太郎"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Slack ID</label>
              <input
                type="text"
                value={formSlackId}
                onChange={(e) => setFormSlackId(e.target.value)}
                placeholder="例：U0123456789"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={formSubmitting}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {formSubmitting ? '登録中...' : '登録'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(null) }}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <div className="p-8 text-center text-gray-400 italic text-sm">メンバーがいません</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {members.map((m) => (
            <li key={m.id} className="px-6 py-4">
              {editingId === m.id ? (
                <form onSubmit={(e) => handleEdit(e, m.id)} className="space-y-3">
                  {editError && <p className="text-sm text-red-600">{editError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">名前 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Slack ID</label>
                      <input
                        type="text"
                        value={editSlackId}
                        onChange={(e) => setEditSlackId(e.target.value)}
                        placeholder="例：U0123456789"
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={editSubmitting}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {editSubmitting ? '保存中...' : '保存'}
                    </button>
                    <button type="button" onClick={cancelEdit}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors">
                      キャンセル
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    {m.slack_id && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                        </svg>
                        {m.slack_id}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(m)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      disabled={deleting === m.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50"
                      title="削除"
                    >
                      {deleting === m.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── 外注者タブ ──────────────────────────────────────────────────────────────

function OutsourcersTab() {
  const [outsourcers, setOutsourcers] = useState<OutsourcerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'shooting' | 'editing'>('shooting')
  const [formNotes, setFormNotes] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/outsourcers')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error.message)
        else setOutsourcers(json.data ?? [])
      })
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/outsourcers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, type: formType, notes: formNotes || null }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setFormError(json.error?.message ?? '登録に失敗しました'); return }
      setFormName('')
      setFormType('shooting')
      setFormNotes('')
      setShowForm(false)
      load()
    } catch {
      setFormError('ネットワークエラーが発生しました')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/outsourcers/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) { alert(json.error?.message ?? '削除に失敗しました'); return }
      setOutsourcers((prev) => prev.filter((o) => o.id !== id))
    } catch {
      alert('ネットワークエラーが発生しました')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingPlaceholder />
  if (error) return <ErrorMessage message={error} />

  const shooting = outsourcers.filter((o) => o.type === 'shooting')
  const editing = outsourcers.filter((o) => o.type === 'editing')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">外注者一覧</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{outsourcers.length}名</span>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            追加
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="px-6 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">名前 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              placeholder="例：鈴木 カメラマン"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">種別 <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {(['shooting', 'editing'] as const).map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm cursor-pointer transition-all ${
                    formType === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="outsourcerType"
                    value={t}
                    checked={formType === t}
                    onChange={() => setFormType(t)}
                    className="sr-only"
                  />
                  {OUTSOURCER_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">備考</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="例：専門分野など"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={formSubmitting}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {formSubmitting ? '登録中...' : '登録'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(null) }}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {outsourcers.length === 0 ? (
        <div className="p-8 text-center text-gray-400 italic text-sm">外注者がいません</div>
      ) : (
        <div>
          {shooting.length > 0 && (
            <div>
              <div className="px-6 py-2 bg-orange-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-orange-700 uppercase tracking-widest">撮影外注</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {shooting.map((o) => <OutsourcerRow key={o.id} o={o} deleting={deleting} onDelete={handleDelete} />)}
              </ul>
            </div>
          )}
          {editing.length > 0 && (
            <div>
              <div className="px-6 py-2 bg-violet-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-widest">編集外注</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {editing.map((o) => <OutsourcerRow key={o.id} o={o} deleting={deleting} onDelete={handleDelete} />)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OutsourcerRow({
  o,
  deleting,
  onDelete,
}: {
  o: OutsourcerItem
  deleting: string | null
  onDelete: (id: string, name: string) => void
}) {
  return (
    <li className="px-6 py-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0">
        {o.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{o.name}</p>
        {o.notes && <p className="text-xs text-gray-500 mt-0.5">{o.notes}</p>}
      </div>
      <button
        onClick={() => onDelete(o.id, o.name)}
        disabled={deleting === o.id}
        className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50"
        title="削除"
      >
        {deleting === o.id ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    </li>
  )
}

// ─── クライアントタブ ────────────────────────────────────────────────────────

function ClientsTab() {
  const [clients, setClients] = useState<ClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formAreas, setFormAreas] = useState<string[]>([])
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/clients')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error.message)
        else setClients(json.data ?? [])
      })
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleArea = (area: string) => {
    setFormAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, areas: formAreas }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setFormError(json.error?.message ?? '登録に失敗しました'); return }
      setFormName('')
      setFormAreas([])
      setShowForm(false)
      load()
    } catch {
      setFormError('ネットワークエラーが発生しました')
    } finally {
      setFormSubmitting(false)
    }
  }

  if (loading) return <LoadingPlaceholder />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">クライアント一覧</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            追加
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="px-6 py-4 bg-gray-50 border-b border-gray-100 space-y-4">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div>
              <label className="text-xs text-gray-600 mb-1 block">クライアント名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                maxLength={100}
                placeholder="例：株式会社〇〇"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-2 block">
                エリア
                {formAreas.length > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">{formAreas.length}件選択中</span>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {AREA_OPTIONS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      formAreas.includes(area)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={formSubmitting}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {formSubmitting ? '登録中...' : '登録'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError(null); setFormAreas([]) }}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                キャンセル
              </button>
            </div>
          </form>
        )}

        {clients.length === 0 ? (
          <div className="p-8 text-center text-gray-400 italic text-sm">クライアントがいません</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {clients.map((c) => (
              <li key={c.id} className="px-6 py-4">
                <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                {c.areas && c.areas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.areas.map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── 閾値設定タブ ────────────────────────────────────────────────────────────

function ThresholdsTab() {
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/project-settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error.message)
        else {
          const list: AppSetting[] = json.data ?? []
          setSettings(list)
          const initial: Record<string, string> = {}
          for (const s of list) initial[s.key] = s.value
          setValues(initial)
        }
      })
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (key: string) => {
    setSaveError(null)
    setSaveSuccess(null)
    setSaving(key)
    try {
      const res = await fetch('/api/project-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: values[key] ?? '' }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setSaveError(json.error?.message ?? '保存に失敗しました'); return }
      setSaveSuccess(key)
      setTimeout(() => setSaveSuccess(null), 2000)
    } catch {
      setSaveError('ネットワークエラーが発生しました')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <LoadingPlaceholder />
  if (error) return <ErrorMessage message={error} />

  const thresholdKeys = [
    { key: 'fb_warning_days', label: 'FB警告日数', description: 'FB期限の何日前に警告を出すか' },
    { key: 'edit_warning_days', label: '編集警告日数', description: '編集開始予定日の何日前に警告を出すか' },
  ]
  const displayKeys = [
    ...thresholdKeys,
    ...settings
      .filter((s) => !thresholdKeys.some((t) => t.key === s.key))
      .map((s) => ({ key: s.key, label: s.key, description: '' })),
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">閾値設定</h2>
        <p className="text-xs text-gray-500 mt-0.5">Slack通知などのタイミングを設定します</p>
      </div>
      {saveError && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{saveError}</div>
      )}
      <div className="divide-y divide-gray-50">
        {displayKeys.map((item) => (
          <div key={item.key} className="px-6 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number" min={0} max={365}
                value={values[item.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
                className="w-20 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">日</span>
              <button
                onClick={() => handleSave(item.key)}
                disabled={saving === item.key}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {saving === item.key ? '...' : saveSuccess === item.key ? '保存済み' : '保存'}
              </button>
            </div>
          </div>
        ))}
        {displayKeys.length === 0 && (
          <div className="p-8 text-center text-gray-400 italic text-sm">設定項目がありません</div>
        )}
      </div>
    </div>
  )
}

// ─── YouTubeアカウントタブ ────────────────────────────────────────────────────

interface YoutubeAccountItem {
  id: string
  channel_name: string
  channel_id: string
  contact_name?: string | null
  notes?: string | null
}

function YoutubeAccountsTab() {
  const [accounts, setAccounts] = useState<YoutubeAccountItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formChannelName, setFormChannelName] = useState('')
  const [formChannelId, setFormChannelId] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/youtube-accounts')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error.message)
        else setAccounts(json.data ?? [])
      })
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/youtube-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_name: formChannelName,
          channel_id: formChannelId || formChannelName,
          notes: formNotes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setFormError(json.error?.message ?? '登録に失敗しました'); return }
      setFormChannelName('')
      setFormChannelId('')
      setFormNotes('')
      setShowForm(false)
      load()
    } catch {
      setFormError('ネットワークエラーが発生しました')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？スケジュールもすべて削除されます。`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/youtube-accounts/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) { alert(json.error?.message ?? '削除に失敗しました'); return }
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      alert('ネットワークエラーが発生しました')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingPlaceholder />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">YouTubeアカウント一覧</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{accounts.length}件</span>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            追加
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="px-6 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">チャンネル名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formChannelName}
              onChange={(e) => setFormChannelName(e.target.value)}
              required
              placeholder="例：不動産チャンネル"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">チャンネルID <span className="text-gray-400">（省略時はチャンネル名を使用）</span></label>
            <input
              type="text"
              value={formChannelId}
              onChange={(e) => setFormChannelId(e.target.value)}
              placeholder="例：@fudosan_channel"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">備考</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="例：メインチャンネル"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={formSubmitting}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {formSubmitting ? '登録中...' : '登録'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(null) }}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {accounts.length === 0 ? (
        <div className="p-8 text-center text-gray-400 italic text-sm">アカウントがありません</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {accounts.map((a) => (
            <li key={a.id} className="px-6 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.593 7.203a2.506 2.506 0 00-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.44a2.56 2.56 0 00-1.766 1.763C2 8.773 2 12.001 2 12.001s0 3.226.403 4.795a2.506 2.506 0 001.762 1.766C5.736 19 12 19 12 19s6.265 0 7.831-.44a2.506 2.506 0 001.762-1.766C22 15.23 22 12 22 12s0-3.226-.407-4.797zM10 15.001l.001-6 5.198 3.001L10 15.001z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{a.channel_name}</p>
                <p className="text-xs text-gray-500">{a.channel_id}</p>
                {a.notes && <p className="text-xs text-gray-400 mt-0.5">{a.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(a.id, a.channel_name)}
                disabled={deleting === a.id}
                className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50"
                title="削除"
              >
                {deleting === a.id ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LoadingPlaceholder() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
      <span className="text-gray-400 text-sm animate-pulse">読み込み中...</span>
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <p className="text-red-500 text-sm">{message}</p>
    </div>
  )
}
