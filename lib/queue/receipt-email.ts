import { z } from 'zod'
import {
  getAbsoluteJobUrl,
  getQstashClient,
  isQstashConfigured,
} from '@/lib/queue/qstash'

export const receiptEmailJobSchema = z.object({
  organizationSlug: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  receiptNumber: z.string().min(1),
  actor: z
    .object({
      userId: z.string().min(1),
      username: z.string().min(1).optional(),
    })
    .optional(),
  subject: z.string().min(1).optional(),
  templateSlug: z.string().min(1).optional(),
  smtpVaultId: z.string().min(1).optional(),
  templateConfig: z
    .object({
      primaryColor: z.string().min(1).optional(),
      secondaryColor: z.string().min(1).optional(),
      footerText: z.string().min(1).optional(),
    })
    .optional(),
  requestId: z.string().min(1).optional(),
})

export type ReceiptEmailJob = z.infer<typeof receiptEmailJobSchema>

function getReceiptEmailFlowControlKey(organizationId: string): string {
  // QStash requires keys to be alphanumeric, hyphen, underscore, or period.
  // Avoid ':' to prevent runtime errors like: "flowControlKey must be alphanumeric...".
  return `tenant.${organizationId}.receipt-email`
}

export async function enqueueReceiptEmailJob(job: ReceiptEmailJob): Promise<{
  queued: boolean
  messageId?: string
  error?: string
}> {
  if (!isQstashConfigured()) {
    return { queued: false, error: 'QStash is not configured' }
  }

  const parsed = receiptEmailJobSchema.safeParse(job)
  if (!parsed.success) {
    return { queued: false, error: 'Invalid job payload' }
  }

  const client = getQstashClient()
  const url = getAbsoluteJobUrl('/api/jobs/receipt-emails')

  const result = await client.publishJSON({
    url,
    body: parsed.data,
    retries: 10,
    timeout: 120,
    label: 'receipt-email',
    ...(parsed.data.organizationId
      ? {
          flowControl: {
            key: getReceiptEmailFlowControlKey(parsed.data.organizationId),
            parallelism: 1,
          },
        }
      : {}),
  })

  return { queued: true, messageId: result.messageId }
}

export async function enqueueReceiptEmailJobs(
  jobs: ReceiptEmailJob[]
): Promise<{ queued: boolean; messageIds?: string[]; error?: string }> {
  if (!isQstashConfigured()) {
    return { queued: false, error: 'QStash is not configured' }
  }

  const validJobs: ReceiptEmailJob[] = []
  for (const job of jobs) {
    const parsed = receiptEmailJobSchema.safeParse(job)
    if (parsed.success) validJobs.push(parsed.data)
  }

  if (validJobs.length === 0) {
    return { queued: false, error: 'No valid jobs to enqueue' }
  }

  const client = getQstashClient()
  const url = getAbsoluteJobUrl('/api/jobs/receipt-emails')

  const results = await client.batchJSON(
    validJobs.map((body) => ({
      url,
      body,
      retries: 10,
      timeout: 120,
      label: 'receipt-email',
      ...(body.organizationId
        ? {
            flowControl: {
              key: getReceiptEmailFlowControlKey(body.organizationId),
              parallelism: 1,
            },
          }
        : {}),
    }))
  )

  return { queued: true, messageIds: results.map((r) => r.messageId) }
}
