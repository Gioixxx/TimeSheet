import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, isAuthEnabled, verifyCookieToken } from '@/lib/session'

const PUBLIC_PATHS = ['/login', '/setup']

export default async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p)

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await verifyCookieToken(token)

  if (!isPublic && !session) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (isPublic && session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon.svg|.*\\.png$).*)',
  ],
}
