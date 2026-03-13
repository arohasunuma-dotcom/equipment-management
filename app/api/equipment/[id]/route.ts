import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { equipmentSchema } from '@/lib/validations/equipment'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data, error } = await supabase.from('equipment_with_status').select('*').eq('id', id).single()
  if (!data) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: '機材が見つかりません' } }, { status: 404 })
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ編集できます' } }, { status: 403 })

  const body = await req.json()
  const parsed = equipmentSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? '入力値が正しくありません' } }, { status: 422 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if ('serial_number' in updateData) updateData.serial_number = updateData.serial_number || null
  if ('notes' in updateData) updateData.notes = updateData.notes || null
  if ('image_url' in updateData) updateData.image_url = updateData.image_url || null

  const { data, error } = await supabase.from('equipment').update(updateData).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ削除できます' } }, { status: 403 })

  // 有効な予約が存在する場合は削除不可
  const { data: activeRentals } = await supabase
    .from('rentals').select('id').eq('equipment_id', id)
    .not('status', 'in', '("cancelled","returned")').limit(1)

  if (activeRentals && activeRentals.length > 0) {
    return NextResponse.json({
      data: null,
      error: { code: 'CONFLICT', message: '現在貸出中または予約済みのため削除できません。利用停止に変更してください。' },
    }, { status: 409 })
  }

  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data: { message: '削除しました' }, error: null })
}
