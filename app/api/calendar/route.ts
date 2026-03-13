import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  const isAdmin = me?.role === 'admin'

  const url = new URL(req.url)
  const from = url.searchParams.get('from') ?? new Date().toISOString().split('T')[0]
  const to = url.searchParams.get('to') ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let query = supabase
    .from('rentals')
    .select('id, start_date, end_date, purpose, status, user_id, equipment:equipment(id, name, category:categories(name)), user:users(id, name)')
    .not('status', 'in', '("cancelled","returned")')
    .lte('start_date', to)
    .gte('end_date', from)
    .order('start_date', { ascending: true })

  const equipment_id = url.searchParams.get('equipment_id')
  if (equipment_id) query = query.eq('equipment_id', equipment_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  // 一般ユーザーには他人の予約者名を非表示
  const masked = data?.map((r) => ({
    ...r,
    user: isAdmin || r.user_id === authUser.id
      ? r.user
      : { id: null, name: '予約済み' },
  }))

  return NextResponse.json({ data: masked, error: null })
}
