import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみアクセスできます' } }, { status: 403 })

  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true })
  if (error) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })

  return NextResponse.json({ data, error: null })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未ログインです' } }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: '管理者のみ作成できます' } }, { status: 403 })

  const body = await req.json()
  const { email, name, password, role } = body

  if (!email || !name || !password) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'email・name・passwordは必須です' } }, { status: 422 })
  }
  if (password.length < 8) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'パスワードは8文字以上で入力してください' } }, { status: 422 })
  }

  // Service Role で Auth にユーザー作成
  const adminClient = await createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: authError.message } }, { status: 500 })

  // ロールを更新（トリガーで 'user' が挿入されるため、admin の場合は上書き）
  if (role === 'admin') {
    await supabase.from('users').update({ role: 'admin' }).eq('id', authData.user.id)
  }

  const { data } = await supabase.from('users').select('*').eq('id', authData.user.id).single()

  return NextResponse.json({ data, error: null }, { status: 201 })
}
