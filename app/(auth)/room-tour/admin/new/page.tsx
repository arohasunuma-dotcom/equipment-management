'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ModelForm } from '@/components/room-tour/ModelForm'
import { RoomTourModel } from '@/types/room-tour'

export default function NewModelPage() {
  const router = useRouter()

  const handleSubmit = async (data: Partial<RoomTourModel>) => {
    const res = await fetch('/api/room-tour/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error?.message ?? '登録に失敗しました')
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
      <h2 className="text-2xl font-bold text-gray-800">新規モデル登録</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <ModelForm onSubmit={handleSubmit} submitLabel="登録する" />
      </div>
    </div>
  )
}
