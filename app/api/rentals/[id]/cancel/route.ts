import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: rental } = await supabase.from('rentals').select('id, status').eq('id', id).single()
  if (!rental) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: '予約が見つかりません' } }, { status: 404 })

  if (['returned', 'cancelled'].includes(rental.status)) {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: `${rental.status === 'returned' ? '返却済み' : 'キャンセル済み'}の予約はキャンセルできません` } }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('rentals').update({ status: 'cancelled' }).eq('id', id).select().single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}
