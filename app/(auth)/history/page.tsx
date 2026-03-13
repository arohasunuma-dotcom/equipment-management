import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { RentalStatus } from '@/types'

const statusLabel: Record<RentalStatus, string> = {
  active: '貸出中',
  completed: '返却済み',
  cancelled: 'キャンセル',
  overdue: '返却遅延',
}

const statusColor: Record<RentalStatus, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
  overdue: 'bg-red-100 text-red-700',
}

export default async function HistoryPage() {
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) redirect('/dashboard')

  const { data: me } = await authClient.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const supabase = await createAdminClient()
  const { data: rentals } = await supabase
    .from('rentals')
    .select('*, rental_equipment(equipment_id, equipment:equipment(id, name)), renter_name')
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
            {rentals?.map((r) => {
              const eqNames = (r as any).rental_equipment?.map((re: any) => re.equipment?.name).filter(Boolean) ?? []
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{eqNames.join(', ') || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{(r as any).renter_name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(r.start_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(r.end_date)}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.purpose}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status as RentalStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {statusLabel[r.status as RentalStatus] ?? r.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!rentals || rentals.length === 0) && (
          <p className="text-center text-gray-400 py-12 text-sm">履歴がありません</p>
        )}
      </div>
    </div>
  )
}
