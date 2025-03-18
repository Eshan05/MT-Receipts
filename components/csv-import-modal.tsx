'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { downloadCSVTemplate, csvTemplateFields } from '@/lib/csv-template'
import {
  parseCSV,
  checkDuplicates,
  type ParsedCSVRow,
  type CSVValidationResult,
  type DuplicateInfo,
} from '@/lib/csv-parser'
import { IEvent } from '@/models/event.model'

interface CSVImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: IEvent
  existingEntries: {
    customerEmail: string
    items: { name: string }[]
  }[]
  onComplete: () => void
}

type Step = 'upload' | 'preview' | 'confirm' | 'importing'

interface RowSelection {
  [key: number]: boolean
}

export function CSVImportModal({
  open,
  onOpenChange,
  event,
  existingEntries,
  onComplete,
}: CSVImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [validationResult, setValidationResult] =
    useState<CSVValidationResult | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [rowSelection, setRowSelection] = useState<RowSelection>({})
  const [overrideDuplicates, setOverrideDuplicates] = useState<Set<number>>(
    new Set()
  )
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
  }>({ success: 0, failed: 0 })
  const [sendEmails, setSendEmails] = useState(false)

  const resetState = useCallback(() => {
    setStep('upload')
    setValidationResult(null)
    setDuplicates([])
    setRowSelection({})
    setOverrideDuplicates(new Set())
    setImportProgress({ current: 0, total: 0 })
    setImportResults({ success: 0, failed: 0 })
    setSendEmails(false)
  }, [])

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const result = parseCSV(text, event.items)
        setValidationResult(result)

        if (result.rows.length > 0) {
          const dupes = checkDuplicates(result.rows, existingEntries)
          setDuplicates(dupes)

          // Initialize selection - all valid rows selected by default
          const initialSelection: RowSelection = {}
          result.rows.forEach((row) => {
            const hasError = result.errors.some(
              (e) => e.rowNumber === row.rowNumber
            )
            const isDupe = dupes.some((d) => d.rowNumber === row.rowNumber)
            initialSelection[row.rowNumber] = !hasError && !isDupe
          })
          setRowSelection(initialSelection)
        }

        setStep('preview')
      }
      reader.readAsText(file)
    },
    [existingEntries]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.csv')) {
        handleFileUpload(file)
      } else {
        toast.error('Please upload a CSV file')
      }
    },
    [handleFileUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload]
  )

  const toggleRow = (rowNumber: number) => {
    setRowSelection((prev) => ({
      ...prev,
      [rowNumber]: !prev[rowNumber],
    }))
  }

  const toggleDuplicateOverride = (rowNumber: number) => {
    setOverrideDuplicates((prev) => {
      const next = new Set(prev)
      if (next.has(rowNumber)) {
        next.delete(rowNumber)
      } else {
        next.add(rowNumber)
      }
      return next
    })
    // Also select the row when overriding
    setRowSelection((prev) => ({
      ...prev,
      [rowNumber]: true,
    }))
  }

  const getSelectedRows = (): ParsedCSVRow[] => {
    if (!validationResult) return []
    return validationResult.rows.filter((row) => rowSelection[row.rowNumber])
  }

  const getRowStatus = (
    row: ParsedCSVRow
  ): { type: 'valid' | 'error' | 'duplicate' | 'warning'; label: string } => {
    const hasError = validationResult?.errors.some(
      (e) => e.rowNumber === row.rowNumber
    )
    if (hasError) return { type: 'error', label: 'Error' }

    const hasWarning = validationResult?.warnings.some(
      (w) => w.rowNumber === row.rowNumber
    )
    if (hasWarning) return { type: 'warning', label: 'Warning' }

    const dupe = duplicates.find((d) => d.rowNumber === row.rowNumber)
    if (dupe) {
      if (overrideDuplicates.has(row.rowNumber)) {
        return { type: 'duplicate', label: 'Override' }
      }
      return { type: 'duplicate', label: 'Duplicate' }
    }

    return { type: 'valid', label: 'New' }
  }

  const calculateTotal = (): number => {
    return getSelectedRows().reduce(
      (sum, row) =>
        sum + row.items.reduce((s, i) => s + i.quantity * i.price, 0),
      0
    )
  }

  const handleImport = async (shouldSendEmails: boolean) => {
    const rows = getSelectedRows()
    if (rows.length === 0) {
      toast.error('No rows selected for import')
      return
    }

    setSendEmails(shouldSendEmails)
    setStep('importing')
    setImportProgress({ current: 0, total: rows.length })
    let success = 0
    let failed = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const response = await fetch('/api/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event._id,
            customer: {
              name: row.customerName,
              email: row.customerEmail,
              phone: row.customerPhone,
              address: row.customerAddress,
            },
            items: row.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
            })),
            totalAmount: row.items.reduce(
              (s, i) => s + i.quantity * i.price,
              0
            ),
            paymentMethod: row.paymentMethod,
            emailSent: shouldSendEmails ? false : row.emailSent,
            sendEmail: shouldSendEmails,
            notes: row.notes,
          }),
        })

        if (response.ok) {
          success++
        } else {
          failed++
        }
      } catch {
        failed++
      }

      setImportProgress({ current: i + 1, total: rows.length })
    }

    setImportResults({ success, failed })

    if (success > 0) {
      toast.success(`Successfully imported ${success} entries`)
      onComplete()
    }

    if (failed > 0) {
      toast.error(`Failed to import ${failed} entries`)
    }

    // Close modal after short delay
    setTimeout(() => {
      onOpenChange(false)
      resetState()
    }, 2000)
  }

  const selectedCount = Object.values(rowSelection).filter(Boolean).length
  const validRowsCount =
    validationResult?.rows.filter((row) => {
      const hasError = validationResult.errors.some(
        (e) => e.rowNumber === row.rowNumber
      )
      const isDupe = duplicates.some((d) => d.rowNumber === row.rowNumber)
      const hasWarning = validationResult.warnings.some(
        (w) => w.rowNumber === row.rowNumber
      )
      return !hasError && !isDupe && !hasWarning
    }).length || 0
  const warningRowsCount =
    validationResult?.rows.filter((row) => {
      return validationResult.warnings.some(
        (w) => w.rowNumber === row.rowNumber
      )
    }).length || 0

  const formatPaymentMethod = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      card: 'Card',
      other: 'Other',
    }
    return labels[method] || method
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className='overflow-hidden max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FileSpreadsheet className='w-5 h-5' />
            Import Entries from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import entries for {event.name}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className='space-y-4 py-4'>
            <Button
              variant='outline'
              className='w-full gap-2'
              onClick={() => downloadCSVTemplate(event.eventCode, event.items)}
            >
              <Download className='w-4 h-4' />
              Download Template
            </Button>

            <div
              className='border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors'
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <Upload className='size-10 mx-auto mb-4 text-muted-foreground' />
              <p className='text-base font-medium'>Drop your CSV file here</p>
              <p className='text-sm text-muted-foreground'>Click to browse</p>
              <input
                id='csv-input'
                type='file'
                accept='.csv'
                className='hidden'
                onChange={handleFileSelect}
              />
            </div>

            <div className='bg-muted/50 rounded-lg p-4'>
              <p className='text-sm font-medium mb-2'>CSV Format:</p>
              <div className='grid grid-cols-2 gap-0.5 text-xs'>
                {csvTemplateFields.slice(0, 6).map((field) => (
                  <div key={field.key} className='flex items-center gap-1'>
                    <span className=''>{field.label}</span>
                    {field.required && (
                      <span className='text-destructive'>*</span>
                    )}
                  </div>
                ))}
              </div>
              <div className='mt-2 pt-2 border-t'>
                <p className='text-xs font-medium text-muted-foreground'>
                  Items format:
                </p>
                <p className='text-2xs text-muted-foreground'>
                  Separate multiple items with semicolons
                </p>
                <code className='bg-muted/50 px-2 py-1.5 mt-2 rounded text-2xs leading-4 block text-foreground/80'>
                  Item Name x2 @₹100; Another Item x1 @₹50
                  <br />
                  Shirt x1 @₹499; Mug x2 @₹299
                  <br />
                  Badge x30 @₹20; Poster x5 @₹150
                  <br />
                  Like so...
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && validationResult && (
          <div className='space-y-3 w-full overflow-x-auto no-scrollbar'>
            <div className='flex items-center gap-2 text-sm'>
              <Badge variant='secondary' className='gap-1'>
                {validationResult.rows.length} parsed
              </Badge>
              <Badge className='bg-green-500/10 text-green-600 border-green-500/30 gap-1'>
                <CheckCircle2 className='w-3 h-3' />
                {validRowsCount} valid
              </Badge>
              {validationResult.errors.length > 0 && (
                <Badge className='bg-red-500/10 text-red-600 border-red-500/30 gap-1'>
                  <XCircle className='w-3 h-3' />
                  {validationResult.errors.length} errors
                </Badge>
              )}
              {duplicates.length > 0 && (
                <Badge className='bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1'>
                  <AlertTriangle className='w-3 h-3' />
                  {duplicates.length} duplicates
                </Badge>
              )}
              {validationResult.warnings.length > 0 && (
                <Badge className='bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1'>
                  <AlertCircle className='w-3 h-3' />
                  {validationResult.warnings.length} warnings
                </Badge>
              )}
            </div>

            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  const selection: RowSelection = {}
                  validationResult.rows.forEach((row) => {
                    const hasError = validationResult.errors.some(
                      (e) => e.rowNumber === row.rowNumber
                    )
                    const isDupe = duplicates.some(
                      (d) => d.rowNumber === row.rowNumber
                    )
                    const hasWarning = validationResult.warnings.some(
                      (w) => w.rowNumber === row.rowNumber
                    )
                    selection[row.rowNumber] =
                      !hasError && !isDupe && !hasWarning
                  })
                  setRowSelection(selection)
                }}
              >
                Select Valid
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  const selection: RowSelection = {}
                  validationResult.rows.forEach((row) => {
                    selection[row.rowNumber] = true
                  })
                  setRowSelection(selection)
                }}
              >
                Select All
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setRowSelection({})}
              >
                Clear
              </Button>
            </div>

            <ScrollArea className='h-72 rounded border no-scrollbar'>
              <div className='w-full no-scrollbar'>
                <Table scrollbar={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-8 sticky top-0 bg-background'></TableHead>
                      <TableHead className='w-10 sticky top-0 bg-background'>
                        #
                      </TableHead>
                      <TableHead className='sticky top-0 bg-background'>
                        Customer
                      </TableHead>
                      <TableHead className='sticky top-0 bg-background'>
                        Email
                      </TableHead>
                      <TableHead className='sticky top-0 bg-background'>
                        Items
                      </TableHead>
                      <TableHead className='sticky top-0 bg-background'>
                        Payment
                      </TableHead>
                      <TableHead className='sticky top-0 bg-background'>
                        Status
                      </TableHead>
                      <TableHead className='sticky top-0 bg-background'>
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResult.rows.map((row) => {
                      const status = getRowStatus(row)
                      const hasError = status.type === 'error'
                      const hasWarning = status.type === 'warning'
                      const isDupe = status.type === 'duplicate'
                      const isOverridden = overrideDuplicates.has(row.rowNumber)
                      const rowErrors = validationResult.errors.filter(
                        (e) => e.rowNumber === row.rowNumber
                      )
                      const rowWarnings = validationResult.warnings.filter(
                        (e) => e.rowNumber === row.rowNumber
                      )
                      const invalidItems = validationResult.invalidItems.get(
                        row.rowNumber
                      )

                      const paymentConfig: Record<
                        string,
                        { style: string; icon: typeof Banknote }
                      > = {
                        cash: {
                          style: 'text-green-600',
                          icon: Banknote,
                        },
                        upi: {
                          style: 'text-purple-600',
                          icon: Smartphone,
                        },
                        card: {
                          style: 'text-blue-600',
                          icon: CreditCard,
                        },
                        other: {
                          style: 'text-gray-600',
                          icon: Wallet,
                        },
                      }
                      const pConfig =
                        paymentConfig[row.paymentMethod] || paymentConfig.other
                      const PaymentIcon = pConfig.icon

                      return (
                        <TableRow
                          key={row.rowNumber}
                          className={cn(
                            hasError && 'bg-red-500/5',
                            hasWarning && 'bg-orange-500/5',
                            isDupe && !isOverridden && 'bg-yellow-500/5'
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={rowSelection[row.rowNumber] || false}
                              onCheckedChange={() => toggleRow(row.rowNumber)}
                              disabled={hasError}
                            />
                          </TableCell>
                          <TableCell className='font-mono text-xs text-muted-foreground'>
                            {row.rowNumber}
                          </TableCell>
                          <TableCell>
                            <span className='text-xs truncate max-w-24 block'>
                              {row.customerName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='text-xs truncate max-w-32 block text-muted-foreground'>
                              {row.customerEmail}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='text-xs'>
                              <div className='flex items-center gap-1'>
                                <Package className='w-3 h-3 text-muted-foreground' />
                                <span className='text-xs'>
                                  {row.items.length} item
                                  {row.items.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline' className={cn('gap-1.5')}>
                              <PaymentIcon
                                className={`w-3 h-3 ${pConfig.style}`}
                              />
                              <span className='text-xs'>
                                {formatPaymentMethod(row.paymentMethod)}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {status.type === 'valid' && (
                              <Badge className='bg-green-500/10 text-green-600 border-green-500/30 gap-1'>
                                <CheckCircle2 className='w-3 h-3' />
                                New
                              </Badge>
                            )}
                            {status.type === 'error' && (
                              <Badge className='bg-red-500/10 text-red-600 border-red-500/30 gap-1'>
                                <XCircle className='w-3 h-3' />
                                Error
                              </Badge>
                            )}
                            {status.type === 'warning' && (
                              <Badge className='bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1'>
                                <AlertCircle className='w-3 h-3' />
                                Warning
                              </Badge>
                            )}
                            {status.type === 'duplicate' && (
                              <Badge
                                className={cn(
                                  'gap-1',
                                  isOverridden
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                    : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                                )}
                              >
                                <AlertTriangle className='w-3 h-3' />
                                {isOverridden ? 'Override' : 'Duplicate'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasError && rowErrors.length > 0 && (
                              <span className='text-xs text-red-600'>
                                {rowErrors[0].message}
                              </span>
                            )}
                            {status.type === 'warning' && invalidItems && (
                              <span className='text-xs text-orange-600'>
                                Unknown: {invalidItems.join(', ')}
                              </span>
                            )}
                            {isDupe && !isOverridden && (
                              <Button
                                size='sm'
                                variant='ghost'
                                className='h-6 text-xs text-white hover:text-blue-700'
                                onClick={() =>
                                  toggleDuplicateOverride(row.rowNumber)
                                }
                              >
                                Override
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation='horizontal' />
            </ScrollArea>

            <div className='flex justify-between'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setStep('upload')}
              >
                Back
              </Button>
              <Button
                size='sm'
                disabled={selectedCount === 0}
                onClick={() => setStep('confirm')}
              >
                Continue with {selectedCount} entries
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className='space-y-3 py-2'>
            <div className='bg-muted/30 rounded-lg p-2 space-y-1'>
              <div className='flex justify-between items-center text-sm'>
                <span className='text-muted-foreground'>Entries to import</span>
                <span className='font-semibold'>{selectedCount}</span>
              </div>
              <div className='flex justify-between items-center text-sm'>
                <span className='text-muted-foreground'>Total amount</span>
                <span className='font-semibold'>
                  ₹{calculateTotal().toLocaleString()}
                </span>
              </div>
              {overrideDuplicates.size > 0 && (
                <div className='flex justify-between items-center text-sm'>
                  <span className='text-muted-foreground'>
                    Duplicates overridden
                  </span>
                  <Badge className='bg-blue-500/10 text-blue-600 border-blue-500/30'>
                    {overrideDuplicates.size}
                  </Badge>
                </div>
              )}
            </div>

            <div className='flex items-center gap-1 flex-wrap'>
              {['cash', 'upi', 'card', 'other'].map((method) => {
                const count = getSelectedRows().filter(
                  (r) => r.paymentMethod === method
                ).length
                if (count === 0) return null

                const paymentConfig: Record<
                  string,
                  { style: string; icon: typeof Banknote }
                > = {
                  cash: {
                    style: 'text-green-600',
                    icon: Banknote,
                  },
                  upi: {
                    style: 'text-purple-600',
                    icon: Smartphone,
                  },
                  card: {
                    style: 'text-blue-600',
                    icon: CreditCard,
                  },
                  other: {
                    style: 'text-gray-600',
                    icon: Wallet,
                  },
                }
                const config = paymentConfig[method]
                const Icon = config.icon

                return (
                  <Badge
                    key={method}
                    variant='outline'
                    className={cn('gap-1.5')}
                  >
                    <Icon className={`w-3 h-3 ${config.style}`} />
                    <span className='text-xs'>
                      {formatPaymentMethod(method)}
                    </span>
                    <span className='text-xs'>×{count}</span>
                  </Badge>
                )
              })}
            </div>

            <div className='rounded-lg p-2 flex gap-2'>
              <AlertTriangle className='size-4 text-yellow-600 shrink-0 mt-0.5' />
              <div className='text-sm'>
                <p className='font-medium text-yellow-600'>Note:</p>
                <ul className='text-2xs text-muted-foreground mt-1 space-y-0.5 -ml-1'>
                  <li>• &nbsp;Receipts will be generated automatically</li>
                  <li>
                    • &nbsp;Choose "Save Only" to import without sending emails
                  </li>
                  <li>• &nbsp;The second button imports and send receipts</li>
                  <li>• &nbsp;This action cannot be undone</li>
                </ul>
              </div>
            </div>

            <div className='flex justify-between gap-2 pt-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setStep('preview')}
              >
                Back
              </Button>
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => handleImport(false)}
                >
                  Save Only
                </Button>
                <Button size='sm' onClick={() => handleImport(true)}>
                  Save & Send Emails
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className='space-y-4 py-6 text-center'>
            <Loader2 className='w-10 h-10 mx-auto animate-spin text-primary' />
            <p className='font-medium'>Importing entries...</p>
            <Progress
              value={(importProgress.current / importProgress.total) * 100}
              className='w-full'
            />
            <p className='text-sm text-muted-foreground'>
              {importProgress.current} of {importProgress.total}
            </p>
            {sendEmails && (
              <p className='text-xs text-muted-foreground'>
                Emails will be sent after import
              </p>
            )}
            <div className='flex justify-center gap-4'>
              {importResults.success > 0 && (
                <Badge className='bg-green-500/10 text-green-600 border-green-500/30 gap-1'>
                  <CheckCircle2 className='w-3 h-3' />
                  {importResults.success} success
                </Badge>
              )}
              {importResults.failed > 0 && (
                <Badge className='bg-red-500/10 text-red-600 border-red-500/30 gap-1'>
                  <XCircle className='w-3 h-3' />
                  {importResults.failed} failed
                </Badge>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
