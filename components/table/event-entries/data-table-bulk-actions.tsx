'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Mail,
  CheckCircle,
  RotateCcw,
  CreditCard,
  Download,
  Trash2,
  X,
  Loader2,
  Banknote,
  Smartphone,
  Wallet,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EventEntry } from './schema'
import { getAllTemplateInfo } from '@/lib/templates'
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

interface DataTableBulkActionsProps {
  selectedEntries: EventEntry[]
  onClearSelection: () => void
  onUpdate: () => void
  eventCode: string
}

export function DataTableBulkActions({
  selectedEntries,
  onClearSelection,
  onUpdate,
  eventCode,
}: DataTableBulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [smtpVaults, setSmtpVaults] = useState<SmtpVaultMeta[]>([])
  const [selectedTemplateSlug, setSelectedTemplateSlug] =
    useState<string>('professional')
  const [selectedVaultId, setSelectedVaultId] = useState<string>('default')
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

  const selectedCount = selectedEntries.length
  const receiptNumbers = selectedEntries.map((e) => e.receiptNumber)

  const hasPendingEmails = selectedEntries.some(
    (e) => !e.emailSent && !e.emailError
  )
  const hasUnsent = selectedEntries.some((e) => !e.emailSent)
  const hasNonRefunded = selectedEntries.some((e) => !e.refunded)
  const selectedSenderVault =
    selectedVaultId === 'default'
      ? undefined
      : smtpVaults.find((vault) => vault.id === selectedVaultId)

  const handleBulkAction = async (
    action: string,
    endpoint: string,
    method: string = 'POST',
    body?: Record<string, unknown>
  ) => {
    setIsProcessing(action)
    toast.promise(
      fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || { receiptNumbers }),
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || `Failed to ${action}`)
        }
        return response.json()
      }),
      {
        loading: `${action}...`,
        success: (result) => {
          onUpdate()
          onClearSelection()
          return result.message || `${action} completed`
        },
        error: (err) =>
          err instanceof Error ? err.message : `Failed to ${action}`,
        finally: () => setIsProcessing(null),
      }
    )
  }

  const handleSendEmails = (templateSlug?: string, smtpVaultId?: string) =>
    handleBulkAction('send emails', '/api/receipts/emails', 'POST', {
      filter: { receiptNumbers },
      templateSlug,
      smtpVaultId,
    })

  const handleMarkSent = () =>
    handleBulkAction('mark as sent', '/api/receipts', 'PATCH', {
      filter: { receiptNumbers },
      emailSent: true,
    })

  const handleMarkRefunded = () =>
    handleBulkAction('mark as refunded', '/api/receipts', 'PATCH', {
      filter: { receiptNumbers },
      refunded: true,
    })

  const handleDelete = () =>
    handleBulkAction('delete', '/api/receipts', 'DELETE', {
      receiptNumbers,
    })

  const handleChangePayment = (method: string) =>
    handleBulkAction('change payment method', '/api/receipts', 'PATCH', {
      filter: { receiptNumbers },
      paymentMethod: method,
    })

  const exportSelectedToCSV = () => {
    const csvData = selectedEntries.map((entry) => ({
      receiptNumber: entry.receiptNumber,
      customerName: entry.customer.name,
      customerEmail: entry.customer.email,
      customerPhone: entry.customer.phone || '',
      items: entry.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
      totalAmount: entry.totalAmount,
      paymentMethod: entry.paymentMethod,
      emailSent: entry.emailSent,
      refunded: entry.refunded || false,
      createdAt: new Date(entry.createdAt).toISOString(),
    }))

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) =>
        Object.values(row)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventCode}-selected-${selectedCount}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selectedCount} entries to CSV`)
  }

  const exportSelectedToJSON = () => {
    const jsonData = selectedEntries.map((entry) => ({
      receiptNumber: entry.receiptNumber,
      customer: entry.customer,
      items: entry.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.quantity * i.price,
      })),
      totalAmount: entry.totalAmount,
      paymentMethod: entry.paymentMethod,
      emailSent: entry.emailSent,
      refunded: entry.refunded || false,
      createdAt: entry.createdAt,
    }))

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventCode}-selected-${selectedCount}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selectedCount} entries to JSON`)
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50'>
        <div className='flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg'>
          <Badge variant='secondary' className='gap-1'>
            {selectedCount} <span className='max-md:hidden'>selected</span>
          </Badge>
          <Button
            size='sm'
            variant='ghost'
            className='h-7 px-2'
            onClick={onClearSelection}
          >
            <X className='w-3 h-3' />
            <span className='max-md:hidden'>Clear</span>
          </Button>

          <div className='w-px h-5 bg-border mx-1' />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-7 gap-1'
                disabled={!hasPendingEmails || isProcessing !== null}
              >
                {isProcessing === 'send emails' ? (
                  <Loader2 className='w-3 h-3 animate-spin' />
                ) : (
                  <Mail className='w-3 h-3' />
                )}
                <span className='max-md:hidden'>Email</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => setSendDialogOpen(true)}
                disabled={isProcessing === 'send emails'}
              >
                Configure Send
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size='sm'
            variant='outline'
            className='h-7 gap-1'
            onClick={handleMarkSent}
            disabled={!hasUnsent || isProcessing !== null}
          >
            {isProcessing === 'mark as sent' ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <CheckCircle className='w-3 h-3' />
            )}
            <span className='max-md:hidden'>Mark Sent</span>
          </Button>

          <Button
            size='sm'
            variant='outline'
            className='h-7 gap-1'
            onClick={handleMarkRefunded}
            disabled={!hasNonRefunded || isProcessing !== null}
          >
            {isProcessing === 'mark as refunded' ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <RotateCcw className='w-3 h-3' />
            )}
            <span className='max-md:hidden'>Mark Refunded</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-7 gap-1'
                disabled={isProcessing !== null}
              >
                <CreditCard className='w-3 h-3' />
                <span className='max-md:hidden'>Payment</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => handleChangePayment('cash')}
                disabled={isProcessing === 'change payment method'}
              >
                <Banknote className='w-3 h-3 mr-2' />
                Cash
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleChangePayment('upi')}
                disabled={isProcessing === 'change payment method'}
              >
                <Smartphone className='w-3 h-3 mr-2' />
                UPI
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleChangePayment('card')}
                disabled={isProcessing === 'change payment method'}
              >
                <CreditCard className='w-3 h-3 mr-2' />
                Card
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleChangePayment('other')}
                disabled={isProcessing === 'change payment method'}
              >
                <Wallet className='w-3 h-3 mr-2' />
                Other
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-7 gap-1'
                disabled={isProcessing !== null}
              >
                <Download className='w-3 h-3' />
                <span className='max-md:hidden'>Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={exportSelectedToCSV}>
                <FileSpreadsheet className='w-3 h-3 mr-2' />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportSelectedToJSON}>
                <FileJson className='w-3 h-3 mr-2' />
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size='sm'
            variant='destructive'
            className='h-7 gap-1'
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isProcessing !== null}
          >
            {isProcessing === 'delete' ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <Trash2 className='w-3 h-3' />
            )}
            <span className='max-md:hidden'>Delete</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Entries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedCount}{' '}
              receipt{selectedCount > 1 ? 's' : ''}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing === 'delete'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90'
              onClick={handleDelete}
              disabled={isProcessing === 'delete'}
            >
              {isProcessing === 'delete' ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Emails</DialogTitle>
            <DialogDescription>
              Choose template and sender for {selectedCount} selected entries.
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
                <FieldLabel>Sender</FieldLabel>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSendDialogOpen(false)
                handleSendEmails(
                  selectedTemplateSlug,
                  selectedVaultId === 'default' ? undefined : selectedVaultId
                )
              }}
              disabled={isProcessing === 'send emails'}
            >
              Send Emails
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
