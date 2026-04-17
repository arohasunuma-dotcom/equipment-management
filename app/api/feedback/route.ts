import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createFeedbackSchema } from '@/lib/validations/projects'

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

  const parsed = createFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'バリデーションエラー' } },
      { status: 422 }
    )
  }

  const { project_id, type, notes } = parsed.data

  // Verify project exists
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', project_id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: '案件が見つかりません' } },
      { status: 404 }
    )
  }

  // Insert feedback record
  const { data: feedback, error: feedbackError } = await supabase
    .from('feedback_records')
    .insert({ project_id, type, received_at: new Date().toISOString(), notes: notes ?? null })
    .select()
    .single()

  if (feedbackError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: feedbackError.message } },
      { status: 500 }
    )
  }

  // Update project status to fb_waiting if type is 'first'
  if (type === 'first') {
    const { error: updateError } = await supabase
      .from('projects')
      .update({ status: 'fb_waiting', updated_at: new Date().toISOString() })
      .eq('id', project_id)

    if (updateError) {
      return NextResponse.json(
        { data: null, error: { code: 'INTERNAL_ERROR', message: updateError.message } },
        { status: 500 }
      )
    }
  }

  // Insert notification log
  await supabase
    .from('notification_logs')
    .insert({ project_id, type: 'fb_received', sent_at: new Date().toISOString() })

  return NextResponse.json({ data: feedback, error: null }, { status: 201 })
}
