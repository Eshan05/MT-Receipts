import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { isQstashConfigured } from '@/lib/queue/qstash'
import { enqueueReceiptEmailJobs } from '@/lib/queue/receipt-email'
import ReceiptEmailJobItem from '@/models/receipt-email-job-item.model'
import {
  createReceiptEmailBatch,
  createReceiptEmailBatchItems,
  markReceiptEmailBatchEnqueued,
  markReceiptEmailBatchEnqueueFailed,
} from '@/lib/jobs/receipt-email-batches'
import { writeAuditLog } from '@/lib/tenants/audit-log'
import { writeSystemLog } from '@/lib/system-logs'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ batchId: string }> }
) {
  const meta = getRequestMeta(request)
  const ctx = await getTenantContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { batchId } = await props.params
  if (!batchId) {
    return NextResponse.json({ message: 'Missing batchId' }, { status: 400 })
  }

  const log = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    tenantId: ctx.organization.id,
    tenantSlug: ctx.organization.slug,
    userId: ctx.user.id,
    batchId,
  })

  if (!isQstashConfigured()) {
    return NextResponse.json(
      { message: 'Queue is not configured' },
      { status: 503 }
    )
  }

  const failedItems = await ReceiptEmailJobItem.find({
    batchId,
    organizationSlug: ctx.organization.slug,
    status: 'failed',
  })
    .select('receiptNumber')
    .lean()

  const receiptNumbers = failedItems.map((i) => i.receiptNumber)
  if (receiptNumbers.length === 0) {
    return NextResponse.json(
      { message: 'No failed emails to retry' },
      { status: 400 }
    )
  }

  // Ensure receipts still exist and are not refunded.
  const receipts = await ctx.models.Receipt.find({
    receiptNumber: { $in: receiptNumbers },
    refunded: { $ne: true },
  })
    .select('receiptNumber')
    .lean()

  const retryReceiptNumbers = receipts.map((r) => r.receiptNumber)
  if (retryReceiptNumbers.length === 0) {
    return NextResponse.json(
      { message: 'No eligible receipts to retry' },
      { status: 400 }
    )
  }

  const { batchId: newBatchId } = await createReceiptEmailBatch({
    organizationId: ctx.organization.id,
    organizationSlug: ctx.organization.slug,
    createdByUserId: ctx.user.id,
    total: retryReceiptNumbers.length,
  })

  await createReceiptEmailBatchItems({
    batchId: newBatchId,
    organizationId: ctx.organization.id,
    organizationSlug: ctx.organization.slug,
    receiptNumbers: retryReceiptNumbers,
  })

  const jobs = retryReceiptNumbers.map((receiptNumber) => ({
    organizationSlug: ctx.organization.slug,
    organizationId: ctx.organization.id,
    receiptNumber,
    actor: { userId: ctx.user.id, username: ctx.user.username },
    requestId: newBatchId,
  }))

  const queued = await enqueueReceiptEmailJobs(jobs).catch((err) => ({
    queued: false,
    messageIds: undefined,
    error: err instanceof Error ? err.message : 'Failed to enqueue jobs',
  }))

  if (!queued.queued) {
    await markReceiptEmailBatchEnqueueFailed({
      batchId: newBatchId,
      error: queued.error || 'Failed to enqueue jobs',
    })

    void writeSystemLog({
      level: 'error',
      kind: 'receipt_email_batch_retry_enqueue_failed',
      message: 'Failed to enqueue receipt email retry batch',
      organizationId: ctx.organization.id,
      organizationSlug: ctx.organization.slug,
      batchId: newBatchId,
      requestId: meta.requestId,
      meta: {
        fromBatchId: batchId,
        requestedCount: receiptNumbers.length,
        queuedCount: jobs.length,
        error: queued.error,
      },
    }).catch(() => undefined)

    log.error('receipt_email_retry_enqueue_failed', { error: queued.error })
    return NextResponse.json(
      { message: 'Failed to retry emails', error: queued.error },
      { status: 500 }
    )
  }

  await markReceiptEmailBatchEnqueued({ batchId: newBatchId })

  void writeSystemLog({
    level: 'info',
    kind: 'receipt_email_batch_retry_enqueued',
    message: 'Queued receipt email retry batch',
    organizationId: ctx.organization.id,
    organizationSlug: ctx.organization.slug,
    batchId: newBatchId,
    requestId: meta.requestId,
    meta: {
      fromBatchId: batchId,
      requestedCount: receiptNumbers.length,
      queuedCount: jobs.length,
    },
  }).catch(() => undefined)

  void writeAuditLog({
    userId: ctx.user.id,
    organizationId: ctx.organization.id,
    organizationSlug: ctx.organization.slug,
    action: 'UPDATE',
    resourceType: 'RECEIPT',
    details: {
      kind: 'bulk_email_retry_queued',
      fromBatchId: batchId,
      batchId: newBatchId,
      requested: receiptNumbers.length,
      queued: jobs.length,
      requestId: meta.requestId,
    },
    status: 'SUCCESS',
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  }).catch(() => undefined)

  return NextResponse.json(
    {
      message: `Queued ${jobs.length} retries`,
      queuedCount: jobs.length,
      jobBatchId: newBatchId,
    },
    { status: 202 }
  )
}
