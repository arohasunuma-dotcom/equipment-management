import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient()

  const url = new URL(req.url)
  const from = url.searchParams.get('from') ?? new Date().toISOString().split('T')[0]
  const to = url.searchParams.get('to') ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let query = supabase
    .from('rentals')
    .select('id, start_date, end_date, purpose, status, renter_name, equipment:equipment(id, name, category:categories(name))')
    .not('status', 'in', '("cancelled","returned")')
    .lte('start_date', to)
    .gte('end_date', from)
    .order('start_date', { ascending: true })

  const equipment_id = url.searchParams.get('equipment_id')
  if (equipment_id) query = query.eq('equipment_id', equipment_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}
