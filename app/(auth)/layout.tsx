import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { User } from '@/types'

const GUEST_USER: User = { id: 'guest', email: '', name: 'ゲスト', role: 'user', is_active: true, created_at: '' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={GUEST_USER} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={GUEST_USER} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
