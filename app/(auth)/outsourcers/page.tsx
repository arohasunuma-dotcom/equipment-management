'use client'

import { useEffect, useState } from 'react'
import { Outsourcer } from '@/types/projects'
import { OUTSOURCER_TYPE_LABELS, OUTSOURCER_TYPE_COLORS } from '@/lib/projectConstants'

interface MonthSummary {
  outsourcer_id: string
  outsourcer: Outsourcer
  total_amount: number
  project_count: number
}

interface ProjectHistory {
  id: string
  kind: 'project' | 'batch' | 'youtube'
  amount: number
  delivered_at: string | null
  batch_name?: string
  project: {
    id: string
    title: string
    shooting_date: string | null
    delivery_date: string | null
    work_type: string
    status: string
  } | null
  // YouTube専用フィールド
  channel_name?: string | null
  channel_url?: string | null
  post_date?: string | null
  yt_status?: string
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

function getMonthOptions() {
  const now = new Date()
  const options: { year: number; month: number; label: string; value: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    })
  }
  return options
}

const WORK_TYPE_LABELS: Record<string, string> = {
  shooting_only: '撮影のみ',
  editing_only: '編集のみ',
  shooting_and_editing: '撮影＋編集',
}

export default function OutsourcersPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [outsourcers, setOutsourcers] = useState<Outsourcer[]>([])
  const [summaries, setSummaries] = useState<MonthSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [projectHistory, setProjectHistory] = useState<Record<string, ProjectHistory[]>>({})
  const [historyLoading, setHistoryLoading] = useState<string | null>(null)

  const monthOptions = getMonthOptions()
  const selectedValue = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const label = `${selectedYear}年${selectedMonth + 1}月`

  useEffect(() => {
    const { start, end } = getMonthRange(selectedYear, selectedMonth)
    Promise.all([
      fetch('/api/outsourcers').then((r) => r.json()),
      fetch(`/api/outsourcers/summary?start=${start}&end=${end}`).then((r) => r.json()),
    ])
      .then(([outsourcersJson, summaryJson]) => {
        setOutsourcers(outsourcersJson.data ?? [])
        setSummaries(summaryJson.data ?? [])
      })
      .catch(() => setError('データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    setSummaryLoading(true)
    const { start, end } = getMonthRange(selectedYear, selectedMonth)
    fetch(`/api/outsourcers/summary?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((json) => setSummaries(json.data ?? []))
      .catch(() => setError('データの取得に失敗しました'))
      .finally(() => setSummaryLoading(false))
  }, [selectedYear, selectedMonth])

  const handleRowClick = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (projectHistory[id]) return

    setHistoryLoading(id)
    try {
      const res = await fetch(`/api/outsourcers/${id}/projects`)
      const json = await res.json()
      setProjectHistory((prev) => ({ ...prev, [id]: json.data ?? [] }))
    } finally {
      setHistoryLoading(null)
    }
  }

  const getSummary = (id: string) => summaries.find((s) => s.outsourcer_id === id)

  const totalAmount = summaries.reduce((acc, s) => acc + s.total_amount, 0)
  const totalCount = summaries.reduce((acc, s) => acc + s.project_count, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">外注一覧</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">の実績（納品済のみ）</span>
          <select
            value={selectedValue}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              setSelectedYear(y)
              setSelectedMonth(m - 1)
            }}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 月次サマリー */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">{label}の支払い合計</p>
          {summaryLoading
            ? <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1" />
            : <p className="text-2xl font-bold text-gray-900">¥{totalAmount.toLocaleString()}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">{label}の対応件数</p>
          {summaryLoading
            ? <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            : <p className="text-2xl font-bold text-gray-900">{totalCount}<span className="text-sm font-normal text-gray-500 ml-1">件</span></p>}
        </div>
      </div>

      {/* 外注者一覧 */}
      {outsourcers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 italic text-sm">
          外注者がいません。メンバー設定から追加してください。
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">外注者一覧 <span className="text-xs text-gray-400 font-normal ml-1">クリックで案件履歴を表示</span></h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">名前</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">種別</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">{label}の支払い</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">{label}の件数</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {outsourcers.map((o) => {
                const summary = getSummary(o.id)
                const isExpanded = expandedId === o.id
                const history = projectHistory[o.id]
                const isLoadingHistory = historyLoading === o.id

                return (
                  <>
                    <tr
                      key={o.id}
                      onClick={() => handleRowClick(o.id)}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0">
                            {o.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{o.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${OUTSOURCER_TYPE_COLORS[o.type]}`}>
                          {OUTSOURCER_TYPE_LABELS[o.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {summaryLoading
                          ? <div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
                          : <span className="text-sm font-semibold text-gray-900">{summary ? `¥${summary.total_amount.toLocaleString()}` : '¥0'}</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {summaryLoading
                          ? <div className="h-4 w-8 bg-gray-100 rounded animate-pulse ml-auto" />
                          : <span className="text-sm text-gray-700">{summary ? `${summary.project_count}件` : '0件'}</span>}
                      </td>
                      <td className="px-4 py-4 text-gray-400">
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>

                    {/* 案件履歴パネル */}
                    {isExpanded && (
                      <tr key={`${o.id}-history`}>
                        <td colSpan={5} className="px-0 py-0 bg-slate-50 border-b border-gray-100">
                          <div className="px-6 py-4">
                            {isLoadingHistory ? (
                              <div className="flex justify-center py-4">
                                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : !history || history.length === 0 ? (
                              <p className="text-sm text-gray-400 italic py-2">案件履歴がありません</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 mb-2">案件履歴（全{history.length}件）</p>
                                {history.map((h) => (
                                  <div key={`${h.kind}-${h.id}`} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                                    <div className="min-w-0">
                                      {h.kind === 'youtube' ? (
                                        <>
                                          <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                                              YouTube
                                            </span>
                                            <a
                                              href="/youtube"
                                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {h.channel_name ?? '（チャンネル不明）'}
                                            </a>
                                          </div>
                                          {h.post_date && (
                                            <p className="text-xs text-gray-400 mt-0.5">投稿日: {h.post_date}</p>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <a
                                            href={h.project ? `/projects/${h.project.id}` : '#'}
                                            className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {h.batch_name
                                              ? `${h.project?.title ?? '（削除済み）'} — ${h.batch_name}`
                                              : (h.project?.title ?? '（削除済み）')}
                                          </a>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            {h.project?.work_type && (
                                              <span className="text-xs text-gray-400">
                                                {WORK_TYPE_LABELS[h.project.work_type] ?? h.project.work_type}
                                              </span>
                                            )}
                                            {h.project?.delivery_date && (
                                              <span className="text-xs text-gray-400">納期: {h.project.delivery_date}</span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0 space-y-0.5">
                                      <p className="text-sm font-semibold text-gray-900">¥{h.amount.toLocaleString()}</p>
                                      {h.delivered_at ? (
                                        <p className="text-xs text-green-600">
                                          納品済 {new Date(h.delivered_at).toLocaleDateString('ja-JP')}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-amber-500">未納品</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
