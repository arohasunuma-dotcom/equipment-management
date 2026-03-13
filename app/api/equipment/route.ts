import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient()

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
  // 管理者のみ登録可能
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ登録できます' } }, { status: 403 })

  const { data: me } = await authClient.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ登録できます' } }, { status: 403 })

  const body = await req.json()
  const { name, notes, image_url, category_id, serial_number } = body

  if (!name?.trim()) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '機材名は必須です' } }, { status: 422 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('equipment')
    .insert({
      name: name.trim(),
      notes: notes || null,
      image_url: image_url || null,
      category_id: category_id || null,
      serial_number: serial_number || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null }, { status: 201 })
}
