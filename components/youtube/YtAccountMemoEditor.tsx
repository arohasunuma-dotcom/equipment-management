'use client'

import { useState, useRef } from 'react'

export function YtAccountMemoEditor({ accountId, initialNotes }: { accountId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const notesRef = useRef(initialNotes ?? '')

  const save = async (value: string) => {
    if (value === notesRef.current) return
    notesRef.current = value
    setSaving(true)
    await fetch(`/api/youtube-accounts/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: value || null }),
    })
    setSaving(false)
  }

  return (
    <div className="mt-2 relative" onClick={(e) => e.preventDefault()}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        placeholder="メモを追加..."
        rows={2}
        className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-300"
      />
      {saving && <span className="absolute bottom-2 right-2 text-[10px] text-gray-400">保存中...</span>}
    </div>
  )
}
