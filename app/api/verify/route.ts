import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import ReceiptVerificationIndex from '@/models/receipt-verification-index.model'
import { getTenantModels } from '@/lib/db/tenant-models'

function normalizeReceiptNumber(value: string): string {
  return value.trim()
}

async function findOwnerSlugByScanningTenants(
  activeSlugs: string[],
  receiptNumber: string
): Promise<string | null> {
  if (!activeSlugs.length) return null

  const concurrency = 5
  let cursor = 0
  let foundSlug: string | null = null

  const workers = Array.from(
    { length: Math.min(concurrency, activeSlugs.length) },
    async () => {
      while (cursor < activeSlugs.length && !foundSlug) {
        const slug = activeSlugs[cursor]!
        cursor += 1

        try {
          const { Receipt } = await getTenantModels(slug)
          const exists = await Receipt.exists({ receiptNumber })
          if (exists) {
            foundSlug = slug
            return
          }
        } catch {
          // Ignore tenant connection errors and continue scanning.
        }
      }
    }
  )

  await Promise.all(workers)
  return foundSlug
}

export async function GET(request: NextRequest) {
  const certificateId = request.nextUrl.searchParams
    .get('certificateId')
    ?.toString()

  if (!certificateId || certificateId.trim() === '') {
    return NextResponse.json(
      { ok: false, message: 'Missing certificateId' },
      { status: 400 }
    )
  }

  if (certificateId.length > 256) {
    return NextResponse.json(
      { ok: false, message: 'certificateId is too long' },
      { status: 400 }
    )
  }

  const receiptNumber = normalizeReceiptNumber(certificateId)

  try {
    await dbConnect()

    const cached = await ReceiptVerificationIndex.findOne({ receiptNumber })
      .select('organizationSlug')
      .lean<{ organizationSlug: string }>()

    if (cached?.organizationSlug) {
      const org = await Organization.findOne({
        slug: cached.organizationSlug,
        status: 'active',
      })
        .select('slug')
        .lean<{ slug: string }>()

      if (org?.slug) {
        void ReceiptVerificationIndex.updateOne(
          { receiptNumber },
          { $set: { lastVerifiedAt: new Date() } }
        ).catch(() => undefined)

        return NextResponse.json({
          ok: true,
          receiptNumber,
          organizationSlug: org.slug,
        })
      }
    }

    const activeOrgs = await Organization.find({ status: 'active' })
      .select('slug')
      .lean<Array<{ slug: string }>>()

    const activeSlugs = activeOrgs
      .map((o) => o.slug)
      .filter((slug): slug is string => typeof slug === 'string' && slug !== '')

    const ownerSlug = await findOwnerSlugByScanningTenants(
      activeSlugs,
      receiptNumber
    )

    if (!ownerSlug) {
      return NextResponse.json(
        { ok: false, message: 'Certificate not found' },
        { status: 404 }
      )
    }

    await ReceiptVerificationIndex.updateOne(
      { receiptNumber },
      {
        $set: {
          organizationSlug: ownerSlug,
          lastVerifiedAt: new Date(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({
      ok: true,
      receiptNumber,
      organizationSlug: ownerSlug,
    })
  } catch (error) {
    console.error('verify_lookup_error', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to verify certificate' },
      { status: 500 }
    )
  }
}
