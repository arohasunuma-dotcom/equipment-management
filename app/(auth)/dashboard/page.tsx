import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Rental, User } from '@/types'
import { Plus, AlertTriangle } from 'lucide-react'

const statusLabel: Record<string, string> = {
  reserved: '予約中',
  renting: '貸出中',
  overdue: '返却期限超過',
}

const statusColor: Record<string, string> = {
  reserved: 'bg-blue-100 text-blue-700',
  renting: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const { data: myRentals } = await supabase
    .from('rentals')
    .select('*, equipment(id, name, image_url, category:categories(name))')
    .eq('user_id', authUser.id)
    .in('status', ['reserved', 'renting', 'overdue'])
    .order('start_date', { ascending: true })

  let overdueRentals: Rental[] = []
  if (user?.role === 'admin') {
    const { data } = await supabase
      .from('rentals')
      .select('*, equipment(id, name), user:users(id, name)')
      .eq('status', 'overdue')
    overdueRentals = (data as Rental[]) ?? []
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <Link href="/rentals/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-1" />
          新しく予約する
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">自分の進行中の予約</CardTitle>
          </CardHeader>
          <CardContent>
            {!myRentals || myRentals.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">進行中の予約はありません</p>
            ) : (
              <ul className="space-y-3">
                {myRentals.map((rental) => (
                  <li key={rental.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {(rental as any).equipment?.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[rental.status]}`}>
                        {statusLabel[rental.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(rental.start_date)} 〜 {formatDate(rental.end_date)}
                    </p>
                    <p className="text-xs text-gray-600">{rental.purpose}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {(user as User)?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                延滞中の機材
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueRentals.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">延滞中の機材はありません</p>
              ) : (
                <ul className="space-y-2">
                  {overdueRentals.map((rental) => (
                    <li key={rental.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800">
                        {(rental as any).equipment?.name}
                      </p>
                      <p className="text-xs text-red-600">
                        {(rental as any).user?.name} — 返却予定: {formatDate(rental.end_date)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
