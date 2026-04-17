import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createAdminClient()

  // 1. 案件レベル外注
  const { data: poRows, error: e1 } = await supabase
    .from('project_outsourcers')
    .select('id, amount, notes, delivered_at, created_at, project:projects(id, title, shooting_date, delivery_date, work_type, status, deleted_at)')
    .eq('outsourcer_id', id)
    .order('created_at', { ascending: false })

  if (e1) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: e1.message } }, { status: 500 })

  // 2. タスクバッチレベル外注
  const { data: batchRows, error: e2 } = await supabase
    .from('task_batches')
    .select('id, name, outsourcer_amount, delivered_at, created_at, project:projects!project_id(id, title, work_type, status, deleted_at)')
    .eq('outsourcer_id', id)
    .order('created_at', { ascending: false })

  if (e2) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: e2.message } }, { status: 500 })

  // 3. YouTubeスケジュール外注（納品済み以降）
  const { data: ytRows, error: e3 } = await supabase
    .from('youtube_schedules')
    .select('id, post_date, delivered_at, status, youtube_outsourcers, account:youtube_accounts!youtube_account_id(id, channel_name)')
    .in('status', ['delivered', 'reserved', 'posted'])
    .not('youtube_outsourcers', 'is', null)
    .order('post_date', { ascending: false })

  if (e3) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: e3.message } }, { status: 500 })

  // 統一形式にまとめて返す
  type RowProject = { id: string; title: string; work_type: string; status: string; deleted_at: string | null; shooting_date?: string | null; delivery_date?: string | null }
  type YtOutsourcerEntry = { outsourcer_id: string; name: string; amount: number }
  type YtAccount = { id: string; channel_name: string } | null
  type ResultItem = {
    id: string; kind: 'project' | 'batch' | 'youtube'; batch_name?: string
    amount: number; delivered_at: string | null; created_at: string
    project: RowProject | null
    channel_name?: string | null; channel_url?: string | null; post_date?: string | null; yt_status?: string
  }

  const resolveProject = (raw: unknown): RowProject | null => {
    if (!raw) return null
    if (Array.isArray(raw)) return raw[0] ?? null
    return raw as RowProject
  }

  const resolveAccount = (raw: unknown): YtAccount => {
    if (!raw) return null
    if (Array.isArray(raw)) return (raw[0] ?? null) as YtAccount
    return raw as YtAccount
  }

  // youtube_outsourcers JSONB から対象外注者のエントリを取得
  const ytItems: ResultItem[] = []
  for (const row of ytRows ?? []) {
    const entries = (row.youtube_outsourcers ?? []) as YtOutsourcerEntry[]
    const entry = entries.find((e) => e.outsourcer_id === id)
    if (!entry || entry.amount <= 0) continue
    const account = resolveAccount(row.account)
    ytItems.push({
      id: row.id,
      kind: 'youtube' as const,
      amount: entry.amount,
      delivered_at: row.delivered_at,
      created_at: row.delivered_at ?? row.post_date ?? '',
      project: null,
      channel_name: account?.channel_name ?? null,
      channel_url: null,
      post_date: row.post_date,
      yt_status: row.status,
    })
  }

  const results: ResultItem[] = [
    ...(poRows ?? []).filter((r) => !resolveProject(r.project)?.deleted_at).map((r) => ({
      id: r.id,
      kind: 'project' as const,
      amount: r.amount,
      delivered_at: r.delivered_at,
      created_at: r.created_at,
      project: resolveProject(r.project),
    })),
    ...(batchRows ?? []).filter((r) => !resolveProject(r.project)?.deleted_at).map((r) => ({
      id: r.id,
      kind: 'batch' as const,
      batch_name: r.name,
      amount: r.outsourcer_amount ?? 0,
      delivered_at: r.delivered_at,
      created_at: r.created_at,
      project: resolveProject(r.project),
    })),
    ...ytItems,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ data: results, error: null })
}
