import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getTenantContext } from '@/lib/auth/tenant-route'
import { getReceiptEmailBatchSummary } from '@/lib/jobs/receipt-email-batches'
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

const retryBatchSchema = z.object({
  action: z.enum(['retry_failed']),
})

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ batchId: string }> }
) {
  const ctx = await getTenantContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { batchId } = await props.params
  if (!batchId) {
    return NextResponse.json({ message: 'Missing batchId' }, { status: 400 })
  }

  const summary = await getReceiptEmailBatchSummary({
    batchId,
    organizationSlug: ctx.organization.slug,
    limitFailedReceiptNumbers: 100,
  })

  if (!summary) {
    return NextResponse.json({ message: 'Batch not found' }, { status: 404 })
  }

  return NextResponse.json(summary)
}

export async function PATCH(
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

  const requestBody = await request.json().catch(() => null)
  const actionFromQuery = request.nextUrl.searchParams.get('action')
  const parsed = retryBatchSchema.safeParse(
    requestBody && typeof requestBody === 'object'
      ? requestBody
      : actionFromQuery
        ? { action: actionFromQuery }
        : null
  )

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: 'Invalid action. Use action=retry_failed in body or query.',
        details: parsed.error.format(),
      },
      { status: 400 }
    )
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

  const receiptNumbers = failedItems.map((item) => item.receiptNumber)
  if (receiptNumbers.length === 0) {
    return NextResponse.json(
      { message: 'No failed emails to retry' },
      { status: 400 }
    )
  }

  const receipts = await ctx.models.Receipt.find({
    receiptNumber: { $in: receiptNumbers },
    refunded: { $ne: true },
  })
    .select('receiptNumber')
    .lean()

  const retryReceiptNumbers = receipts.map((receipt) => receipt.receiptNumber)
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
