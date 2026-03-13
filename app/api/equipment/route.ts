import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { equipmentSchema } from '@/lib/validations/equipment'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const url = new URL(req.url)
  let query = supabase.from('equipment_with_status').select('*').order('created_at', { ascending: false })

  const q = url.searchParams.get('q')
  if (q) query = query.ilike('name', `%${q}%`)

  const category_id = url.searchParams.get('category_id')
  if (category_id) query = query.eq('category_id', category_id)

  const status = url.searchParams.get('status')
  if (status) query = query.eq('current_status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ登録できます' } }, { status: 403 })

  const body = await req.json()
  const parsed = equipmentSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? '入力値が正しくありません'
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message } }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('equipment')
    .insert({ ...parsed.data, serial_number: parsed.data.serial_number || null, notes: parsed.data.notes || null, image_url: parsed.data.image_url || null })
    .select().single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null }, { status: 201 })
}
