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

  // Fetch active projects (not completed or cancelled)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, status')
    .not('status', 'in', '("completed","cancelled")')

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  const now = new Date().toISOString()
  const processed = projects?.length ?? 0

  // Insert a single daily digest notification log
  // TODO: Slack実装 - 各案件の担当者にSlack通知を送信する
  if (processed > 0) {
    await supabase
      .from('notification_logs')
      .insert({ project_id: null, type: 'daily_digest', sent_at: now, message: `日次ダイジェスト: ${processed}件の進行中案件` })
  }

  return NextResponse.json({ data: { processed }, error: null })
}
