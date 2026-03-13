import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { RentalManager } from '@/components/rentals/RentalManager'

export default async function RentalsPage() {
  const supabase = await createAdminClient()
  const cookieStore = await cookies()
  const username = cookieStore.get('username')?.value ?? ''

  const { data: rentals } = await supabase
    .from('rentals')
    .select('*, rental_equipment(equipment_id, equipment:equipment(id, name, image_url))')
    .order('created_at', { ascending: false })

  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return <RentalManager rentals={rentals ?? []} equipment={equipment ?? []} currentUser={username} />
}
