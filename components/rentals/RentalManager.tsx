'use client'

import { useState, useMemo } from 'react'
import { Rental, Equipment } from '@/types'

interface Props {
  rentals: Rental[]
  equipment: Equipment[]
  currentUser: string
  staffMembers: { id: string; name: string }[]
}

type FormData = {
  equipment_ids: string[]
  renter_name: string
  start_date: string
  end_date: string
  shooting_date: string
  purpose: string
  return_location: string
  notes: string
}

const emptyForm = (currentUser: string): FormData => ({
  equipment_ids: [],
  renter_name: currentUser,
  start_date: '',
  end_date: '',
  shooting_date: '',
  purpose: '',
  return_location: '',
  notes: '',
})

const statusLabel: Record<string, string> = {
  active: '貸出中',
  overdue: '返却遅延',
  completed: '返却済み',
  cancelled: 'キャンセル',
}

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  overdue: 'bg-rose-100 text-rose-700 border border-rose-200',
  completed: 'bg-slate-100 text-slate-600 border border-slate-200',
  cancelled: 'bg-gray-100 text-gray-400 border border-gray-200',
}

export function RentalManager({ rentals: initialRentals, equipment, currentUser, staffMembers }: Props) {
  const [rentals, setRentals] = useState<Rental[]>(initialRentals)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRental, setEditingRental] = useState<Rental | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm(currentUser))
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  const activeRentals = rentals.filter(r => r.status === 'active' || r.status === 'overdue')
  const completedRentals = rentals.filter(r => r.status === 'completed' || r.status === 'cancelled')

  const overdueRentals = activeRentals.filter(r => r.end_date < todayStr)

  // Block any equipment that has ANY active/overdue (unreturned) rental
  const availableEquipment = useMemo(() => {
    return equipment.filter(eq => {
      const hasUnreturned = rentals.some(r => {
        if (editingRental && r.id === editingRental.id) return false
        if (r.status === 'completed' || r.status === 'cancelled') return false
        return r.rental_equipment?.some(re => re.equipment_id === eq.id)
      })
      return !hasUnreturned
    })
  }, [equipment, rentals, editingRental])

  function openAddModal() {
    setEditingRental(null)
    setForm(emptyForm(currentUser))
    setErrorMsg('')
    setModalOpen(true)
  }

  function openEditModal(rental: Rental) {
    setEditingRental(rental)
    setForm({
      equipment_ids: rental.rental_equipment?.map(re => re.equipment_id) ?? [],
      renter_name: rental.renter_name ?? '',
      start_date: rental.start_date,
      end_date: rental.end_date,
      shooting_date: rental.shooting_date ?? '',
      purpose: rental.purpose,
      return_location: rental.return_location ?? '',
      notes: rental.notes ?? '',
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingRental(null)
    setErrorMsg('')
  }

  function toggleEquipment(id: string) {
    setForm(f => ({
      ...f,
      equipment_ids: f.equipment_ids.includes(id)
        ? f.equipment_ids.filter(e => e !== id)
        : [...f.equipment_ids, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    try {
      let res: Response
      if (editingRental) {
        res = await fetch(`/api/rentals/${editingRental.id}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        res = await fetch('/api/rentals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }

      const json = await res.json()
      if (json.error) {
        setErrorMsg(json.error.message)
        return
      }

      if (editingRental) {
        setRentals(prev => prev.map(r => r.id === editingRental.id ? json.data : r))
      } else {
        setRentals(prev => [json.data, ...prev])
      }
      closeModal()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplete(id: string) {
    if (!window.confirm('この貸出を返却完了にしますか？')) return
    const res = await fetch(`/api/rentals/${id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const json = await res.json()
    if (!json.error) {
      setRentals(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' as const } : r))
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('削除しますか？この操作は取り消せません。')) return
    const res = await fetch(`/api/rentals/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.error) {
      alert('削除に失敗しました: ' + json.error.message)
      return
    }
    setRentals(prev => prev.filter(r => r.id !== id))
  }

  function RentalRow({ rental }: { rental: Rental }) {
    const eqNames = rental.rental_equipment?.map(re => re.equipment?.name ?? re.equipment_id) ?? []
    const visibleEq = eqNames.slice(0, 3)
    const extraCount = eqNames.length - 3

    const isOverdue = rental.end_date < todayStr && rental.status === 'active'
    const displayStatus = isOverdue ? 'overdue' : rental.status

    return (
      <tr className={`border-b border-gray-50 hover:bg-gray-50/50 group transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}>
        <td className="px-4 py-3 w-48 min-w-[160px]">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {visibleEq.map((n, i) => (
                <span key={i} className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 truncate max-w-[180px]">{n}</span>
              ))}
              {extraCount > 0 && (
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg border border-gray-200">+{extraCount}</span>
              )}
            </div>
            <span className="text-xs text-gray-500 font-medium">{rental.renter_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">
          <div>{rental.shooting_date && <span className="block text-gray-800 font-medium">撮影: {rental.shooting_date}</span>}</div>
          <div>{rental.start_date} 〜 {rental.end_date}</div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">
          <div className="max-w-[160px]">
            <p className="truncate">{rental.purpose}</p>
            {rental.return_location && <p className="text-gray-400 truncate">返却: {rental.return_location}</p>}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadge[displayStatus]}`}>
            {statusLabel[displayStatus]}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {(rental.status === 'active' || rental.status === 'overdue') && (
              <>
                <button
                  onClick={() => handleComplete(rental.id)}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 whitespace-nowrap"
                >
                  返却完了
                </button>
                <button
                  onClick={() => openEditModal(rental)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100"
                >
                  編集
                </button>
              </>
            )}
            <button
              onClick={() => handleDelete(rental.id)}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 bg-rose-50 rounded-lg border border-rose-100"
            >
              削除
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">貸出管理</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規予約
        </button>
      </div>

      {overdueRentals.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-rose-700">返却期限超過 {overdueRentals.length}件</p>
            <p className="text-xs text-rose-600 mt-0.5">
              {overdueRentals.map(r => {
                const names = r.rental_equipment?.map(re => re.equipment?.name ?? '').filter(Boolean).join('・') ?? ''
                return `${r.renter_name}（${names}）`
              }).join('、')}
            </p>
          </div>
        </div>
      )}

      {/* Active rentals table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <h3 className="font-bold text-gray-800">貸出中・予約済み</h3>
          {overdueRentals.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {overdueRentals.length}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48 min-w-[160px]">貸出機材/担当</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40 min-w-[140px]">撮影日/期間</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">撮影内容&返却場所</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 min-w-[80px]">状態</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 min-w-[120px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {activeRentals.map(rental => (
                <RentalRow key={rental.id} rental={rental} />
              ))}
              {activeRentals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    現在の貸出・予約はありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed rentals table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">返却完了履歴</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48 min-w-[160px]">貸出機材/担当</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40 min-w-[140px]">撮影日/期間</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">撮影内容&返却場所</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 min-w-[80px]">状態</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 min-w-[120px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {completedRentals.map(rental => (
                <RentalRow key={rental.id} rental={rental} />
              ))}
              {completedRentals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    返却完了の履歴はありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingRental ? '予約を編集' : '新規予約'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    貸出期間（開始）<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="block w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    返却予定日<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={form.end_date}
                    min={form.start_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="block w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">撮影当日</label>
                <input
                  type="date"
                  value={form.shooting_date}
                  onChange={e => setForm(f => ({ ...f, shooting_date: e.target.value }))}
                  className="block w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  機材を選択（複数可）<span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {availableEquipment.map(eq => (
                    <label key={eq.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50/50 transition-colors ${form.equipment_ids.includes(eq.id) ? 'bg-blue-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.equipment_ids.includes(eq.id)}
                        onChange={() => toggleEquipment(eq.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      {eq.image_url && (
                        <img src={eq.image_url} alt={eq.name} className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                      )}
                      <span className="text-sm font-medium text-gray-800">{eq.name}</span>
                    </label>
                  ))}
                  {availableEquipment.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      利用可能な機材がありません
                    </div>
                  )}
                </div>
                {form.equipment_ids.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">{form.equipment_ids.length}件選択中</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  担当者<span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.renter_name}
                  onChange={e => setForm(f => ({ ...f, renter_name: e.target.value }))}
                  className="block w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">担当者を選択</option>
                  {staffMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">返却場所</label>
                <input
                  type="text"
                  value={form.return_location}
                  onChange={e => setForm(f => ({ ...f, return_location: e.target.value }))}
                  placeholder="例: 第1スタジオ、倉庫A"
                  className="block w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  撮影内容・目的<span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={form.purpose}
                  onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  placeholder="撮影の目的や内容を入力"
                  rows={3}
                  className="block w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || form.equipment_ids.length === 0}
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '処理中...' : editingRental ? '保存する' : '予約する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
