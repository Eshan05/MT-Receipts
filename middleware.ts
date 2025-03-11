import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuthToken, getTokenServer } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const token = await getTokenServer()
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/') &&
    !request.nextUrl.pathname.startsWith('/v')

  if (isProtectedRoute) {
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = '/v'
      url.search = `redirect=${request.nextUrl.pathname}`
      return NextResponse.redirect(url)
    }

    const verifiedToken = await verifyAuthToken(token)
    if (!verifiedToken) {
      const url = request.nextUrl.clone()
      url.pathname = '/v'
      url.search = `redirect=${request.nextUrl.pathname}`
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
