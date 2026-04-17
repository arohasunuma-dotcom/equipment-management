import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createTaskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, '200文字以内で入力してください'),
  step_order: z.number().int('step_orderは整数で入力してください').min(0),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)')
    .optional()
    .nullable(),
  assignee_id: z.string().uuid('担当者IDが不正です').optional().nullable(),
  notes: z.string().max(1000, '1000文字以内で入力してください').optional().nullable(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:users(id, name)')
    .eq('project_id', id)
    .order('step_order', { ascending: true })

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
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

  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'バリデーションエラー'
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message } },
      { status: 422 }
    )
  }

  const { title, step_order, due_date, assignee_id, notes } = parsed.data

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: id,
      title,
      step_order,
      status: 'pending',
      due_date: due_date ?? null,
      assignee_id: assignee_id ?? null,
      notes: notes ?? null,
    })
    .select('*, assignee:users(id, name)')
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
