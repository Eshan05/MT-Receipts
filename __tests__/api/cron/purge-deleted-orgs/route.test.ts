/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('mongoose', () => {
  const dropDatabase = vi.fn()
  const useDb = vi.fn(() => ({ dropDatabase }))

  const mongooseMock = {
    connection: {
      useDb,
    },
    Types: {
      ObjectId: class ObjectId {},
    },
    __useDb: useDb,
    __dropDatabase: dropDatabase,
  }

  return {
    default: mongooseMock,
    ...mongooseMock,
  }
})

vi.mock('@/lib/db-conn', () => ({
  default: vi.fn(),
}))

vi.mock('@/lib/redis', () => ({
  invalidateCachedOrganization: vi.fn(),
}))

vi.mock('@/lib/db/tenant', () => ({
  getTenantDbName: vi.fn((slug: string) => `tenant_${slug}`),
}))

vi.mock('@/models/user.model', () => ({
  default: {
    updateMany: vi.fn(),
  },
}))

vi.mock('@/models/organization.model', () => ({
  default: {
    find: vi.fn(),
    deleteOne: vi.fn(),
  },
}))

import dbConnect from '@/lib/db-conn'
import mongoose from 'mongoose'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { invalidateCachedOrganization } from '@/lib/redis'
import { getTenantDbName } from '@/lib/db/tenant'
import { POST, GET } from '@/app/api/crons/purge-deleted-orgs/route'

describe('/api/crons/purge-deleted-orgs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    delete process.env.ORGANIZATION_RETENTION_DAYS

    const useDb = (mongoose as any).__useDb as ReturnType<typeof vi.fn>
    const dropDatabase = (mongoose as any).__dropDatabase as ReturnType<
      typeof vi.fn
    >
    useDb?.mockClear?.()
    dropDatabase?.mockClear?.()

    // Default: no candidates.
    const lean = vi.fn().mockResolvedValue([])
    const select = vi.fn(() => ({ lean }))
    vi.mocked(Organization.find).mockReturnValue({ select } as never)
  })

  it('returns 500 when CRON_SECRET is not configured', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/crons/purge-deleted-orgs', {
        method: 'POST',
      })
    )

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toMatch(/CRON_SECRET/i)
  })

  it('returns 401 when Authorization is missing/invalid', async () => {
    process.env.CRON_SECRET = 'secret'

    const response = await POST(
      new NextRequest('http://localhost:3000/api/crons/purge-deleted-orgs', {
        method: 'POST',
      })
    )

    expect(response.status).toBe(401)
  })

  it('purges eligible organizations when authorized', async () => {
    process.env.CRON_SECRET = 'secret'
    process.env.ORGANIZATION_RETENTION_DAYS = '30'

    const useDb = (mongoose as any).__useDb as ReturnType<typeof vi.fn>
    const dropDatabase = (mongoose as any).__dropDatabase as ReturnType<
      typeof vi.fn
    >

    const orgId = { toString: () => 'org-1' }

    const lean = vi.fn().mockResolvedValue([
      {
        _id: orgId,
        slug: 'acme',
        restoresBefore: new Date(Date.now() - 60_000),
      },
    ])
    const select = vi.fn(() => ({ lean }))
    vi.mocked(Organization.find).mockReturnValue({ select } as never)

    vi.mocked(User.updateMany).mockResolvedValue({
      acknowledged: true,
    } as never)
    vi.mocked(Organization.deleteOne).mockResolvedValue({
      deletedCount: 1,
    } as never)
    vi.mocked(invalidateCachedOrganization).mockResolvedValue(
      undefined as never
    )

    const request = new NextRequest(
      'http://localhost:3000/api/crons/purge-deleted-orgs',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret',
        },
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(dbConnect).toHaveBeenCalledOnce()

    expect(User.updateMany).toHaveBeenCalledOnce()
    expect(useDb).toHaveBeenCalledWith('tenant_acme')
    expect(dropDatabase).toHaveBeenCalledOnce()

    expect(Organization.deleteOne).toHaveBeenCalledWith({ _id: orgId })
    expect(invalidateCachedOrganization).toHaveBeenCalledWith('acme')
    expect(getTenantDbName).toHaveBeenCalledWith('acme')

    const data = await response.json()
    expect(data.purgedCount).toBe(1)
    expect(data.purged).toEqual(['acme'])
    expect(data.scanned).toBe(1)
    expect(data.retentionDays).toBe(30)
  })

  it('GET delegates to POST', async () => {
    process.env.CRON_SECRET = 'secret'

    const response = await GET(
      new NextRequest('http://localhost:3000/api/crons/purge-deleted-orgs', {
        method: 'GET',
        headers: {
          authorization: 'Bearer secret',
        },
      })
    )

    expect(response.status).toBe(200)
  })
})
