/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'

vi.mock('@/lib/auth/superadmin-route', () => ({
  getSuperAdminContext: vi.fn(),
}))

vi.mock('@/lib/b2-s3', () => ({
  getB2S3Client: vi.fn(),
}))

vi.mock('@/lib/db-conn', () => ({
  default: vi.fn(),
}))

vi.mock('@/models/organization.model', () => ({
  default: {
    find: vi.fn(),
  },
}))

vi.mock('@/models/user.model', () => ({
  default: {
    find: vi.fn(),
  },
}))

vi.mock('@/lib/db/tenant-models', () => ({
  getTenantModels: vi.fn(),
}))

import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
import { getB2S3Client } from '@/lib/b2-s3'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { getTenantModels } from '@/lib/db/tenant-models'
import { GET, POST } from '@/app/api/admins/backups/route'

describe('/api/admins/backups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns guard response when not superadmin', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue(
      NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    )

    const response = await GET()
    expect(response.status).toBe(403)
  })

  it('POST returns guard response when not superadmin', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue(
      NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    )

    const response = await POST()
    expect(response.status).toBe(403)
  })

  it('returns configured=false when env vars are missing', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    } as any)

    vi.mocked(getB2S3Client).mockImplementation(() => {
      throw new Error('Missing required environment variable: B2_ACCESS_KEY_ID')
    })

    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.configured).toBe(false)
    expect(data.ok).toBe(false)
  })

  it('performs HeadBucket when bucket is configured', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    } as any)

    const send = vi.fn().mockResolvedValue({})
    vi.mocked(getB2S3Client).mockReturnValue({
      client: { send },
      bucket: 'my-bucket',
    } as any)

    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.checked).toBe('headBucket')
    expect(send).toHaveBeenCalledOnce()
  })

  it('performs ListBuckets when no bucket is configured', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    } as any)

    const send = vi.fn().mockResolvedValue({ Buckets: [] })
    vi.mocked(getB2S3Client).mockReturnValue({
      client: { send },
      bucket: undefined,
    } as any)

    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.checked).toBe('listBuckets')
    expect(send).toHaveBeenCalledOnce()
  })

  it('POST uploads a gzipped snapshot to B2', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    } as any)

    const send = vi.fn().mockResolvedValue({})
    vi.mocked(getB2S3Client).mockReturnValue({
      client: { send },
      bucket: 'my-bucket',
    } as any)

    vi.mocked(dbConnect).mockResolvedValue(undefined as any)

    vi.mocked(Organization.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ slug: 'acme' }, { slug: 'Beta' }]),
    } as any)
    vi.mocked(User.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'u1' }]),
    } as any)

    const makeTenantModels = () => {
      const chain = { lean: vi.fn().mockResolvedValue([]) }
      const find = vi.fn().mockReturnValue(chain)
      return {
        Event: { find },
        Receipt: { find },
        Template: { find },
        Sequence: { find },
      }
    }

    vi.mocked(getTenantModels).mockImplementation(
      async () => makeTenantModels() as any
    )

    const response = await POST()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.key).toMatch(/^backups\//)
    expect(data.key).toMatch(/\.json\.gz$/)
    expect(typeof data.bytes).toBe('number')
    expect(data.bytes).toBeGreaterThan(10)
    expect(data.orgCount).toBe(2)
    expect(data.tenantCount).toBe(2)
    expect(Array.isArray(data.tenantErrors)).toBe(true)

    expect(send).toHaveBeenCalledOnce()
    const cmd = send.mock.calls[0]?.[0]
    expect(cmd).toBeInstanceOf(PutObjectCommand)
    expect((cmd as any).input.Bucket).toBe('my-bucket')
    expect((cmd as any).input.Key).toBe(data.key)
    expect((cmd as any).input.ContentEncoding).toBe('gzip')
  })

  it('POST records tenantErrors but still uploads', async () => {
    vi.mocked(getSuperAdminContext).mockResolvedValue({
      user: { id: '1', email: 'admin@test.local', username: 'admin' },
    } as any)

    const send = vi.fn().mockResolvedValue({})
    vi.mocked(getB2S3Client).mockReturnValue({
      client: { send },
      bucket: 'my-bucket',
    } as any)

    vi.mocked(dbConnect).mockResolvedValue(undefined as any)

    vi.mocked(Organization.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ slug: 'ok' }, { slug: 'bad' }]),
    } as any)
    vi.mocked(User.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)

    vi.mocked(getTenantModels).mockImplementation(async (slug: string) => {
      if (slug === 'bad') throw new Error('Tenant connection failed')

      const chain = { lean: vi.fn().mockResolvedValue([]) }
      const find = vi.fn().mockReturnValue(chain)
      return {
        Event: { find },
        Receipt: { find },
        Template: { find },
        Sequence: { find },
      } as any
    })

    const response = await POST()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.tenantCount).toBe(1)
    expect(data.tenantErrors).toHaveLength(1)

    expect(send).toHaveBeenCalledOnce()
  })
})
