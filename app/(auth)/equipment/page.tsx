import { createAdminClient } from '@/lib/supabase/server'
import { EquipmentManager } from '@/components/equipment/EquipmentManager'

export default async function EquipmentPage() {
  const supabase = await createAdminClient()
  const { data: equipment } = await supabase
    .from('equipment_with_status')
    .select('id,name,notes,serial_number,image_url,is_active,category_id,category_name,current_status,created_at')
    .order('created_at', { ascending: false })

  return <EquipmentManager equipment={equipment ?? []} isAdmin={true} />
}
