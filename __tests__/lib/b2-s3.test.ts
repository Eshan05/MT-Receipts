import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { getB2S3ClientConfig, getB2S3Config } from '@/lib/b2-s3'

const ORIGINAL_ENV = { ...process.env }

function resetEnv() {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.B2_S3_REGION
  delete process.env.B2_S3_ENDPOINT
  delete process.env.B2_BUCKET
  delete process.env.B2_ACCESS_KEY_ID
  delete process.env.B2_SECRET_ACCESS_KEY
}

describe('Backblaze B2 S3 helper', () => {
  beforeEach(() => resetEnv())
  afterEach(() => resetEnv())

  it('throws when required credentials are missing', () => {
    process.env.B2_S3_REGION = 'us-east-005'

    expect(() => getB2S3Config()).toThrow(/B2_ACCESS_KEY_ID/)
  })

  it('derives endpoint from region when endpoint is not set', () => {
    process.env.B2_S3_REGION = 'us-east-005'
    process.env.B2_ACCESS_KEY_ID = 'test-access-key-id'
    process.env.B2_SECRET_ACCESS_KEY = 'test-secret-access-key'

    const cfg = getB2S3Config()
    expect(cfg.endpoint).toBe('https://s3.us-east-005.backblazeb2.com')
    expect(cfg.region).toBe('us-east-005')
  })

  it('normalizes endpoint without protocol to https://', () => {
    process.env.B2_S3_REGION = 'us-east-005'
    process.env.B2_S3_ENDPOINT = 's3.us-east-005.backblazeb2.com'
    process.env.B2_ACCESS_KEY_ID = 'test-access-key-id'
    process.env.B2_SECRET_ACCESS_KEY = 'test-secret-access-key'

    const cfg = getB2S3Config()
    expect(cfg.endpoint).toBe('https://s3.us-east-005.backblazeb2.com')
  })

  it('infers region from endpoint when B2_S3_REGION is not set', () => {
    process.env.B2_S3_ENDPOINT = 'https://s3.us-west-004.backblazeb2.com'
    process.env.B2_ACCESS_KEY_ID = 'test-access-key-id'
    process.env.B2_SECRET_ACCESS_KEY = 'test-secret-access-key'

    const cfg = getB2S3Config()
    expect(cfg.region).toBe('us-west-004')
    expect(cfg.endpoint).toBe('https://s3.us-west-004.backblazeb2.com')
  })

  it('requires B2_BUCKET when requireBucket=true', () => {
    process.env.B2_S3_REGION = 'us-east-005'
    process.env.B2_ACCESS_KEY_ID = 'test-access-key-id'
    process.env.B2_SECRET_ACCESS_KEY = 'test-secret-access-key'

    expect(() => getB2S3ClientConfig({ requireBucket: true })).toThrow(
      /B2_BUCKET/
    )
  })

  it('returns an S3Client config object with credentials + endpoint', () => {
    process.env.B2_S3_REGION = 'us-east-005'
    process.env.B2_ACCESS_KEY_ID = 'test-access-key-id'
    process.env.B2_SECRET_ACCESS_KEY = 'test-secret-access-key'
    process.env.B2_BUCKET = 'my-bucket'

    const { clientConfig, bucket } = getB2S3ClientConfig({
      requireBucket: true,
    })
    expect(bucket).toBe('my-bucket')
    expect(clientConfig.region).toBe('us-east-005')
    expect(clientConfig.endpoint).toBe('https://s3.us-east-005.backblazeb2.com')

    // sanity: creds are wired in (exact shape differs across providers)
    expect(clientConfig.credentials).toBeDefined()
  })
})
