import { describe, expect, it, vi } from 'vitest'

const publishJSON = vi.fn(async () => ({ messageId: 'msg_backup' }))

vi.mock('@/lib/queue/qstash', () => ({
  isQstashConfigured: () => true,
  getAbsoluteJobUrl: vi.fn(() => 'https://base.test/api/jobs/backups'),
  getQstashClient: () => ({ publishJSON }),
  getQstashSigningConfig: () => ({
    currentSigningKey: 'sig_current',
    nextSigningKey: 'sig_next',
    clockTolerance: 0,
  }),
}))

describe('backups queue', () => {
  it('publishes job to /api/jobs/backups', async () => {
    const { enqueueBackupsRunJob } = await import('@/lib/queue/backups')
    const { getAbsoluteJobUrl } = await import('@/lib/queue/qstash')

    const res = await enqueueBackupsRunJob({ actorUserId: 'user_1' })

    expect(res.queued).toBe(true)
    expect(res.messageId).toBe('msg_backup')
    expect(getAbsoluteJobUrl).toHaveBeenCalledWith('/api/jobs/backups')
    expect(publishJSON).toHaveBeenCalled()
  })
})
