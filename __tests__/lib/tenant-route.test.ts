/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db-conn', () => ({
  default: vi.fn(),
}))

const mockGetOrganizationContext = vi.fn()
vi.mock('@/lib/tenants/organization-context', () => ({
  getOrganizationContext: (...args: unknown[]) =>
    mockGetOrganizationContext(...args),
}))

const mockGetTenantModels = vi.fn()
vi.mock('@/lib/db/tenant-models', () => ({
  getTenantModels: (...args: unknown[]) => mockGetTenantModels(...args),
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

describe('lib/auth/tenant-route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('getTenantContext returns 401 when missing token', async () => {
    mockGetTokenServer.mockResolvedValueOnce(undefined)

    const { getTenantContext } = await import('@/lib/auth/tenant-route')
    const result = await getTenantContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(401)
      await expect(result.json()).resolves.toEqual({ error: 'Unauthorized' })
    }
  })

  it('getTenantContext returns 401 when token invalid', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce(null)

    const { getTenantContext } = await import('@/lib/auth/tenant-route')
    const result = await getTenantContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(401)
      await expect(result.json()).resolves.toEqual({ error: 'Unauthorized' })
    }
  })

  it('getTenantContext returns 404 when user not found', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce({ email: 'x@example.com' })
    mockUserFindOne.mockResolvedValueOnce(null)

    const { getTenantContext } = await import('@/lib/auth/tenant-route')
    const result = await getTenantContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(404)
      await expect(result.json()).resolves.toEqual({ error: 'User not found' })
    }
  })

  it('getTenantContext returns 400 when org context missing', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce({ email: 'x@example.com' })
    mockUserFindOne.mockResolvedValueOnce({
      _id: { toString: () => 'u1' },
      email: 'x@example.com',
      username: 'x',
      isSuperAdmin: false,
      memberships: [{ organizationSlug: 'aces', role: 'admin' }],
    })
    mockGetOrganizationContext.mockResolvedValueOnce(null)

    const { getTenantContext } = await import('@/lib/auth/tenant-route')
    const result = await getTenantContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(400)
      await expect(result.json()).resolves.toEqual({
        error: 'Organization context not found',
      })
    }
  })

  it('getTenantContext returns 403 when membership missing', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce({ email: 'x@example.com' })
    mockUserFindOne.mockResolvedValueOnce({
      _id: { toString: () => 'u1' },
      email: 'x@example.com',
      username: 'x',
      isSuperAdmin: false,
      memberships: [{ organizationSlug: 'other', role: 'admin' }],
    })
    mockGetOrganizationContext.mockResolvedValueOnce({
      id: 'o1',
      slug: 'aces',
      name: 'ACES',
      status: 'active',
    })

    const { getTenantContext } = await import('@/lib/auth/tenant-route')
    const result = await getTenantContext(new Request('http://localhost'))

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(403)
      await expect(result.json()).resolves.toEqual({ error: 'Access denied' })
    }
  })

  it('getTenantContext returns full tenant context on success', async () => {
    mockGetTokenServer.mockResolvedValueOnce('t')
    mockVerifyAuthToken.mockResolvedValueOnce({ email: 'x@example.com' })
    mockUserFindOne.mockResolvedValueOnce({
      _id: { toString: () => 'u1' },
      email: 'x@example.com',
      username: 'x',
      isSuperAdmin: true,
      memberships: [{ organizationSlug: 'aces', role: 'member' }],
    })
    mockGetOrganizationContext.mockResolvedValueOnce({
      id: 'o1',
      slug: 'aces',
      name: 'ACES',
      status: 'active',
    })
    mockGetTenantModels.mockResolvedValueOnce({ hello: 'models' })

    const { getTenantContext } = await import('@/lib/auth/tenant-route')
    const result = await getTenantContext(new Request('http://localhost'))

    expect(result).not.toBeInstanceOf(Response)
    if (!(result instanceof Response)) {
      expect(result.organization.slug).toBe('aces')
      expect(result.user.email).toBe('x@example.com')
      expect(result.user.isSuperAdmin).toBe(true)
      expect(result.membership.role).toBe('member')
      expect(result.models).toEqual({ hello: 'models' })
    }
  })

  it('requireAdmin returns 403 when role is not admin', async () => {
    const { requireAdmin } = await import('@/lib/auth/tenant-route')

    const ctx = {
      organization: { id: 'o1', slug: 'aces', name: 'ACES', status: 'active' },
      models: {} as any,
      user: {
        id: 'u1',
        email: 'x@example.com',
        username: 'x',
        isSuperAdmin: false,
      },
      membership: { role: 'member' as const },
    }

    const result = await requireAdmin(ctx)
    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(403)
      await expect(result.json()).resolves.toEqual({
        error: 'Admin access required',
      })
    }
  })

  it('getTenantModelsFromContext returns 400 when org context missing', async () => {
    mockGetOrganizationContext.mockResolvedValueOnce(null)

    const { getTenantModelsFromContext } =
      await import('@/lib/auth/tenant-route')
    const result = await getTenantModelsFromContext()

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(400)
      await expect(result.json()).resolves.toEqual({
        error: 'Organization context not found',
      })
    }
  })

  it('getTenantModelsFromContext returns tenant models when org context exists', async () => {
    mockGetOrganizationContext.mockResolvedValueOnce({
      id: 'o1',
      slug: 'aces',
      name: 'ACES',
      status: 'active',
    })
    mockGetTenantModels.mockResolvedValueOnce({ ok: true })

    const { getTenantModelsFromContext } =
      await import('@/lib/auth/tenant-route')
    const result = await getTenantModelsFromContext()

    expect(result).not.toBeInstanceOf(Response)
    if (!(result instanceof Response)) {
      expect(result).toEqual({ ok: true })
    }
  })
})
