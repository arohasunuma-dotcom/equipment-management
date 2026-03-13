import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Rental, RentalStatus } from '@/types'
import { Plus, ClipboardList } from 'lucide-react'
import { ReturnButton } from '@/components/rentals/ReturnButton'
import { CancelButton } from '@/components/rentals/CancelButton'

const statusLabel: Record<RentalStatus, string> = {
  reserved: '予約中',
  renting: '貸出中',
  returned: '返却済み',
  cancelled: 'キャンセル',
  overdue: '返却期限超過',
}

const statusColor: Record<RentalStatus, string> = {
  reserved: 'bg-blue-100 text-blue-700',
  renting: 'bg-green-100 text-green-700',
  returned: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
  overdue: 'bg-red-100 text-red-700',
}

export default async function RentalsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: activeRentals } = await supabase
    .from('rentals')
    .select('*, equipment:equipment(id, name, category:categories(name))')
    .eq('user_id', authUser.id)
    .in('status', ['reserved', 'renting', 'overdue'])
    .order('start_date', { ascending: true })

  const { data: pastRentals } = await supabase
    .from('rentals')
    .select('*, equipment:equipment(id, name, category:categories(name))')
    .eq('user_id', authUser.id)
    .in('status', ['returned', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(20)

  function RentalCard({ rental, showActions }: { rental: Rental; showActions: boolean }) {
    return (
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900">{(rental as any).equipment?.name}</p>
            <p className="text-xs text-gray-500">{(rental as any).equipment?.category?.name}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[rental.status]}`}>
            {statusLabel[rental.status]}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <p>{formatDate(rental.start_date)} 〜 {formatDate(rental.end_date)}</p>
          <p className="text-gray-500 mt-0.5">{rental.purpose}</p>
        </div>
        {showActions && (
          <div className="flex gap-2 pt-1">
            <CancelButton rentalId={rental.id} />
            {(rental.status === 'renting' || rental.status === 'overdue') && (
              <ReturnButton rentalId={rental.id} equipmentName={(rental as any).equipment?.name ?? ''} />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">自分の予約</h1>
        <Link href="/rentals/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-1" />
          新しく予約する
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-700">進行中の予約</h2>
        {!activeRentals || activeRentals.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border rounded-xl bg-white">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">進行中の予約はありません</p>
          </div>
        ) : (
          activeRentals.map((r) => (
            <RentalCard key={r.id} rental={r as Rental} showActions />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-700">過去の予約</h2>
        {!pastRentals || pastRentals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">過去の予約はありません</p>
        ) : (
          pastRentals.map((r) => (
            <RentalCard key={r.id} rental={r as Rental} showActions={false} />
          ))
        )}
      </section>
    </div>
  )
}
