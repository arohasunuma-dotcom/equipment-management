'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { today } from '@/lib/utils'
import { Loader2, AlertCircle } from 'lucide-react'

interface Props {
  equipment: { id: string; name: string; category_name: string; current_status: string }[]
  defaultEquipmentId?: string
  renterName?: string
}

export function RentalForm({ equipment, defaultEquipmentId, renterName = '' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; conflicting_period?: { start_date: string; end_date: string } } | null>(null)

  const [form, setForm] = useState({
    equipment_id: defaultEquipmentId ?? '',
    start_date: '',
    end_date: '',
    purpose: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/rentals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, renter_name: renterName }),
    })
    const json = await res.json()
    setLoading(false)

    if (json.error) {
      setError(json.error)
      return
    }

    toast.success('予約が完了しました')
    router.push('/rentals')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-5">
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error.message}</p>
            {error.conflicting_period && (
              <p className="mt-1 text-xs">
                既存予約期間: {error.conflicting_period.start_date} 〜 {error.conflicting_period.end_date}
              </p>
            )}
          </div>
        </div>
      )}

      {renterName && (
        <div className="p-3 bg-gray-50 border rounded-lg text-sm text-gray-600">
          予約者: <span className="font-medium text-gray-900">{renterName}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="equipment_id">機材 <span className="text-red-500">*</span></Label>
        <select
          id="equipment_id"
          value={form.equipment_id}
          onChange={(e) => set('equipment_id', e.target.value)}
          required
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">機材を選択してください</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name}（{eq.category_name}）
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">貸出日 <span className="text-red-500">*</span></Label>
          <Input
            id="start_date"
            type="date"
            min={today()}
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">返却日 <span className="text-red-500">*</span></Label>
          <Input
            id="end_date"
            type="date"
            min={form.start_date || today()}
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="purpose">使用目的 <span className="text-red-500">*</span></Label>
        <Input
          id="purpose"
          placeholder="〇〇社 PV撮影"
          value={form.purpose}
          onChange={(e) => set('purpose', e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">備考</Label>
        <Textarea
          id="notes"
          placeholder="早朝から使用しますなど"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>キャンセル</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          予約を確定する
        </Button>
      </div>
    </form>
  )
}
