import { createAdminClient } from '@/lib/supabase/server'
import { calculateSchedule } from '@/lib/scheduleCalculator'
import { updateProjectSchema } from '@/lib/validations/projects'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createAdminClient()

  // プロジェクト本体 + バッチ（tasks は別クエリで取得してマージ）
  const [{ data, error }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase
      .from('projects')
      .select(
        `*,
        client:clients(id, name),
        assigned_editor:users(id, name),
        cameraman:staff_members!cameraman_id(id, name),
        editor_member:staff_members!editor_member_id(id, name),
        director:staff_members!director_id(id, name),
        task_batches(id, name, due_date, outsourcer_id, outsourcer_amount, delivered_at, created_at, outsourcer:outsourcers(id, name, type)),
        project_outsourcers(id, outsourcer_id, amount, notes, delivered_at, outsourcer:outsourcers(id, name, type))`
      )
      .eq('id', id)
      .single(),
    supabase
      .from('tasks')
      .select('id, batch_id, step_order, title, status, due_date, created_at, updated_at')
      .eq('project_id', id)
      .order('step_order', { ascending: true }),
  ])

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: '案件が見つかりません' } },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  if (tasksError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: tasksError.message } },
      { status: 500 }
    )
  }

  // tasks をバッチごとにマージ
  type BatchRow = { id: string; tasks?: unknown[] }
  const merged = {
    ...data,
    task_batches: ((data as { task_batches?: BatchRow[] }).task_batches ?? []).map((b) => ({
      ...b,
      tasks: (tasks ?? []).filter((t) => t.batch_id === b.id),
    })),
  }

  return NextResponse.json({ data: merged, error: null })
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
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

  const parsed = updateProjectSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'バリデーションエラー'
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message } },
      { status: 422 }
    )
  }

  // outsourcers は別テーブル (project_outsourcers) のため projects の update から除外
  // deleted_at は復元用途で直接渡す
  const { outsourcers, deleted_at, ...rest } = parsed.data
  const updates = rest as Record<string, unknown>

  // deleted_at が明示的に渡された場合（null = 復元）
  if (deleted_at !== undefined) updates.deleted_at = deleted_at ?? null

  // cameraman_ids が渡された場合、cameraman_id を先頭要素で同期
  if ('cameraman_ids' in updates && Array.isArray(updates.cameraman_ids)) {
    updates.cameraman_id = (updates.cameraman_ids as string[])[0] ?? null
  }

  // shooting_date が変わった場合はスケジュールを再計算
  if ('shooting_date' in updates) {
    const schedule = calculateSchedule({
      shooting_date: (updates.shooting_date as string | null | undefined) ?? undefined,
    })
    if (schedule.editing_start_date !== undefined) updates.editing_start_date = schedule.editing_start_date
    if (schedule.fb_deadline !== undefined) updates.fb_deadline = schedule.fb_deadline
    if (schedule.re_fb_deadline !== undefined) updates.re_fb_deadline = schedule.re_fb_deadline
    if (schedule.delivery_date !== undefined) updates.delivery_date = schedule.delivery_date
  }

  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: '案件が見つかりません' } },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  // outsourcers が送られてきた場合は差し替え（既存を削除→再挿入）
  if (outsourcers !== undefined) {
    await supabase.from('project_outsourcers').delete().eq('project_id', id)
    if (outsourcers.length > 0) {
      const rows = outsourcers.map((o) => ({
        project_id: id,
        outsourcer_id: o.outsourcer_id,
        amount: o.amount,
        notes: o.notes ?? null,
      }))
      const { error: outsourcerError } = await supabase.from('project_outsourcers').insert(rows)
      if (outsourcerError) {
        return NextResponse.json(
          { data: null, error: { code: 'INTERNAL_ERROR', message: outsourcerError.message } },
          { status: 500 }
        )
      }
    }
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { message: '削除しました' }, error: null })
}
