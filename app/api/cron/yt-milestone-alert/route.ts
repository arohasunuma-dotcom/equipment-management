import { createAdminClient } from '@/lib/supabase/server'
import { sendSlackMessage } from '@/lib/slack'
import { NextRequest, NextResponse } from 'next/server'

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

const MILESTONE_LABELS: Record<string, string> = {
  script_draft:       '撮影台本初稿',
  script_fb:          '台本FB',
  script_client:      '台本先方提出',
  shooting:           '撮影日',
  footage_share:      '撮影素材共有',
  internal_draft:     '社内初稿',
  internal_fb:        '社内FB',
  client_first_draft: '先方初稿提出',
  client_fb:          '先方FB',
  internal_v2:        '社内第２稿',
  client_revision:    '修正稿提出',
  client_final:       '先方最終確認',
  owner_check:        'お施主様チェック',
  delivery:           '納品日',
  thumbnail:          'サムネ作成日',
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: '認証に失敗しました' } },
      { status: 401 }
    )
  }

  const supabase = await createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: schedules, error } = await supabase
    .from('youtube_schedules')
    .select('id, content_type, post_date, milestones, account:youtube_accounts!youtube_account_id(channel_name)')
    .not('status', 'eq', 'posted')
    .not('milestones', 'is', null)

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }

  type Alert = { channel: string; title: string; milestone: string; date: string; kind: 'today' | 'overdue' }
  const alerts: Alert[] = []

  for (const s of schedules ?? []) {
    const milestones = s.milestones as Record<string, { date: string | null; done: boolean }> | null
    if (!milestones) continue

    const account = Array.isArray(s.account) ? s.account[0] : s.account
    const channel = (account as { channel_name: string } | null)?.channel_name ?? '不明チャンネル'
    const title = s.content_type ?? (s.post_date ? `投稿日: ${s.post_date}` : '（タイトルなし）')

    for (const [key, ms] of Object.entries(milestones)) {
      if (!ms?.date || ms.done) continue
      if (ms.date === today) {
        alerts.push({ channel, title, milestone: MILESTONE_LABELS[key] ?? key, date: ms.date, kind: 'today' })
      } else if (ms.date < today) {
        alerts.push({ channel, title, milestone: MILESTONE_LABELS[key] ?? key, date: ms.date, kind: 'overdue' })
      }
    }
  }

  if (alerts.length === 0) {
    return NextResponse.json({ data: { processed: 0 }, error: null })
  }

  const todayAlerts = alerts.filter((a) => a.kind === 'today')
  const overdueAlerts = alerts.filter((a) => a.kind === 'overdue')

  const lines: string[] = ['*📅 YouTube マイルストーン アラート*']

  if (todayAlerts.length > 0) {
    lines.push('\n*⚠️ 本日が期限:*')
    for (const a of todayAlerts) {
      lines.push(`• [${a.channel}] ${a.title} — *${a.milestone}*`)
    }
  }

  if (overdueAlerts.length > 0) {
    lines.push('\n*🔴 期限超過:*')
    for (const a of overdueAlerts) {
      lines.push(`• [${a.channel}] ${a.title} — *${a.milestone}* (${a.date})`)
    }
  }

  await sendSlackMessage(lines.join('\n'))

  return NextResponse.json({ data: { processed: alerts.length }, error: null })
}
