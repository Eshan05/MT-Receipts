import { describe, expect, it } from 'vitest'
import ReceiptEmailBatch from '@/models/receipt-email-batch.model'
import ReceiptEmailJobItem from '@/models/receipt-email-job-item.model'
import {
  createReceiptEmailBatch,
  createReceiptEmailBatchItems,
  getReceiptEmailBatchSummary,
  markReceiptEmailBatchEnqueueFailed,
} from '@/lib/jobs/receipt-email-batches'

describe('receipt email batches', () => {
  it('aggregates counts, processed, retried, and status', async () => {
    const { batchId } = await createReceiptEmailBatch({
      organizationId: 'org_1',
      organizationSlug: 'acme',
      createdByUserId: 'user_1',
      total: 3,
    })

    await createReceiptEmailBatchItems({
      batchId,
      organizationId: 'org_1',
      organizationSlug: 'acme',
      receiptNumbers: ['R-1', 'R-2', 'R-3'],
    })

    await ReceiptEmailJobItem.updateOne(
      { batchId, receiptNumber: 'R-1' },
      {
        $set: { status: 'succeeded', completedAt: new Date() },
        $inc: { attempts: 1 },
      }
    )

    await ReceiptEmailJobItem.updateOne(
      { batchId, receiptNumber: 'R-2' },
      {
        $set: {
          status: 'failed',
          lastError: 'smtp_error',
          completedAt: new Date(),
        },
        $inc: { attempts: 2 },
      }
    )

    await ReceiptEmailJobItem.updateOne(
      { batchId, receiptNumber: 'R-3' },
      {
        $set: { status: 'skipped', completedAt: new Date() },
        $inc: { attempts: 1 },
      }
    )

    const summary = await getReceiptEmailBatchSummary({
      batchId,
      organizationSlug: 'acme',
    })

    expect(summary).not.toBeNull()
    expect(summary?.batchId).toBe(batchId)
    expect(summary?.total).toBe(3)
    expect(summary?.counts.succeeded).toBe(1)
    expect(summary?.counts.failed).toBe(1)
    expect(summary?.counts.skipped).toBe(1)
    expect(summary?.processed).toBe(3)
    expect(summary?.retried).toBe(1)
    expect(summary?.status).toBe('completed_with_failures')
    expect(summary?.failedReceiptNumbers).toContain('R-2')
  })

  it('returns enqueue_failed summary when batch enqueue fails', async () => {
    const { batchId } = await createReceiptEmailBatch({
      organizationId: 'org_2',
      organizationSlug: 'beta',
      createdByUserId: 'user_2',
      total: 10,
    })

    await markReceiptEmailBatchEnqueueFailed({ batchId, error: 'no_qstash' })

    const batch = await ReceiptEmailBatch.findById(batchId).lean()
    expect(batch?.status).toBe('enqueue_failed')

    const summary = await getReceiptEmailBatchSummary({
      batchId,
      organizationSlug: 'beta',
    })
    expect(summary?.status).toBe('enqueue_failed')
    expect(summary?.processed).toBe(0)
    expect(summary?.counts.failed).toBe(0)
  })
})
