'use client'

import { PREFECTURES } from '@/lib/prefectures'
import { cn } from '@/lib/utils'

interface JapanMapProps {
  activeCodes?: number[]
  modelCounts?: Record<number, number>
  onSelectPrefecture?: (code: number) => void
  selectedCode?: number | null
}

export function JapanMap({ activeCodes = [], modelCounts = {}, onSelectPrefecture, selectedCode }: JapanMapProps) {
  const activeSet = new Set(activeCodes)

  return (
    <div className="overflow-x-auto">
      <div
        className="relative"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(13, 44px)',
          gridTemplateRows: 'repeat(16, 34px)',
          gap: '2px',
          width: 'fit-content',
          margin: '0 auto',
        }}
      >
        {PREFECTURES.map((pref) => {
          const isActive = activeSet.has(pref.code)
          const isSelected = selectedCode === pref.code
          const count = modelCounts[pref.code] ?? 0

          return (
            <button
              key={pref.code}
              onClick={() => isActive && onSelectPrefecture?.(pref.code)}
              style={{
                gridColumnStart: pref.col,
                gridColumnEnd: pref.col + (pref.colSpan ?? 1),
                gridRowStart: pref.row,
                gridRowEnd: pref.row + (pref.rowSpan ?? 1),
              }}
              className={cn(
                'relative flex flex-col items-center justify-center rounded text-center transition-all text-xs font-medium leading-tight',
                isActive
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm'
                  : 'bg-gray-200 text-gray-500 cursor-default',
                isSelected && 'ring-2 ring-blue-400 ring-offset-1',
              )}
              title={pref.name}
            >
              <span style={{ fontSize: pref.colSpan ? '11px' : '9px' }}>
                {pref.name}
              </span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-blue-700 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow border border-blue-200">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
