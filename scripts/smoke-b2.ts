import 'dotenv/config'
import { HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3'
import { getB2S3Client } from '@/lib/b2-s3'

async function main() {
  const { client, bucket } = getB2S3Client()

  if (bucket) {
    console.log(`Checking B2 bucket access (HeadBucket): ${bucket}`)
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    console.log('OK: HeadBucket succeeded')
    return
  }

  console.log('No B2_BUCKET set; listing buckets instead (ListBuckets)')
  const result = await client.send(new ListBucketsCommand({}))
  const names = (result.Buckets || []).map((b) => b.Name).filter(Boolean)
  console.log(`OK: ListBuckets succeeded (${names.length} buckets)`)
  if (names.length > 0) {
    console.log('Buckets:', names.join(', '))
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('B2 smoke test failed:', message)
  process.exit(1)
})
