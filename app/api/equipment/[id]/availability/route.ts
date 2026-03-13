import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const url = new URL(req.url)
  const from = url.searchParams.get('from') ?? new Date().toISOString().split('T')[0]
  const to = url.searchParams.get('to') ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('rentals')
    .select('start_date, end_date, status')
    .eq('equipment_id', id)
    .not('status', 'in', '("cancelled","returned")')
    .lte('start_date', to)
    .gte('end_date', from)
    .order('start_date', { ascending: true })

  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data: { equipment_id: id, booked_periods: data }, error: null })
}
