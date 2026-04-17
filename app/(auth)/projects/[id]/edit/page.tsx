'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { ProjectWithRelations, WorkType, Client } from '@/types/projects'
import { WORK_TYPE_LABELS } from '@/lib/projectConstants'

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
          <label
            key={o.value}
            className={`flex items-center justify-center px-4 py-2.5 border rounded-xl text-sm cursor-pointer transition-all ${
              value === o.value
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
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

export default function ProjectEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [workType, setWorkType] = useState<WorkType>('shooting_and_editing')
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')

  // マスターデータ
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [projectRes, clientsRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch('/api/clients'),
        ])
        const [projectJson, clientsJson] = await Promise.all([
          projectRes.json(), clientsRes.json(),
        ])

        if (!projectRes.ok || projectJson.error) {
          setError(projectJson.error?.message ?? '案件の取得に失敗しました')
          return
        }

        const project = projectJson.data as ProjectWithRelations
        setTitle(project.title)
        setClientId(project.client_id ?? '')
        setWorkType(project.work_type ?? 'shooting_and_editing')

        setClients(clientsJson.data ?? [])
      } catch {
        setError('データの取得中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function handleWorkTypeChange(wt: WorkType) {
    setWorkType(wt)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('タイトルは必須です'); return }
    setError(null)
    setSubmitting(true)

    const body = {
      title: title.trim(),
      client_id: clientId || null,
      work_type: workType,
    }

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? '更新に失敗しました')
        return
      }
      router.push(`/projects/${id}`)
      router.refresh()
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-800">案件を編集</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 〇〇様ルームツアー"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:border-gray-300"
          />
        </div>

        {/* クライアント */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">クライアント</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
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

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            キャンセル
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            {submitting ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  )
}
