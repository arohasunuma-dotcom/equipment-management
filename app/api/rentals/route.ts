import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rentalSchema } from '@/lib/validations/rental'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()

  const url = new URL(req.url)
  let query = supabase
    .from('rentals')
    .select('*, equipment:equipment(id, name, category:categories(name)), user:users(id, name)')
    .order('start_date', { ascending: false })

  if (me?.role !== 'admin') {
    query = query.eq('user_id', authUser.id)
  }

  const status = url.searchParams.get('status')
  if (status) query = query.eq('status', status)

  const equipment_id = url.searchParams.get('equipment_id')
  if (equipment_id) query = query.eq('equipment_id', equipment_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const body = await req.json()
  const parsed = rentalSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? '入力値が正しくありません'
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message } }, { status: 422 })
  }

  const { equipment_id, start_date, end_date, purpose, notes } = parsed.data

  // 機材の存在確認
  const { data: eq } = await supabase.from('equipment').select('id, is_active').eq('id', equipment_id).single()
  if (!eq) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: '機材が見つかりません' } }, { status: 404 })
  if (!eq.is_active) return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'この機材は現在利用停止中です' } }, { status: 409 })

  // 重複チェック — 期間が重なる既存予約を検索
  const { data: conflicts } = await supabase
    .from('rentals')
    .select('id, start_date, end_date')
    .eq('equipment_id', equipment_id)
    .not('status', 'in', '("cancelled","returned")')
    .lte('start_date', end_date)
    .gte('end_date', start_date)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    const conflict = conflicts[0]
    return NextResponse.json({
      data: null,
      error: {
        code: 'CONFLICT',
        message: `この機材は ${conflict.start_date} 〜 ${conflict.end_date} の期間に既に予約があります。別の日程を選択してください。`,
        conflicting_period: { start_date: conflict.start_date, end_date: conflict.end_date },
      },
    }, { status: 409 })
  }

  // 予約作成
  const { data, error } = await supabase
    .from('rentals')
    .insert({ user_id: authUser.id, equipment_id, start_date, end_date, purpose, notes: notes || null, status: 'reserved' })
    .select('*, equipment:equipment(id, name)')
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null }, { status: 201 })
}
