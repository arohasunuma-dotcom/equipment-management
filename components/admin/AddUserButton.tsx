'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'

export function AddUserButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)

    if (json.error) {
      toast.error(json.error.message)
      return
    }

    toast.success('ユーザーを追加しました')
    setOpen(false)
    setForm({ name: '', email: '', password: '', role: 'user' })
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        ユーザーを追加する
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザーを追加する</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>名前 <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="田中 太郎" />
            </div>
            <div className="space-y-1.5">
              <Label>メールアドレス <span className="text-red-500">*</span></Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="tanaka@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>初期パスワード <span className="text-red-500">*</span></Label>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="user">スタッフ</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                追加する
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
