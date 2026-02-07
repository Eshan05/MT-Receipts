import dbConnect from '@/lib/db-conn'
import AuditLog, { type IAuditLog } from '@/models/audit-log.model'

export async function writeAuditLog(entry: {
  userId: string
  organizationId?: string
  organizationSlug?: string
  action: IAuditLog['action']
  resourceType: IAuditLog['resourceType']
  resourceId?: string
  details?: Record<string, unknown>
  status?: IAuditLog['status']
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  if (process.env.SKIP_AUDIT_LOGS === 'true') return
  if (!process.env.MONGODB_URI) return

  await dbConnect()

  await AuditLog.create({
    user: entry.userId,
    organizationId: entry.organizationId,
    organizationSlug: entry.organizationSlug,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    details: entry.details,
    status: entry.status,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  })
}
