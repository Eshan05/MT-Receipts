import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuthToken, getTokenServer } from '@/lib/auth'
import {
  isStaticPath,
  isPublicPath,
  isSuperAdminPath,
  extractSlugFromPath,
  createErrorResponse,
  injectOrganizationHeaders,
  isPublicReceiptView,
  isApiRoute,
} from '@/lib/middleware-helpers'
import {
  resolveOrganizationFromCache as resolveOrganization,
  getOrganizationErrorPath,
} from '@/lib/organization-context'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isStaticPath(pathname)) {
    return NextResponse.next()
  }

  if (isApiRoute(pathname)) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (isPublicReceiptView(pathname)) {
    return handlePublicReceiptView(request)
  }

  if (isSuperAdminPath(pathname)) {
    return handleSuperAdminRoutes(request)
  }

  const slug = extractSlugFromPath(pathname)

  if (slug) {
    return handleTenantRoutes(request, slug)
  }

  if (!isAuthenticatedRoute(pathname)) {
    return NextResponse.next()
  }

  const authResult = await checkAuth(request)
  if (authResult) {
    return authResult
  }

  return NextResponse.next()
}

function isAuthenticatedRoute(pathname: string): boolean {
  const publicRoutes = ['/', '/v']
  if (publicRoutes.includes(pathname)) {
    return false
  }
  return true
}

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = await getTokenServer(request)

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

  return null
}

async function handlePublicReceiptView(
  request: NextRequest
): Promise<NextResponse> {
  return NextResponse.next()
}

async function handleSuperAdminRoutes(
  request: NextRequest
): Promise<NextResponse> {
  const token = await getTokenServer(request)

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/v'
    url.search = `redirect=${request.nextUrl.pathname}`
    return NextResponse.redirect(url)
  }

  const verifiedToken = await verifyAuthToken(token)

  if (!verifiedToken || !verifiedToken.isSuperAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

async function handleTenantRoutes(
  request: NextRequest,
  slug: string
): Promise<NextResponse> {
  const authResult = await checkAuth(request)
  if (authResult) {
    return authResult
  }

  const org = await resolveOrganization(slug)

  const errorPath = getOrganizationErrorPath(org)

  if (errorPath) {
    return createErrorResponse(request, errorPath)
  }

  return injectOrganizationHeaders(request, {
    id: org!.id,
    slug: org!.slug,
    name: org!.name,
  })
}

async function handleApiRoutes(request: NextRequest): Promise<NextResponse> {
  const orgSlugCookie = request.cookies.get('currentOrganization')?.value

  if (!orgSlugCookie) {
    return NextResponse.next()
  }

  const org = await resolveOrganization(orgSlugCookie)

  if (!org || org.status !== 'active') {
    return NextResponse.next()
  }

  return injectOrganizationHeaders(request, {
    id: org.id,
    slug: org.slug,
    name: org.name,
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
