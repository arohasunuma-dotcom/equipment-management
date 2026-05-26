import { createAdminClient } from '@/lib/supabase/server'
import { calculateTaskScheduleFromDraft } from '@/lib/taskTemplates'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const rescheduleSchema = z.object({
  draft_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

type RouteContext = { params: Promise<{ id: string; batchId: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id, batchId } = await params
  const supabase = await createAdminClient()

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } },
      { status: 422 }
    )
  }

  const parsed = rescheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'バリデーションエラー' } },
      { status: 422 }
    )
  }

  const { draft_date, due_date } = parsed.data
  const taskSchedule = calculateTaskScheduleFromDraft(draft_date, due_date)

  // バッチ内全タスクを取得
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, step_order')
    .eq('batch_id', batchId)
    .eq('project_id', id)

  if (fetchError || !tasks) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: fetchError?.message ?? 'タスク取得失敗' } },
      { status: 500 }
    )
  }

  // 全タスクの due_date を一括更新
  const now = new Date().toISOString()
  await Promise.all(
    tasks.map((t) =>
      supabase
        .from('tasks')
        .update({ due_date: taskSchedule[t.step_order] ?? null, updated_at: now })
        .eq('id', t.id)
    )
  )

  return NextResponse.json({ data: { taskSchedule }, error: null })
}
