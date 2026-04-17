import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient()
  const url = new URL(req.url)
  const start = url.searchParams.get('start')
  const end   = url.searchParams.get('end')

  type ProjectRef = { deleted_at: string | null } | { deleted_at: string | null }[] | null
  const isProjectDeleted = (proj: ProjectRef) => {
    const p = Array.isArray(proj) ? proj[0] ?? null : proj
    return !!p?.deleted_at
  }

  // 1. project_outsourcers (案件レベル外注)
  let q1 = supabase
    .from('project_outsourcers')
    .select('outsourcer_id, amount, outsourcer:outsourcers(id, name, type, is_active), project:projects!project_id(deleted_at)')
    .not('delivered_at', 'is', null)
  if (start) q1 = q1.gte('delivered_at', `${start}T00:00:00`)
  if (end)   q1 = q1.lte('delivered_at', `${end}T23:59:59`)
  const { data: poRows, error: e1 } = await q1
  if (e1) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: e1.message } }, { status: 500 })

  // 2. task_batches (タスクバッチレベル外注)
  let q2 = supabase
    .from('task_batches')
    .select('outsourcer_id, outsourcer_amount, outsourcer:outsourcers(id, name, type, is_active), project:projects!project_id(deleted_at)')
    .not('outsourcer_id', 'is', null)
    .not('delivered_at', 'is', null)
  if (start) q2 = q2.gte('delivered_at', `${start}T00:00:00`)
  if (end)   q2 = q2.lte('delivered_at', `${end}T23:59:59`)
  const { data: batchRows, error: e2 } = await q2
  if (e2) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: e2.message } }, { status: 500 })

  // 3. youtube_schedules (YouTube長尺外注) — 納品日マイルストーンで絞り込み
  const { data: ytRows, error: e3 } = await supabase
    .from('youtube_schedules')
    .select('youtube_outsourcers, milestones')
    .in('status', ['delivered', 'reserved', 'posted'])
    .eq('video_length', 'long')
    .not('youtube_outsourcers', 'is', null)
  if (e3) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: e3.message } }, { status: 500 })

  // 外注者ごとに集計（削除済み案件は除外）
  const map = new Map<string, { outsourcer: unknown; total_amount: number; project_count: number }>()

  const accum = (outsourcerId: string, outsourcerData: unknown, amount: number) => {
    const existing = map.get(outsourcerId)
    if (existing) {
      existing.total_amount += amount
      existing.project_count += 1
    } else {
      map.set(outsourcerId, { outsourcer: outsourcerData, total_amount: amount, project_count: 1 })
    }
  }

  for (const row of poRows ?? []) {
    if (isProjectDeleted(row.project as ProjectRef)) continue
    accum(row.outsourcer_id, row.outsourcer, row.amount)
  }
  for (const row of batchRows ?? []) {
    if (!row.outsourcer_id) continue
    if (isProjectDeleted(row.project as ProjectRef)) continue
    accum(row.outsourcer_id, row.outsourcer, row.outsourcer_amount ?? 0)
  }
  type YtOutsourcerEntry = { outsourcer_id: string; name: string; amount: number }
  type MilestoneEntry = { date?: string | null; done?: boolean }
  type Milestones = Record<string, MilestoneEntry>
  for (const row of ytRows ?? []) {
    // 納品日マイルストーンで月フィルタ
    const milestones = (row.milestones ?? {}) as Milestones
    const deliveryDate = milestones['delivery']?.date ?? null
    if (!deliveryDate) continue
    if (start && deliveryDate < start) continue
    if (end   && deliveryDate > end)   continue

    const entries = (row.youtube_outsourcers ?? []) as YtOutsourcerEntry[]
    for (const entry of entries) {
      if (!entry.outsourcer_id || entry.amount <= 0) continue
      accum(entry.outsourcer_id, { id: entry.outsourcer_id, name: entry.name }, entry.amount)
    }
  }

  const result = Array.from(map.entries()).map(([outsourcer_id, val]) => ({
    outsourcer_id,
    ...val,
  }))

  return NextResponse.json({ data: result, error: null })
}
