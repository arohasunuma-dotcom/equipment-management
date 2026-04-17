import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createClientSchema = z.object({
  name: z.string().min(1, 'クライアント名を入力してください'),
  areas: z.array(z.string()).default([]),
})

export async function GET(_req: NextRequest) {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } }, { status: 422 })
  }

  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'バリデーションエラー' } }, { status: 422 })
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({ name: parsed.data.name, areas: parsed.data.areas })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data: client, error: null }, { status: 201 })
}
