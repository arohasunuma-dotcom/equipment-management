import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data, error } = await supabase.from('equipment_with_status').select('*').eq('id', id).single()
  if (!data) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: '機材が見つかりません' } }, { status: 404 })
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 管理者のみ編集可能
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ編集できます' } }, { status: 403 })

  const { data: me } = await authClient.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ編集できます' } }, { status: 403 })

  const body = await req.json()

  // Build update object directly, allowing is_active, name, notes, image_url
  const updateData: Record<string, unknown> = {}
  if ('name' in body) updateData.name = body.name || null
  if ('notes' in body) updateData.notes = body.notes || null
  if ('image_url' in body) updateData.image_url = body.image_url || null
  if ('is_active' in body) updateData.is_active = body.is_active
  if ('category_id' in body) updateData.category_id = body.category_id || null
  if ('serial_number' in body) updateData.serial_number = body.serial_number || null

  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('equipment').update(updateData).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 管理者のみ削除可能
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ削除できます' } }, { status: 403 })

  const { data: me } = await authClient.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ削除できます' } }, { status: 403 })

  const supabase = await createAdminClient()
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data: { message: '削除しました' }, error: null })
}
