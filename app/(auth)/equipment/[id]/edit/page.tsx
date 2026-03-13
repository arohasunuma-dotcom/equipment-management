import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { EquipmentForm } from '@/components/equipment/EquipmentForm'
import { ArrowLeft } from 'lucide-react'

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) redirect('/equipment')

  const { data: me } = await authClient.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') redirect('/equipment')

  const supabase = await createAdminClient()
  const { data: equipment } = await supabase.from('equipment').select('*').eq('id', id).single()
  if (!equipment) notFound()

  const { data: categories } = await supabase.from('categories').select('*').order('name')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/equipment/${id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        機材詳細に戻る
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">機材を編集する</h1>
      <EquipmentForm categories={categories ?? []} equipment={equipment} />
    </div>
  )
}
