import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Camera, Plus } from 'lucide-react'
import { EquipmentCurrentStatus, User } from '@/types'

const statusLabel: Record<EquipmentCurrentStatus, string> = {
  available: '利用可能',
  reserved: '予約済み',
  renting: '貸出中',
  overdue: '返却期限超過',
  inactive: '利用停止',
}

const statusColor: Record<EquipmentCurrentStatus, string> = {
  available: 'bg-green-100 text-green-700',
  reserved: 'bg-yellow-100 text-yellow-700',
  renting: 'bg-red-100 text-red-700',
  overdue: 'bg-red-200 text-red-800',
  inactive: 'bg-gray-100 text-gray-500',
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category_id?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  const params = await searchParams

  const { data: categories } = await supabase.from('categories').select('*').order('name')

  let query = supabase
    .from('equipment_with_status')
    .select('*')
    .order('created_at', { ascending: false })

  if (params.q) query = query.ilike('name', `%${params.q}%`)
  if (params.category_id) query = query.eq('category_id', params.category_id)
  if (params.status) query = query.eq('current_status', params.status)

  const { data: equipment } = await query

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">機材一覧</h1>
        {user?.role === 'admin' && (
          <Link href="/equipment/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-1" />
            機材を登録する
          </Link>
        )}
      </div>

      <form className="flex flex-wrap gap-3">
        <Input
          name="q"
          placeholder="機材名で検索..."
          defaultValue={params.q ?? ''}
          className="w-56"
        />
        <select
          name="category_id"
          defaultValue={params.category_id ?? ''}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">すべてのカテゴリ</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">すべての状態</option>
          <option value="available">利用可能</option>
          <option value="reserved">予約済み</option>
          <option value="renting">貸出中</option>
          <option value="overdue">返却期限超過</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">絞り込む</Button>
      </form>

      {!equipment || equipment.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>機材が見つかりませんでした</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eq) => {
            const status = eq.current_status as EquipmentCurrentStatus
            return (
              <Link key={eq.id} href={`/equipment/${eq.id}`}>
                <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm leading-snug">{eq.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{eq.category_name}</p>
                    </div>
                    <Camera className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                  </div>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[status]}`}>
                    {statusLabel[status]}
                  </span>
                  {eq.serial_number && (
                    <p className="text-xs text-gray-400">SN: {eq.serial_number}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
