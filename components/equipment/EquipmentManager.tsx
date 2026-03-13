'use client'

import { useState, useRef } from 'react'
import { Equipment } from '@/types'

interface Props {
  equipment: Equipment[]
  isAdmin: boolean
}

export function EquipmentManager({ equipment: initialEquipment, isAdmin }: Props) {
  const [equipment, setEquipment] = useState(initialEquipment)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({ name: '', image_url: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeItems = equipment.filter(e => e.is_active)
  const deletedItems = equipment.filter(e => !e.is_active)
  const filteredEquipment = activeTab === 'active' ? activeItems : deletedItems

  function startAdd() {
    setEditingId('new')
    setFormData({ name: '', image_url: '', notes: '' })
    setError(null)
  }

  function startEdit(item: Equipment) {
    setEditingId(item.id)
    setFormData({ name: item.name, image_url: item.image_url || '', notes: item.notes || '' })
    setError(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setFormData(f => ({ ...f, image_url: reader.result as string }))
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (editingId === 'new') {
        const res = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, category_id: null }),
        })
        const json = await res.json()
        if (json.error) { setError(json.error.message); return }
        setEquipment(prev => [json.data, ...prev])
      } else if (editingId) {
        const res = await fetch(`/api/equipment/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const json = await res.json()
        if (json.error) { setError(json.error.message); return }
        setEquipment(prev => prev.map(e => e.id === editingId ? { ...e, ...json.data } : e))
      }
      setEditingId(null)
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!editingId || editingId === 'new') return
    if (!window.confirm('この機材を「削除済み」タブへ移動しますか？')) return
    await fetch(`/api/equipment/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })
    setEquipment(prev => prev.map(e => e.id === editingId ? { ...e, is_active: false } : e))
    setEditingId(null)
    setActiveTab('deleted')
  }

  async function handleRestore(id: string) {
    if (!window.confirm('この機材を利用可能リストに復元しますか？')) return
    await fetch(`/api/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    })
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, is_active: true } : e))
    setActiveTab('active')
  }

  async function handleHardDelete(id: string) {
    if (!window.confirm('この機材を完全に削除しますか？この操作は取り消せません。')) return
    const res = await fetch(`/api/equipment/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.error) {
      setEquipment(prev => prev.filter(e => e.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">機材一覧</h2>
        {isAdmin && (
          <button onClick={startAdd} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            機材を新規登録
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 bg-white/50 rounded-t-xl overflow-hidden">
        <button onClick={() => setActiveTab('active')} className={`flex-1 px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'active' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          利用可能 ({activeItems.length})
        </button>
        <button onClick={() => setActiveTab('deleted')} className={`flex-1 px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'deleted' ? 'border-rose-600 text-rose-600 bg-rose-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          削除済み ({deletedItems.length})
        </button>
      </div>

      {editingId && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">{editingId === 'new' ? '機材を新規登録' : '機材情報を編集'}</h3>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
              <div className="flex flex-col items-center gap-4 py-2">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="w-40 h-40 object-cover rounded-xl border-2 border-dashed border-gray-200 bg-gray-50" />
                ) : (
                  <div className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
                  写真をアップロード
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">機材名</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} className="block w-full rounded-xl border-gray-200 p-3 border" placeholder="例: Sony α7S III" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} className="block w-full rounded-xl border-gray-200 p-3 border" rows={3} placeholder="特徴や付属品など" />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                {editingId !== 'new' && (
                  <button type="button" onClick={handleDelete} className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-700 px-4 py-2.5 bg-rose-50 rounded-xl border border-rose-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    この機材を削除
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={() => setEditingId(null)} className="px-6 py-2 text-sm font-medium text-gray-500">キャンセル</button>
                  <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-xl hover:bg-blue-700 font-bold disabled:opacity-50">
                    {loading ? '処理中...' : editingId === 'new' ? '登録する' : '保存する'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEquipment.map((item) => (
          <div key={item.id} className={`group bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 transition-all duration-300 ${!item.is_active ? 'opacity-85 bg-gray-50 border-rose-100' : 'hover:shadow-xl hover:-translate-y-1'}`}>
            <div className={`relative aspect-video overflow-hidden bg-gray-100 ${!item.is_active ? 'grayscale' : ''}`}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
              {!item.is_active && (
                <div className="absolute inset-0 bg-rose-900/10 flex items-center justify-center">
                  <div className="bg-rose-600 text-white font-bold px-3 py-1 rounded-full text-[10px] tracking-widest uppercase">削除済みアーカイブ</div>
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className={`font-bold mb-1 truncate ${!item.is_active ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</h3>
              <p className="text-[10px] text-gray-500 line-clamp-2 h-7 mb-4 leading-relaxed">{item.notes || item.category_name || '説明なし'}</p>
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                {item.is_active ? (
                  isAdmin ? (
                    <button onClick={() => startEdit(item)} className="flex-1 flex justify-center items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 py-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      詳細・編集
                    </button>
                  ) : (
                    <a href={`/equipment/${item.id}`} className="flex-1 flex justify-center items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 py-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                      詳細を見る
                    </a>
                  )
                ) : (
                  isAdmin ? (
                    <div className="flex gap-2 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleRestore(item.id)} className="flex-1 flex justify-center items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 py-2 bg-white rounded-xl border border-emerald-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        復元
                      </button>
                      <button onClick={() => handleHardDelete(item.id)} className="flex-1 flex justify-center items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 py-2 bg-white rounded-xl border border-rose-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        完全削除
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">利用停止中</span>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredEquipment.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white/50 rounded-3xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 text-sm">{activeTab === 'active' ? '利用可能な機材は登録されていません' : '削除済みのアーカイブ機材はありません'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
