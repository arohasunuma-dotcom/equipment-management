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

  // Calculate today + 3 days threshold
  const today = new Date()
  const threshold = new Date(today.getTime() + 3 * 86400000)
  const thresholdDate = threshold.toISOString().split('T')[0]

  // Fetch projects with fb_deadline within 3 days and status = fb_waiting
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, fb_deadline, status')
    .eq('status', 'fb_waiting')
    .lte('fb_deadline', thresholdDate)

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  const now = new Date().toISOString()

  // Insert notification log for each at-risk project
  // TODO: Slack実装 - 担当者にFB期限リマインダーを送信する
  if (projects && projects.length > 0) {
    const logs = projects.map((p) => ({
      project_id: p.id,
      type: 'fb_reminder',
      sent_at: now,
      message: `FB期限リマインダー: ${p.title} (期限: ${p.fb_deadline})`,
    }))
    await supabase.from('notification_logs').insert(logs)
  }

  return NextResponse.json({ data: { processed: projects?.length ?? 0 }, error: null })
}
