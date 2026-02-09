import { describe, expect, it, vi } from 'vitest'

const publishJSON = vi.fn(async () => ({ messageId: 'msg_1' }))
const batchJSON = vi.fn(async (reqs: any[]) =>
  reqs.map(() => ({ messageId: 'msg_1' }))
)

vi.mock('@/lib/queue/qstash', () => ({
  isQstashConfigured: () => true,
  getAbsoluteJobUrl: vi.fn(() => 'https://base.test/api/jobs/receipt-emails'),
  getQstashClient: () => ({ publishJSON, batchJSON }),
  getQstashSigningConfig: () => ({
    currentSigningKey: 'sig_current',
    nextSigningKey: 'sig_next',
    clockTolerance: 0,
  }),
}))

describe('receipt email queue', () => {
  it('publishes single job to /api/jobs/receipt-emails', async () => {
    const { enqueueReceiptEmailJob } = await import('@/lib/queue/receipt-email')
    const { getAbsoluteJobUrl } = await import('@/lib/queue/qstash')

    const res = await enqueueReceiptEmailJob({
      organizationSlug: 'org',
      receiptNumber: 'R-1',
    })

    expect(res.queued).toBe(true)
    expect(res.messageId).toBe('msg_1')
    expect(getAbsoluteJobUrl).toHaveBeenCalledWith('/api/jobs/receipt-emails')
    expect(publishJSON).toHaveBeenCalled()
  })

  it('publishes batch jobs to /api/jobs/receipt-emails', async () => {
    const { enqueueReceiptEmailJobs } =
      await import('@/lib/queue/receipt-email')
    const { getAbsoluteJobUrl } = await import('@/lib/queue/qstash')

    const res = await enqueueReceiptEmailJobs([
      { organizationSlug: 'org', receiptNumber: 'R-1' },
      { organizationSlug: 'org', receiptNumber: 'R-2' },
    ])

    expect(res.queued).toBe(true)
    expect(res.messageIds).toEqual(['msg_1', 'msg_1'])
    expect(getAbsoluteJobUrl).toHaveBeenCalledWith('/api/jobs/receipt-emails')
    expect(batchJSON).toHaveBeenCalled()
  })
})
