import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, slack_id, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()
  const body = await req.json()
  const { name, slack_id } = body

  if (!name?.trim()) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '名前を入力してください' } }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('staff_members')
    .insert({ name: name.trim(), slack_id: slack_id?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}
