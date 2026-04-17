import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAdminClient()
  const body = await req.json()
  const { name, slack_id } = body

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '名前を入力してください' } }, { status: 422 })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (slack_id !== undefined) updates.slack_id = slack_id?.trim() || null

  const { data, error } = await supabase
    .from('staff_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('staff_members')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data: { id }, error: null })
}
