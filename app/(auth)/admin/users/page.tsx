import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { AddUserButton } from '@/components/admin/AddUserButton'
import { Badge } from '@/components/ui/badge'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('users').select('*').order('created_at', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        <AddUserButton />
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">名前</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">メールアドレス</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">ロール</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">状態</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role === 'admin' ? '管理者' : 'スタッフ'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {u.is_active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
