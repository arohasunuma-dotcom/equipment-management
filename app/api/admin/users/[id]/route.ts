import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null
  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return null
  return authUser
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: '管理者のみ削除できます' } },
      { status: 403 }
    )
  }

  const { id } = await params

  if (id === admin.id) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: '自分自身は削除できません' } },
      { status: 403 }
    )
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { id }, error: null })
}
