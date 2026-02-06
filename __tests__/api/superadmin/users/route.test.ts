/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/auth/superadmin-route', () => ({
  getSuperAdminContext: vi.fn(),
}))

vi.mock('@/lib/db-conn', () => ({
  default: vi.fn(),
}))

vi.mock('@/models/user.model', () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}))

import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
import User from '@/models/user.model'
import { GET } from '@/app/api/admins/users/route'

describe('GET /api/admins/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns guard response for non-superadmin', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue(
      NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/admins/users')
    )

    expect(response.status).toBe(403)
  })

  it('returns mapped users list', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    })

    vi.mocked(User.countDocuments).mockResolvedValue(1)
    vi.mocked(User.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  _id: { toString: () => 'user-1' },
                  username: 'alice',
                  email: 'alice@test.local',
                  isSuperAdmin: false,
                  isActive: true,
                  memberships: [
                    {
                      organizationId: { toString: () => 'org-1' },
                      organizationSlug: 'aces',
                      role: 'admin',
                      approvedAt: new Date('2026-01-01T00:00:00.000Z'),
                      joinedVia: 'manual',
                    },
                  ],
                  lastSignIn: new Date('2026-02-01T00:00:00.000Z'),
                  createdAt: new Date('2025-12-01T00:00:00.000Z'),
                },
              ]),
            }),
          }),
        }),
      }),
    } as never)

    const response = await GET(
      new NextRequest('http://localhost:3000/api/admins/users?limit=20')
    )

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.users).toHaveLength(1)
    expect(data.users[0]).toMatchObject({
      username: 'alice',
      email: 'alice@test.local',
      membershipCount: 1,
    })
    expect(data.pagination.total).toBe(1)
  })
})
