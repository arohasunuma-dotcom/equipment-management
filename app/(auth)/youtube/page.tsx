'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { YoutubeAccount, YoutubeSchedule, YoutubeOutsourcerEntry } from '@/types/projects'

interface StaffMember {
  id: string
  name: string
}

interface OutsourcerOption {
  id: string
  name: string
  type: 'shooting' | 'editing'
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '未着手' },
  { value: 'editing', label: '編集中' },
  { value: 'delivered', label: '納品済み' },
  { value: 'reserved', label: '予約済み' },
  { value: 'posted', label: '投稿済み' },
]

// isClient = 先方関係（オレンジ色）
const MILESTONE_KEYS: { key: string; label: string; isClient?: boolean }[] = [
  { key: 'script_draft',       label: '撮影台本初稿' },
  { key: 'script_fb',          label: '台本FB' },
  { key: 'script_client',      label: '台本先方提出',    isClient: true },
  { key: 'shooting',           label: '撮影日' },
  { key: 'footage_share',      label: '撮影素材共有' },
  { key: 'internal_draft',     label: '社内初稿' },
  { key: 'internal_fb',        label: '社内FB' },
  { key: 'client_first_draft', label: '先方初稿提出',    isClient: true },
  { key: 'client_fb',          label: '先方FB',          isClient: true },
  { key: 'internal_v2',        label: '社内第２稿' },
  { key: 'client_revision',    label: '修正稿提出',      isClient: true },
  { key: 'client_final',       label: '先方最終確認',    isClient: true },
  { key: 'owner_check',        label: 'お施主様チェック', isClient: true },
  { key: 'delivery',           label: '納品日' },
  { key: 'thumbnail',          label: 'サムネ作成日' },
]

// ─── ページ本体 ───────────────────────────────────────────────────────────────

function getMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-')
  return `${y}年${parseInt(m)}月`
}

export default function YouTubePage() {
  const searchParams = useSearchParams()
  const initialAccountId = searchParams.get('account_id')

  const [accounts, setAccounts] = useState<YoutubeAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<YoutubeSchedule[]>([])
  const [members, setMembers] = useState<StaffMember[]>([])
  const [outsourcers, setOutsourcers] = useState<OutsourcerOption[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [editingAccount, setEditingAccount] = useState<YoutubeAccount | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string | null>(getMonthStr(new Date()))

  useEffect(() => {
    fetch('/api/youtube-accounts')
      .then((r) => r.json())
      .then((json) => {
        const list: YoutubeAccount[] = json.data ?? []
        setAccounts(list)
        if (initialAccountId && list.find((a) => a.id === initialAccountId)) {
          setActiveAccountId(initialAccountId)
        } else if (list.length > 0) {
          setActiveAccountId(list[0].id)
        }
      })
      .finally(() => setLoadingAccounts(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/staff-members')
      .then((r) => r.json())
      .then((json) => setMembers(json.data ?? []))
    fetch('/api/outsourcers')
      .then((r) => r.json())
      .then((json) => setOutsourcers(json.data ?? []))
  }, [])

  const loadSchedules = useCallback((accountId: string) => {
    setLoadingSchedules(true)
    fetch(`/api/youtube-schedules?account_id=${accountId}`)
      .then((r) => r.json())
      .then((json) => setSchedules(json.data ?? []))
      .finally(() => setLoadingSchedules(false))
  }, [])

  useEffect(() => {
    if (activeAccountId) loadSchedules(activeAccountId)
  }, [activeAccountId, loadSchedules])

  const handleAccountAdded = (account: YoutubeAccount) => {
    setAccounts((prev) => [...prev, account])
    setActiveAccountId(account.id)
    setShowAddAccount(false)
  }

  const handleAccountUpdated = (account: YoutubeAccount) => {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)))
    setEditingAccount(null)
  }

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`「${name}」とそのスケジュールをすべて削除しますか？`)) return
    const res = await fetch(`/api/youtube-accounts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const remaining = accounts.filter((a) => a.id !== id)
      setAccounts(remaining)
      if (activeAccountId === id) {
        setActiveAccountId(remaining[0]?.id ?? null)
        setSchedules([])
      }
    }
  }

  const handleAddRow = async () => {
    if (!activeAccountId) return
    setAddingRow(true)
    // activeMonth が設定されている場合はその月の1日をデフォルト投稿日にする
    const post_date = activeMonth ? `${activeMonth}-01` : null
    const res = await fetch('/api/youtube-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtube_account_id: activeAccountId, ...(post_date ? { post_date } : {}) }),
    })
    const json = await res.json()
    if (res.ok && json.data) {
      setSchedules((prev) => [...prev, json.data])
    }
    setAddingRow(false)
  }

  const handleUpdate = async (id: string, patch: Partial<YoutubeSchedule>) => {
    const res = await fetch(`/api/youtube-schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (res.ok && json.data) {
      setSchedules((prev) => prev.map((s) => (s.id === id ? json.data : s)))
    }
  }

  const handleDeleteRow = async (id: string) => {
    if (!confirm('この行を削除しますか？')) return
    const res = await fetch(`/api/youtube-schedules/${id}`, { method: 'DELETE' })
    if (res.ok) setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const filteredSchedules = (activeMonth
    ? schedules.filter((s) => s.post_date?.startsWith(activeMonth))
    : schedules
  ).slice().sort((a, b) => {
    if (!a.post_date && !b.post_date) return 0
    if (!a.post_date) return 1
    if (!b.post_date) return -1
    return a.post_date.localeCompare(b.post_date)
  })

  const prevMonth = () => {
    if (!activeMonth) { setActiveMonth(getMonthStr(new Date())); return }
    const [y, m] = activeMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setActiveMonth(getMonthStr(d))
  }
  const nextMonth = () => {
    if (!activeMonth) { setActiveMonth(getMonthStr(new Date())); return }
    const [y, m] = activeMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    setActiveMonth(getMonthStr(d))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">YouTube管理</h1>
        <button
          onClick={() => setShowAddAccount(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          アカウント追加
        </button>
      </div>

      {showAddAccount && (
        <AddAccountModal members={members} onAdded={handleAccountAdded} onClose={() => setShowAddAccount(false)} />
      )}
      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          members={members}
          onUpdated={handleAccountUpdated}
          onClose={() => setEditingAccount(null)}
        />
      )}

      {loadingAccounts ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-slate-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center space-y-3">
          <svg className="w-12 h-12 text-gray-200 mx-auto" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.593 7.203a2.506 2.506 0 00-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.44a2.56 2.56 0 00-1.766 1.763C2 8.773 2 12.001 2 12.001s0 3.226.403 4.795a2.506 2.506 0 001.762 1.766C5.736 19 12 19 12 19s6.265 0 7.831-.44a2.506 2.506 0 001.762-1.766C22 15.23 22 12 22 12s0-3.226-.407-4.797zM10 15.001l.001-6 5.198 3.001L10 15.001z" />
          </svg>
          <p className="text-gray-400 text-sm">YouTubeアカウントがありません</p>
          <button
            onClick={() => setShowAddAccount(true)}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            アカウントを追加する
          </button>
        </div>
      ) : (
        <>
          {/* アカウントタブ */}
          <div className="flex items-center gap-2 flex-wrap">
            {accounts.map((account) => {
              const isActive = activeAccountId === account.id
              return (
                <div
                  key={account.id}
                  className={`flex items-center rounded-full border transition-all shadow-sm ${
                    isActive
                      ? 'bg-slate-800 border-slate-800 shadow-slate-200'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                  }`}
                >
                  <button
                    onClick={() => setActiveAccountId(account.id)}
                    className={`pl-4 pr-2 py-1.5 text-sm font-medium transition-colors rounded-l-full ${
                      isActive ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {account.channel_name}
                  </button>
                  <button
                    onClick={() => setEditingAccount(account)}
                    className={`p-1.5 transition-colors ${
                      isActive ? 'text-slate-300 hover:text-white' : 'text-gray-300 hover:text-gray-600'
                    }`}
                    title="アカウント編集"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.id, account.channel_name)}
                    className={`pr-3 pl-1 py-1.5 text-xs transition-colors rounded-r-full ${
                      isActive ? 'text-slate-400 hover:text-white' : 'text-gray-300 hover:text-red-400'
                    }`}
                    title="アカウント削除"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* 月フィルター */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800 w-28 text-center">
              {activeMonth ? formatMonthLabel(activeMonth) : '全期間'}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {/* スプレッドシートリンク */}
            {accounts.find((a) => a.id === activeAccountId)?.spreadsheet_url && (
              <a
                href={accounts.find((a) => a.id === activeAccountId)!.spreadsheet_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1 transition-colors"
                title="スプレッドシートを開く"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                スプシ
              </a>
            )}
          </div>

          {loadingSchedules ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-4 border-slate-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* 凡例 */}
              <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500 bg-gray-50">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-200 inline-block" />
                  社内工程
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-orange-200 inline-block" />
                  先方工程
                </span>
              </div>

              {/* ヘッダー */}
              <TableHeader />

              {/* スケジュール一覧 */}
              <div className="divide-y divide-gray-100">
                {filteredSchedules.length === 0 ? (
                  <div className="px-4 py-10 text-center text-gray-400 italic text-sm">
                    {activeMonth ? `${formatMonthLabel(activeMonth)}のスケジュールがありません` : 'スケジュールがありません'}
                  </div>
                ) : (
                  filteredSchedules.map((s) => (
                    <ScheduleRow
                      key={s.id}
                      schedule={s}
                      members={members}
                      outsourcers={outsourcers}
                      onUpdate={handleUpdate}
                      onDelete={handleDeleteRow}
                    />
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={handleAddRow}
                  disabled={addingRow}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {addingRow ? '追加中...' : '行を追加'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── スケジュール行 ───────────────────────────────────────────────────────────

function ScheduleRow({
  schedule,
  members,
  outsourcers,
  onUpdate,
  onDelete,
}: {
  schedule: YoutubeSchedule
  members: StaffMember[]
  outsourcers: OutsourcerOption[]
  onUpdate: (id: string, patch: Partial<YoutubeSchedule>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [showOutsourcers, setShowOutsourcers] = useState(false)
  const milestones = schedule.milestones ?? {}
  const isLong = schedule.video_length === 'long'
  const entries: YoutubeOutsourcerEntry[] = schedule.youtube_outsourcers ?? []
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0)

  const updateMilestone = (key: string, field: 'date' | 'done', value: string | boolean) => {
    const current = milestones[key] ?? { date: null, done: false }
    const updated = { ...milestones, [key]: { ...current, [field]: value } }
    onUpdate(schedule.id, { milestones: updated })
  }

  // 完了済みマイルストーン数（長尺のみ表示）
  const doneCount = MILESTONE_KEYS.filter((m) => milestones[m.key]?.done).length
  const totalCount = MILESTONE_KEYS.length

  return (
    <div>
      {/* ─── 行（常に表示） ─── */}
      <div className="flex items-center gap-0 hover:bg-gray-50 transition-colors">
        {/* 展開ボタン（長尺のみ） */}
        <div className="flex-shrink-0 w-8 self-stretch flex items-center justify-center">
          {isLong ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1"
              title={expanded ? '折りたたむ' : '展開する'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* 予約 */}
        <div className="flex-shrink-0 w-10 py-2.5 text-center">
          <input
            type="checkbox"
            checked={schedule.post_reserved}
            onChange={(e) => onUpdate(schedule.id, { post_reserved: e.target.checked })}
            className="w-4 h-4 accent-blue-600"
            title="投稿予約"
          />
        </div>

        {/* 投稿日 */}
        <div className="flex-shrink-0 w-36 px-1 py-1.5">
          <input
            type="date"
            defaultValue={schedule.post_date ?? ''}
            onBlur={(e) => {
              const val = e.target.value || null
              if (val !== schedule.post_date) onUpdate(schedule.id, { post_date: val })
            }}
            className="w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:bg-white"
          />
        </div>

        {/* 動画尺 */}
        <div className="flex-shrink-0 w-20 px-1 py-1.5">
          <select
            value={schedule.video_length}
            onChange={(e) => onUpdate(schedule.id, { video_length: e.target.value as 'short' | 'long' })}
            className="w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:bg-white"
          >
            <option value="short">ショート</option>
            <option value="long">長尺</option>
          </select>
        </div>

        {/* ステータス */}
        <div className="flex-shrink-0 w-24 px-1 py-1.5">
          <select
            value={schedule.status}
            onChange={(e) => onUpdate(schedule.id, { status: e.target.value })}
            className="w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 企画内容 */}
        <div className="flex-1 min-w-0 px-1 py-1.5">
          <input
            type="text"
            defaultValue={schedule.content_type ?? ''}
            onBlur={(e) => {
              const val = e.target.value.trim() || null
              if (val !== schedule.content_type) onUpdate(schedule.id, { content_type: val })
            }}
            placeholder="企画内容"
            className="w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:bg-white"
          />
        </div>

        {/* 制作担当 */}
        <div className="flex-shrink-0 w-28 px-1 py-1.5">
          <select
            value={schedule.member_id ?? ''}
            onChange={(e) => onUpdate(schedule.id, { member_id: e.target.value || null })}
            className="w-full text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:bg-white"
          >
            <option value="">―</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* 外注ボタン */}
        <div className="flex-shrink-0 w-24 px-1 py-1.5 text-center">
          <button
            onClick={() => setShowOutsourcers((v) => !v)}
            className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors ${
              entries.length > 0
                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title="外注編集者"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {entries.length > 0 ? `¥${totalAmount.toLocaleString()}` : '外注'}
          </button>
        </div>

        {/* マイルストーン進捗バッジ（長尺のみ） */}
        <div className="flex-shrink-0 w-16 px-1 text-center">
          {isLong && (
            <span className={`text-xs font-medium ${doneCount === totalCount ? 'text-green-600' : 'text-gray-400'}`}>
              {doneCount}/{totalCount}
            </span>
          )}
        </div>

        {/* 進捗 */}
        <div className="flex-shrink-0 w-16 px-1 py-1.5 flex items-center gap-0.5">
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={schedule.progress}
            onBlur={(e) => {
              const val = Math.min(100, Math.max(0, parseInt(e.target.value || '0', 10)))
              if (val !== schedule.progress) onUpdate(schedule.id, { progress: val })
            }}
            className="w-10 text-xs bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:bg-white text-center"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>

        {/* 削除 */}
        <div className="flex-shrink-0 w-8 py-1.5 text-center">
          <button
            onClick={() => onDelete(schedule.id)}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
            title="削除"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── 外注パネル ─── */}
      {showOutsourcers && (
        <OutsourcerPanel
          entries={entries}
          outsourcers={outsourcers}
          onSave={(updated) => onUpdate(schedule.id, { youtube_outsourcers: updated })}
        />
      )}

      {/* ─── 展開時のマイルストーンパネル（長尺のみ） ─── */}
      {isLong && expanded && (
        <div className="bg-gray-50 border-t border-gray-100 px-8 py-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {MILESTONE_KEYS.map((mk) => {
              const ms = milestones[mk.key]
              const today = new Date().toISOString().split('T')[0]
              const isOverdue = !ms?.done && ms?.date && ms.date < today
              const isToday = !ms?.done && ms?.date && ms.date === today
              const alertClass = isOverdue
                ? 'bg-red-50 border border-red-300'
                : isToday
                ? 'bg-yellow-50 border border-yellow-300'
                : mk.isClient
                ? 'bg-orange-50 border border-orange-100'
                : 'bg-white border border-gray-100'
              return (
                <div
                  key={mk.key}
                  className={`rounded-lg px-2.5 py-2 space-y-1.5 ${alertClass}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-medium leading-tight ${
                        mk.isClient ? 'text-orange-700' : 'text-gray-600'
                      }`}
                    >
                      {mk.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={ms?.done ?? false}
                      onChange={(e) => updateMilestone(mk.key, 'done', e.target.checked)}
                      className={`w-3.5 h-3.5 shrink-0 ${mk.isClient ? 'accent-orange-500' : 'accent-green-600'}`}
                    />
                  </div>
                  <input
                    type="date"
                    defaultValue={ms?.date ?? ''}
                    onBlur={(e) => {
                      const val = e.target.value || null
                      if (val !== (ms?.date ?? null)) {
                        updateMilestone(mk.key, 'date', val ?? '')
                      }
                    }}
                    className={`w-full text-xs border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 ${
                      mk.isClient
                        ? 'border-orange-200 focus:ring-orange-400 bg-orange-50'
                        : 'border-gray-200 focus:ring-blue-400 bg-white'
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 外注パネル ───────────────────────────────────────────────────────────────

function OutsourcerPanel({
  entries,
  outsourcers,
  onSave,
}: {
  entries: YoutubeOutsourcerEntry[]
  outsourcers: OutsourcerOption[]
  onSave: (updated: YoutubeOutsourcerEntry[]) => void
}) {
  const [selectId, setSelectId] = useState('')
  const [amount, setAmount] = useState('')

  const handleAdd = () => {
    const found = outsourcers.find((o) => o.id === selectId)
    if (!found || !amount) return
    const val = parseInt(amount, 10)
    if (isNaN(val) || val < 0) return
    onSave([...entries, { outsourcer_id: found.id, name: found.name, amount: val }])
    setSelectId('')
    setAmount('')
  }

  const handleRemove = (idx: number) => {
    onSave(entries.filter((_, i) => i !== idx))
  }

  const total = entries.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="bg-violet-50 border-t border-violet-100 px-8 py-3 space-y-2">
      <p className="text-xs font-semibold text-violet-700 mb-1">外注編集者</p>

      {entries.length > 0 && (
        <ul className="space-y-1 mb-2">
          {entries.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-700 font-medium">{e.name}</span>
              <span className="text-gray-600">¥{e.amount.toLocaleString()}</span>
              <button
                onClick={() => handleRemove(i)}
                className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                title="削除"
              >
                ✕
              </button>
            </li>
          ))}
          <li className="flex items-center justify-between text-xs font-semibold text-violet-700 border-t border-violet-200 pt-1 mt-1">
            <span>合計</span>
            <span>¥{total.toLocaleString()}</span>
          </li>
        </ul>
      )}

      {/* 追加フォーム */}
      <div className="flex items-center gap-2">
        <select
          value={selectId}
          onChange={(e) => setSelectId(e.target.value)}
          className="text-xs border border-violet-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          <option value="">外注者を選択</option>
          {outsourcers.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">¥</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="金額"
            className="w-24 text-xs border border-violet-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!selectId || !amount}
          className="px-3 py-1 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          追加
        </button>
      </div>
    </div>
  )
}

// ─── ヘッダー行 ───────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div className="flex items-center gap-0 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 py-2">
      <div className="flex-shrink-0 w-8" />
      <div className="flex-shrink-0 w-10 text-center">予約</div>
      <div className="flex-shrink-0 w-36 px-2">投稿日</div>
      <div className="flex-shrink-0 w-20 px-2">動画尺</div>
      <div className="flex-shrink-0 w-24 px-2">ステータス</div>
      <div className="flex-1 px-2">企画内容</div>
      <div className="flex-shrink-0 w-28 px-2">制作担当</div>
      <div className="flex-shrink-0 w-24 text-center">外注</div>
      <div className="flex-shrink-0 w-16 text-center">工程</div>
      <div className="flex-shrink-0 w-16 px-2">進捗</div>
      <div className="flex-shrink-0 w-8" />
    </div>
  )
}

// ─── アカウント追加モーダル ────────────────────────────────────────────────────

function AddAccountModal({
  members,
  onAdded,
  onClose,
}: {
  members: StaffMember[]
  onAdded: (account: YoutubeAccount) => void
  onClose: () => void
}) {
  const [channelName, setChannelName] = useState('')
  const [channelId, setChannelId] = useState('')
  const [notes, setNotes] = useState('')
  const [memberId, setMemberId] = useState('')
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/youtube-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_name: channelName,
          channel_id: channelId || channelName,
          notes: notes || null,
          member_id: memberId || null,
          spreadsheet_url: spreadsheetUrl || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? '登録に失敗しました')
        return
      }
      onAdded(json.data)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">YouTubeアカウント追加</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              チャンネル名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              required
              placeholder="例：不動産チャンネル"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              チャンネルID
              <span className="ml-1 text-gray-400">（省略時はチャンネル名を使用）</span>
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="例：@fudosan_channel"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">運用担当者</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">未設定</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">スプレッドシートURL</label>
            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">備考</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例：メインチャンネル"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '登録中...' : '追加'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── アカウント編集モーダル ────────────────────────────────────────────────────

function EditAccountModal({
  account,
  members,
  onUpdated,
  onClose,
}: {
  account: YoutubeAccount
  members: StaffMember[]
  onUpdated: (account: YoutubeAccount) => void
  onClose: () => void
}) {
  const [channelName, setChannelName] = useState(account.channel_name)
  const [channelId, setChannelId] = useState(account.channel_id)
  const [memberId, setMemberId] = useState(account.member_id ?? '')
  const [notes, setNotes] = useState(account.notes ?? '')
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(account.spreadsheet_url ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/youtube-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_name: channelName,
          channel_id: channelId || channelName,
          notes: notes || null,
          member_id: memberId || null,
          spreadsheet_url: spreadsheetUrl || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? '更新に失敗しました')
        return
      }
      onUpdated(json.data)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">アカウント編集</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              チャンネル名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              required
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">チャンネルID</label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">運用担当者</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">未設定</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">スプレッドシートURL</label>
            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">備考</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
