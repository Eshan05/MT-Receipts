/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/tenant-route', () => ({
  getTenantContext: vi.fn(),
}))

vi.mock('@/lib/tenants/limits', () => ({
  getOrganizationLimits: vi.fn(),
  getUserSlotUsage: vi.fn(),
  isUnlimited: (limit: unknown) => typeof limit !== 'number' || limit < 0,
  getRolling30DaysStart: (now: Date = new Date()) => {
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    return start
  },
}))

import { POST } from '@/app/api/events/route'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { getOrganizationLimits } from '@/lib/tenants/limits'

describe('POST /api/events (limits)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when maxEvents is reached', async () => {
    const Event = {
      countDocuments: vi.fn().mockResolvedValue(1),
      findByEventCode: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    }

    vi.mocked(getTenantContext).mockResolvedValue({
      organization: {
        id: '507f1f77bcf86cd799439011',
        slug: 'test',
        name: 'Test',
        status: 'active',
      },
      models: { Event },
      user: {
        id: 'u1',
        email: 'u1@test.local',
        username: 'u1',
        isSuperAdmin: false,
      },
      membership: { role: 'admin' },
    } as any)

    vi.mocked(getOrganizationLimits).mockResolvedValue({
      maxEvents: 1,
      maxReceiptsPerMonth: -1,
      maxUsers: -1,
    })

    const request = new NextRequest('http://localhost:3000/api/events', {
      method: 'POST',
      body: JSON.stringify({
        eventCode: 'ev1',
        type: 'seminar',
        name: 'Test Event',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
    expect(Event.create).not.toHaveBeenCalled()
  })
})
