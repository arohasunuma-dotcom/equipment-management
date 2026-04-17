import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { RentalForm } from '@/components/rentals/RentalForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default async function NewRentalPage({
  searchParams,
}: {
  searchParams: Promise<{ equipment_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createAdminClient()
  const cookieStore = await cookies()
  const username = cookieStore.get('username')?.value ?? ''

  const [{ data: equipment }, { data: staffMembers }] = await Promise.all([
    supabase
      .from('equipment_with_status')
      .select('id, name, category_name, current_status')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('staff_members')
      .select('id, name')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={params.equipment_id ? `/equipment/${params.equipment_id}` : '/equipment'} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">機材を予約する</h1>
      <RentalForm
        equipment={equipment ?? []}
        defaultEquipmentId={params.equipment_id}
        renterName={username}
        staffMembers={staffMembers ?? []}
      />
    </div>
  )
}
