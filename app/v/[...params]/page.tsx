import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  User,
  CreditCard,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import dbConnect from '@/lib/db-conn'
import Organization from '@/models/organization.model'
import {
  createOrganizationHeaders,
  resolveOrganizationFromCache,
} from '@/lib/tenants/organization-context'
import { siteConfig } from '@/lib/site'

interface ReceiptData {
  valid: boolean
  receipt?: {
    receiptNumber: string
    customer: {
      name: string
      email: string
      phone?: string
      address?: string
    }
    items: Array<{
      name: string
      description?: string
      quantity: number
      price: number
      total: number
    }>
    totalAmount: number
    paymentMethod?: string
    notes?: string
    refunded: boolean
    refundReason?: string
    emailSent: boolean
    createdAt: string
  }
  event?: {
    name: string
    eventCode: string
    type: string
    location?: string
    startDate?: string
    endDate?: string
  } | null
  message?: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ params: string[] }> | { params: string[] }
}): Promise<Metadata> {
  const resolvedParams = await params
  const parts = Array.isArray(resolvedParams.params)
    ? resolvedParams.params
    : []

  const receiptNumber = parts.length === 1 ? parts[0] : parts[1]
  const title = receiptNumber
    ? `Verify Receipt ${receiptNumber}`
    : 'Receipt Verification'

  const canonicalPath = parts.length ? `/v/${parts.join('/')}` : '/v'

  return {
    title,
    description:
      'Verify an event receipt using its receipt number (Optionally organization slug).',
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      url: `${siteConfig.url}${canonicalPath}`,
      title,
      description:
        'Verify an event receipt using its receipt number (Optionally organization slug).',
      siteName: siteConfig.name,
      locale: 'en_US',
    },
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    card: 'Card',
    other: 'Other',
  }
  return labels[method] || method
}

async function getOrgBranding(slug: string): Promise<{
  name: string
  logoUrl?: string
  status?: string
} | null> {
  await dbConnect()
  const org = await Organization.findOne({ slug: slug.toLowerCase() })
    .select('name logoUrl status')
    .lean<{ name: string; logoUrl?: string; status: string }>()

  if (!org) return null
  return { name: org.name, logoUrl: org.logoUrl, status: org.status }
}

async function getReceiptWithoutOrg(
  receiptNumber: string
): Promise<ReceiptData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/receipts/${receiptNumber}`, {
    next: { revalidate: 300 },
  })
  return response.json()
}

async function getReceiptWithOrg(
  slug: string,
  receiptNumber: string
): Promise<ReceiptData> {
  const orgCtx = await resolveOrganizationFromCache(slug)
  if (!orgCtx || orgCtx.status !== 'active') {
    return {
      valid: false,
      message: 'Organization not found or not active',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/receipts/${receiptNumber}`, {
    headers: createOrganizationHeaders(orgCtx),
    next: { revalidate: 300 },
  })

  return response.json()
}

function InvalidReceipt({
  receiptNumber,
  message,
}: {
  receiptNumber: string
  message?: string
}) {
  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-black'>
      <div className='text-center max-w-sm'>
        <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mb-3'>
          <XCircle className='w-6 h-6 text-red-400' />
        </div>
        <h1 className='text-base font-medium text-white mb-1.5'>
          Invalid Receipt
        </h1>
        <p className='text-xs text-zinc-500 mb-2'>
          {message || 'This receipt could not be verified.'}
        </p>
        <p className='font-mono text-tiny text-zinc-600'>{receiptNumber}</p>
      </div>
    </div>
  )
}

async function ReceiptContent({
  params,
}: {
  params: Promise<{ params: string[] }> | { params: string[] }
}) {
  const resolvedParams = await params
  const parts = Array.isArray(resolvedParams.params)
    ? resolvedParams.params
    : []

  if (parts.length === 1) {
    const receiptNumber = parts[0]
    const data = await getReceiptWithoutOrg(receiptNumber)

    if (!data.valid || !data.receipt) {
      return (
        <InvalidReceipt receiptNumber={receiptNumber} message={data.message} />
      )
    }

    return <ReceiptView data={data} />
  }

  if (parts.length === 2) {
    const [slug, receiptNumber] = parts

    const [data, branding] = await Promise.all([
      getReceiptWithOrg(slug, receiptNumber),
      getOrgBranding(slug),
    ])

    if (!data.valid || !data.receipt) {
      return (
        <InvalidReceipt receiptNumber={receiptNumber} message={data.message} />
      )
    }

    return (
      <ReceiptView
        data={data}
        orgName={branding?.name || slug}
        orgLogoUrl={branding?.logoUrl}
      />
    )
  }

  return (
    <InvalidReceipt
      receiptNumber={parts.join('/')}
      message='Invalid verification URL.'
    />
  )
}

function ReceiptView({
  data,
  orgName = 'Eshan Receipts',
  orgLogoUrl,
}: {
  data: ReceiptData
  orgName?: string
  orgLogoUrl?: string
}) {
  if (!data.receipt) {
    return <InvalidReceipt receiptNumber='unknown' />
  }

  const { receipt, event } = data

  return (
    <div className='min-h-screen bg-[#000000] text-white p-4 py-6'>
      <div className='max-w-md mx-auto space-y-2'>
        <div className='mb-3'>
          <Link href='/'>
            <Button
              variant='ghost'
              size='sm'
              className='text-zinc-500 hover:text-white hover:bg-zinc-900 h-6 text-[11px] px-2'
            >
              <ArrowLeft className='w-3 h-3 mr-1' />
              Back
            </Button>
          </Link>
        </div>

        <div className='border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950'>
          <div className='px-4 py-3 border-b border-zinc-800'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Image
                  src={
                    orgLogoUrl ||
                    'https://avatars.githubusercontent.com/u/140711476?v=4'
                  }
                  alt={orgName}
                  width={20}
                  height={20}
                  className='rounded-full'
                />
                <div>
                  <div className='font-medium text-xs'>{orgName}</div>
                  <div className='text-tiny text-zinc-500'>
                    Receipt Verification
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-1'>
                <CheckCircle className='w-3 h-3 text-emerald-400' />
                <span className='text-[11px] text-emerald-400 font-medium'>
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className='px-4 py-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='font-mono text-[11px] text-zinc-500'>
                {receipt.receiptNumber}
              </div>
              {receipt.refunded && (
                <Badge className='bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 text-tiny px-1.5 py-0 h-4'>
                  <RotateCcw className='w-2 h-2 mr-0.5' />
                  Refunded
                </Badge>
              )}
            </div>

            {event && (
              <div className='px-2.5 py-2 rounded bg-zinc-900/50 border border-zinc-800 flex items-center justify-between'>
                <div className='font-medium text-xs'>{event.name}</div>
                <div className='flex flex-wrap gap-2 text-tiny text-zinc-500'>
                  {event.location && (
                    <span className='flex items-center gap-0.5'>
                      <MapPin className='w-2.5 h-2.5' />
                      {event.location}
                    </span>
                  )}
                  {event.startDate && (
                    <span className='flex items-center gap-0.5'>
                      <Calendar className='w-2.5 h-2.5' />
                      {format(new Date(event.startDate), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <div className='flex items-center gap-1 text-[9px] text-zinc-500 uppercase tracking-wider mb-1'>
                  <User className='w-2.5 h-2.5' />
                  Customer
                </div>
                <div className='text-xs font-medium'>
                  {receipt.customer.name}
                </div>
                <div className='text-tiny text-zinc-400'>
                  {receipt.customer.email}
                </div>
                {receipt.customer.phone && (
                  <div className='text-tiny text-zinc-500'>
                    {receipt.customer.phone}
                  </div>
                )}
              </div>
              <div className='text-right'>
                <div className='flex items-center justify-end gap-1 text-[9px] text-zinc-500 uppercase tracking-wider mb-1'>
                  <Calendar className='w-2.5 h-2.5' />
                  Issued
                </div>
                <div className='text-tiny'>
                  {format(new Date(receipt.createdAt), 'MMM d, yyyy')}
                </div>
                <div className='text-tiny text-zinc-500'>
                  {format(new Date(receipt.createdAt), 'h:mm a')}
                </div>
              </div>
            </div>

            <div className='border-t border-zinc-800 pt-3'>
              <div className='text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5'>
                Items
              </div>
              <div className='space-y-1'>
                {receipt.items.map((item, idx) => (
                  <div key={idx} className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-zinc-500 tabular-nums text-tiny w-4'>
                        {item.quantity}x
                      </span>
                      <div>
                        <div className='text-xs'>{item.name}</div>
                        {item.description && (
                          <div className='text-tiny text-zinc-500'>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='font-mono text-tiny text-zinc-400'>
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex items-center justify-between pt-2 mt-2 border-t border-zinc-800'>
                <span className='text-tiny text-zinc-500'>Total</span>
                <span className='text-base font-semibold font-mono'>
                  {formatCurrency(receipt.totalAmount)}
                </span>
              </div>
            </div>

            <div className='flex items-center justify-between pt-3 border-t border-zinc-800 text-tiny'>
              <span className='flex items-center gap-1 text-zinc-500'>
                <CreditCard className='w-2.5 h-2.5' />
                Payment Method
              </span>
              <span>
                {receipt.paymentMethod
                  ? formatPaymentMethod(receipt.paymentMethod)
                  : '-'}
              </span>
            </div>

            {receipt.refunded && receipt.refundReason && (
              <div className='px-2.5 py-2 rounded bg-orange-500/5 border border-orange-500/20'>
                <div className='text-[9px] text-orange-400 uppercase tracking-wider mb-0.5'>
                  Refund Reason
                </div>
                <div className='text-tiny text-zinc-300'>
                  {receipt.refundReason}
                </div>
              </div>
            )}

            {receipt.notes && (
              <div className='pt-2 border-t border-zinc-800'>
                <div className='text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5'>
                  Notes
                </div>
                <div className='text-tiny text-zinc-400'>{receipt.notes}</div>
              </div>
            )}
          </div>

          <div className='px-4 py-2 bg-zinc-900/50 border-t border-zinc-800'>
            <div className='flex items-center justify-center gap-1 text-tiny text-zinc-600'>
              <CheckCircle className='w-2 h-2 text-emerald-400' />
              Verified on {format(new Date(), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className='min-h-screen bg-black p-4 py-6'>
      <div className='max-w-md mx-auto'>
        <div className='border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 p-4'>
          <div className='animate-pulse space-y-3'>
            <div className='h-3 bg-zinc-800 rounded w-1/4' />
            <div className='h-6 bg-zinc-800 rounded w-1/2' />
            <div className='h-16 bg-zinc-800 rounded' />
            <div className='h-20 bg-zinc-800 rounded' />
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function Page(props: {
  params: Promise<{ params: string[] }>
}) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ReceiptContent params={props.params} />
    </Suspense>
  )
}
