import { NextRequest, NextResponse } from 'next/server'
import { RESERVED_SLUGS } from '../utils/reserved-slugs'

export const PUBLIC_PATHS = [
  '/',
  '/v',
  '/login',
  '/signup',
  '/o',
  '/api/sessions',
  '/api/users',
]

export const SUPERADMIN_PATHS = ['/s', '/superadmin', '/api/admins']

export const STATIC_PATHS = ['/favicon.ico', '/_next', '/api']

export const NON_TENANT_PATHS = [
  'v',
  'api',
  's',
  'superadmin',
  'login',
  'signup',
  'sign-in',
  'sign-up',
  'logout',
  'o',
]

export function isStaticPath(pathname: string): boolean {
  return STATIC_PATHS.some((staticPath) => pathname.startsWith(staticPath))
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(publicPath + '/')
  )
}

export function isSuperAdminPath(pathname: string): boolean {
  return SUPERADMIN_PATHS.some(
    (saPath) => pathname === saPath || pathname.startsWith(`${saPath}/`)
  )
}

export function isNonTenantPath(firstSegment: string): boolean {
  return NON_TENANT_PATHS.includes(firstSegment)
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}

export function extractSlugFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  const firstSegment = segments[0]

  if (isNonTenantPath(firstSegment) || isReservedSlug(firstSegment)) {
    return null
  }

  return firstSegment.toLowerCase()
}

export function createRedirectUrl(
  request: { nextUrl: { clone(): URL } },
  path: string
): URL {
  const url = request.nextUrl.clone()
  url.pathname = path
  return url
}

export function createErrorResponse(
  request: NextRequest,
  errorPath: string
): NextResponse {
  const url = createRedirectUrl(request, errorPath)
  return NextResponse.redirect(url)
}

export function injectOrganizationHeaders(
  request: NextRequest,
  org: { id: string; slug: string; name: string }
): NextResponse {
  const response = NextResponse.next()
  response.headers.set('x-organization-id', org.id)
  response.headers.set('x-organization-slug', org.slug)
  response.headers.set('x-organization-name', org.name)
  return response
}

export function getPathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api')
}

export function isPublicReceiptView(pathname: string): boolean {
  const segments = getPathSegments(pathname)
  return segments[0] === 'v'
}
