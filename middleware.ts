import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuthToken, getTokenServer } from '@/lib/auth/auth'
import type { JWTPayload } from 'jose'
import {
  isStaticPath,
  isPublicPath,
  isSuperAdminPath,
  extractSlugFromPath,
  createErrorResponse,
  injectOrganizationHeaders,
  isPublicReceiptView,
} from '@/lib/middleware-helpers'
import { getCachedOrganization, type CachedOrganization } from '@/lib/redis'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isStaticPath(pathname)) return NextResponse.next()
  if (isPublicPath(pathname)) return NextResponse.next()

  if (isPublicReceiptView(pathname)) return handlePublicReceiptView(request)

  if (isSuperAdminPath(pathname)) return handleSuperAdminRoutes(request)

  const slug = extractSlugFromPath(pathname)

  if (slug) {
    return handleTenantRoutes(request, slug)
  }

  if (!isAuthenticatedRoute(pathname)) {
    return NextResponse.next()
  }

  const auth = await checkAuth(request)
  if (auth.response) {
    return auth.response
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

async function checkAuth(request: NextRequest): Promise<{
  response: NextResponse | null
  verifiedToken: JWTPayload | null
}> {
  const token = await getTokenServer(request)

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/v'
    url.search = `redirect=${request.nextUrl.pathname}`
    return { response: NextResponse.redirect(url), verifiedToken: null }
  }

  const verifiedToken = await verifyAuthToken(token)
  if (!verifiedToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/v'
    url.search = `redirect=${request.nextUrl.pathname}`
    return { response: NextResponse.redirect(url), verifiedToken: null }
  }

  return { response: null, verifiedToken }
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
  const auth = await checkAuth(request)
  if (auth.response) {
    return auth.response
  }

  const org = await resolveOrganizationForMiddleware(request, slug)
  const errorPath = getOrganizationErrorPath(org)

  if (errorPath) {
    return createErrorResponse(request, errorPath)
  }

  queueTenantPageViewLog({
    request,
    organization: org!,
    verifiedToken: auth.verifiedToken,
  })

  return injectOrganizationHeaders(request, {
    id: org!.id,
    slug: org!.slug,
    name: org!.name,
  })
}

async function resolveOrganizationForMiddleware(
  request: NextRequest,
  slug: string
): Promise<CachedOrganization | null> {
  const cachedOrg = await getCachedOrganization(slug)
  if (cachedOrg) return cachedOrg

  // Edge Runtime can't connect to MongoDB. On cache miss, fetch from an existing
  // Node.js API route which will also populate the cache.
  try {
    const url = new URL(
      `/api/organizations/${encodeURIComponent(slug)}`,
      request.url
    )
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) return null
    const data = (await res.json()) as {
      id?: unknown
      slug?: unknown
      name?: unknown
      status?: unknown
    }

    const id =
      typeof data.id === 'string'
        ? data.id
        : ((data.id as any)?.toString?.() ?? '')
    const resolvedSlug = typeof data.slug === 'string' ? data.slug : slug
    const name = typeof data.name === 'string' ? data.name : ''
    const status = typeof data.status === 'string' ? data.status : ''

    if (!id || !resolvedSlug || !name || !status) return null

    return { id, slug: resolvedSlug, name, status }
  } catch {
    return null
  }
}

function getOrganizationErrorPath(
  org: { status: string } | null
): string | null {
  if (!org) {
    return '/o/404'
  }

  switch (org.status) {
    case 'pending':
      return '/o/202'
    case 'suspended':
      return '/o/403'
    case 'deleted':
      return '/o/410'
    default:
      return null
  }
}

function queueTenantPageViewLog(params: {
  request: NextRequest
  organization: { id: string; slug: string; name: string }
  verifiedToken: JWTPayload | null
}) {
  const secret = process.env.INTERNAL_AUDIT_LOG_SECRET
  if (!secret) return

  const email =
    typeof params.verifiedToken?.email === 'string'
      ? params.verifiedToken.email
      : undefined
  if (!email) return

  if (params.request.method !== 'GET') return

  const purpose = params.request.headers.get('purpose')
  const secPurpose = params.request.headers.get('sec-purpose')
  const middlewarePrefetch = params.request.headers.get('x-middleware-prefetch')
  if (
    purpose === 'prefetch' ||
    secPurpose === 'prefetch' ||
    middlewarePrefetch
  ) {
    return
  }

  const dest = params.request.headers.get('sec-fetch-dest')
  const accept = params.request.headers.get('accept')
  const isDocument =
    dest === 'document' || (accept?.includes('text/html') ?? false)
  if (!isDocument) return

  const rawRate = process.env.TENANT_PAGE_VIEW_SAMPLE_RATE
  const sampleRate = rawRate ? Number(rawRate) : 0.1
  const effectiveRate = sampleRate >= 1 ? 1 : sampleRate > 0 ? sampleRate : 0
  if (effectiveRate < 1 && Math.random() >= effectiveRate) {
    return
  }

  const url = new URL('/api/logs/views', params.request.url)
  const body = {
    email,
    organizationId: params.organization.id,
    organizationSlug: params.organization.slug,
    path: params.request.nextUrl.pathname,
    referrer: params.request.headers.get('referer') || undefined,
    userAgent: params.request.headers.get('user-agent') || undefined,
    ip:
      params.request.headers.get('x-forwarded-for') ||
      params.request.headers.get('x-real-ip') ||
      undefined,
  }

  try {
    void fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-audit-log-secret': secret,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      keepalive: true,
    })
  } catch {
    // ignore
  }
}

async function handleApiRoutes(request: NextRequest): Promise<NextResponse> {
  const orgSlugCookie = request.cookies.get('currentOrganization')?.value

  if (!orgSlugCookie) {
    return NextResponse.next()
  }

  const org = await resolveOrganizationForMiddleware(request, orgSlugCookie)

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
