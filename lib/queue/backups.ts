import { z } from 'zod'
import {
  getAbsoluteJobUrl,
  getQstashClient,
  isQstashConfigured,
} from '@/lib/queue/qstash'

export const backupsRunJobSchema = z.object({
  actorUserId: z.string().min(1),
  requestId: z.string().min(1).optional(),
})

export type BackupsRunJob = z.infer<typeof backupsRunJobSchema>

export async function enqueueBackupsRunJob(job: BackupsRunJob): Promise<{
  queued: boolean
  messageId?: string
  error?: string
}> {
  if (!isQstashConfigured()) {
    return { queued: false, error: 'QStash is not configured' }
  }

  const parsed = backupsRunJobSchema.safeParse(job)
  if (!parsed.success) {
    return { queued: false, error: 'Invalid job payload' }
  }

  const client = getQstashClient()
  const url = getAbsoluteJobUrl('/api/jobs/backups')

  const result = await client.publishJSON({
    url,
    body: parsed.data,
    retries: 5,
    timeout: 900,
    label: 'backups-run',
    flowControl: {
      // QStash requires keys to be alphanumeric, hyphen, underscore, or period.
      key: 'superadmin.backups-run',
      parallelism: 1,
    },
  })

  return { queued: true, messageId: result.messageId }
}
