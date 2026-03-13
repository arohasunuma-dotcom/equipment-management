import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDateShort } from '@/lib/utils'
import { EquipmentCurrentStatus } from '@/types'
import { ArrowLeft, Camera, CalendarDays, Pencil } from 'lucide-react'

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

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase.from('users').select('role').eq('id', authUser.id).single()

  const { data: eq } = await supabase
    .from('equipment_with_status')
    .select('*')
    .eq('id', id)
    .single()

  if (!eq) notFound()

  const today = new Date().toISOString().split('T')[0]
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: upcomingRentals } = await supabase
    .from('rentals')
    .select('id, user_id, start_date, end_date, status, user:users(name)')
    .eq('equipment_id', id)
    .not('status', 'in', '("cancelled","returned")')
    .gte('end_date', today)
    .lte('start_date', threeMonthsLater)
    .order('start_date', { ascending: true })

  const status = eq.current_status as EquipmentCurrentStatus
  const isAvailable = status === 'available'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/equipment" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          機材一覧に戻る
        </Link>
        {user?.role === 'admin' && (
          <Link href={`/equipment/${id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" }) + " ml-auto"}>
            <Pencil className="h-4 w-4 mr-1" />
            編集
          </Link>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6 flex flex-col sm:flex-row gap-6">
        <div className="flex-shrink-0 w-full sm:w-40 h-36 bg-gray-100 rounded-lg flex items-center justify-center">
          {eq.image_url ? (
            <img src={eq.image_url} alt={eq.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Camera className="h-10 w-10 text-gray-300" />
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{eq.name}</h1>
            <p className="text-sm text-gray-500">{eq.category_name}</p>
          </div>
          {eq.serial_number && <p className="text-sm text-gray-600">シリアル番号: {eq.serial_number}</p>}
          {eq.notes && <p className="text-sm text-gray-600">{eq.notes}</p>}

          <div className="flex items-center gap-3">
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor[status]}`}>
              {statusLabel[status]}
            </span>
            {isAvailable && (
              <Link href={`/rentals/new?equipment_id=${id}`} className={buttonVariants({ size: "sm" })}>この機材を予約する</Link>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          予約状況（今後3ヶ月）
        </h2>
        {!upcomingRentals || upcomingRentals.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">予約はありません</p>
        ) : (
          <ul className="space-y-2">
            {upcomingRentals.map((r) => (
              <li key={r.id} className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <div className="text-sm">
                  <span className="font-medium text-gray-800">
                    {formatDate(r.start_date)} 〜 {formatDate(r.end_date)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {user?.role === 'admin'
                    ? (r as any).user?.name
                    : r.user_id === authUser.id ? 'あなた' : '予約済み'
                  }
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
