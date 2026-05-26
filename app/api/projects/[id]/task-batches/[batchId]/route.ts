import { createAdminClient } from '@/lib/supabase/server'
import { calculateTaskSchedule } from '@/lib/taskTemplates'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateBatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  shooting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  outsourcer_id: z.string().uuid().optional().nullable(),
  outsourcer_amount: z.number().int().min(0).optional().nullable(),
  delivered_at: z.string().datetime().optional().nullable(),
  shooting_type: z.enum(['smartphone', 'dslr']).optional().nullable(),
  format: z.enum(['landscape', 'portrait', 'square']).optional().nullable(),
  cameraman_ids: z.array(z.string().uuid()).optional().nullable(),
  type: z.enum(['room_tour', 'interview', 'texture', 'other']).optional().nullable(),
  editor_member_id: z.string().uuid().optional().nullable(),
})

type RouteContext = { params: Promise<{ id: string; batchId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id, batchId } = await params
  const supabase = await createAdminClient()

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } },
      { status: 422 }
    )
  }

  const parsed = updateBatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'バリデーションエラー' } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('task_batches')
    .update(parsed.data)
    .eq('id', batchId)
    .eq('project_id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  // バッチの shooting_date を更新した場合
  let taskSchedule: Record<number, string> | null = null
  if ('shooting_date' in parsed.data) {
    const shootingDate = parsed.data.shooting_date ?? null

    // プロジェクトの shooting_date に同期
    await supabase
      .from('projects')
      .update({ shooting_date: shootingDate, updated_at: new Date().toISOString() })
      .eq('id', id)

    // 全タスクの due_date を自動更新
    const { data: batchTasks } = await supabase
      .from('tasks')
      .select('id, step_order')
      .eq('batch_id', batchId)

    if (batchTasks && batchTasks.length > 0) {
      // due_date が変わっていた場合は最新値を使用
      const latestDueDate = parsed.data.due_date !== undefined
        ? (parsed.data.due_date ?? null)
        : (data.due_date ?? null)
      taskSchedule = shootingDate
        ? calculateTaskSchedule(shootingDate, latestDueDate)
        : null

      await Promise.all(
        batchTasks.map((t) =>
          supabase
            .from('tasks')
            .update({
              due_date: taskSchedule ? (taskSchedule[t.step_order] ?? null) : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', t.id)
        )
      )
    }
  }

  return NextResponse.json({ data, taskSchedule, error: null })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id, batchId } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('task_batches')
    .delete()
    .eq('id', batchId)
    .eq('project_id', id)

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { message: '削除しました' }, error: null })
}
