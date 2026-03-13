import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // ログイン画面・認証API は常に通過
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return supabaseResponse
  }

  // Supabase Auth セッション確認（管理者ログイン）
  const { data: { user } } = await supabase.auth.getUser()

  // username cookie 確認（一般スタッフ）
  const username = request.cookies.get('username')?.value

  // 未認証かつ username cookie もない場合 → /login にリダイレクト
  if (!user && !username) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 認証済みまたは username cookie あり → ダッシュボードへのログインリダイレクト
  if ((user || username) && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
