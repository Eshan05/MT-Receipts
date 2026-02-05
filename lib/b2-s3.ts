import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'

export interface B2S3Config {
  region: string
  endpoint: string
  bucket?: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

function inferRegionFromEndpoint(endpoint: string): string | undefined {
  try {
    const normalized = normalizeEndpoint(endpoint)
    const url = new URL(normalized)
    const parts = url.hostname.split('.')
    const s3Index = parts.indexOf('s3')
    if (s3Index !== -1 && parts[s3Index + 1]) {
      return parts[s3Index + 1]
    }
    return undefined
  } catch {
    return undefined
  }
}

function normalizeEndpoint(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

function computeEndpoint(region: string, endpoint?: string): string {
  if (endpoint && endpoint.trim().length > 0) {
    return normalizeEndpoint(endpoint)
  }
  return `https://s3.${region}.backblazeb2.com`
}

function readRequired(name: string): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getB2S3Config(options?: {
  requireBucket?: boolean
}): B2S3Config {
  const endpointRaw = process.env.B2_S3_ENDPOINT
  const regionFromEnv = (process.env.B2_S3_REGION || '').trim()
  const regionFromEndpoint = endpointRaw
    ? inferRegionFromEndpoint(endpointRaw)
    : undefined
  const region = regionFromEnv || regionFromEndpoint || ''

  if (!region) {
    throw new Error(
      'Missing required environment variable: B2_S3_REGION (or provide B2_S3_ENDPOINT)'
    )
  }

  const accessKeyId = readRequired('B2_ACCESS_KEY_ID')
  const secretAccessKey = readRequired('B2_SECRET_ACCESS_KEY')

  const endpoint = computeEndpoint(region, endpointRaw)

  const bucket = (process.env.B2_BUCKET || '').trim() || undefined
  if (options?.requireBucket && !bucket) {
    throw new Error('Missing required environment variable: B2_BUCKET')
  }

  return {
    region,
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: false,
  }
}

export function getB2S3ClientConfig(options?: { requireBucket?: boolean }): {
  clientConfig: S3ClientConfig
  bucket?: string
} {
  const cfg = getB2S3Config(options)

  return {
    bucket: cfg.bucket,
    clientConfig: {
      region: cfg.region,
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: cfg.forcePathStyle,
    },
  }
}

let cachedClient: S3Client | undefined
let cachedKey: string | undefined

export function getB2S3Client(options?: { requireBucket?: boolean }): {
  client: S3Client
  bucket?: string
} {
  const { clientConfig, bucket } = getB2S3ClientConfig(options)

  const key = JSON.stringify({
    region: clientConfig.region,
    endpoint: clientConfig.endpoint,
    forcePathStyle: clientConfig.forcePathStyle,
    accessKeyId:
      typeof clientConfig.credentials === 'object' && clientConfig.credentials
        ? (clientConfig.credentials as any).accessKeyId
        : undefined,
  })

  if (!cachedClient || cachedKey !== key) {
    cachedClient = new S3Client(clientConfig)
    cachedKey = key
  }

  return { client: cachedClient, bucket }
}
