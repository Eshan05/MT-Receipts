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
} from '@/lib/middleware-helpers'
import {
  resolveOrganization,
  getOrganizationErrorPath,
} from '@/lib/organization-context'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isStaticPath(pathname)) {
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

  if (!slug) {
    return NextResponse.next()
  }

  return handleTenantRoutes(request, slug)
}

async function handlePublicReceiptView(
  request: NextRequest
): Promise<NextResponse> {
  return NextResponse.next()
}

async function handleSuperAdminRoutes(
  request: NextRequest
): Promise<NextResponse> {
  const token = await getTokenServer()

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
