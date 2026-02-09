import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth/tenant-route'
import { getReceiptEmailBatchSummary } from '@/lib/jobs/receipt-email-batches'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ batchId: string }> }
) {
  const ctx = await getTenantContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { batchId } = await props.params
  if (!batchId) {
    return NextResponse.json({ message: 'Missing batchId' }, { status: 400 })
  }

  const summary = await getReceiptEmailBatchSummary({
    batchId,
    organizationSlug: ctx.organization.slug,
    limitFailedReceiptNumbers: 100,
  })

  if (!summary) {
    return NextResponse.json({ message: 'Batch not found' }, { status: 404 })
  }

  return NextResponse.json(summary)
}
