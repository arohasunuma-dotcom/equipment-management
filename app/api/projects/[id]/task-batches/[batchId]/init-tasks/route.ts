import { createAdminClient } from '@/lib/supabase/server'
import { getTemplateForType, calculateTaskSchedule } from '@/lib/taskTemplates'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string; batchId: string }> }

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id, batchId } = await params
  const supabase = await createAdminClient()

  // バッチ情報を取得
  const { data: batch, error: batchError } = await supabase
    .from('task_batches')
    .select('id, type, shooting_date, due_date')
    .eq('id', batchId)
    .eq('project_id', id)
    .single()

  if (batchError || !batch) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'バッチが見つかりません' } },
      { status: 404 }
    )
  }

  // 既存タスクがあればそのまま返す
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('batch_id', batchId)
    .order('step_order', { ascending: true })

  if (existingTasks && existingTasks.length > 0) {
    return NextResponse.json({ data: { tasks: existingTasks }, error: null }, { status: 200 })
  }

  // プロジェクト種別をフォールバック取得
  const { data: project } = await supabase
    .from('projects')
    .select('type')
    .eq('id', id)
    .single()

  // タスク生成
  const templates = getTemplateForType(batch.type ?? project?.type)
  const shootingDate = batch.shooting_date ?? null
  const dueDate = batch.due_date ?? null
  const schedule = shootingDate ? calculateTaskSchedule(shootingDate, dueDate) : null
  const taskRows = templates.map((t) => ({
    project_id: id,
    batch_id: batchId,
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

  return NextResponse.json({ data: { tasks }, error: null }, { status: 201 })
}
