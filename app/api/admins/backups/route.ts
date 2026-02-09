import { NextResponse } from 'next/server'
import {
  HeadBucketCommand,
  ListBucketsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

import { getSuperAdminContext } from '@/lib/auth/superadmin-route'
import { getB2S3Client } from '@/lib/b2-s3'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { getTenantModels } from '@/lib/db/tenant-models'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'
import { isQstashConfigured } from '@/lib/queue/qstash'
import { enqueueBackupsRunJob } from '@/lib/queue/backups'
import { runBackupsSnapshot } from '@/lib/backups/run-backups'

export const runtime = 'nodejs'

type BackupsHealthResponse = {
  configured: boolean
  ok: boolean
  checked: 'headBucket' | 'listBuckets' | null
  region?: string
  endpoint?: string
  bucket?: string
  error?: string
}

type BackupsRunResponse = {
  ok: boolean
  key?: string
  bytes?: number
  createdAt?: string
  orgCount?: number
  tenantCount?: number
  tenantErrors?: Array<{ slug: string; error: string }>
  error?: string
}

function isMissingEnvError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('Missing required environment variable')
}

export async function GET(request?: Request) {
  const meta = getRequestMeta(request)
  const log = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const superAdmin = await getSuperAdminContext(request)
    if (superAdmin instanceof NextResponse) return superAdmin

    let clientInfo: ReturnType<typeof getB2S3Client>
    try {
      clientInfo = getB2S3Client()
    } catch (err) {
      if (isMissingEnvError(err)) {
        const payload: BackupsHealthResponse = {
          configured: false,
          ok: false,
          checked: null,
          error: err instanceof Error ? err.message : String(err),
        }
        return NextResponse.json(payload, { status: 200 })
      }
      throw err
    }

    const { client, bucket } = clientInfo
    if (bucket) {
      await client.send(new HeadBucketCommand({ Bucket: bucket }))
      const payload: BackupsHealthResponse = {
        configured: true,
        ok: true,
        checked: 'headBucket',
        region: process.env.B2_S3_REGION,
        endpoint: process.env.B2_S3_ENDPOINT,
        bucket,
      }
      return NextResponse.json(payload)
    }

    await client.send(new ListBucketsCommand({}))
    const payload: BackupsHealthResponse = {
      configured: true,
      ok: true,
      checked: 'listBuckets',
      region: process.env.B2_S3_REGION,
      endpoint: process.env.B2_S3_ENDPOINT,
    }
    return NextResponse.json(payload)
  } catch (error) {
    log.error('backups_health_error', { error })
    const message = error instanceof Error ? error.message : 'Unknown error'

    const payload: BackupsHealthResponse = {
      configured: true,
      ok: false,
      checked: null,
      error: message,
      region: process.env.B2_S3_REGION,
      endpoint: process.env.B2_S3_ENDPOINT,
      bucket: process.env.B2_BUCKET,
    }

    return NextResponse.json(payload, { status: 500 })
  }
}

export async function POST(request?: Request) {
  const meta = getRequestMeta(request)
  const log = createLogger({
    requestId: meta.requestId,
    method: meta.method,
    path: meta.path,
    ip: meta.ip,
  })

  try {
    const superAdmin = await getSuperAdminContext(request)
    if (superAdmin instanceof NextResponse) return superAdmin

    const rl = await checkRateLimit({
      policy: RATE_LIMITS.superadminBackupsRun,
      scope: `superadmin:${superAdmin.user.id}`,
    })
    if (!rl.success) {
      log.warn('rate_limited', { limiter: rl.policy.name })
      return rateLimitedResponse(rl)
    }

    if (isQstashConfigured()) {
      const queued = await enqueueBackupsRunJob({
        actorUserId: superAdmin.user.id,
        requestId: meta.requestId,
      }).catch((err) => ({
        queued: false,
        messageId: undefined,
        error: err instanceof Error ? err.message : 'Failed to enqueue job',
      }))

      if (!queued.queued) {
        log.warn('backups_enqueue_failed', { error: queued.error })
      } else {
        void writeAuditLog({
          userId: superAdmin.user.id,
          action: 'UPDATE',
          resourceType: 'ORGANIZATION',
          details: {
            kind: 'backup_queued',
            messageId: queued.messageId,
            requestId: meta.requestId,
          },
          status: 'SUCCESS',
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        }).catch(() => undefined)
      }

      return NextResponse.json(
        {
          ok: true,
          queued: queued.queued,
          messageId: queued.messageId,
          error: queued.queued ? undefined : queued.error,
        },
        { status: queued.queued ? 202 : 200 }
      )
    }

    const { client, bucket } = getB2S3Client({ requireBucket: true })
    const payload = await runBackupsSnapshot({
      createdByUserId: superAdmin.user.id,
      requestId: meta.requestId,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      s3: { client, bucket: bucket! },
    })

    return NextResponse.json(payload)
  } catch (error) {
    log.error('backups_run_error', { error })
    const message = error instanceof Error ? error.message : 'Unknown error'
    const payload: BackupsRunResponse = { ok: false, error: message }
    return NextResponse.json(payload, { status: 500 })
  }
}
