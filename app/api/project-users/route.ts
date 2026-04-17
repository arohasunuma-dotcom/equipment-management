import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, slack_user_id')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}
