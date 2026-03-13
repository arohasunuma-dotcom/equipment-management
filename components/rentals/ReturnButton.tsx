'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface ReturnButtonProps {
  rentalId: string
  equipmentName: string
}

export function ReturnButton({ rentalId, equipmentName }: ReturnButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReturn() {
    setLoading(true)
    const res = await fetch(`/api/rentals/${rentalId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    const json = await res.json()
    setLoading(false)

    if (json.error) {
      toast.error(json.error.message)
      return
    }

    toast.success('返却処理が完了しました')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>返却処理をする</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{equipmentName} を返却しますか？</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>備考（任意）</Label>
            <Textarea
              placeholder="バッテリー2本返却済みなど"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button onClick={handleReturn} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              返却を確定する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
