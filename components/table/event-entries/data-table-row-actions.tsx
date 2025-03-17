'use client'

import { Row } from '@tanstack/react-table'
import {
  MoreHorizontal,
  Eye,
  Mail,
  Download,
  RotateCcw,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EventEntry } from './schema'
import { useState } from 'react'
import { toast } from 'sonner'
import { PDFViewer } from '@react-pdf/renderer'
import { getTemplateComponent, getAllTemplateInfo } from '@/lib/templates'
import { useMemo } from 'react'
import { IEvent } from '@/models/event.model'
import { EntryForm } from '@/app/(root)/events/[code]/_components/entry-form'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  event: IEvent
  onUpdate?: () => void
}

export function DataTableRowActions<TData>({
  row,
  event,
  onUpdate,
}: DataTableRowActionsProps<TData>) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const entry = row.original as EventEntry
  const templateInfo = getAllTemplateInfo()

  const handleSendEmail = async (templateSlug?: string) => {
    if (!entry.receiptNumber) return
    try {
      const response = await fetch(
        `/api/receipts/${entry.receiptNumber}/send-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateSlug }),
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

  const handleDelete = async () => {
    if (!entry.receiptNumber) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/receipts/${entry.receiptNumber}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete receipt')
      toast.success('Receipt deleted successfully')
      setIsDeleteOpen(false)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to delete receipt')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSuccess = () => {
    setIsEditOpen(false)
    onUpdate?.()
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
            <Eye className='mr-1' />
            View Receipt
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Mail className='mr-1' />
              {entry.emailSent ? 'Resend Email' : 'Send Email'}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {templateInfo.map((template) => (
                <DropdownMenuItem
                  key={template.slug}
                  onClick={() => handleSendEmail(template.slug)}
                >
                  {template.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={handleDownloadPdf}>
            <Download className='mr-1' />
            Download PDF
          </DropdownMenuItem>
          {!entry.refunded && (
            <>
              <DropdownMenuSeparator className='my-0.5' />
              <DropdownMenuItem
                onClick={() => setIsEditOpen(true)}
                className=''
              >
                <Pencil className='mr-1' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteOpen(true)}
                className='text-destructive'
              >
                <Trash2 className='mr-1' />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator className='my-0.5' />
              <DropdownMenuItem className='text-yellow-500'>
                <RotateCcw className='mr-1' />
                Mark Refunded
              </DropdownMenuItem>
            </>
          )}
          {entry.refunded && (
            <>
              <DropdownMenuSeparator className='my-0.5' />
              <DropdownMenuItem
                onClick={() => setIsEditOpen(true)}
                className=''
              >
                <Pencil className='mr-1' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteOpen(true)}
                className='text-destructive'
              >
                <Trash2 className='mr-1' />
                Delete
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

      <Credenza open={isEditOpen} onOpenChange={setIsEditOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Edit Entry</CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody>
            <EntryForm
              event={event}
              editEntry={entry}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditOpen(false)}
            />
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete receipt{' '}
              <span className='font-mono font-medium'>
                {entry.receiptNumber}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90'
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
