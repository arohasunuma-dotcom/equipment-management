import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  channel_name: z.string().min(1, 'チャンネル名を入力してください').max(200).optional(),
  channel_id: z.string().min(1, 'チャンネルIDを入力してください').max(200).optional(),
  contact_name: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  member_id: z.string().uuid().optional().nullable(),
  spreadsheet_url: z.string().url('URLの形式が不正です').optional().nullable().or(z.literal('')),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'バリデーションエラー'
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('youtube_accounts')
    .update(parsed.data)
    .eq('id', id)
    .select('*, member:staff_members(id, name)')
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  return NextResponse.json({ data, error: null })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase.from('youtube_accounts').delete().eq('id', id)
  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  return NextResponse.json({ data: { id }, error: null })
}
