import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { respondFeedbackSchema } from '@/lib/validations/projects'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createAdminClient()
  const { id } = await params

  // Verify feedback record exists
  const { data: feedback, error: feedbackFetchError } = await supabase
    .from('feedback_records')
    .select('id, project_id, responded_at')
    .eq('id', id)
    .single()

  if (feedbackFetchError || !feedback) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'FBレコードが見つかりません' } },
      { status: 404 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = respondFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'バリデーションエラー' } },
      { status: 422 }
    )
  }

  const now = new Date().toISOString()

  // Build update payload
  const updatePayload: Record<string, unknown> = { responded_at: now }
  if (parsed.data.notes !== undefined) {
    updatePayload.notes = parsed.data.notes
  }

  // Update feedback record with responded_at
  const { data: updatedFeedback, error: updateFeedbackError } = await supabase
    .from('feedback_records')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateFeedbackError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: updateFeedbackError.message } },
      { status: 500 }
    )
  }

  // Update project status to fb_responded
  const { error: updateProjectError } = await supabase
    .from('projects')
    .update({ status: 'fb_responded', updated_at: now })
    .eq('id', feedback.project_id)

  if (updateProjectError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: updateProjectError.message } },
      { status: 500 }
    )
  }

  // Insert notification log
  await supabase
    .from('notification_logs')
    .insert({ project_id: feedback.project_id, type: 'fb_responded', sent_at: now })

  return NextResponse.json({ data: updatedFeedback, error: null })
}
