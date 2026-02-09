import dbConnect from '@/lib/db-conn'
import ReceiptEmailBatch from '@/models/receipt-email-batch.model'
import ReceiptEmailJobItem, {
  type ReceiptEmailJobItemStatus,
} from '@/models/receipt-email-job-item.model'

export type ReceiptEmailBatchSummary = {
  batchId: string
  organizationId: string
  organizationSlug: string
  createdByUserId: string
  total: number
  counts: Record<ReceiptEmailJobItemStatus, number>
  processed: number
  retried: number
  status: 'running' | 'completed' | 'completed_with_failures' | 'enqueue_failed'
  failedReceiptNumbers: string[]
  updatedAt: string
  createdAt: string
}

const ALL_STATUSES: ReceiptEmailJobItemStatus[] = [
  'queued',
  'processing',
  'retrying',
  'succeeded',
  'failed',
  'skipped',
]

export async function createReceiptEmailBatch(params: {
  organizationId: string
  organizationSlug: string
  createdByUserId: string
  total: number
  subject?: string
  templateSlug?: string
  smtpVaultId?: string
}): Promise<{ batchId: string }> {
  await dbConnect()

  const batch = await ReceiptEmailBatch.create({
    organizationId: params.organizationId,
    organizationSlug: params.organizationSlug,
    createdByUserId: params.createdByUserId,
    subject: params.subject,
    templateSlug: params.templateSlug,
    smtpVaultId: params.smtpVaultId,
    total: params.total,
    status: 'created',
  })

  return { batchId: batch._id.toString() }
}

export async function createReceiptEmailBatchItems(params: {
  batchId: string
  organizationId: string
  organizationSlug: string
  receiptNumbers: string[]
}): Promise<void> {
  await dbConnect()

  if (params.receiptNumbers.length === 0) return

  await ReceiptEmailJobItem.insertMany(
    params.receiptNumbers.map((receiptNumber) => ({
      batchId: params.batchId,
      organizationId: params.organizationId,
      organizationSlug: params.organizationSlug,
      receiptNumber,
      status: 'queued' as const,
      attempts: 0,
    })),
    { ordered: false }
  )
}

export async function markReceiptEmailBatchEnqueued(params: {
  batchId: string
}): Promise<void> {
  await dbConnect()
  await ReceiptEmailBatch.updateOne(
    { _id: params.batchId },
    { $set: { status: 'enqueued', error: undefined } }
  )
}

export async function markReceiptEmailBatchEnqueueFailed(params: {
  batchId: string
  error: string
}): Promise<void> {
  await dbConnect()
  await ReceiptEmailBatch.updateOne(
    { _id: params.batchId },
    { $set: { status: 'enqueue_failed', error: params.error } }
  )
}

export async function getReceiptEmailBatchSummary(params: {
  batchId: string
  organizationSlug?: string
  limitFailedReceiptNumbers?: number
}): Promise<ReceiptEmailBatchSummary | null> {
  await dbConnect()

  const batch = await ReceiptEmailBatch.findById(params.batchId).lean()
  if (!batch) return null

  if (
    params.organizationSlug &&
    batch.organizationSlug !== params.organizationSlug
  ) {
    return null
  }

  if (batch.status === 'enqueue_failed') {
    return {
      batchId: batch._id.toString(),
      organizationId: batch.organizationId,
      organizationSlug: batch.organizationSlug,
      createdByUserId: batch.createdByUserId,
      total: batch.total,
      counts: {
        queued: 0,
        processing: 0,
        retrying: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      },
      processed: 0,
      retried: 0,
      status: 'enqueue_failed',
      failedReceiptNumbers: [],
      updatedAt: batch.updatedAt.toISOString(),
      createdAt: batch.createdAt.toISOString(),
    }
  }

  const countsAgg = await ReceiptEmailJobItem.aggregate<{
    _id: ReceiptEmailJobItemStatus
    count: number
  }>([
    { $match: { batchId: batch._id.toString() } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const counts = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    ReceiptEmailJobItemStatus,
    number
  >

  for (const row of countsAgg) {
    if (row && row._id && typeof row.count === 'number') {
      counts[row._id] = row.count
    }
  }

  const processed = counts.succeeded + counts.failed + counts.skipped

  const retryAgg = await ReceiptEmailJobItem.aggregate<{
    _id: null
    retried: number
  }>([
    { $match: { batchId: batch._id.toString(), attempts: { $gt: 1 } } },
    { $group: { _id: null, retried: { $sum: 1 } } },
  ])

  const retried = retryAgg?.[0]?.retried || 0

  const limitFailed = Math.max(0, params.limitFailedReceiptNumbers ?? 50)
  const failedItems =
    limitFailed > 0
      ? await ReceiptEmailJobItem.find({
          batchId: batch._id.toString(),
          status: 'failed',
        })
          .select('receiptNumber')
          .sort({ updatedAt: -1 })
          .limit(limitFailed)
          .lean()
      : []

  const failedReceiptNumbers = failedItems.map((i) => i.receiptNumber)

  const isDone = processed >= batch.total && batch.total > 0
  const status = isDone
    ? counts.failed > 0
      ? 'completed_with_failures'
      : 'completed'
    : 'running'

  return {
    batchId: batch._id.toString(),
    organizationId: batch.organizationId,
    organizationSlug: batch.organizationSlug,
    createdByUserId: batch.createdByUserId,
    total: batch.total,
    counts,
    processed,
    retried,
    status,
    failedReceiptNumbers,
    updatedAt: batch.updatedAt.toISOString(),
    createdAt: batch.createdAt.toISOString(),
  }
}
