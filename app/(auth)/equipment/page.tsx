import { createClient, createAdminClient } from '@/lib/supabase/server'
import { EquipmentManager } from '@/components/equipment/EquipmentManager'

export default async function EquipmentPage() {
  const supabase = await createAdminClient()
  const { data: equipment } = await supabase
    .from('equipment_with_status')
    .select('*')
    .order('created_at', { ascending: false })

  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  let isAdmin = false
  if (authUser) {
    const { data: me } = await authClient.from('users').select('role').eq('id', authUser.id).single()
    isAdmin = me?.role === 'admin'
  }

  return <EquipmentManager equipment={equipment ?? []} isAdmin={isAdmin} />
}
