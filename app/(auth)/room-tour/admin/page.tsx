'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PREFECTURE_MAP } from '@/lib/prefectures'
import { RoomTourModel } from '@/types/room-tour'

export default function RoomTourAdminPage() {
  const [models, setModels] = useState<RoomTourModel[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/room-tour/models')
      .then((res) => res.json())
      .then((json) => setModels(json.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/room-tour/models/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setModels((prev) => prev.filter((m) => m.id !== id))
      }
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/room-tour"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            マップへ戻る
          </Link>
          <h2 className="text-2xl font-bold text-gray-800">モデル管理</h2>
        </div>
        <Link
          href="/room-tour/admin/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規登録
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && models.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 italic">
          モデルが登録されていません
        </div>
      )}

      {!loading && models.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">モデル名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">工務店</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">都道府県</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">写真</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {models.map((model) => (
                <tr key={model.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{model.name}</span>
                    {model.address && (
                      <p className="text-xs text-gray-400 mt-0.5">{model.address}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{model.company_name}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/room-tour/prefecture/${model.prefecture_code}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {PREFECTURE_MAP[model.prefecture_code] ?? `${model.prefecture_code}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {model.media_count ?? 0}枚
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/room-tour/admin/${model.id}/edit`}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleDelete(model.id, model.name)}
                        disabled={deleting === model.id}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === model.id ? '削除中...' : '削除'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
