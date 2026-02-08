'use client'

import { AutosizeTextarea } from '@/components/ui/autoresize-textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from '@/components/ui/credenza'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerFormat,
  type RgbaValue,
} from '@/components/derived/color-picker'

import {
  receiptSchema,
  type ReceiptFormValues,
  type TemplateConfigFormValues,
} from '@/lib/schemas/receipt'
import type {
  TemplateInfo,
  TemplateProps,
  TemplateConfig,
} from '@/lib/templates/types'
import { getTemplateComponent } from '@/lib/templates'
import { IEvent } from '@/models/event.model'

import { zodResolver } from '@hookform/resolvers/zod'
import { PDFViewer } from '@react-pdf/renderer'
import {
  AtSign,
  Calendar,
  CreditCard,
  Download,
  Eye,
  FileText,
  Hash,
  Image,
  Loader2,
  MapPin,
  Package,
  Palette,
  Phone,
  Plus,
  QrCode,
  Settings2,
  Sparkles,
  Trash2,
  User,
  User2Icon,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  fetchSmtpVaults,
  type SmtpVaultMeta,
} from '@/lib/tenants/smtp-vault-client'
import { SenderSelectView } from '@/components/navigation/sender-select-view'
import { useAuth } from '@/contexts/AuthContext'

interface ReceiptFormProps {
  templates: TemplateInfo[]
  preselectedEventId?: string | null
}

const defaultConfig: TemplateConfig = {
  primaryColor: '#25345b',
  showQrCode: true,
  organizationName: 'Eshan',
  logoUrl: 'https://avatars.githubusercontent.com/u/140711476?v=4',
}

const defaultTemplateProps: TemplateProps = {
  receiptNumber: 'RCP-0000-0000',
  customer: {
    name: 'Customer Name',
    email: 'customer@email.com',
    phone: '+91 0000000000',
    address: 'Address',
  },
  event: {
    name: 'Event Name',
    code: 'EVT000',
    type: 'other',
    location: 'Location',
    startDate: 'January 1, 2025',
  },
  items: [
    {
      name: 'Item Name',
      description: 'Description',
      quantity: 1,
      price: 100,
      total: 100,
    },
  ],
  totalAmount: 100,
  paymentMethod: 'cash',
  date: 'January 1, 2025',
  config: defaultConfig,
  notes: '',
}

export function ReceiptForm({
  templates,
  preselectedEventId,
}: ReceiptFormProps) {
  const { currentOrganization } = useAuth()
  const [events, setEvents] = useState<IEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [baseConfig, setBaseConfig] = useState<TemplateConfig>(defaultConfig)
  const [config, setConfig] = useState<TemplateConfig>(defaultConfig)
  const [smtpVaults, setSmtpVaults] = useState<SmtpVaultMeta[]>([])
  const [selectedSmtpVaultId, setSelectedSmtpVaultId] = useState<string>('')

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      eventId: preselectedEventId || '',
      templateSlug: 'professional',
      customer: {
        name: '',
        email: '',
        phone: '',
        address: '',
      },
      items: [
        {
          id: crypto.randomUUID(),
          name: '',
          description: '',
          quantity: 1,
          price: 0,
          total: 0,
        },
      ],
      taxes: [],
      totalAmount: 0,
      paymentMethod: 'cash',
      notes: '',
      config: defaultConfig,
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const {
    fields: taxFields,
    append: appendTax,
    remove: removeTax,
  } = useFieldArray({
    control: form.control,
    name: 'taxes',
  })

  const selectedEventId = form.watch('eventId')
  const watchedItems = form.watch('items')
  const watchedTaxes = form.watch('taxes')
  const selectedTemplate = form.watch('templateSlug')
  const watchedCustomer = form.watch('customer')
  const watchedPaymentMethod = form.watch('paymentMethod')
  const watchedNotes = form.watch('notes')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (response.ok) {
          const data = await response.json()
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoadingEvents(false)
      }
    }
    fetchEvents()
  }, [])

  useEffect(() => {
    if (!currentOrganization?.slug) return

    let cancelled = false

    const loadOrganizationDefaults = async () => {
      try {
        const res = await fetch(
          `/api/organizations/${currentOrganization.slug}`
        )
        if (!res.ok) return

        const data = await res.json()

        const logoUrlRaw =
          typeof data?.logoUrl === 'string' ? data.logoUrl.trim() : ''
        const organizationNameRaw =
          typeof data?.settings?.organizationName === 'string'
            ? data.settings.organizationName.trim()
            : typeof data?.name === 'string'
              ? data.name.trim()
              : ''
        const websiteUrlRaw =
          typeof data?.settings?.websiteUrl === 'string'
            ? data.settings.websiteUrl.trim()
            : ''
        const contactEmailRaw =
          typeof data?.settings?.contactEmail === 'string'
            ? data.settings.contactEmail.trim()
            : ''

        const nextBaseConfig: TemplateConfig = {
          // primaryColor:
          //   typeof data?.settings?.primaryColor === 'string' &&
          //   data.settings.primaryColor.trim()
          //     ? data.settings.primaryColor
          //     : defaultConfig.primaryColor,
          primaryColor: defaultConfig.primaryColor,
          secondaryColor:
            typeof data?.settings?.secondaryColor === 'string' &&
            data.settings.secondaryColor.trim()
              ? data.settings.secondaryColor
              : undefined,
          showQrCode: defaultConfig.showQrCode,
          organizationName:
            organizationNameRaw || defaultConfig.organizationName,
          logoUrl: logoUrlRaw || undefined,
          websiteUrl: websiteUrlRaw || undefined,
          contactEmail: contactEmailRaw || undefined,
        }

        if (cancelled) return

        setBaseConfig(nextBaseConfig)
        setConfig((previous) => {
          const looksUntouched =
            previous.primaryColor === defaultConfig.primaryColor &&
            previous.secondaryColor === defaultConfig.secondaryColor &&
            previous.showQrCode === defaultConfig.showQrCode &&
            previous.organizationName === defaultConfig.organizationName &&
            previous.logoUrl === defaultConfig.logoUrl

          return looksUntouched ? nextBaseConfig : previous
        })
      } catch {
        // ignore; keep defaults
      }
    }

    void loadOrganizationDefaults()
    return () => {
      cancelled = true
    }
  }, [currentOrganization?.slug])

  const loadSmtpVaults = useCallback(async () => {
    try {
      const vaults = await fetchSmtpVaults()
      setSmtpVaults(vaults)
      const defaultVault = vaults.find((vault) => vault.isDefault)
      setSelectedSmtpVaultId(defaultVault?.id || '')
    } catch (error) {
      console.error('Error loading SMTP vaults:', error)
      toast.error('Failed to load email vaults')
    }
  }, [])

  useEffect(() => {
    if (configOpen) {
      loadSmtpVaults()
    }
  }, [configOpen, loadSmtpVaults])

  const selectedEvent = useMemo(() => {
    return events.find((e) => e._id?.toString() === selectedEventId)
  }, [events, selectedEventId])

  const selectedSenderVault = useMemo(() => {
    if (!selectedSmtpVaultId) return undefined
    return smtpVaults.find((vault) => vault.id === selectedSmtpVaultId)
  }, [smtpVaults, selectedSmtpVaultId])

  useEffect(() => {
    const subtotal = watchedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    )

    const taxTotal = (watchedTaxes || []).reduce((sum, tax) => {
      const rate = Number(tax?.rate) || 0
      if (!Number.isFinite(rate) || rate <= 0) return sum
      return sum + (subtotal * rate) / 100
    }, 0)

    form.setValue('totalAmount', subtotal + taxTotal)
  }, [watchedItems, watchedTaxes, form])

  useEffect(() => {
    if (selectedEvent && selectedEvent.items.length > 0) {
      const existingItems = form.getValues('items')
      const hasUserItems = existingItems.some(
        (item) => item.name && item.name !== ''
      )

      if (!hasUserItems || existingItems.length === 1) {
        const eventItems = selectedEvent.items.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name,
          description: item.description || '',
          quantity: 1,
          price: item.price,
          total: item.price,
        }))
        form.setValue('items', eventItems)
      }
    }
  }, [selectedEvent, form])

  useEffect(() => {
    form.setValue('config', config)
  }, [config, form])

  const updateItemTotal = useCallback(
    (index: number) => {
      const quantity = form.getValues(`items.${index}.quantity`)
      const price = form.getValues(`items.${index}.price`)
      const total = quantity * price
      form.setValue(`items.${index}.total`, total)
    },
    [form]
  )

  const generateReceiptNumber = useCallback(() => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(1000 + Math.random() * 9000)
    return `RCP-${year}${month}-${random}`
  }, [])

  const buildTemplateProps = useCallback((): TemplateProps => {
    const date = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const items = watchedItems.map((item) => ({
      name: item.name || 'Item',
      description: item.description,
      quantity: item.quantity || 1,
      price: item.price || 0,
      total: (item.quantity || 1) * (item.price || 0),
    }))

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxLines = (watchedTaxes || [])
      .filter((tax) => !!tax?.name)
      .map((tax) => {
        const rate = Number(tax.rate) || 0
        const amount = Number.isFinite(rate) ? (subtotal * rate) / 100 : 0
        return {
          name: tax.name,
          rate,
          amount,
        }
      })

    const taxTotal = taxLines.reduce((sum, tax) => sum + tax.amount, 0)
    const totalAmount = subtotal + taxTotal

    return {
      receiptNumber: generateReceiptNumber(),
      customer: {
        name: watchedCustomer.name || defaultTemplateProps.customer.name,
        email: watchedCustomer.email || defaultTemplateProps.customer.email,
        phone: watchedCustomer.phone || undefined,
        address: watchedCustomer.address || undefined,
      },
      event: {
        name: selectedEvent?.name || defaultTemplateProps.event.name,
        code: selectedEvent?.eventCode || defaultTemplateProps.event.code,
        type: selectedEvent?.type || 'other',
        location: selectedEvent?.location || undefined,
        startDate: selectedEvent?.startDate
          ? new Date(selectedEvent.startDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
          : undefined,
        endDate: selectedEvent?.endDate
          ? new Date(selectedEvent.endDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
          : undefined,
      },
      items:
        items.length > 0 && items.some((i) => i.name !== 'Item')
          ? items
          : defaultTemplateProps.items,
      taxes: taxLines,
      totalAmount: totalAmount || defaultTemplateProps.totalAmount,
      paymentMethod: watchedPaymentMethod,
      date,
      config: config,
      notes: watchedNotes || undefined,
    }
  }, [
    watchedItems,
    watchedTaxes,
    watchedCustomer,
    selectedEvent,
    watchedPaymentMethod,
    watchedNotes,
    config,
    generateReceiptNumber,
  ])

  const templateProps = useMemo(
    () => buildTemplateProps(),
    [buildTemplateProps]
  )

  const TemplateComponent = useMemo(() => {
    return getTemplateComponent(selectedTemplate || 'professional')
  }, [selectedTemplate])

  const generatePdf = useCallback(async () => {
    toast.promise(
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateProps,
          templateSlug: selectedTemplate,
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error('Failed to generate PDF')
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt-${templateProps.receiptNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }),
      {
        loading: 'Generating PDF...',
        success: 'PDF downloaded',
        error: 'Failed to generate PDF',
      }
    )
  }, [templateProps, selectedTemplate])

  const onSubmit = async (data: ReceiptFormValues) => {
    if (!selectedEvent) {
      toast.error('Please select an event')
      return
    }

    const receiptNumber = generateReceiptNumber()

    toast.promise(
      fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          receiptNumber,
          event: {
            _id: selectedEvent._id,
            name: selectedEvent.name,
            code: selectedEvent.eventCode,
            type: selectedEvent.type,
            location: selectedEvent.location,
            startDate: selectedEvent.startDate,
            endDate: selectedEvent.endDate,
          },
          smtpVaultId: selectedSmtpVaultId || undefined,
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to create receipt')
        }
        return response.json()
      }),
      {
        loading: 'Creating receipt...',
        success: () => {
          form.reset({
            eventId: '',
            templateSlug: 'professional',
            customer: { name: '', email: '', phone: '', address: '' },
            items: [
              {
                id: crypto.randomUUID(),
                name: '',
                description: '',
                quantity: 1,
                price: 0,
                total: 0,
              },
            ],
            taxes: [],
            totalAmount: 0,
            paymentMethod: 'cash',
            notes: '',
            config: baseConfig,
          })
          setConfig(baseConfig)
          return 'Receipt created'
        },
        error: (err) =>
          err instanceof Error ? err.message : 'Failed to create receipt',
      }
    )
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <div className='space-y-4'>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium flex items-center gap-2'>
                <FileText className='w-4 h-4' />
                Event & Template
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Controller
                name='eventId'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className='sr-only'>Event</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingEvents}
                    >
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue
                          placeholder={
                            loadingEvents ? 'Loading events...' : 'Select event'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem
                            key={event._id?.toString()}
                            value={event._id?.toString() || ''}
                          >
                            <div className='flex items-center gap-2'>
                              <Calendar className='w-3 h-3' />
                              <span>{event.name}</span>
                              <span className='text-muted-foreground text-xs'>
                                ({event.eventCode})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className='flex gap-2'>
                <Controller
                  name='templateSlug'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className='flex-1'>
                      <FieldLabel className='sr-only'>Template</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder='Select template' />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem
                              key={template.slug}
                              value={template.slug}
                            >
                              <div className='flex items-center gap-2'>
                                <FileText className='w-3 h-3' />
                                <span>{template.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Credenza open={configOpen} onOpenChange={setConfigOpen}>
                  <CredenzaTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='shrink-0'
                    >
                      <Settings2 className='w-4 h-4' />
                    </Button>
                  </CredenzaTrigger>
                  <CredenzaContent>
                    <CredenzaHeader>
                      <CredenzaTitle>Template Configuration</CredenzaTitle>
                    </CredenzaHeader>
                    <CredenzaBody className='space-y-4'>
                      <div className='space-y-3'>
                        <div className='grid grid-cols-2 gap-3'>
                          <div className='space-y-1.5'>
                            <label className='text-xs font-medium flex items-center gap-1.5'>
                              <Palette className='w-3 h-3' />
                              Primary Color
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  className='w-full justify-start gap-2 h-8'
                                >
                                  <div
                                    className='w-4 h-4 rounded border'
                                    style={{
                                      backgroundColor: config.primaryColor,
                                    }}
                                  />
                                  {config.primaryColor}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className='w-64 p-3'
                                align='start'
                              >
                                <ColorPicker
                                  value={config.primaryColor || '#25345b'}
                                  onChange={(rgba: RgbaValue) => {
                                    const r = Math.round(rgba[0])
                                    const g = Math.round(rgba[1])
                                    const b = Math.round(rgba[2])
                                    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                                    setConfig((prev) => ({
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

                          <div className='space-y-1.5'>
                            <label className='text-xs font-medium flex items-center gap-1.5'>
                              <Palette className='w-3 h-3' />
                              Secondary Color
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  className='w-full justify-start gap-2 h-8'
                                >
                                  <div
                                    className='w-4 h-4 rounded border'
                                    style={{
                                      backgroundColor:
                                        config.secondaryColor || '#000000',
                                    }}
                                  />
                                  {config.secondaryColor || 'Not set'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className='w-64 p-3'
                                align='start'
                              >
                                <ColorPicker
                                  value={config.secondaryColor || '#000000'}
                                  onChange={(rgba: RgbaValue) => {
                                    const r = Math.round(rgba[0])
                                    const g = Math.round(rgba[1])
                                    const b = Math.round(rgba[2])
                                    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                                    setConfig((prev) => ({
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

                        <div className='space-y-1.5'>
                          <label className='text-xs font-medium flex items-center gap-1.5'>
                            <User className='w-3 h-3' />
                            Organization Name
                          </label>
                          <Input
                            value={config.organizationName || ''}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                organizationName: e.target.value,
                              }))
                            }
                            placeholder='Organization name'
                          />
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-xs font-medium flex items-center gap-1.5'>
                            <Image className='w-3 h-3' />
                            Logo URL
                          </label>
                          <Input
                            value={config.logoUrl || ''}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                logoUrl: e.target.value || undefined,
                              }))
                            }
                            placeholder='https://example.com/logo.png'
                          />
                        </div>

                        <div className='space-y-1.5'>
                          <label className='text-xs font-medium flex items-center gap-1.5'>
                            <FileText className='w-3 h-3' />
                            Footer Text
                          </label>
                          <Input
                            value={config.footerText || ''}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                footerText: e.target.value || undefined,
                              }))
                            }
                            placeholder='Custom footer text'
                          />
                        </div>

                        <div className='flex items-center justify-between'>
                          <label className='text-xs font-medium flex items-center gap-1.5'>
                            <QrCode className='w-3 h-3' />
                            Show QR Code
                          </label>
                          <Switch
                            checked={config.showQrCode}
                            onCheckedChange={(checked) =>
                              setConfig((prev) => ({
                                ...prev,
                                showQrCode: checked,
                              }))
                            }
                          />
                        </div>

                        <p className='text-xs text-muted-foreground bg-muted/50 p-2 rounded'>
                          <strong>Note:</strong> QR code will not appear in the
                          live preview but will be included in the downloaded
                          PDF. Download the PDF to see the final result.
                        </p>

                        <div className='pt-2 border-t space-y-1.5'>
                          <label className='text-xs font-medium flex items-center gap-1.5'>
                            <User2Icon className='w-3 h-3' />
                            Sender for new email sends
                          </label>
                          <Select
                            value={selectedSmtpVaultId || 'default'}
                            onValueChange={(value) =>
                              setSelectedSmtpVaultId(
                                value === 'default' ? '' : value
                              )
                            }
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
                              <SelectItem value='default'>
                                Use default sender
                              </SelectItem>
                              {smtpVaults.map((vault) => (
                                <SelectItem key={vault.id} value={vault.id}>
                                  <SenderSelectView vault={vault} />
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CredenzaBody>
                    <CredenzaFooter>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setConfig(baseConfig)}
                      >
                        Reset
                      </Button>
                      <Button size='sm' onClick={() => setConfigOpen(false)}>
                        Done
                      </Button>
                    </CredenzaFooter>
                  </CredenzaContent>
                </Credenza>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium flex items-center gap-2'>
                <User className='w-4 h-4' />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Controller
                name='customer.name'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className='sr-only'>Customer Name</FieldLabel>
                    <div className='relative'>
                      <Input
                        {...field}
                        placeholder='Customer name'
                        className='peer ps-7'
                        aria-invalid={fieldState.invalid}
                      />
                      <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                        <User size={12} />
                      </div>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='customer.email'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className='sr-only'>Email</FieldLabel>
                    <div className='relative'>
                      <Input
                        {...field}
                        type='email'
                        placeholder='Email address'
                        className='peer ps-7'
                        aria-invalid={fieldState.invalid}
                      />
                      <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                        <AtSign size={12} />
                      </div>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className='grid grid-cols-2 gap-2'>
                <Controller
                  name='customer.phone'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className='sr-only'>Phone</FieldLabel>
                      <div className='relative'>
                        <Input
                          {...field}
                          placeholder='Phone'
                          className='peer ps-7'
                          aria-invalid={fieldState.invalid}
                        />
                        <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                          <Phone size={12} />
                        </div>
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name='customer.address'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className='sr-only'>Address</FieldLabel>
                      <div className='relative'>
                        <Input
                          {...field}
                          placeholder='Address'
                          className='peer ps-7'
                          aria-invalid={fieldState.invalid}
                        />
                        <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                          <MapPin size={12} />
                        </div>
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm font-medium flex items-center gap-2'>
                  <Package className='w-4 h-4' />
                  Items
                </CardTitle>
                <Button
                  type='button'
                  onClick={() =>
                    append({
                      id: crypto.randomUUID(),
                      name: '',
                      description: '',
                      quantity: 1,
                      price: selectedEvent?.items?.[0]?.price || 0,
                      total: 0,
                    })
                  }
                  variant='outline'
                  size='sm'
                  className='gap-1 h-7 text-xs'
                >
                  <Plus className='w-3 h-3' />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-2'>
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className='group flex flex-col gap-1.5 p-2 rounded-md bg-muted/40'
                >
                  <div className='flex items-start gap-1.5'>
                    <Controller
                      name={`items.${index}.name`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className='flex-1'
                        >
                          <div className='relative'>
                            <Input
                              {...field}
                              placeholder='Item name'
                              className='peer ps-6'
                              aria-invalid={fieldState.invalid}
                            />
                            <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                              <Package size={11} />
                            </div>
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name={`items.${index}.quantity`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className='w-16'
                        >
                          <div className='relative'>
                            <Input
                              {...field}
                              type='number'
                              min={1}
                              placeholder='Qty'
                              className='peer ps-6 text-center'
                              aria-invalid={fieldState.invalid}
                              onChange={(e) => {
                                const value = parseInt(e.target.value)
                                field.onChange(isNaN(value) ? 1 : value)
                                updateItemTotal(index)
                              }}
                            />
                            <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                              <Hash size={11} />
                            </div>
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name={`items.${index}.price`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className='w-24'
                        >
                          <div className='relative'>
                            <Input
                              {...field}
                              type='number'
                              min={0}
                              placeholder='Price'
                              className='peer ps-6'
                              aria-invalid={fieldState.invalid}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value)
                                field.onChange(isNaN(value) ? 0 : value)
                                updateItemTotal(index)
                              }}
                            />
                            <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                              <span className='text-tiny'>₹</span>
                            </div>
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => {
                        if (fields.length > 1) remove(index)
                        else toast.error('At least one item required')
                      }}
                      className='w-6 h-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive'
                    >
                      <Trash2 className='w-3 h-3' />
                    </Button>
                  </div>

                  <Controller
                    name={`items.${index}.description`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Input
                          {...field}
                          placeholder='Description (optional)'
                          className='text-xs h-6'
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </div>
              ))}

              <div className='flex justify-between items-center pt-2 border-t'>
                <span className='text-sm font-medium'>Total (incl. taxes)</span>
                <span className='text-lg font-semibold'>
                  ₹
                  {form
                    .watch('totalAmount')
                    .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm font-medium flex items-center gap-2'>
                  <Sparkles className='w-4 h-4' />
                  Taxes
                </CardTitle>
                <Button
                  type='button'
                  onClick={() => appendTax({ name: '', rate: 0 })}
                  variant='outline'
                  size='sm'
                  className='gap-1 h-7 text-xs'
                >
                  <Plus className='w-3 h-3' />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-2'>
              {taxFields.length === 0 ? (
                <p className='text-xs text-muted-foreground'>No taxes</p>
              ) : null}

              {taxFields.map((tax, index) => {
                const subtotal = watchedItems.reduce(
                  (sum, item) => sum + item.quantity * item.price,
                  0
                )
                const rate = Number(watchedTaxes?.[index]?.rate) || 0
                const amount =
                  Number.isFinite(rate) && rate > 0
                    ? (subtotal * rate) / 100
                    : 0

                return (
                  <div
                    key={tax.id}
                    className='group flex items-center gap-2 p-2 rounded-md bg-muted/40'
                  >
                    <Controller
                      name={`taxes.${index}.name`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className='flex-1'
                        >
                          <Input
                            {...field}
                            placeholder='CGST / SGST / IGST / GST...'
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name={`taxes.${index}.rate`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className='w-24'
                        >
                          <div className='relative'>
                            <Input
                              {...field}
                              type='number'
                              min={0}
                              step='0.01'
                              placeholder='Rate'
                              className='peer pr-6'
                              aria-invalid={fieldState.invalid}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value)
                                field.onChange(isNaN(value) ? 0 : value)
                              }}
                            />
                            <div className='pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-2 text-muted-foreground/80'>
                              <span className='text-xs'>%</span>
                            </div>
                          </div>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <div className='w-24 text-right text-xs text-muted-foreground tabular-nums'>
                      ₹{amount.toFixed(2)}
                    </div>

                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => removeTax(index)}
                      className='w-6 h-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive'
                    >
                      <Trash2 className='w-3 h-3' />
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium flex items-center gap-2'>
                <CreditCard className='w-4 h-4' />
                Payment & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Controller
                name='paymentMethod'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className='sr-only'>Payment Method</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder='Select payment method' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='cash'>
                          <div className='flex items-center gap-2'>
                            <span>Cash</span>
                          </div>
                        </SelectItem>
                        <SelectItem value='upi'>
                          <div className='flex items-center gap-2'>
                            <span>UPI</span>
                          </div>
                        </SelectItem>
                        <SelectItem value='card'>
                          <div className='flex items-center gap-2'>
                            <span>Card</span>
                          </div>
                        </SelectItem>
                        <SelectItem value='other'>
                          <div className='flex items-center gap-2'>
                            <span>Other</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='notes'
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className='sr-only'>Notes</FieldLabel>
                    <AutosizeTextarea
                      {...field}
                      placeholder='Additional notes (optional)'
                      className='resize-none'
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={generatePdf}
              disabled={generatingPdf}
              className='flex-1 gap-1.5'
            >
              {generatingPdf ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Download className='w-4 h-4' />
              )}
              Download PDF
            </Button>
            <Button
              type='submit'
              disabled={submitting}
              className='flex-1 gap-1.5'
            >
              {submitting ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Sparkles className='w-4 h-4' />
              )}
              Create Receipt
            </Button>
          </div>
        </form>
      </div>

      <div className='lg:sticky lg:top-4 lg:self-start'>
        <Card className='overflow-hidden'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <Eye className='w-4 h-4' />
              Receipt Preview
            </CardTitle>
            <p className='text-xs text-muted-foreground'>
              QR code will appear in downloaded PDF. Download to see final
              result.
            </p>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='w-full aspect-[1/1.414] bg-gray-100'>
              <PDFViewer width='100%' height='100%' showToolbar={false}>
                <TemplateComponent {...templateProps} />
              </PDFViewer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
