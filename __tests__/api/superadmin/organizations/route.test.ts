/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/superadmin-route', () => ({
  getSuperAdminContext: vi.fn(),
}))

vi.mock('@/lib/db-conn', () => ({
  default: vi.fn(),
}))

vi.mock('@/models/organization.model', () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}))

vi.mock('@/models/user.model', () => ({
  default: {
    countDocuments: vi.fn(),
  },
}))

import { getSuperAdminContext } from '@/lib/superadmin-route'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { GET } from '@/app/api/admins/organizations/route'

describe('GET /api/admins/organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns guard response when user is not superadmin', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue(
      NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/admins/organizations')
    )

    expect(response.status).toBe(403)
  })

  it('returns paginated organizations list', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    })

    const organizations = [
      {
        _id: { toString: () => 'org-1' },
        slug: 'aces',
        name: 'ACES',
        description: 'desc',
        logoUrl: '',
        status: 'active',
        limits: { maxEvents: -1, maxReceiptsPerMonth: -1, maxUsers: -1 },
        settings: { primaryColor: '#123456' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        approvedAt: undefined,
        deletedAt: undefined,
        restoresBefore: undefined,
      },
    ]

    vi.mocked(Organization.countDocuments).mockResolvedValue(1)
    vi.mocked(Organization.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(organizations),
          }),
        }),
      }),
    } as never)

    vi.mocked(User.countDocuments).mockResolvedValue(4)

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/admins/organizations?page=1&limit=20'
      )
    )

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.organizations).toHaveLength(1)
    expect(data.organizations[0]).toMatchObject({
      slug: 'aces',
      name: 'ACES',
      memberCount: 4,
    })
    expect(data.pagination.total).toBe(1)
  })
})
