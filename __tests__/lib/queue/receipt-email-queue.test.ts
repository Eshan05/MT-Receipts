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
      organizationId: 'org_1',
      receiptNumber: 'R-1',
    })

    expect(res.queued).toBe(true)
    expect(res.messageId).toBe('msg_1')
    expect(getAbsoluteJobUrl).toHaveBeenCalledWith('/api/jobs/receipt-emails')
    expect(publishJSON).toHaveBeenCalled()

    // @ts-expect-error I wish I can switch to ts-go
    const args = publishJSON.mock.calls[0]?.[0]
    // @ts-expect-error I wish I can switch to ts-go
    expect(args.flowControl).toMatchObject({
      key: 'tenant.org_1.receipt-email',
      parallelism: 1,
    })
  })

  it('publishes batch jobs to /api/jobs/receipt-emails', async () => {
    const { enqueueReceiptEmailJobs } =
      await import('@/lib/queue/receipt-email')
    const { getAbsoluteJobUrl } = await import('@/lib/queue/qstash')

    const res = await enqueueReceiptEmailJobs([
      {
        organizationSlug: 'org',
        organizationId: 'org_1',
        receiptNumber: 'R-1',
      },
      {
        organizationSlug: 'org',
        organizationId: 'org_1',
        receiptNumber: 'R-2',
      },
    ])

    expect(res.queued).toBe(true)
    expect(res.messageIds).toEqual(['msg_1', 'msg_1'])
    expect(getAbsoluteJobUrl).toHaveBeenCalledWith('/api/jobs/receipt-emails')
    expect(batchJSON).toHaveBeenCalled()

    const batchArgs = batchJSON.mock.calls[0]?.[0]
    expect(Array.isArray(batchArgs)).toBe(true)
    expect(batchArgs[0]?.flowControl).toMatchObject({
      key: 'tenant.org_1.receipt-email',
      parallelism: 1,
    })
  })
})
