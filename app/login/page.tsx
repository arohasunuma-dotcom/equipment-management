'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clapperboard, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleNameLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    await fetch('/api/auth/set-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })

    router.push('/dashboard')
    router.refresh()
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border shadow-sm p-8">
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="p-3 bg-gray-100 rounded-full">
              <Clapperboard className="h-6 w-6 text-gray-700" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">機材管理システム</h1>
          </div>

          {!showAdminForm ? (
            <form onSubmit={handleNameLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">お名前</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="田中 太郎"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                利用開始
              </Button>
              <p className="text-center text-xs text-gray-400 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminForm(true)}
                  className="hover:underline"
                >
                  管理者ログイン
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                管理者ログイン
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setShowAdminForm(false); setError('') }}
              >
                戻る
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
