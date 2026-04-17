import { NextRequest, NextResponse } from 'next/server'

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: '認証に失敗しました' } },
      { status: 401 }
    )
  }

  // TODO: Google Calendar API実装 - プロジェクトのイベントをGoogle Calendarと同期する
  return NextResponse.json({ data: { synced: 0 }, error: null })
}
