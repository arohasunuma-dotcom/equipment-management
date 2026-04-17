import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  const isAdmin = me?.role === 'admin'

  const today = new Date().toISOString().split('T')[0]
  const in90days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: rentals } = await supabase
    .from('rentals')
    .select('id, start_date, end_date, purpose, status, equipment:equipment(id, name, category:categories(name)), user:users(id, name)')
    .not('status', 'in', '("cancelled","returned")')
    .lte('start_date', in90days)
    .gte('end_date', today)
    .order('start_date', { ascending: true })

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, category:categories(name)')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-6 w-6 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">カレンダー</h1>
      </div>

      {!rentals || rentals.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p>今後90日間の予約はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rentals.map((rental) => {
            const eq = rental.equipment as any
            const user = rental.user as any
            return (
              <div key={rental.id} className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{eq?.name}</p>
                  <p className="text-xs text-gray-500">{(eq?.category as any)?.name}</p>
                </div>
                <div className="text-sm text-gray-700">
                  {formatDate(rental.start_date)} 〜 {formatDate(rental.end_date)}
                </div>
                <div className="text-sm text-gray-600">{rental.purpose}</div>
                <div className="text-sm text-gray-500">
                  {isAdmin ? user?.name : user?.id === authUser.id ? 'あなた' : '予約済み'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
