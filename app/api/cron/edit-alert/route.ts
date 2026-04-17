import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: '認証に失敗しました' } },
      { status: 401 }
    )
  }

  const supabase = await createAdminClient()

  // Calculate today - 7 days threshold
  const today = new Date()
  const threshold = new Date(today.getTime() - 7 * 86400000)
  const thresholdDate = threshold.toISOString().split('T')[0]

  // Fetch projects where editing started 7+ days ago and still in editing status
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, editing_start_date, status')
    .eq('status', 'editing')
    .lte('editing_start_date', thresholdDate)

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  const now = new Date().toISOString()

  // Insert notification log for each delayed project
  // TODO: Slack実装 - 担当者に編集遅延アラートを送信する
  if (projects && projects.length > 0) {
    const logs = projects.map((p) => ({
      project_id: p.id,
      type: 'edit_alert',
      sent_at: now,
      message: `編集遅延アラート: ${p.title} (編集開始: ${p.editing_start_date})`,
    }))
    await supabase.from('notification_logs').insert(logs)
  }

  return NextResponse.json({ data: { processed: projects?.length ?? 0 }, error: null })
}
