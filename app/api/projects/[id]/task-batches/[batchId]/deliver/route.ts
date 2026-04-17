import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string; batchId: string }> }

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id, batchId } = await params
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('task_batches')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', batchId)
    .eq('project_id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}
