import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: rental } = await supabase.from('rentals').select('id, user_id, status').eq('id', id).single()
  if (!rental) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: '予約が見つかりません' } }, { status: 404 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (rental.user_id !== authUser.id && me?.role !== 'admin') {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '権限がありません' } }, { status: 403 })
  }

  if (rental.status === 'returned') {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'すでに返却済みです' } }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const notes = body.notes ?? null

  // rentals のステータス更新 と return_records への挿入を連続実行
  const { error: updateError } = await supabase
    .from('rentals').update({ status: 'returned' }).eq('id', id)

  if (updateError) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: updateError.message } }, { status: 500 })

  const { data: returnRecord, error: insertError } = await supabase
    .from('return_records').insert({ rental_id: id, notes }).select().single()

  if (insertError) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: insertError.message } }, { status: 500 })

  return NextResponse.json({ data: { id, status: 'returned', return_record: returnRecord }, error: null })
}
