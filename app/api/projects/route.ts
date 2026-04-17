import { createAdminClient } from '@/lib/supabase/server'
import { calculateSchedule } from '@/lib/scheduleCalculator'
import { getTemplateForType } from '@/lib/taskTemplates'
import { createProjectSchema } from '@/lib/validations/projects'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient()
  const url = new URL(req.url)

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10))
  const offset = (page - 1) * limit

  let query = supabase
    .from('projects')
    .select(
      `*, client:clients(id, name), assigned_editor:users(id, name),
      cameraman:staff_members!cameraman_id(id, name),
      editor_member:staff_members!editor_member_id(id, name),
      director:staff_members!director_id(id, name),
      tasks(step_order, status, due_date)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  const status = url.searchParams.get('status')
  if (status) query = query.eq('status', status)

  const client_id = url.searchParams.get('client_id')
  if (client_id) query = query.eq('client_id', client_id)

  const assigned_editor_id = url.searchParams.get('assigned_editor_id')
  if (assigned_editor_id) query = query.eq('assigned_editor_id', assigned_editor_id)

  // deleted=true の場合は削除済みのみ、それ以外は削除済みを除外
  if (url.searchParams.get('deleted') === 'true') {
    query = query.not('deleted_at', 'is', null)
  } else {
    query = query.is('deleted_at', null)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data,
    error: null,
    meta: { total: count ?? 0, page, limit },
  })
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

  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'バリデーションエラー'
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message } },
      { status: 422 }
    )
  }

  const { title, client_id, type, work_type, format, shooting_date, shooting_type, delivery_date, cameraman_id, cameraman_ids, editor_member_id, director_id, model_name, notes, outsourcers, batches } = parsed.data

  const schedule = calculateSchedule({ shooting_date: shooting_date ?? undefined })
  const resolvedWorkType = work_type ?? 'shooting_and_editing'

  // cameraman_ids が渡された場合はそちらを優先、cameraman_id は先頭要素で同期
  const resolvedCameramanIds = cameraman_ids ?? (cameraman_id ? [cameraman_id] : [])
  const resolvedCameramanId = resolvedCameramanIds[0] ?? null

  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert({
      title,
      client_id: client_id ?? null,
      type,
      work_type: resolvedWorkType,
      format,
      status: 'shooting_scheduled',
      shooting_type: shooting_type ?? null,
      shooting_date: shooting_date ?? null,
      editing_start_date: schedule.editing_start_date ?? null,
      fb_deadline: schedule.fb_deadline ?? null,
      re_fb_deadline: schedule.re_fb_deadline ?? null,
      delivery_date: delivery_date ?? schedule.delivery_date ?? null,
      cameraman_id: resolvedCameramanId,
      cameraman_ids: resolvedCameramanIds,
      editor_member_id: editor_member_id ?? null,
      director_id: director_id ?? null,
      model_name: model_name ?? null,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: insertError.message } },
      { status: 500 }
    )
  }

  if (outsourcers && outsourcers.length > 0) {
    const outsourcerRows = outsourcers.map((o) => ({
      project_id: project.id,
      outsourcer_id: o.outsourcer_id,
      amount: o.amount,
      notes: o.notes ?? null,
    }))
    const { error: outsourcerError } = await supabase.from('project_outsourcers').insert(outsourcerRows)
    if (outsourcerError) {
      return NextResponse.json(
        { data: null, error: { code: 'INTERNAL_ERROR', message: outsourcerError.message } },
        { status: 500 }
      )
    }
  }

  // 編集あり案件のタスクバッチを作成
  if (resolvedWorkType !== 'shooting_only' && batches && batches.length > 0) {
    const templates = getTemplateForType(type)
    for (const batch of batches) {
      const { data: batchRow, error: batchError } = await supabase
        .from('task_batches')
        .insert({
          project_id: project.id,
          name: batch.name,
          due_date: batch.due_date ?? null,
          outsourcer_id: batch.outsourcer_id ?? null,
          outsourcer_amount: batch.outsourcer_amount ?? null,
          shooting_date: batch.shooting_date ?? null,
          shooting_type: batch.shooting_type ?? null,
          format: batch.format ?? null,
          cameraman_ids: batch.cameraman_ids ?? null,
          type: batch.type ?? null,
          editor_member_id: batch.editor_member_id ?? null,
        })
        .select()
        .single()
      if (batchError) {
        return NextResponse.json(
          { data: null, error: { code: 'INTERNAL_ERROR', message: batchError.message } },
          { status: 500 }
        )
      }
      if (templates.length > 0) {
        const taskRows = templates.map((t) => ({
          project_id: project.id,
          batch_id: batchRow.id,
          step_order: t.step_order,
          title: t.title,
          status: 'pending' as const,
        }))
        const { error: taskError } = await supabase.from('tasks').insert(taskRows)
        if (taskError) {
          return NextResponse.json(
            { data: null, error: { code: 'INTERNAL_ERROR', message: taskError.message } },
            { status: 500 }
          )
        }
      }
    }
  }

  return NextResponse.json({ data: project, error: null }, { status: 201 })
}
