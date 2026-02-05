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

vi.mock('@/lib/redis', () => ({
  invalidateCachedOrganization: vi.fn(),
  setCachedOrganization: vi.fn(),
}))

vi.mock('@/models/user.model', () => ({
  default: {
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('@/models/organization.model', () => ({
  default: {
    findBySlug: vi.fn(),
    deleteOne: vi.fn(),
  },
}))

import { getSuperAdminContext } from '@/lib/superadmin-route'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { PATCH, DELETE } from '@/app/api/admins/organizations/[slug]/route'

describe('/api/admins/organizations/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    })
  })

  it('updates limits via PATCH action=limits', async () => {
    const save = vi.fn().mockResolvedValue(undefined)

    vi.mocked(Organization.findBySlug).mockResolvedValue({
      _id: { toString: () => 'org-1' },
      slug: 'aces',
      name: 'ACES',
      status: 'active',
      limits: { maxEvents: -1, maxReceiptsPerMonth: -1, maxUsers: -1 },
      save,
    } as never)

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/admins/organizations/aces', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'limits',
          limits: { maxUsers: 25 },
        }),
      }),
      { params: Promise.resolve({ slug: 'aces' }) }
    )

    expect(response.status).toBe(200)
    expect(save).toHaveBeenCalledOnce()

    const data = await response.json()
    expect(data.organization.limits.maxUsers).toBe(25)
  })

  it('soft deletes organization via PATCH action=delete', async () => {
    const save = vi.fn().mockResolvedValue(undefined)

    const org: any = {
      _id: { toString: () => 'org-1' },
      slug: 'aces',
      name: 'ACES',
      status: 'active',
      limits: { maxEvents: -1, maxReceiptsPerMonth: -1, maxUsers: -1 },
      deletedAt: undefined,
      restoresBefore: undefined,
      save,
    }

    vi.mocked(Organization.findBySlug).mockResolvedValue(org)

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/admins/organizations/aces', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'delete' }),
      }),
      { params: Promise.resolve({ slug: 'aces' }) }
    )

    expect(response.status).toBe(200)
    expect(org.status).toBe('deleted')
    expect(org.deletedAt).toBeInstanceOf(Date)
    expect(org.restoresBefore).toBeInstanceOf(Date)
  })

  it('hard deletes only deleted organizations', async () => {
    vi.mocked(Organization.findBySlug).mockResolvedValue({
      _id: { toString: () => 'org-1' },
      slug: 'aces',
      status: 'deleted',
    } as never)

    vi.mocked(User.updateMany).mockResolvedValue({
      acknowledged: true,
    } as never)
    vi.mocked(Organization.deleteOne).mockResolvedValue({
      deletedCount: 1,
    } as never)

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/admins/organizations/aces', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ slug: 'aces' }) }
    )

    expect(response.status).toBe(200)
    expect(User.updateMany).toHaveBeenCalledOnce()
    expect(Organization.deleteOne).toHaveBeenCalledOnce()
  })

  it('blocks hard delete when org is not in deleted state', async () => {
    vi.mocked(Organization.findBySlug).mockResolvedValue({
      _id: { toString: () => 'org-1' },
      slug: 'aces',
      status: 'active',
    } as never)

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/admins/organizations/aces', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ slug: 'aces' }) }
    )

    expect(response.status).toBe(400)
  })

  it('returns guard response when not superadmin', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue(
      NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    )

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/admins/organizations/aces', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve' }),
      }),
      { params: Promise.resolve({ slug: 'aces' }) }
    )

    expect(response.status).toBe(403)
  })
})
