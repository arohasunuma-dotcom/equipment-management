import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { RentalStatus } from '@/types'

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

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: rentals } = await supabase
    .from('rentals')
    .select('*, equipment:equipment(id, name), user:users(id, name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">貸出履歴</h1>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">機材名</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">借りた人</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">貸出日</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">返却日</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">使用目的</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rentals?.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{(r as any).equipment?.name}</td>
                <td className="px-4 py-3 text-gray-600">{(r as any).user?.name}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(r.start_date)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(r.end_date)}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.purpose}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status as RentalStatus]}`}>
                    {statusLabel[r.status as RentalStatus]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!rentals || rentals.length === 0) && (
          <p className="text-center text-gray-400 py-12 text-sm">履歴がありません</p>
        )}
      </div>
    </div>
  )
}
