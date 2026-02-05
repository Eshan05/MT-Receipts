/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/tenant-route', () => ({
  getTenantContext: vi.fn(),
}))

vi.mock('@/lib/limits', () => ({
  getOrganizationLimits: vi.fn(),
  getUserSlotUsage: vi.fn(),
  isUnlimited: (limit: unknown) => typeof limit !== 'number' || limit < 0,
  getRolling30DaysStart: (now: Date = new Date()) => {
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    return start
  },
}))

import { POST } from '@/app/api/receipts/route'
import { getTenantContext } from '@/lib/tenant-route'
import { getOrganizationLimits } from '@/lib/limits'

describe('POST /api/receipts (limits)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when maxReceiptsPerMonth is reached (rolling 30 days)', async () => {
    const Receipt = {
      countDocuments: vi.fn().mockResolvedValue(1),
      create: vi.fn(),
    }
    const Event = {
      findById: vi.fn().mockResolvedValue({
        _id: 'e1',
        name: 'Event',
        eventCode: 'EVT',
        type: 'seminar',
      }),
    }
    const Sequence = {}

    vi.mocked(getTenantContext).mockResolvedValue({
      organization: {
        id: '507f1f77bcf86cd799439011',
        slug: 'test',
        name: 'Test',
        status: 'active',
      },
      models: { Receipt, Event, Sequence },
      user: {
        id: 'u1',
        email: 'u1@test.local',
        username: 'u1',
        isSuperAdmin: false,
      },
      membership: { role: 'admin' },
    } as any)

    vi.mocked(getOrganizationLimits).mockResolvedValue({
      maxEvents: -1,
      maxReceiptsPerMonth: 1,
      maxUsers: -1,
    })

    const request = new NextRequest('http://localhost:3000/api/receipts', {
      method: 'POST',
      body: JSON.stringify({
        eventId: 'e1',
        customer: { name: 'Customer', email: 'c@test.local' },
        items: [],
        totalAmount: 0,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
    expect(Receipt.create).not.toHaveBeenCalled()
  })
})
