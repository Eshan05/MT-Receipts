/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'

describe('lib/auth/auth (server)', () => {
  const originalJwtSecret = process.env.JWT_SECRET

  beforeEach(() => {
    vi.resetModules()
    process.env.JWT_SECRET = 'test-jwt-secret'
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret
    vi.restoreAllMocks()
  })

  it('creates and verifies a session token (roundtrip)', async () => {
    const { createSessionToken, verifyAuthToken } =
      await import('@/lib/auth/auth')

    const token = await createSessionToken('user@example.com')
    expect(typeof token).toBe('string')

    const payload = await verifyAuthToken(token)
    expect(payload?.email).toBe('user@example.com')
    expect(typeof payload?.jti).toBe('string')
  })

  it('includes isSuperAdmin claim when requested', async () => {
    const { createSessionToken, verifyAuthToken } =
      await import('@/lib/auth/auth')

    const token = await createSessionToken('admin@example.com', {
      isSuperAdmin: true,
    })

    const payload = await verifyAuthToken(token)
    expect(payload?.email).toBe('admin@example.com')
    expect(payload?.isSuperAdmin).toBe(true)
  })

  it('returns null for invalid tokens', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/auth')

    const payload = await verifyAuthToken('not-a-jwt')
    expect(payload).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('getTokenServer reads authToken from Cookie header', async () => {
    const { getTokenServer } = await import('@/lib/auth/auth')

    const request = new Request('http://localhost/test', {
      headers: {
        cookie: 'authToken=abc123; other=ok',
      },
    })

    await expect(getTokenServer(request)).resolves.toBe('abc123')
  })

  it('getTokenServer decodes cookie values (supports = in value)', async () => {
    const { getTokenServer } = await import('@/lib/auth/auth')

    const request = new Request('http://localhost/test', {
      headers: {
        cookie: 'authToken=abc%3Ddef%3Dghi',
      },
    })

    await expect(getTokenServer(request)).resolves.toBe('abc=def=ghi')
  })

  it('getTokenServer falls back to Authorization: Bearer token when cookie missing', async () => {
    const { getTokenServer } = await import('@/lib/auth/auth')

    const request = new Request('http://localhost/test', {
      headers: {
        authorization: 'Bearer bearer-token',
      },
    })

    await expect(getTokenServer(request)).resolves.toBe('bearer-token')
  })

  it('getTokenServer prefers cookie over Authorization header', async () => {
    const { getTokenServer } = await import('@/lib/auth/auth')

    const request = new Request('http://localhost/test', {
      headers: {
        cookie: 'authToken=cookie-token',
        authorization: 'Bearer bearer-token',
      },
    })

    await expect(getTokenServer(request)).resolves.toBe('cookie-token')
  })

  it('getCurrentOrgSlug reads current org cookie from headers', async () => {
    const { getCurrentOrgSlug } = await import('@/lib/auth/auth')

    const request = new Request('http://localhost/test', {
      headers: {
        cookie: 'currentOrganization=my-org; authToken=x',
      },
    })

    await expect(getCurrentOrgSlug(request)).resolves.toBe('my-org')
  })

  it('setAuthCookie sets authToken cookie on response', async () => {
    const { setAuthCookie } = await import('@/lib/auth/auth')

    const response = NextResponse.json({ ok: true })
    const setSpy = vi.spyOn(response.cookies, 'set')

    await setAuthCookie('user@example.com', response)

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'authToken',
        path: '/',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        value: expect.any(String),
      })
    )
  })

  it('clearAuthCookie clears authToken cookie on response', async () => {
    const { clearAuthCookie } = await import('@/lib/auth/auth')

    const response = NextResponse.json({ ok: true })
    const setSpy = vi.spyOn(response.cookies, 'set')

    await clearAuthCookie(response)

    expect(setSpy).toHaveBeenCalledWith({
      name: 'authToken',
      value: '',
      path: '/',
      maxAge: 0,
    })
  })
})
