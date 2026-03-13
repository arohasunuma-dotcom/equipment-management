import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createAdminClient()
  const url = new URL(req.url)

  let query = supabase
    .from('rentals')
    .select('*, rental_equipment(equipment_id, equipment:equipment(id, name, image_url))')
    .order('created_at', { ascending: false })

  const renter_name = url.searchParams.get('renter_name')
  if (renter_name) query = query.eq('renter_name', renter_name)

  const status = url.searchParams.get('status')
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()
  const body = await req.json()
  const { equipment_ids, renter_name, start_date, end_date, shooting_date, purpose, return_location, notes } = body

  if (!equipment_ids?.length) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '機材を1つ以上選択してください' } }, { status: 422 })
  if (!renter_name?.trim()) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '担当者名を入力してください' } }, { status: 422 })
  if (!start_date || !end_date || !purpose) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '必須項目を入力してください' } }, { status: 422 })

  // Check overlap for each equipment
  for (const equipment_id of equipment_ids) {
    const { data: conflicts } = await supabase
      .from('rental_equipment')
      .select('rental_id, rental:rentals!inner(start_date, end_date, status)')
      .eq('equipment_id', equipment_id)
      .not('rental.status', 'in', '("completed","cancelled")')
      .lte('rental.start_date', end_date)
      .gte('rental.end_date', start_date)
      .limit(1)

    if (conflicts && conflicts.length > 0) {
      const { data: eq } = await supabase.from('equipment').select('name').eq('id', equipment_id).single()
      const conflict = (conflicts[0] as any).rental
      return NextResponse.json({
        data: null,
        error: {
          code: 'CONFLICT',
          message: `「${eq?.name}」は ${conflict.start_date} 〜 ${conflict.end_date} の期間に既に予約があります。`,
        },
      }, { status: 409 })
    }
  }

  // Create rental
  const { data: rental, error: rentalError } = await supabase
    .from('rentals')
    .insert({ user_id: null, renter_name: renter_name.trim(), start_date, end_date, shooting_date: shooting_date || null, purpose, return_location: return_location || null, notes: notes || null, status: 'active' })
    .select()
    .single()

  if (rentalError) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: rentalError.message } }, { status: 500 })

  // Create rental_equipment records
  await supabase.from('rental_equipment').insert(
    equipment_ids.map((eid: string) => ({ rental_id: rental.id, equipment_id: eid }))
  )

  // Fetch complete rental with equipment
  const { data: complete } = await supabase
    .from('rentals')
    .select('*, rental_equipment(equipment_id, equipment:equipment(id, name, image_url))')
    .eq('id', rental.id)
    .single()

  return NextResponse.json({ data: complete, error: null }, { status: 201 })
}
