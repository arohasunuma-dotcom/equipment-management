import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  channel_name: z.string().min(1, 'チャンネル名を入力してください').max(200),
  channel_id: z.string().min(1, 'チャンネルIDを入力してください').max(200),
  contact_name: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  member_id: z.string().uuid().optional().nullable(),
})

export async function GET() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('youtube_accounts')
    .select('*, member:staff_members(id, name)')
    .order('channel_name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } },
      { status: 422 }
    )
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'バリデーションエラー'
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('youtube_accounts')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  return NextResponse.json({ data, error: null }, { status: 201 })
}
