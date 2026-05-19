'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { ModelForm } from '@/components/room-tour/ModelForm'
import { RoomTourModel } from '@/types/room-tour'

export default function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [model, setModel] = useState<RoomTourModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/room-tour/models/${id}`)
      .then((res) => {
        if (!res.ok) { setNotFound(true); return null }
        return res.json()
      })
      .then((json) => { if (json) setModel(json.data) })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (data: Partial<RoomTourModel>) => {
    const res = await fetch(`/api/room-tour/models/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error?.message ?? '更新に失敗しました')
    router.push('/room-tour/admin')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/room-tour/admin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          モデル管理に戻る
        </Link>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">モデル編集</h2>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {notFound && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
          モデルが見つかりません
        </div>
      )}

      {!loading && model && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <ModelForm initial={model} onSubmit={handleSubmit} submitLabel="更新する" />
        </div>
      )}
    </div>
  )
}
