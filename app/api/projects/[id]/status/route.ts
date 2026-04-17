import { createAdminClient } from '@/lib/supabase/server'
import type { ProjectStatus } from '@/types/projects'
import { NextRequest, NextResponse } from 'next/server'

const PROJECT_STATUS_VALUES: ProjectStatus[] = [
  'inquiry',
  'shooting_scheduled',
  'shooting_done',
  'editing',
  'fb_waiting',
  'fb_responded',
  'fix_editing',
  're_fb_waiting',
  'completed',
  'cancelled',
]

type RouteContext = { params: Promise<{ id: string }> }

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

  const { status: newStatus } = body as { status?: unknown }

  if (!newStatus || !PROJECT_STATUS_VALUES.includes(newStatus as ProjectStatus)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'ステータスが不正です' } },
      { status: 422 }
    )
  }

  // 現在の案件を取得
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: '案件が見つかりません' } },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: fetchError.message } },
      { status: 500 }
    )
  }

  const currentStatus = project.status as ProjectStatus
  const targetStatus = newStatus as ProjectStatus

  // ステータスを更新
  const { data: updated, error: updateError } = await supabase
    .from('projects')
    .update({ status: targetStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: updateError.message } },
      { status: 500 }
    )
  }

  // 通知ログを記録
  const { error: logError } = await supabase.from('notification_logs').insert({
    project_id: id,
    type: 'status_changed',
    message: `ステータスが「${currentStatus}」から「${targetStatus}」に変更されました`,
    sent_at: new Date().toISOString(),
  })

  if (logError) {
    // ログ書き込みに失敗しても更新自体は成功扱いにする
    console.error('[notification_logs insert error]', logError.message)
  }

  return NextResponse.json({ data: updated, error: null })
}
