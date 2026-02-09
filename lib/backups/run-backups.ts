import {
  PutObjectCommand,
  type S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3'
import crypto from 'node:crypto'
import { gzipSync } from 'node:zlib'

import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import User from '@/models/user.model'
import { getTenantModels } from '@/lib/db/tenant-models'
import { writeAuditLog } from '@/lib/tenants/audit-log'
import { createLogger } from '@/lib/logger'

export type BackupsRunResponse = {
  ok: boolean
  key?: string
  bytes?: number
  createdAt?: string
  orgCount?: number
  tenantCount?: number
  tenantErrors?: Array<{ slug: string; error: string }>
  error?: string
}

export async function runBackupsSnapshot(params: {
  createdByUserId: string
  requestId?: string
  ipAddress?: string
  userAgent?: string
  s3: { client: S3Client; bucket: string }
}): Promise<BackupsRunResponse> {
  const log = createLogger({
    kind: 'backups_snapshot',
    createdByUserId: params.createdByUserId,
    requestId: params.requestId,
  })

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
      createdByUserId: params.createdByUserId,
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

  const put: PutObjectCommandInput = {
    Bucket: params.s3.bucket,
    Key: key,
    Body: gz,
    ContentType: 'application/json',
    ContentEncoding: 'gzip',
  }

  await params.s3.client.send(new PutObjectCommand(put))

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
    key,
    bytes: gz.byteLength,
    orgCount: organizations.length,
    tenantCount: Object.keys(tenants).length,
    tenantErrorsCount: tenantErrors.length,
  })

  await writeAuditLog({
    userId: params.createdByUserId,
    action: 'BACKUP',
    resourceType: 'ORGANIZATION',
    details: {
      key,
      bytes: gz.byteLength,
      createdAt,
      orgCount: organizations.length,
      tenantCount: Object.keys(tenants).length,
      tenantErrorsCount: tenantErrors.length,
      requestId: params.requestId,
    },
    status: tenantErrors.length > 0 ? 'FAILURE' : 'SUCCESS',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  }).catch(() => undefined)

  return payload
}
