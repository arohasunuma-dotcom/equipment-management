'use client'

import { useState, useRef } from 'react'

export function MemoEditor({ projectId, initialMemo }: { projectId: string; initialMemo: string | null }) {
  const [memo, setMemo] = useState(initialMemo ?? '')
  const [saving, setSaving] = useState(false)
  const memoRef = useRef(initialMemo ?? '')

  const save = async (value: string) => {
    if (value === memoRef.current) return
    memoRef.current = value
    setSaving(true)
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo: value || null }),
    })
    setSaving(false)
  }

  return (
    <div className="mt-2 relative" onClick={(e) => e.preventDefault()}>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        placeholder="メモを追加..."
        rows={2}
        className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-300"
      />
      {saving && <span className="absolute bottom-2 right-2 text-[10px] text-gray-400">保存中...</span>}
    </div>
  )
}
