import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { NextRequest, NextResponse } from 'next/server'

import { backupsRunJobSchema } from '@/lib/queue/backups'
import { getB2S3Client } from '@/lib/b2-s3'
import { runBackupsSnapshot } from '@/lib/backups/run-backups'
import { createLogger } from '@/lib/logger'
import { getQstashSigningConfig } from '@/lib/queue/qstash'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = verifySignatureAppRouter(async (req: NextRequest) => {
  const body = await req.json().catch(() => null)
  const parsed = backupsRunJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid job payload', errors: parsed.error.issues },
      { status: 400 }
    )
  }

  const job = parsed.data
  const log = createLogger({
    job: 'backups-run',
    actorUserId: job.actorUserId,
    requestId: job.requestId,
  })

  try {
    const { client, bucket } = getB2S3Client({ requireBucket: true })

    const payload = await runBackupsSnapshot({
      createdByUserId: job.actorUserId,
      requestId: job.requestId,
      s3: { client, bucket: bucket! },
    })

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    log.error('backups_run_job_error', { error })
    return NextResponse.json(
      { message: 'Backup job failed' },
      {
        status: 500,
      }
    )
  }
}, getQstashSigningConfig())
