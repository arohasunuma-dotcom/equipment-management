'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Equipment, Category } from '@/types'

interface Props {
  categories: Category[]
  equipment?: Equipment
}

export function EquipmentForm({ categories, equipment }: Props) {
  const router = useRouter()
  const isEdit = !!equipment
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category_id: equipment?.category_id ?? '',
    name: equipment?.name ?? '',
    serial_number: equipment?.serial_number ?? '',
    notes: equipment?.notes ?? '',
    image_url: equipment?.image_url ?? '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const url = isEdit ? `/api/equipment/${equipment!.id}` : '/api/equipment'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)

    if (json.error) {
      toast.error(json.error.message)
      return
    }

    toast.success(isEdit ? '機材情報を更新しました' : '機材を登録しました')
    router.push('/equipment')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">機材名 <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Sony α7IV"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category_id">カテゴリ <span className="text-red-500">*</span></Label>
        <select
          id="category_id"
          value={form.category_id}
          onChange={(e) => set('category_id', e.target.value)}
          required
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">カテゴリを選択してください</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="serial_number">シリアル番号</Label>
        <Input
          id="serial_number"
          value={form.serial_number}
          onChange={(e) => set('serial_number', e.target.value)}
          placeholder="SN-12345"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">備考（付属品・注意事項など）</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="バッテリー2個付属"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="image_url">写真URL</Label>
        <Input
          id="image_url"
          type="url"
          value={form.image_url}
          onChange={(e) => set('image_url', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? '保存する' : '登録する'}
        </Button>
      </div>
    </form>
  )
}
