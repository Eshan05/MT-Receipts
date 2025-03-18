import { Suspense } from 'react'
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

async function getReceipt(receiptNumber: string): Promise<ReceiptData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/receipts/${receiptNumber}`, {
    next: { revalidate: 300 },
  })
  return response.json()
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
        <p className='font-mono text-[10px] text-zinc-600'>{receiptNumber}</p>
      </div>
    </div>
  )
}

async function ReceiptContent({ receiptNumber }: { receiptNumber: string }) {
  const data = await getReceipt(receiptNumber)

  if (!data.valid || !data.receipt) {
    return (
      <InvalidReceipt receiptNumber={receiptNumber} message={data.message} />
    )
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
                  src='https://res.cloudinary.com/dygc8r0pv/image/upload/v1734452294/ACES_Logo_ACE_White_d6rz6a.png'
                  alt='ACES'
                  width={20}
                  height={20}
                  className='rounded-full'
                />
                <div>
                  <div className='font-medium text-xs'>ACES</div>
                  <div className='text-[10px] text-zinc-500'>
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
                <Badge className='bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 text-[10px] px-1.5 py-0 h-4'>
                  <RotateCcw className='w-2 h-2 mr-0.5' />
                  Refunded
                </Badge>
              )}
            </div>

            {event && (
              <div className='px-2.5 py-2 rounded bg-zinc-900/50 border border-zinc-800 flex items-center justify-between'>
                <div className='font-medium text-xs'>{event.name}</div>
                <div className='flex flex-wrap gap-2 text-[10px] text-zinc-500'>
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
                <div className='text-[10px] text-zinc-400'>
                  {receipt.customer.email}
                </div>
                {receipt.customer.phone && (
                  <div className='text-[10px] text-zinc-500'>
                    {receipt.customer.phone}
                  </div>
                )}
              </div>
              <div className='text-right'>
                <div className='flex items-center justify-end gap-1 text-[9px] text-zinc-500 uppercase tracking-wider mb-1'>
                  <Calendar className='w-2.5 h-2.5' />
                  Issued
                </div>
                <div className='text-[10px]'>
                  {format(new Date(receipt.createdAt), 'MMM d, yyyy')}
                </div>
                <div className='text-[10px] text-zinc-500'>
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
                      <span className='text-zinc-500 tabular-nums text-[10px] w-4'>
                        {item.quantity}x
                      </span>
                      <div>
                        <div className='text-xs'>{item.name}</div>
                        {item.description && (
                          <div className='text-[10px] text-zinc-500'>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='font-mono text-[10px] text-zinc-400'>
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex items-center justify-between pt-2 mt-2 border-t border-zinc-800'>
                <span className='text-[10px] text-zinc-500'>Total</span>
                <span className='text-base font-semibold font-mono'>
                  {formatCurrency(receipt.totalAmount)}
                </span>
              </div>
            </div>

            <div className='flex items-center justify-between pt-3 border-t border-zinc-800 text-[10px]'>
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
                <div className='text-[10px] text-zinc-300'>
                  {receipt.refundReason}
                </div>
              </div>
            )}

            {receipt.notes && (
              <div className='pt-2 border-t border-zinc-800'>
                <div className='text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5'>
                  Notes
                </div>
                <div className='text-[10px] text-zinc-400'>{receipt.notes}</div>
              </div>
            )}
          </div>

          <div className='px-4 py-2 bg-zinc-900/50 border-t border-zinc-800'>
            <div className='flex items-center justify-center gap-1 text-[10px] text-zinc-600'>
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

export default async function ReceiptVerificationPage({
  params,
}: {
  params: Promise<{ receiptNumber: string }>
}) {
  const { receiptNumber } = await params

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ReceiptContent receiptNumber={receiptNumber} />
    </Suspense>
  )
}
