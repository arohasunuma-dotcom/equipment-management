import { createDraftsClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createDraftsClient()
  const url = new URL(req.url)
  const prefectureCode = url.searchParams.get('prefecture_code')

  let query = supabase
    .from('room_tour_models')
    .select('*, media:room_tour_media(id)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (prefectureCode) {
    query = query.eq('prefecture_code', parseInt(prefectureCode, 10))
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  const modelsWithCount = (data ?? []).map((m) => ({
    ...m,
    media_count: Array.isArray(m.media) ? m.media.length : 0,
    media: undefined,
  }))

  return NextResponse.json({ data: modelsWithCount, error: null, meta: { total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const supabase = await createDraftsClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です' } },
      { status: 422 }
    )
  }

  const { name, company_name, prefecture_code, address, description, thumbnail_url } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'モデル名は必須です' } },
      { status: 422 }
    )
  }
  if (!company_name || typeof company_name !== 'string' || !company_name.trim()) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: '工務店名は必須です' } },
      { status: 422 }
    )
  }
  if (!prefecture_code || typeof prefecture_code !== 'number' || prefecture_code < 1 || prefecture_code > 47) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: '都道府県は必須です' } },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('room_tour_models')
    .insert({
      name: (name as string).trim(),
      company_name: (company_name as string).trim(),
      prefecture_code,
      address: address ? String(address).trim() || null : null,
      description: description ? String(description).trim() || null : null,
      thumbnail_url: thumbnail_url ? String(thumbnail_url).trim() || null : null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
