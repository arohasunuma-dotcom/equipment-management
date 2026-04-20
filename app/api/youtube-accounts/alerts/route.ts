import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getToday, isWithin2BusinessDays } from '@/lib/businessDays'

export type AccountAlert = {
  account_id: string
  channel_name: string
  has_overdue: boolean
  has_warning: boolean
}

export async function GET() {
  const supabase = await createAdminClient()
  const today = getToday()

  const { data: schedules, error } = await supabase
    .from('youtube_schedules')
    .select('youtube_account_id, milestones, account:youtube_accounts!youtube_account_id(id, channel_name)')
    .not('status', 'eq', 'posted')
    .eq('video_length', 'long')
    .not('milestones', 'is', null)

  if (error) {
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }

  const map = new Map<string, AccountAlert>()

  for (const s of schedules ?? []) {
    const accountRaw = Array.isArray(s.account) ? s.account[0] : s.account
    const account = accountRaw as { id: string; channel_name: string } | null
    if (!account) continue

    const accountId = s.youtube_account_id as string
    if (!map.has(accountId)) {
      map.set(accountId, { account_id: accountId, channel_name: account.channel_name, has_overdue: false, has_warning: false })
    }
    const entry = map.get(accountId)!

    const milestones = (s.milestones ?? {}) as Record<string, { date: string | null; done: boolean }>
    for (const ms of Object.values(milestones)) {
      if (!ms?.date || ms.done) continue
      if (ms.date < today) {
        entry.has_overdue = true
      } else if (isWithin2BusinessDays(ms.date, today)) {
        entry.has_warning = true
      }
    }
  }

  return NextResponse.json({ data: Array.from(map.values()), error: null })
}
