/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db-conn', () => ({
  default: vi.fn(),
}))

const mockGetTokenServer = vi.fn()
const mockVerifyAuthToken = vi.fn()
vi.mock('@/lib/auth/auth', () => ({
  getTokenServer: (...args: unknown[]) => mockGetTokenServer(...args),
  verifyAuthToken: (...args: unknown[]) => mockVerifyAuthToken(...args),
}))

const mockUserFindOne = vi.fn()
vi.mock('@/models/user.model', () => ({
  default: {
    findOne: (...args: unknown[]) => mockUserFindOne(...args),
  },
}))

describe('lib/auth/superadmin-route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when missing token', async () => {
    mockGetTokenServer.mockResolvedValueOnce(undefined)

    const { getSuperAdminContext } = await import('@/lib/auth/superadmin-route')
    const result = await getSuperAdminContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(401)
      await expect(result.json()).resolves.toEqual({ error: 'Unauthorized' })
    }
  })

  it('returns 404 when user not found', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce({ email: 'x@example.com' })
    mockUserFindOne.mockResolvedValueOnce(null)

    const { getSuperAdminContext } = await import('@/lib/auth/superadmin-route')
    const result = await getSuperAdminContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(404)
      await expect(result.json()).resolves.toEqual({ error: 'User not found' })
    }
  })

  it('returns 403 when user is not a superadmin', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce({ email: 'x@example.com' })
    mockUserFindOne.mockResolvedValueOnce({
      _id: { toString: () => 'u1' },
      email: 'x@example.com',
      username: 'x',
      isSuperAdmin: false,
    })

    const { getSuperAdminContext } = await import('@/lib/auth/superadmin-route')
    const result = await getSuperAdminContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(403)
      await expect(result.json()).resolves.toEqual({
        error: 'Super admin access required',
      })
    }
  })

  it('returns superadmin context when user is a superadmin', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce({ email: 'x@example.com' })
    mockUserFindOne.mockResolvedValueOnce({
      _id: { toString: () => 'u1' },
      email: 'x@example.com',
      username: 'x',
      isSuperAdmin: true,
    })

    const { getSuperAdminContext } = await import('@/lib/auth/superadmin-route')
    const result = await getSuperAdminContext(new Request('http://localhost'))

    expect(result).not.toBeInstanceOf(Response)
    if (!(result instanceof Response)) {
      expect(result.user).toEqual({
        id: 'u1',
        email: 'x@example.com',
        username: 'x',
      })
    }
  })
})
