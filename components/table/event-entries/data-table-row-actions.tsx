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
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
  type RgbaValue,
} from '@/components/derived/color-picker'
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
import { useReceiptEmailBatchTracker } from '@/contexts/receipt-email-batch-tracker'

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
  const { trackBatch } = useReceiptEmailBatchTracker()
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

  const [emailSubject, setEmailSubject] = useState<string>('')
  const [subjectCustomized, setSubjectCustomized] = useState(false)

  const [templateConfig, setTemplateConfig] = useState<{
    primaryColor: string
    secondaryColor?: string
    footerText?: string
  }>({
    primaryColor: '#25345b',
    secondaryColor: undefined,
    footerText: undefined,
  })
  const entry = row.original as EventEntry
  const templateInfo = getAllTemplateInfo()

  useEffect(() => {
    if (!isSendOpen) return
    let cancelled = false

    const loadVaults = async () => {
      try {
        const vaults = await fetchSmtpVaults()
        if (!cancelled) setSmtpVaults(vaults)
      } catch {
        if (!cancelled) setSmtpVaults([])
      }
    }

    void loadVaults()
    return () => {
      cancelled = true
    }
  }, [isSendOpen])

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
          subject: emailSubject || undefined,
          config: {
            primaryColor: templateConfig.primaryColor,
            secondaryColor: templateConfig.secondaryColor,
            footerText: templateConfig.footerText,
          },
        }),
      }).then(async (response) => {
        const data = (await response.json().catch(() => null)) as {
          message?: string
          jobBatchId?: string
        } | null

        if (!response.ok) {
          throw new Error(data?.message || 'Failed to queue email')
        }

        setIsSendOpen(false)

        const batchId =
          typeof data?.jobBatchId === 'string' ? data.jobBatchId : undefined
        if (batchId) trackBatch(batchId)

        return { status: response.status, ...data }
      }),
      {
        loading: 'Queueing email...',
        success: (result) =>
          result?.message ||
          (result?.status === 202 ? 'Email queued' : 'Email sent'),
        error: (err) =>
          err instanceof Error ? err.message : 'Failed to queue email',
        finally: () => setIsSending(false),
      }
    )
  }

  const handleDownloadPdf = async () => {
    if (!entry.receiptNumber) return

    const url = new URL(
      `/api/receipts/${entry.receiptNumber}`,
      window.location.origin
    )
    url.searchParams.set('format', 'pdf')
    if (templateConfig.primaryColor) {
      url.searchParams.set('primaryColor', templateConfig.primaryColor)
    }
    if (templateConfig.secondaryColor) {
      url.searchParams.set('secondaryColor', templateConfig.secondaryColor)
    }
    if (templateConfig.footerText) {
      url.searchParams.set('footerText', templateConfig.footerText)
    }

    toast.promise(
      fetch(url.toString(), {
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

  const defaultSubject = useMemo(() => {
    const vaultName = (() => {
      if (selectedVaultId === 'default') {
        const defaultVault = smtpVaults.find((vault) => vault.isDefault)
        return defaultVault?.label || defaultVault?.email || 'Default Sender'
      }

      return (
        selectedSenderVault?.label || selectedSenderVault?.email || 'Sender'
      )
    })()

    return `${vaultName} - ${entry.receiptNumber}`
  }, [entry.receiptNumber, selectedSenderVault, selectedVaultId, smtpVaults])

  useEffect(() => {
    if (!isSendOpen) return
    if (subjectCustomized) return
    setEmailSubject(defaultSubject)
  }, [defaultSubject, isSendOpen, subjectCustomized])

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
      taxes: entry.taxes?.map((tax) => ({
        name: tax.name,
        rate: tax.rate,
        amount: tax.amount ?? 0,
      })),
      totalAmount: entry.totalAmount,
      paymentMethod: entry.paymentMethod,
      date:
        typeof entry.createdAt === 'string'
          ? entry.createdAt
          : entry.createdAt?.toISOString(),
      notes: entry.notes,
      config: {
        primaryColor: templateConfig.primaryColor,
        secondaryColor: templateConfig.secondaryColor,
        showQrCode: true,
        organizationName: 'Acquittance',
        footerText: templateConfig.footerText,
      },
    }
  }, [entry, templateConfig])

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
            {entry.emailSent ? 'Queue Email Again' : 'Queue Email'}
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

      <Dialog
        open={isSendOpen}
        onOpenChange={(open) => {
          setIsSendOpen(open)
          if (open) {
            setSubjectCustomized(false)
            setEmailSubject(defaultSubject)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entry.emailSent
                ? 'Queue Receipt Email Again'
                : 'Queue Receipt Email'}
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
              <FieldLabel>Subject</FieldLabel>
              <Input
                value={emailSubject}
                onChange={(e) => {
                  setSubjectCustomized(true)
                  setEmailSubject(e.target.value)
                }}
                placeholder={defaultSubject}
              />
            </div>

            <div className='space-y-3'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <FieldLabel>Primary Color</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-full justify-start gap-2 h-9'
                      >
                        <div
                          className='w-4 h-4 rounded border'
                          style={{
                            backgroundColor: templateConfig.primaryColor,
                          }}
                        />
                        {templateConfig.primaryColor}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-64 p-3' align='start'>
                      <ColorPicker
                        value={templateConfig.primaryColor || '#25345b'}
                        onChange={(rgba: RgbaValue) => {
                          const r = Math.round(rgba[0])
                          const g = Math.round(rgba[1])
                          const b = Math.round(rgba[2])
                          const hex = `#${r.toString(16).padStart(2, '0')}${g
                            .toString(16)
                            .padStart(2, '0')}${b
                            .toString(16)
                            .padStart(2, '0')}`
                          setTemplateConfig((prev) => ({
                            ...prev,
                            primaryColor: hex,
                          }))
                        }}
                        className='flex flex-col gap-2'
                      >
                        <ColorPickerSelection className='h-40 rounded-md' />
                        <ColorPickerHue />
                        <ColorPickerAlpha />
                        <ColorPickerFormat />
                      </ColorPicker>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className='space-y-1'>
                  <FieldLabel>Secondary Color</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-full justify-start gap-2 h-9'
                      >
                        <div
                          className='w-4 h-4 rounded border'
                          style={{
                            backgroundColor:
                              templateConfig.secondaryColor || '#000000',
                          }}
                        />
                        {templateConfig.secondaryColor || 'Not set'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-64 p-3' align='start'>
                      <ColorPicker
                        value={templateConfig.secondaryColor || '#000000'}
                        onChange={(rgba: RgbaValue) => {
                          const r = Math.round(rgba[0])
                          const g = Math.round(rgba[1])
                          const b = Math.round(rgba[2])
                          const hex = `#${r.toString(16).padStart(2, '0')}${g
                            .toString(16)
                            .padStart(2, '0')}${b
                            .toString(16)
                            .padStart(2, '0')}`
                          setTemplateConfig((prev) => ({
                            ...prev,
                            secondaryColor: hex,
                          }))
                        }}
                        className='flex flex-col gap-2'
                      >
                        <ColorPickerSelection className='h-40 rounded-md' />
                        <ColorPickerHue />
                        <ColorPickerAlpha />
                        <ColorPickerFormat />
                      </ColorPicker>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className='space-y-1'>
                <FieldLabel>Footer Text</FieldLabel>
                <Input
                  value={templateConfig.footerText || ''}
                  onChange={(e) =>
                    setTemplateConfig((prev) => ({
                      ...prev,
                      footerText: e.target.value || undefined,
                    }))
                  }
                  placeholder='Custom footer text'
                />
              </div>
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
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                setTemplateConfig({
                  primaryColor: '#25345b',
                  secondaryColor: undefined,
                  footerText: undefined,
                })
              }
            >
              Reset settings
            </Button>
            <Button variant='outline' onClick={() => setIsSendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? 'Queueing...' : 'Queue Email'}
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
