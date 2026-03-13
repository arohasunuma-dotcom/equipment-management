import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('username', name.trim(), {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('username', '', { maxAge: 0, path: '/' })
  return response
}
