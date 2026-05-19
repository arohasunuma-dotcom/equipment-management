'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { JapanMap } from '@/components/room-tour/JapanMap'
import { PREFECTURE_MAP } from '@/lib/prefectures'
import { RoomTourModel } from '@/types/room-tour'

export default function RoomTourPage() {
  const router = useRouter()
  const [models, setModels] = useState<RoomTourModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/room-tour/models')
      .then((res) => res.json())
      .then((json) => setModels(json.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const modelCounts: Record<number, number> = {}
  for (const m of models) {
    modelCounts[m.prefecture_code] = (modelCounts[m.prefecture_code] ?? 0) + 1
  }

  const activeCodes = Object.keys(modelCounts).map(Number)
  const activePrefectures = activeCodes
    .map((code) => ({ code, name: PREFECTURE_MAP[code], count: modelCounts[code] }))
    .sort((a, b) => a.code - b.code)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">ルームツアー マップ</h2>
        <Link
          href="/room-tour/admin"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          モデル管理
        </Link>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">総モデル数</p>
          <p className="text-2xl font-bold text-gray-900">{models.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">公開都道府県数</p>
          <p className="text-2xl font-bold text-gray-900">{activeCodes.length}</p>
        </div>
      </div>

      {/* 地図 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm text-gray-500 mb-4">
          青色の都道府県をクリックするとモデル一覧を表示します
        </p>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <JapanMap
            activeCodes={activeCodes}
            modelCounts={modelCounts}
            onSelectPrefecture={(code) => router.push(`/room-tour/prefecture/${code}`)}
          />
        )}
      </div>

      {/* アクティブ都道府県リスト */}
      {!loading && activePrefectures.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">公開中の都道府県</h3>
          <div className="flex flex-wrap gap-2">
            {activePrefectures.map((pref) => (
              <Link
                key={pref.code}
                href={`/room-tour/prefecture/${pref.code}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {pref.name}
                <span className="bg-blue-200 text-blue-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {pref.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && activePrefectures.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 italic">
          まだモデルが登録されていません。
          <Link href="/room-tour/admin/new" className="ml-1 text-blue-600 underline">
            新規登録する
          </Link>
        </div>
      )}
    </div>
  )
}
