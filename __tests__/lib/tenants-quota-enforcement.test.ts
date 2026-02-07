/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetOrganizationLimits = vi.fn()
const mockGetRolling30DaysStart = vi.fn()
const mockGetUserSlotUsage = vi.fn()
const mockIsUnlimited = vi.fn()

vi.mock('@/lib/tenants/limits', () => ({
  getOrganizationLimits: (...args: unknown[]) =>
    mockGetOrganizationLimits(...args),
  getRolling30DaysStart: (...args: unknown[]) =>
    mockGetRolling30DaysStart(...args),
  getUserSlotUsage: (...args: unknown[]) => mockGetUserSlotUsage(...args),
  isUnlimited: (...args: unknown[]) => mockIsUnlimited(...args),
}))

describe('lib/tenants/quota-enforcement', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('enforceMaxEvents returns 404 when org missing', async () => {
    mockGetOrganizationLimits.mockResolvedValueOnce(null)

    const { enforceMaxEvents } = await import('@/lib/tenants/quota-enforcement')

    const ctx = {
      organization: { id: 'o1', slug: 'aces', name: 'ACES', status: 'active' },
      models: { Event: { countDocuments: vi.fn() } },
    } as any

    const res = await enforceMaxEvents(ctx)
    expect(res).toBeInstanceOf(Response)
    if (res instanceof Response) {
      expect(res.status).toBe(404)
      await expect(res.json()).resolves.toEqual({
        error: 'Organization not found',
      })
    }
  })

  it('enforceMaxEvents returns null when unlimited', async () => {
    mockGetOrganizationLimits.mockResolvedValueOnce({ maxEvents: -1 })
    mockIsUnlimited.mockReturnValueOnce(true)

    const { enforceMaxEvents } = await import('@/lib/tenants/quota-enforcement')

    const countDocuments = vi.fn()
    const ctx = {
      organization: { id: 'o1', slug: 'aces', name: 'ACES', status: 'active' },
      models: { Event: { countDocuments } },
    } as any

    const res = await enforceMaxEvents(ctx)
    expect(res).toBeNull()
    expect(countDocuments).not.toHaveBeenCalled()
  })

  it('enforceMaxEvents returns 403 when limit reached', async () => {
    mockGetOrganizationLimits.mockResolvedValueOnce({ maxEvents: 5 })
    mockIsUnlimited.mockReturnValueOnce(false)

    const { enforceMaxEvents } = await import('@/lib/tenants/quota-enforcement')

    const ctx = {
      organization: { id: 'o1', slug: 'aces', name: 'ACES', status: 'active' },
      models: { Event: { countDocuments: vi.fn().mockResolvedValueOnce(5) } },
    } as any

    const res = await enforceMaxEvents(ctx)
    expect(res).toBeInstanceOf(Response)
    if (res instanceof Response) {
      expect(res.status).toBe(403)
      await expect(res.json()).resolves.toEqual({
        error: 'Event limit reached for this organization',
        resource: 'events',
        limit: 5,
        used: 5,
      })
    }
  })

  it('enforceMaxReceipts checks rolling window and returns 403 on exceed', async () => {
    const windowStart = new Date('2026-01-01T00:00:00.000Z')
    mockGetRolling30DaysStart.mockReturnValueOnce(windowStart)
    mockGetOrganizationLimits.mockResolvedValueOnce({ maxReceiptsPerMonth: 2 })
    mockIsUnlimited.mockReturnValueOnce(false)

    const { enforceMaxReceipts } =
      await import('@/lib/tenants/quota-enforcement')

    const countDocuments = vi.fn().mockResolvedValueOnce(2)

    const ctx = {
      organization: { id: 'o1', slug: 'aces', name: 'ACES', status: 'active' },
      models: { Receipt: { countDocuments } },
    } as any

    const now = new Date('2026-02-01T00:00:00.000Z')
    const res = await enforceMaxReceipts(ctx, now)

    expect(countDocuments).toHaveBeenCalledWith({
      createdAt: { $gte: windowStart },
    })

    expect(res).toBeInstanceOf(Response)
    if (res instanceof Response) {
      expect(res.status).toBe(403)
      await expect(res.json()).resolves.toEqual({
        error: 'Receipt limit reached for this organization',
        resource: 'receipts',
        limit: 2,
        used: 2,
      })
    }
  })

  it('enforceMaxUsersForInvite returns 403 when reserving slots would exceed limit', async () => {
    mockGetOrganizationLimits.mockResolvedValueOnce({ maxUsers: 10 })
    mockIsUnlimited.mockReturnValueOnce(false)
    mockGetUserSlotUsage.mockResolvedValueOnce({ usersTotal: 9 })

    const { enforceMaxUsersForInvite } =
      await import('@/lib/tenants/quota-enforcement')

    const res = await enforceMaxUsersForInvite({
      organizationId: 'o1',
      slotsToReserve: 2,
      now: new Date('2026-02-01T00:00:00.000Z'),
    })

    expect(res).toBeInstanceOf(Response)
    if (res instanceof Response) {
      expect(res.status).toBe(403)
      await expect(res.json()).resolves.toEqual({
        error: 'User limit reached for this organization',
        resource: 'users',
        limit: 10,
        used: 9,
      })
    }
  })

  it('enforceMaxUsersForJoin returns 403 when accepted users at limit', async () => {
    mockGetOrganizationLimits.mockResolvedValueOnce({ maxUsers: 3 })
    mockIsUnlimited.mockReturnValueOnce(false)
    mockGetUserSlotUsage.mockResolvedValueOnce({ usersAccepted: 3 })

    const { enforceMaxUsersForJoin } =
      await import('@/lib/tenants/quota-enforcement')

    const res = await enforceMaxUsersForJoin({
      organizationId: 'o1',
      now: new Date('2026-02-01T00:00:00.000Z'),
    })

    expect(res).toBeInstanceOf(Response)
    if (res instanceof Response) {
      expect(res.status).toBe(403)
      await expect(res.json()).resolves.toEqual({
        error: 'User limit reached for this organization',
        resource: 'users',
        limit: 3,
        used: 3,
      })
    }
  })
})
