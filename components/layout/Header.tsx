'use client'

import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = user.role === 'admin' && user.id !== 'guest'

  async function handleLogout() {
    if (isAdmin) {
      await supabase.auth.signOut()
    } else {
      await fetch('/api/auth/set-user', { method: 'DELETE' })
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0 md:hidden">
      <span className="font-bold text-gray-900">Gear Flow</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user.name}</span>
        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600">
          {isAdmin ? 'ログアウト' : '名前を変更'}
        </button>
      </div>
    </header>
  )
}
