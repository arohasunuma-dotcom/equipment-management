'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PREFECTURES } from '@/lib/prefectures'
import { RoomTourModel } from '@/types/room-tour'

interface ModelFormProps {
  initial?: Partial<RoomTourModel>
  onSubmit: (data: Partial<RoomTourModel>) => Promise<void>
  submitLabel?: string
}

export function ModelForm({ initial = {}, onSubmit, submitLabel = '登録する' }: ModelFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initial.name ?? '')
  const [companyName, setCompanyName] = useState(initial.company_name ?? '')
  const [prefectureCode, setPrefectureCode] = useState<number>(initial.prefecture_code ?? 0)
  const [address, setAddress] = useState(initial.address ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(initial.thumbnail_url ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('モデル名を入力してください'); return }
    if (!companyName.trim()) { setError('工務店名を入力してください'); return }
    if (!prefectureCode) { setError('都道府県を選択してください'); return }

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        company_name: companyName.trim(),
        prefecture_code: prefectureCode,
        address: address.trim() || null,
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
          モデル名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: あかねんモデル"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
          工務店名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="例: ○○工務店"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
          都道府県 <span className="text-red-500">*</span>
        </label>
        <select
          value={prefectureCode}
          onChange={(e) => setPrefectureCode(parseInt(e.target.value, 10))}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value={0}>選択してください</option>
          {PREFECTURES.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">住所</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="例: 愛知県名古屋市○○区..."
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">説明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="モデルハウスの説明を入力..."
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">サムネイルURL</label>
        <input
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://..."
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {submitting ? '保存中...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
