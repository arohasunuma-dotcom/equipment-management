import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { User } from '@/types'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  let currentUser: User | null = null

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (authUser) {
    const { data: dbUser } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (dbUser && dbUser.is_active) currentUser = dbUser as User
  }

  if (!currentUser) {
    const cookieStore = await cookies()
    const username = cookieStore.get('username')?.value
    if (username) {
      currentUser = { id: 'guest', email: '', name: username, role: 'user', is_active: true, created_at: new Date().toISOString() }
    }
  }

  if (!currentUser) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={currentUser as User} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser as User} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
