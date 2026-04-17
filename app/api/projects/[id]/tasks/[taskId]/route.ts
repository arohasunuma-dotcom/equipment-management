import { createAdminClient } from '@/lib/supabase/server'
import { updateTaskSchema } from '@/lib/validations/projects'
import { inferStatusFromStep } from '@/lib/taskTemplates'
import { NextRequest, NextResponse } from 'next/server'

// ステータスの前進順序（後退はしない）
const STATUS_ORDER = [
  'shooting_scheduled',
  'shooting_done',
  'editing',
  'fb_waiting',
  'fb_responded',
  'fix_editing',
  're_fb_waiting',
  'completed',
]

type RouteContext = { params: Promise<{ id: string; taskId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id, taskId } = await params
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

  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'バリデーションエラー'
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('project_id', id)
    .select('*, assignee:users(id, name)')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'タスクが見つかりません' } },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  // ─── step_order=4（撮影日）の due_date 変更時にプロジェクトの shooting_date を同期 ───
  if ('due_date' in parsed.data && data.step_order === 4) {
    await supabase
      .from('projects')
      .update({ shooting_date: parsed.data.due_date ?? null, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  // ─── タスク完了時の自動ステータス更新 ───────────────────────────────────────
  if (parsed.data.status === 'done') {
    // 全タスクを取得して最大完了ステップを求める
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('step_order, status')
      .eq('project_id', id)

    if (allTasks) {
      const maxDoneStep = allTasks
        .filter((t) => t.status === 'done')
        .reduce((max, t) => Math.max(max, t.step_order), 0)

      const inferredStatus = inferStatusFromStep(maxDoneStep)

      if (inferredStatus) {
        // 現在のプロジェクトステータスを取得
        const { data: project } = await supabase
          .from('projects')
          .select('status')
          .eq('id', id)
          .single()

        if (project) {
          const currentOrder = STATUS_ORDER.indexOf(project.status)
          const newOrder = STATUS_ORDER.indexOf(inferredStatus)
          // 前進のみ（ステータスを後退させない）
          if (newOrder > currentOrder) {
            await supabase
              .from('projects')
              .update({ status: inferredStatus, updated_at: new Date().toISOString() })
              .eq('id', id)
          }
        }
      }
    }
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id, taskId } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('project_id', id)

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { message: '削除しました' }, error: null })
}
