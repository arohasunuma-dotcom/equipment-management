import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
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
  youtube_outsourcers: z.array(z.object({
    outsourcer_id: z.string().uuid(),
    name: z.string(),
    amount: z.number().int().min(0),
  })).optional(),
  notes: z.string().max(1000).nullable().optional(),
}).strict()

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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'バリデーションエラー'
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message } },
      { status: 422 }
    )
  }

  const updatePayload: Record<string, unknown> = { ...parsed.data }

  // 納品済み・予約済み・投稿済み になった場合は delivered_at をセット（未セットの場合のみ）
  const BILLABLE_STATUSES = ['delivered', 'reserved', 'posted']
  if (parsed.data.status !== undefined && BILLABLE_STATUSES.includes(parsed.data.status)) {
    const { data: current } = await supabase
      .from('youtube_schedules')
      .select('status, delivered_at')
      .eq('id', id)
      .single()

    const wasBillable = current?.status && BILLABLE_STATUSES.includes(current.status)
    if (!wasBillable || !current?.delivered_at) {
      updatePayload.delivered_at = new Date().toISOString()
    }
  } else if (parsed.data.youtube_outsourcers !== undefined) {
    // 外注費を更新した場合、既にbillableステータスなら delivered_at を維持
    const { data: current } = await supabase
      .from('youtube_schedules')
      .select('status, delivered_at')
      .eq('id', id)
      .single()

    if (current?.status && BILLABLE_STATUSES.includes(current.status) && !current.delivered_at) {
      updatePayload.delivered_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('youtube_schedules')
    .update(updatePayload)
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

  const { error } = await supabase.from('youtube_schedules').delete().eq('id', id)
  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  return NextResponse.json({ data: { id }, error: null })
}
