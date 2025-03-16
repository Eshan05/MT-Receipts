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

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false)
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
    } catch (error) {
      console.error('Failed to send email:', error)
    }
  }

  const handleDownloadPdf = async () => {
    if (!entry.pdfUrl && !entry.receiptNumber) return
    try {
      const url = entry.pdfUrl || `/api/receipts/${entry.receiptNumber}/pdf`
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to download PDF:', error)
    }
  }

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
          <DropdownMenuItem onClick={() => setIsPdfPreviewOpen(true)}>
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

      <Dialog open={isPdfPreviewOpen} onOpenChange={setIsPdfPreviewOpen}>
        <DialogContent className='max-w-4xl max-h-[80vh]'>
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription>
              Receipt {entry.receiptNumber} for {entry.customer.name}
            </DialogDescription>
          </DialogHeader>
          {entry.pdfUrl ? (
            <iframe
              src={entry.pdfUrl}
              className='w-full h-[60vh] rounded border'
              title='Receipt PDF Preview'
            />
          ) : (
            <div className='flex items-center justify-center h-[40vh] text-muted-foreground'>
              <div className='text-center'>
                <p>PDF not available for preview</p>
                <p className='text-sm'>Generate the receipt first</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
