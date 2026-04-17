import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  youtube_account_id: z.string().uuid('無効なアカウントIDです'),
  post_date: z.string().nullable().optional(),
  post_confirmed: z.boolean().optional(),
  post_reserved: z.boolean().optional(),
  property_name: z.string().max(200).nullable().optional(),
  video_length: z.enum(['short', 'long']).optional(),
  status: z.string().max(50).optional(),
  content_type: z.string().max(200).nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  member_id: z.string().uuid().nullable().optional(),
  milestones: z.record(z.string(), z.any()).optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient()
  const url = new URL(req.url)
  const account_id = url.searchParams.get('account_id')

  let query = supabase
    .from('youtube_schedules')
    .select('*, member:staff_members(id, name)')
    .order('post_date', { ascending: true, nullsFirst: false })

  if (account_id) {
    query = query.eq('youtube_account_id', account_id)
  }

  const { data, error } = await query
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
    .from('youtube_schedules')
    .insert(parsed.data)
    .select('*, member:staff_members(id, name)')
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  return NextResponse.json({ data, error: null }, { status: 201 })
}
