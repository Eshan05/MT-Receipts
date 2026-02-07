/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockOrgFindById = vi.fn()
vi.mock('@/models/organization.model', () => ({
  default: {
    findById: (...args: unknown[]) => mockOrgFindById(...args),
  },
}))

const mockUserCountDocuments = vi.fn()
vi.mock('@/models/user.model', () => ({
  default: {
    countDocuments: (...args: unknown[]) => mockUserCountDocuments(...args),
  },
}))

const mockMembershipRequestCountDocuments = vi.fn()
const mockMembershipRequestAggregate = vi.fn()
vi.mock('@/models/membership-request.model', () => ({
  default: {
    countDocuments: (...args: unknown[]) =>
      mockMembershipRequestCountDocuments(...args),
    aggregate: (...args: unknown[]) => mockMembershipRequestAggregate(...args),
  },
}))

describe('lib/tenants/limits', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('isUnlimited returns true for non-numbers and negative numbers', async () => {
    const { isUnlimited } = await import('@/lib/tenants/limits')

    expect(isUnlimited(undefined)).toBe(true)
    expect(isUnlimited(null)).toBe(true)
    expect(isUnlimited(-1)).toBe(true)
    expect(isUnlimited(-999)).toBe(true)
    expect(isUnlimited(0)).toBe(false)
    expect(isUnlimited(10)).toBe(false)
  })

  it('getRolling30DaysStart subtracts 30 days', async () => {
    const { getRolling30DaysStart } = await import('@/lib/tenants/limits')

    const now = new Date('2026-03-15T12:00:00.000Z')
    const start = getRolling30DaysStart(now)

    const diffMs = now.getTime() - start.getTime()
    expect(diffMs).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('getOrganizationLimits returns null when organization missing', async () => {
    mockOrgFindById.mockResolvedValueOnce(null)

    const { getOrganizationLimits } = await import('@/lib/tenants/limits')
    const result = await getOrganizationLimits('507f1f77bcf86cd799439011')

    expect(result).toBeNull()
  })

  it('getOrganizationLimits returns defaults when org limits missing', async () => {
    mockOrgFindById.mockResolvedValueOnce({ limits: undefined })

    const { getOrganizationLimits } = await import('@/lib/tenants/limits')
    const result = await getOrganizationLimits('507f1f77bcf86cd799439011')

    expect(result).toEqual({
      maxEvents: 10,
      maxReceiptsPerMonth: 100,
      maxUsers: 25,
    })
  })

  it('getOrganizationLimits uses org-specific limit overrides', async () => {
    mockOrgFindById.mockResolvedValueOnce({
      limits: { maxEvents: 3, maxUsers: 7 },
    })

    const { getOrganizationLimits } = await import('@/lib/tenants/limits')
    const result = await getOrganizationLimits('507f1f77bcf86cd799439011')

    expect(result).toEqual({
      maxEvents: 3,
      maxReceiptsPerMonth: 100,
      maxUsers: 7,
    })
  })

  it('getUserSlotUsage accounts for accepted users and pending slots', async () => {
    mockUserCountDocuments.mockResolvedValueOnce(5)
    mockMembershipRequestCountDocuments.mockResolvedValueOnce(2)
    mockMembershipRequestAggregate.mockResolvedValueOnce([
      { remainingSlots: 3 },
    ])

    const { getUserSlotUsage } = await import('@/lib/tenants/limits')
    const result = await getUserSlotUsage('507f1f77bcf86cd799439011')

    expect(result).toEqual({
      usersAccepted: 5,
      usersPendingSlots: 5,
      usersTotal: 10,
    })
  })

  it('getUsageSnapshot returns event/receipt counts and user slot usage', async () => {
    mockUserCountDocuments.mockResolvedValueOnce(1)
    mockMembershipRequestCountDocuments.mockResolvedValueOnce(0)
    mockMembershipRequestAggregate.mockResolvedValueOnce([
      { remainingSlots: 0 },
    ])

    const { getUsageSnapshot } = await import('@/lib/tenants/limits')

    const models = {
      Event: { countDocuments: vi.fn().mockResolvedValueOnce(2) },
      Receipt: { countDocuments: vi.fn().mockResolvedValueOnce(4) },
    } as any

    const result = await getUsageSnapshot({
      organizationId: '507f1f77bcf86cd799439011',
      models,
      now: new Date('2026-01-01T00:00:00.000Z'),
    })

    expect(result).toEqual({
      eventsActive: 2,
      receiptsLast30Days: 4,
      usersAccepted: 1,
      usersPendingSlots: 0,
      usersTotal: 1,
    })
  })
})
