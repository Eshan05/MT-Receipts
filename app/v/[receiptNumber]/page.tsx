'use client'

import { use, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  XCircle,
  Receipt,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  MapPinned,
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
  const response = await fetch(
    `${baseUrl}/api/receipts/${receiptNumber}/public`,
    {
      cache: 'no-store',
    }
  )
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

function ReceiptContent({ receiptNumber }: { receiptNumber: string }) {
  const data = use(getReceipt(receiptNumber))

  if (!data.valid || !data.receipt) {
    return (
      <div className='min-h-screen flex items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardContent className='pt-6 text-center'>
            <XCircle className='w-16 h-16 text-destructive mx-auto mb-4' />
            <h1 className='text-2xl font-bold mb-2'>Invalid Receipt</h1>
            <p className='text-muted-foreground mb-4'>
              {data.message || 'This receipt could not be verified.'}
            </p>
            <p className='font-mono text-sm text-muted-foreground'>
              Receipt #{receiptNumber}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { receipt, event } = data

  return (
    <div className='min-h-screen p-4 py-8'>
      <div className='max-w-2xl mx-auto space-y-4'>
        <div className='flex items-center justify-between'>
          <Link href='/'>
            <Button variant='ghost' size='sm' className='gap-1'>
              <ArrowLeft className='w-4 h-4' />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className='text-center border-b'>
            <div className='flex justify-center mb-4'>
              <Image
                src='https://res.cloudinary.com/dygc8r0pv/image/upload/v1734452294/ACES_Logo_ACE_White_d6rz6a.png'
                alt='ACES Logo'
                width={64}
                height={64}
                className='rounded-full'
              />
            </div>
            <div className='flex items-center justify-center gap-2 mb-2'>
              <CheckCircle className='w-5 h-5 text-green-500' />
              <Badge
                variant='outline'
                className='bg-green-500/10 text-green-600 border-green-500/30'
              >
                Verified Receipt
              </Badge>
            </div>
            <CardTitle className='text-xl font-mono'>
              #{receipt.receiptNumber}
            </CardTitle>
            {receipt.refunded && (
              <Badge
                variant='outline'
                className='bg-orange-500/10 text-orange-600 border-orange-500/30 mt-2'
              >
                <RotateCcw className='w-3 h-3 mr-1' />
                Refunded
              </Badge>
            )}
          </CardHeader>

          <CardContent className='pt-6 space-y-6'>
            {event && (
              <div className='bg-muted/50 rounded-lg p-4'>
                <h3 className='font-semibold text-sm text-muted-foreground mb-2'>
                  Event Details
                </h3>
                <div className='font-medium text-lg'>{event.name}</div>
                <div className='flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground'>
                  <div className='flex items-center gap-1'>
                    <Receipt className='w-3.5 h-3.5' />
                    <span className='font-mono'>{event.eventCode}</span>
                  </div>
                  {event.location && (
                    <div className='flex items-center gap-1'>
                      <MapPin className='w-3.5 h-3.5' />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.startDate && (
                    <div className='flex items-center gap-1'>
                      <Calendar className='w-3.5 h-3.5' />
                      <span>
                        {format(new Date(event.startDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className='font-semibold text-sm text-muted-foreground mb-3'>
                Customer Information
              </h3>
              <div className='grid gap-2 text-sm'>
                <div className='flex items-center gap-2'>
                  <User className='w-4 h-4 text-muted-foreground' />
                  <span className='font-medium'>{receipt.customer.name}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Mail className='w-4 h-4 text-muted-foreground' />
                  <span className='text-muted-foreground'>
                    {receipt.customer.email}
                  </span>
                </div>
                {receipt.customer.phone && (
                  <div className='flex items-center gap-2'>
                    <Phone className='w-4 h-4 text-muted-foreground' />
                    <span className='text-muted-foreground'>
                      {receipt.customer.phone}
                    </span>
                  </div>
                )}
                {receipt.customer.address && (
                  <div className='flex items-start gap-2'>
                    <MapPinned className='w-4 h-4 text-muted-foreground mt-0.5' />
                    <span className='text-muted-foreground'>
                      {receipt.customer.address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className='font-semibold text-sm text-muted-foreground mb-3'>
                Items Purchased
              </h3>
              <div className='border rounded-lg overflow-hidden'>
                <div className='bg-muted/50 grid grid-cols-12 gap-2 p-2 text-xs font-medium text-muted-foreground'>
                  <div className='col-span-5'>Item</div>
                  <div className='col-span-2 text-center'>Qty</div>
                  <div className='col-span-2 text-right'>Price</div>
                  <div className='col-span-3 text-right'>Total</div>
                </div>
                {receipt.items.map((item, index) => (
                  <div
                    key={index}
                    className='grid grid-cols-12 gap-2 p-2 text-sm border-t'
                  >
                    <div className='col-span-5'>
                      <div className='font-medium'>{item.name}</div>
                      {item.description && (
                        <div className='text-xs text-muted-foreground'>
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div className='col-span-2 text-center'>
                      {item.quantity}
                    </div>
                    <div className='col-span-2 text-right font-mono'>
                      {formatCurrency(item.price)}
                    </div>
                    <div className='col-span-3 text-right font-mono font-medium'>
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
                <div className='bg-muted/50 grid grid-cols-12 gap-2 p-2 text-sm border-t font-medium'>
                  <div className='col-span-5'>Total</div>
                  <div className='col-span-2' />
                  <div className='col-span-2' />
                  <div className='col-span-3 text-right font-mono text-base'>
                    {formatCurrency(receipt.totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              {receipt.paymentMethod && (
                <div>
                  <h3 className='font-semibold text-sm text-muted-foreground mb-1'>
                    Payment Method
                  </h3>
                  <div className='flex items-center gap-2'>
                    <CreditCard className='w-4 h-4 text-muted-foreground' />
                    <span>{formatPaymentMethod(receipt.paymentMethod)}</span>
                  </div>
                </div>
              )}
              <div>
                <h3 className='font-semibold text-sm text-muted-foreground mb-1'>
                  Purchase Date
                </h3>
                <div className='flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-muted-foreground' />
                  <span>
                    {format(new Date(receipt.createdAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            </div>

            {receipt.notes && (
              <div>
                <h3 className='font-semibold text-sm text-muted-foreground mb-1'>
                  Notes
                </h3>
                <p className='text-sm text-muted-foreground'>{receipt.notes}</p>
              </div>
            )}

            {receipt.refunded && receipt.refundReason && (
              <div className='bg-orange-500/10 border border-orange-500/30 rounded-lg p-3'>
                <h3 className='font-semibold text-sm text-orange-600 mb-1'>
                  Refund Reason
                </h3>
                <p className='text-sm text-muted-foreground'>
                  {receipt.refundReason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className='text-center text-xs text-muted-foreground'>
          This receipt was verified on{' '}
          {format(new Date(), 'MMM d, yyyy h:mm a')}
        </p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className='min-h-screen flex items-center justify-center p-4'>
      <Card className='w-full max-w-2xl'>
        <CardContent className='pt-6'>
          <div className='animate-pulse space-y-4'>
            <div className='h-16 bg-muted rounded-lg' />
            <div className='h-24 bg-muted rounded-lg' />
            <div className='h-32 bg-muted rounded-lg' />
            <div className='h-16 bg-muted rounded-lg' />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReceiptVerificationPage({
  params,
}: {
  params: Promise<{ receiptNumber: string }>
}) {
  const { receiptNumber } = use(params)

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ReceiptContent receiptNumber={receiptNumber} />
    </Suspense>
  )
}
