'use client'

import { Row } from '@tanstack/react-table'
import { MoreHorizontal, Eye, Mail, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EventEntry } from './schema'
import { useState } from 'react'
import { toast } from 'sonner'
import { PDFViewer } from '@react-pdf/renderer'
import { getTemplateComponent } from '@/lib/templates'
import { useMemo } from 'react'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const entry = row.original as EventEntry

  const handleSendEmail = async () => {
    if (!entry.receiptNumber) return
    try {
      const response = await fetch(
        `/api/receipts/${entry.receiptNumber}/send-email`,
        {
          method: 'POST',
        }
      )
      if (!response.ok) throw new Error('Failed to send email')
      toast.success('Email sent successfully')
    } catch (error) {
      toast.error('Failed to send email')
    }
  }

  const handleDownloadPdf = async () => {
    if (!entry.receiptNumber) return
    try {
      const response = await fetch(`/api/receipts/${entry.receiptNumber}/pdf`)
      if (!response.ok) throw new Error('Failed to download PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${entry.receiptNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Failed to download PDF')
    }
  }

  const TemplateComponent = useMemo(() => {
    return getTemplateComponent('professional')
  }, [])

  const templateProps = useMemo(() => {
    return {
      receiptNumber: entry.receiptNumber,
      customer: entry.customer,
      event: {
        _id: '',
        name: '',
        code: '',
        type: 'other' as const,
      },
      items: entry.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total ?? item.quantity * item.price,
      })),
      totalAmount: entry.totalAmount,
      paymentMethod: entry.paymentMethod,
      date:
        typeof entry.createdAt === 'string'
          ? entry.createdAt
          : entry.createdAt?.toISOString(),
      notes: entry.notes,
      config: {
        primaryColor: '#25345b',
        showQrCode: true,
        organizationName: 'ACES',
      },
    }
  }, [entry])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          >
            <MoreHorizontal className='size-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[160px]'>
          <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
            <Eye className='size-4 mr-2' />
            View Receipt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSendEmail}>
            <Mail className='size-4 mr-2' />
            {entry.emailSent ? 'Resend Email' : 'Send Email'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadPdf}>
            <Download className='size-4 mr-2' />
            Download PDF
          </DropdownMenuItem>
          {!entry.refunded && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className='text-orange-600'>
                <RotateCcw className='size-4 mr-2' />
                Mark Refunded
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh]'>
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription>
              Receipt {entry.receiptNumber} for {entry.customer.name}
            </DialogDescription>
          </DialogHeader>
          <div className='w-full aspect-[1/1.414] bg-gray-100 rounded'>
            <PDFViewer width='100%' height='100%' showToolbar={false}>
              <TemplateComponent {...templateProps} />
            </PDFViewer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
