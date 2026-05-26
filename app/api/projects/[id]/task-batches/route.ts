import { createAdminClient } from '@/lib/supabase/server'
import { getTemplateForType, calculateTaskSchedule } from '@/lib/taskTemplates'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createBatchSchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(100),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  shooting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  outsourcer_id: z.string().uuid().optional().nullable(),
  outsourcer_amount: z.number().int().min(0).optional().nullable(),
  shooting_type: z.enum(['smartphone', 'dslr']).optional().nullable(),
  format: z.enum(['landscape', 'portrait', 'square']).optional().nullable(),
  cameraman_ids: z.array(z.string().uuid()).optional().nullable(),
  type: z.enum(['room_tour', 'interview', 'texture', 'other']).optional().nullable(),
  editor_member_id: z.string().uuid().optional().nullable(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createAdminClient()

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } },
      { status: 422 }
    )
  }

  const parsed = createBatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'バリデーションエラー' } },
      { status: 422 }
    )
  }

  // プロジェクトの type を取得
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('type')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: '案件が見つかりません' } },
      { status: 404 }
    )
  }

  // バッチ作成
  const { data: batch, error: batchError } = await supabase
    .from('task_batches')
    .insert({
      project_id: id,
      name: parsed.data.name,
      due_date: parsed.data.due_date ?? null,
      shooting_date: parsed.data.shooting_date ?? null,
      outsourcer_id: parsed.data.outsourcer_id ?? null,
      outsourcer_amount: parsed.data.outsourcer_amount ?? null,
      shooting_type: parsed.data.shooting_type ?? null,
      format: parsed.data.format ?? null,
      cameraman_ids: parsed.data.cameraman_ids ?? [],
      type: parsed.data.type ?? null,
      editor_member_id: parsed.data.editor_member_id ?? null,
    })
    .select()
    .single()

  if (batchError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: batchError.message } },
      { status: 500 }
    )
  }

  // バッチに撮影日がある場合はプロジェクトに同期
  if (parsed.data.shooting_date) {
    await supabase
      .from('projects')
      .update({ shooting_date: parsed.data.shooting_date, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  // タスクを一括作成（バッチの type があればそれを優先）
  const templates = getTemplateForType(parsed.data.type ?? project.type)
  const shootingDate = parsed.data.shooting_date ?? null
  const dueDate = parsed.data.due_date ?? null
  const schedule = shootingDate ? calculateTaskSchedule(shootingDate, dueDate) : null
  const taskRows = templates.map((t) => ({
    project_id: id,
    batch_id: batch.id,
    step_order: t.step_order,
    title: t.title,
    status: 'pending' as const,
    due_date: schedule ? (schedule[t.step_order] ?? null) : null,
  }))

  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .insert(taskRows)
    .select()

  if (taskError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: taskError.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { ...batch, tasks }, error: null }, { status: 201 })
}
