import { createAdminClient } from '@/lib/supabase/server'
import { EquipmentManager } from '@/components/equipment/EquipmentManager'

export default async function EquipmentPage() {
  const supabase = await createAdminClient()
  const { data: equipment } = await supabase
    .from('equipment_with_status')
    .select('*')
    .order('created_at', { ascending: false })

  return <EquipmentManager equipment={equipment ?? []} isAdmin={true} />
}
