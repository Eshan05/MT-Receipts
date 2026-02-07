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
import { gzipSync } from 'node:zlib'
import crypto from 'node:crypto'
import { getRequestMeta } from '@/lib/request-meta'
import { createLogger } from '@/lib/logger'
import { RATE_LIMITS } from '@/lib/tenants/rate-limits'
import { checkRateLimit, rateLimitedResponse } from '@/lib/tenants/rate-limiter'
import { writeAuditLog } from '@/lib/tenants/audit-log'

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
          error:
            err instanceof Error
              ? err.message
              : 'Backblaze B2 is not configured',
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

    const { client, bucket } = getB2S3Client({ requireBucket: true })

    await dbConnect()

    const [organizations, users] = await Promise.all([
      Organization.find({}).lean(),
      User.find({}).lean(),
    ])

    const tenants: Record<
      string,
      {
        events: unknown[]
        receipts: unknown[]
        templates: unknown[]
        sequences: unknown[]
      }
    > = {}

    const tenantErrors: Array<{ slug: string; error: string }> = []

    for (const org of organizations as Array<{ slug?: string }>) {
      const slug = (org.slug || '').toLowerCase().trim()
      if (!slug) continue

      try {
        const models = await getTenantModels(slug)
        const [events, receipts, templates, sequences] = await Promise.all([
          models.Event.find({}).lean(),
          models.Receipt.find({}).lean(),
          models.Template.find({}).lean(),
          models.Sequence.find({}).lean(),
        ])

        tenants[slug] = {
          events,
          receipts,
          templates,
          sequences,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        tenantErrors.push({ slug, error: message })
      }
    }

    const createdAt = new Date().toISOString()
    const snapshot = {
      meta: {
        kind: 'aces-receipts-backup',
        createdAt,
        createdByUserId: superAdmin.user.id,
      },
      master: {
        organizations,
        users,
      },
      tenants,
      tenantErrors,
    }

    const json = JSON.stringify(snapshot)
    const gz = gzipSync(Buffer.from(json, 'utf8'), { level: 9 })

    const safeTimestamp = createdAt.replace(/[:.]/g, '-')
    const nonce = crypto.randomBytes(4).toString('hex')
    const key = `backups/${safeTimestamp}-${nonce}.json.gz`

    await client.send(
      new PutObjectCommand({
        Bucket: bucket!,
        Key: key,
        Body: gz,
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
      })
    )

    const payload: BackupsRunResponse = {
      ok: true,
      key,
      bytes: gz.byteLength,
      createdAt,
      orgCount: organizations.length,
      tenantCount: Object.keys(tenants).length,
      tenantErrors,
    }

    log.info('backups_run_complete', {
      userId: superAdmin.user.id,
      key,
      bytes: gz.byteLength,
      orgCount: organizations.length,
      tenantCount: Object.keys(tenants).length,
      tenantErrorsCount: tenantErrors.length,
    })

    await writeAuditLog({
      userId: superAdmin.user.id,
      action: 'BACKUP',
      resourceType: 'ORGANIZATION',
      details: {
        key,
        bytes: gz.byteLength,
        createdAt,
        orgCount: organizations.length,
        tenantCount: Object.keys(tenants).length,
        tenantErrorsCount: tenantErrors.length,
        requestId: meta.requestId,
      },
      status: tenantErrors.length > 0 ? 'FAILURE' : 'SUCCESS',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => undefined)

    return NextResponse.json(payload)
  } catch (error) {
    log.error('backups_run_error', { error })
    const message = error instanceof Error ? error.message : 'Unknown error'
    const payload: BackupsRunResponse = { ok: false, error: message }
    return NextResponse.json(payload, { status: 500 })
  }
}
