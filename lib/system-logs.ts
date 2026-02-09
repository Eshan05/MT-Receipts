import dbConnect from '@/lib/db-conn'
import SystemLog, { type SystemLogLevel } from '@/models/system-log.model'

export async function writeSystemLog(entry: {
  level: SystemLogLevel
  kind: string
  message: string
  organizationId?: string
  organizationSlug?: string
  batchId?: string
  receiptNumber?: string
  requestId?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  if (!process.env.MONGODB_URI) return

  await dbConnect()

  await SystemLog.create({
    level: entry.level,
    kind: entry.kind,
    message: entry.message,
    organizationId: entry.organizationId,
    organizationSlug: entry.organizationSlug,
    batchId: entry.batchId,
    receiptNumber: entry.receiptNumber,
    requestId: entry.requestId,
    meta: entry.meta,
  })
}
