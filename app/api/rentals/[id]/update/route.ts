import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()
  const body = await req.json()
  const { equipment_ids, renter_name, start_date, end_date, shooting_date, purpose, return_location, notes } = body

  // Update rental
  await supabase.from('rentals').update({
    renter_name, start_date, end_date,
    shooting_date: shooting_date || null,
    purpose, return_location: return_location || null,
    notes: notes || null
  }).eq('id', id)

  // Replace equipment
  if (equipment_ids?.length) {
    await supabase.from('rental_equipment').delete().eq('rental_id', id)
    await supabase.from('rental_equipment').insert(
      equipment_ids.map((eid: string) => ({ rental_id: id, equipment_id: eid }))
    )
  }

  const { data } = await supabase
    .from('rentals')
    .select('*, rental_equipment(equipment_id, equipment:equipment(id, name, image_url))')
    .eq('id', id)
    .single()

  return NextResponse.json({ data, error: null })
}
