/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignJWT, type JWTPayload } from 'jose'

const mockGetCookie = vi.fn()
const mockSetCookie = vi.fn()
const mockDeleteCookie = vi.fn()

vi.mock('cookies-next', () => ({
  getCookie: (...args: unknown[]) => mockGetCookie(...args),
  setCookie: (...args: unknown[]) => mockSetCookie(...args),
  deleteCookie: (...args: unknown[]) => mockDeleteCookie(...args),
}))

describe('lib/auth/auth-client', () => {
  const originalJwtSecret = process.env.JWT_SECRET

  beforeEach(() => {
    vi.resetModules()
    process.env.JWT_SECRET = 'client-jwt-secret'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetCookie.mockReset()
    mockSetCookie.mockReset()
    mockDeleteCookie.mockReset()
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret
    vi.restoreAllMocks()
  })

  it('verifyAuthTokenClient verifies valid token payload', async () => {
    const { verifyAuthTokenClient } = await import('@/lib/auth/auth-client')

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const payload: JWTPayload = { email: 'x@example.com', jti: 'abc' }
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret)

    const verified = await verifyAuthTokenClient(token)
    expect(verified?.email).toBe('x@example.com')
    expect(verified?.jti).toBe('abc')
  })

  it('verifyAuthTokenClient returns null for invalid tokens', async () => {
    const { verifyAuthTokenClient } = await import('@/lib/auth/auth-client')

    const verified = await verifyAuthTokenClient('not-a-jwt')
    expect(verified).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('getTokenClient returns authToken when it is a string', async () => {
    const { getTokenClient } = await import('@/lib/auth/auth-client')

    mockGetCookie.mockReturnValueOnce('token-123')
    expect(getTokenClient()).toBe('token-123')
  })

  it('getTokenClient returns undefined when authToken is not a string', async () => {
    const { getTokenClient } = await import('@/lib/auth/auth-client')

    mockGetCookie.mockReturnValueOnce(undefined)
    expect(getTokenClient()).toBeUndefined()

    mockGetCookie.mockReturnValueOnce(['not', 'string'])
    expect(getTokenClient()).toBeUndefined()
  })

  it('setAuthCookieClient sets cookie with defaults and merges options', async () => {
    const { setAuthCookieClient } = await import('@/lib/auth/auth-client')

    setAuthCookieClient('abc', { maxAge: 123 })

    expect(mockSetCookie).toHaveBeenCalledWith(
      'authToken',
      'abc',
      expect.objectContaining({
        path: '/',
        sameSite: 'strict',
        maxAge: 123,
      })
    )
  })

  it('deleteAuthCookieClient deletes cookie with path', async () => {
    const { deleteAuthCookieClient } = await import('@/lib/auth/auth-client')

    deleteAuthCookieClient({ domain: 'example.com' })

    expect(mockDeleteCookie).toHaveBeenCalledWith(
      'authToken',
      expect.objectContaining({
        path: '/',
        domain: 'example.com',
      })
    )
  })
})
