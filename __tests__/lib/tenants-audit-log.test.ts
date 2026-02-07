/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockDbConnect = vi.fn()
vi.mock('@/lib/db-conn', () => ({
  default: (...args: unknown[]) => mockDbConnect(...args),
}))

const mockAuditLogCreate = vi.fn()
vi.mock('@/models/audit-log.model', () => ({
  default: {
    create: (...args: unknown[]) => mockAuditLogCreate(...args),
  },
}))

describe('lib/tenants/audit-log', () => {
  const originalMongoUri = process.env.MONGODB_URI
  const originalSkip = process.env.SKIP_AUDIT_LOGS

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.MONGODB_URI = originalMongoUri
    process.env.SKIP_AUDIT_LOGS = originalSkip
  })

  it('no-ops when SKIP_AUDIT_LOGS=true', async () => {
    process.env.SKIP_AUDIT_LOGS = 'true'
    process.env.MONGODB_URI = 'mongodb://example/test'

    const { writeAuditLog } = await import('@/lib/tenants/audit-log')

    await writeAuditLog({
      userId: 'u1',
      action: 'LOGIN',
      resourceType: 'USER',
      status: 'SUCCESS',
    })

    expect(mockDbConnect).not.toHaveBeenCalled()
    expect(mockAuditLogCreate).not.toHaveBeenCalled()
  })

  it('no-ops when MONGODB_URI is missing', async () => {
    process.env.SKIP_AUDIT_LOGS = 'false'
    delete process.env.MONGODB_URI

    const { writeAuditLog } = await import('@/lib/tenants/audit-log')

    await writeAuditLog({
      userId: 'u1',
      action: 'LOGIN',
      resourceType: 'USER',
      status: 'SUCCESS',
    })

    expect(mockDbConnect).not.toHaveBeenCalled()
    expect(mockAuditLogCreate).not.toHaveBeenCalled()
  })

  it('writes an audit log record when enabled', async () => {
    process.env.SKIP_AUDIT_LOGS = 'false'
    process.env.MONGODB_URI = 'mongodb://example/test'

    const { writeAuditLog } = await import('@/lib/tenants/audit-log')

    await writeAuditLog({
      userId: 'u1',
      organizationId: 'o1',
      organizationSlug: 'aces',
      action: 'UPDATE',
      resourceType: 'ORGANIZATION',
      resourceId: 'o1',
      details: { hello: 'world' },
      status: 'SUCCESS',
      ipAddress: '1.2.3.4',
      userAgent: 'ua',
    })

    expect(mockDbConnect).toHaveBeenCalled()
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      user: 'u1',
      organizationId: 'o1',
      organizationSlug: 'aces',
      action: 'UPDATE',
      resourceType: 'ORGANIZATION',
      resourceId: 'o1',
      details: { hello: 'world' },
      status: 'SUCCESS',
      ipAddress: '1.2.3.4',
      userAgent: 'ua',
    })
  })
})
