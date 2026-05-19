import { createDraftsClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createDraftsClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('room_tour_models')
    .select('*, media:room_tour_media(*)')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'モデルが見つかりません' } },
      { status: 404 }
    )
  }

  return NextResponse.json({ data, error: null })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createDraftsClient()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } },
      { status: 422 }
    )
  }

  const allowed = ['name', 'company_name', 'prefecture_code', 'address', 'description', 'thumbnail_url']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in (body as Record<string, unknown>)) {
      updates[key] = (body as Record<string, unknown>)[key]
    }
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('room_tour_models')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createDraftsClient()
  const { id } = await params

  const { error } = await supabase
    .from('room_tour_models')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: null, error: null })
}
