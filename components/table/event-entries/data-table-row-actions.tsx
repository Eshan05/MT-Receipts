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
  FileInputIcon,
} from 'lucide-react'
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
  DialogFooter,
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
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PDFViewer } from '@react-pdf/renderer'
import { getTemplateComponent, getAllTemplateInfo } from '@/lib/templates'
import { useMemo } from 'react'
import { IEvent } from '@/models/event.model'
import { EntryForm } from '@/components/forms/entry-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldLabel } from '@/components/ui/field'
import {
  fetchSmtpVaults,
  type SmtpVaultMeta,
} from '@/lib/tenants/smtp-vault-client'
import { SenderSelectView } from '@/components/navigation/sender-select-view'

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
  const [isSendOpen, setIsSendOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [smtpVaults, setSmtpVaults] = useState<SmtpVaultMeta[]>([])
  const [selectedTemplateSlug, setSelectedTemplateSlug] =
    useState<string>('professional')
  const [selectedVaultId, setSelectedVaultId] = useState<string>('default')
  const entry = row.original as EventEntry
  const templateInfo = getAllTemplateInfo()

  useEffect(() => {
    const loadVaults = async () => {
      try {
        const vaults = await fetchSmtpVaults()
        setSmtpVaults(vaults)
      } catch {
        setSmtpVaults([])
      }
    }

    loadVaults()
  }, [])

  const handleSendEmail = async () => {
    if (!entry.receiptNumber) return
    setIsSending(true)

    toast.promise(
      fetch(`/api/receipts/${entry.receiptNumber}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateSlug: selectedTemplateSlug,
          smtpVaultId:
            selectedVaultId === 'default' ? undefined : selectedVaultId,
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error('Failed to send email')
        setIsSendOpen(false)
        return response.json()
      }),
      {
        loading: 'Sending email...',
        success: 'Email sent successfully',
        error: 'Failed to send email',
        finally: () => setIsSending(false),
      }
    )
  }

  const handleDownloadPdf = async () => {
    if (!entry.receiptNumber) return
    toast.promise(
      fetch(`/api/receipts/${entry.receiptNumber}`, {
        headers: { Accept: 'application/pdf' },
      }).then(async (response) => {
        if (!response.ok) throw new Error('Failed to download PDF')
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt-${entry.receiptNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }),
      {
        loading: 'Generating PDF...',
        success: 'PDF downloaded',
        error: 'Failed to download PDF',
      }
    )
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

  const selectedSenderVault = useMemo(() => {
    if (selectedVaultId === 'default') return undefined
    return smtpVaults.find((vault) => vault.id === selectedVaultId)
  }, [smtpVaults, selectedVaultId])

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
        <DropdownMenuContent align='end' className='w-40'>
          <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
            <Eye className='mr-1' />
            View Receipt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsSendOpen(true)}>
            <Mail className='mr-1' />
            {entry.emailSent ? 'Resend Email' : 'Send Email'}
          </DropdownMenuItem>
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

      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entry.emailSent ? 'Resend Receipt Email' : 'Send Receipt Email'}
            </DialogTitle>
            <DialogDescription>
              Choose a template and sender for {entry.customer.email}.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-2'>
            <div className='space-y-1'>
              <FieldLabel>Template</FieldLabel>
              <Select
                value={selectedTemplateSlug}
                onValueChange={setSelectedTemplateSlug}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select template' />
                </SelectTrigger>
                <SelectContent>
                  {templateInfo.map((template) => (
                    <SelectItem key={template.slug} value={template.slug}>
                      <FileInputIcon />
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1'>
              <Select
                value={selectedVaultId}
                onValueChange={setSelectedVaultId}
              >
                <SelectTrigger className='w-full h-10!'>
                  {selectedSenderVault ? (
                    <SenderSelectView
                      vault={selectedSenderVault}
                      showDefaultBadge={false}
                    />
                  ) : (
                    <SelectValue placeholder='Use default sender' />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='default'>Use default sender</SelectItem>
                  {smtpVaults.map((vault) => (
                    <SelectItem key={vault.id} value={vault.id}>
                      <SenderSelectView vault={vault} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldLabel>Sender</FieldLabel>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsSendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Credenza open={isEditOpen} onOpenChange={setIsEditOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Edit Entry</CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody className='overflow-y-auto no-scrollbar'>
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
              className='bg-destructive! text-white hover:bg-destructive/90'
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
