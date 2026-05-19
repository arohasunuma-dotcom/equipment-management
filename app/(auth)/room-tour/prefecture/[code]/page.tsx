'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { PREFECTURE_MAP } from '@/lib/prefectures'
import { RoomTourModel } from '@/types/room-tour'

export default function PrefecturePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const prefCode = parseInt(code, 10)
  const prefName = PREFECTURE_MAP[prefCode] ?? '不明'

  const [models, setModels] = useState<RoomTourModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/room-tour/models?prefecture_code=${prefCode}`)
      .then((res) => res.json())
      .then((json) => setModels(json.data ?? []))
      .finally(() => setLoading(false))
  }, [prefCode])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/room-tour"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          地図に戻る
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">{prefName}</h2>
          {!loading && (
            <span className="text-sm text-gray-500">{models.length}件のモデル</span>
          )}
        </div>
        <Link
          href={`/room-tour/admin/new`}
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
          このエリアにはモデルが登録されていません
        </div>
      )}

      {!loading && models.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  )
}

function ModelCard({ model }: { model: RoomTourModel }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
      {/* サムネイル */}
      <div className="aspect-video bg-gray-100 relative">
        {model.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.thumbnail_url}
            alt={model.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M9 22V12h6v10" />
            </svg>
          </div>
        )}
        {(model.media_count ?? 0) > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            写真 {model.media_count}枚
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-snug">{model.name}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{model.company_name}</p>
        {model.address && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {model.address}
          </p>
        )}
        {model.description && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{model.description}</p>
        )}
      </div>
    </div>
  )
}
