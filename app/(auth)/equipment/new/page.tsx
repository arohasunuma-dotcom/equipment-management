import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { EquipmentForm } from '@/components/equipment/EquipmentForm'
import { ArrowLeft } from 'lucide-react'

export default async function NewEquipmentPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') redirect('/equipment')

  const { data: categories } = await supabase.from('categories').select('*').order('name')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/equipment" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        機材一覧に戻る
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">機材を登録する</h1>
      <EquipmentForm categories={categories ?? []} />
    </div>
  )
}
