import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: rental } = await supabase.from('rentals').select('id, status').eq('id', id).single()
  if (!rental) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: '予約が見つかりません' } }, { status: 404 })
  if (rental.status === 'completed') return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'すでに返却済みです' } }, { status: 409 })

  const body = await req.json().catch(() => ({}))
  const notes = body.notes ?? null

  const { error } = await supabase.from('rentals').update({ status: 'completed' }).eq('id', id)
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  await supabase.from('return_records').insert({ rental_id: id, notes })
  return NextResponse.json({ data: { id, status: 'completed' }, error: null })
}
