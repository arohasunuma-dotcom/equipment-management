import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  type: z.enum(['shooting', 'editing']),
  notes: z.string().optional(),
})

export async function GET(_req: NextRequest) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('outsourcers')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } }, { status: 422 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'バリデーションエラー' } }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('outsourcers')
    .insert({ name: parsed.data.name, type: parsed.data.type, notes: parsed.data.notes ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}
