import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export default async function DashboardPage() {
  const supabase = await createAdminClient()
  const cookieStore = await cookies()

  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  let isAdmin = false
  if (authUser) {
    const { data: me } = await authClient.from('users').select('role').eq('id', authUser.id).single()
    isAdmin = me?.role === 'admin'
  }

  // Stats
  const { data: allEquipment } = await supabase.from('equipment').select('id, is_active')
  const activeEquipment = allEquipment?.filter(e => e.is_active) ?? []

  const { data: allRentals } = await supabase
    .from('rentals')
    .select('id, status, renter_name, end_date, created_at, purpose, rental_equipment(equipment_id, equipment:equipment(name))')
  const activeRentals = allRentals?.filter(r => r.status === 'active') ?? []
  const overdueRentals = allRentals?.filter(r => r.status === 'overdue') ?? []

  const availableCount = Math.max(0, activeEquipment.length - activeRentals.length)
  const recentActivity = [...(allRentals ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  const stats = [
    { label: '総機材数', value: activeEquipment.length, color: 'bg-indigo-500', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { label: '貸出中', value: activeRentals.length, color: 'bg-green-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: '在庫あり', value: availableCount, color: 'bg-blue-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: '返却遅延', value: overdueRentals.length, color: 'bg-red-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ]

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">概要</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${stat.color} p-3 rounded-xl text-white`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">最近の貸出履歴</h3>
          </div>
          <div>
            {recentActivity.map((activity, i) => {
              const names = (activity as any).rental_equipment?.map((re: any) => re.equipment?.name).filter(Boolean) ?? []
              return (
                <div key={activity.id} className={`px-6 py-4 flex items-center justify-between ${i !== recentActivity.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold flex flex-wrap gap-1">
                      {names.map((n: string, idx: number) => (
                        <span key={idx} className="bg-gray-50 px-1 py-0.5 rounded text-[10px] border border-gray-200">{n}</span>
                      ))}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">{activity.renter_name} - {activity.purpose}</span>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    {activity.end_date}
                  </div>
                </div>
              )
            })}
            {recentActivity.length === 0 && (
              <div className="p-10 text-center text-gray-400 italic">貸出データがありません</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">機材管理をスマートに。</h3>
            <p className="text-slate-400 mb-6">
              機材一覧から機材を登録し、貸出管理でスケジュールを把握しましょう。削除済みの機材は自動的に貸出候補から除外されます。
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300 font-medium">システム正常稼働中</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  )
}
