'use client'

import { AutosizeTextarea } from '@/components/ui/autoresize-textarea'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { IEvent } from '@/models/event.model'
import { EventEntry } from '@/components/table/event-entries/schema'
import { defaultIcons, iconMap } from '@/utils/mappings'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  Mail,
  Package,
  Plus,
  Trash2,
  User,
  Phone,
  MapPin,
  FileText,
  Calendar as CalendarIcon,
  RotateCcw,
  CircleCheck,
  CircleDot,
  CircleSlash,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import type { IconType } from 'react-icons'
import { toast } from 'sonner'
import { z } from 'zod'
import { FaDollarSign } from 'react-icons/fa'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const entryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be non-negative'),
})

const entryTaxSchema = z.object({
  name: z.string().min(1, 'Tax name is required'),
  rate: z.number().min(0, 'Tax rate must be non-negative'),
})

const entryCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

const entryFormSchema = z.object({
  customer: entryCustomerSchema,
  items: z.array(entryItemSchema).min(1, 'At least one item is required'),
  taxes: z.array(entryTaxSchema).optional(),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'other']),
  emailSent: z.boolean().optional(),
  notes: z.string().optional(),
  refunded: z.boolean().optional(),
  refundReason: z.string().optional(),
  status: z.enum(['pending', 'sent', 'failed', 'refunded']).optional(),
  createdAt: z.date().optional(),
  emailSentAt: z.date().optional().nullable(),
})

type EntryFormValues = z.infer<typeof entryFormSchema>

interface EntryFormProps {
  event: IEvent
  editEntry?: EventEntry
  onSuccess: () => void
  onCancel: () => void
}

function getIconForName(name: string): IconType {
  const normalizedName = name.toLowerCase().trim()
  if (iconMap[normalizedName]) {
    return iconMap[normalizedName]
  }
  const words = normalizedName.split(/\s+/)
  for (const word of words) {
    if (iconMap[word]) {
      return iconMap[word]
    }
  }
  const hashCode = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }
  return defaultIcons[
    Math.floor(Math.abs(hashCode(name)) % defaultIcons.length)
  ]
}

export function EntryForm({
  event,
  editEntry,
  onSuccess,
  onCancel,
}: EntryFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [itemIcons, setItemIcons] = useState<Record<string, IconType>>({})
  const isEditing = !!editEntry

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: editEntry
      ? {
          customer: {
            name: editEntry.customer.name,
            email: editEntry.customer.email,
            phone: editEntry.customer.phone || '',
            address: editEntry.customer.address || '',
          },
          items: editEntry.items.map((item) => ({
            id: crypto.randomUUID(),
            name: item.name,
            description: item.description || '',
            quantity: item.quantity,
            price: item.price,
          })),
          taxes: (editEntry.taxes || []).map((tax) => ({
            name: tax.name,
            rate: tax.rate,
          })),
          totalAmount: editEntry.totalAmount,
          paymentMethod: editEntry.paymentMethod || 'cash',
          emailSent: editEntry.emailSent,
          notes: editEntry.notes || '',
          refunded: editEntry.refunded || false,
          refundReason: editEntry.refundReason || '',
          status: editEntry.refunded
            ? 'refunded'
            : editEntry.emailSent
              ? 'sent'
              : editEntry.emailError
                ? 'failed'
                : 'pending',
          createdAt: editEntry.createdAt
            ? new Date(editEntry.createdAt)
            : undefined,
          emailSentAt: editEntry.emailSentAt
            ? new Date(editEntry.emailSentAt)
            : null,
        }
      : {
          customer: {
            name: '',
            email: '',
            phone: '',
            address: '',
          },
          items:
            event.items.length > 0
              ? event.items.map((item) => ({
                  id: crypto.randomUUID(),
                  name: item.name,
                  description: item.description || '',
                  quantity: 1,
                  price: item.price,
                }))
              : [
                  {
                    id: crypto.randomUUID(),
                    name: '',
                    description: '',
                    quantity: 1,
                    price: 0,
                  },
                ],
          taxes: [],
          totalAmount: 0,
          paymentMethod: 'cash',
          emailSent: false,
          notes: '',
          refunded: false,
          refundReason: '',
          status: 'pending',
          createdAt: undefined,
          emailSentAt: null,
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

  const watchedItems = form.watch('items')
  const watchedTaxes = form.watch('taxes')

  useEffect(() => {
    const newIcons: Record<string, IconType> = {}
    watchedItems.forEach((item) => {
      if (item.id && item.name) {
        newIcons[item.id] = getIconForName(item.name)
      }
    })
    setItemIcons(newIcons)
  }, [watchedItems])

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

  const onSubmit = async (data: EntryFormValues) => {
    const receiptData = {
      eventId: event._id,
      customer: data.customer,
      items: data.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
      })),
      taxes: (data.taxes || []).map((tax) => ({
        name: tax.name,
        rate: tax.rate,
      })),
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      emailSent: data.emailSent || false,
      notes: data.notes,
      refunded: data.refunded || false,
      refundReason: data.refundReason,
      status: data.status,
      createdAt: data.createdAt?.toISOString(),
      emailSentAt: data.emailSentAt?.toISOString(),
    }

    toast.promise(
      (async () => {
        if (isEditing && editEntry) {
          const response = await fetch(
            `/api/receipts/${editEntry.receiptNumber}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(receiptData),
            }
          )
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Failed to update receipt')
          }
          return response.json()
        } else {
          const response = await fetch('/api/receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(receiptData),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Failed to create receipt')
          }
          return response.json()
        }
      })(),
      {
        loading: isEditing ? 'Updating receipt...' : 'Creating receipt...',
        success: () => {
          onSuccess()
          return isEditing ? 'Receipt updated' : 'Receipt created'
        },
        error: (err) =>
          err instanceof Error
            ? err.message
            : `Failed to ${isEditing ? 'update' : 'create'} receipt`,
      }
    )
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className='space-y-3 overflow-y-auto no-scrollbar'
    >
      <div className='grid grid-cols-2 gap-2'>
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                  placeholder='Email'
                  className='peer ps-7'
                  aria-invalid={fieldState.invalid}
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                  <Mail size={12} />
                </div>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <Controller
          name='customer.phone'
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className='sr-only'>Phone</FieldLabel>
              <div className='relative'>
                <Input
                  {...field}
                  placeholder='Phone (optional)'
                  className='peer ps-7'
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                  <Phone size={12} />
                </div>
              </div>
            </Field>
          )}
        />
        <Controller
          name='customer.address'
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className='sr-only'>Address</FieldLabel>
              <div className='relative'>
                <Input
                  {...field}
                  placeholder='Address (optional)'
                  className='peer ps-7'
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                  <MapPin size={12} />
                </div>
              </div>
            </Field>
          )}
        />
      </div>

      <div className='space-y-1.5'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Items</span>
          <Button
            type='button'
            onClick={() =>
              append({
                id: crypto.randomUUID(),
                name: '',
                description: '',
                quantity: 1,
                price: 0,
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
        <div className='space-y-1'>
          {fields.map((item, index) => {
            const ItemIcon = itemIcons[item.id] || Package
            return (
              <div
                key={item.id}
                className='group p-2 rounded-md bg-muted/40 space-y-1.5'
              >
                <div className='flex items-center gap-1.5'>
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
                            onChange={(e) => {
                              field.onChange(e)
                              if (e.target.value && item.id) {
                                setItemIcons((prev) => ({
                                  ...prev,
                                  [item.id]: getIconForName(e.target.value),
                                }))
                              }
                            }}
                          />
                          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                            <ItemIcon size={11} />
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
                      <Field data-invalid={fieldState.invalid} className='w-16'>
                        <div className='relative'>
                          <Input
                            {...field}
                            type='number'
                            min={1}
                            placeholder='Qty'
                            className='peer ps-5 text-center'
                            aria-invalid={fieldState.invalid}
                            onChange={(e) => {
                              const value = parseInt(e.target.value)
                              field.onChange(isNaN(value) ? 1 : value)
                            }}
                          />
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
                      <Field data-invalid={fieldState.invalid} className='w-20'>
                        <div className='relative'>
                          <Input
                            {...field}
                            type='number'
                            min={0}
                            placeholder='Price'
                            className='peer ps-5'
                            aria-invalid={fieldState.invalid}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value)
                              field.onChange(isNaN(value) ? 0 : value)
                            }}
                          />
                          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                            <FaDollarSign size={10} />
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
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder='Description (optional)'
                      className='text-xs h-7'
                    />
                  )}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className='space-y-1.5'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Taxes</span>
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

        {taxFields.length === 0 ? (
          <p className='text-xs text-muted-foreground'>No taxes</p>
        ) : null}

        <div className='space-y-1'>
          {taxFields.map((tax, index) => {
            const subtotal = watchedItems.reduce(
              (sum, item) => sum + item.quantity * item.price,
              0
            )
            const rate = Number(watchedTaxes?.[index]?.rate) || 0
            const amount =
              Number.isFinite(rate) && rate > 0 ? (subtotal * rate) / 100 : 0

            return (
              <div key={tax.id} className='group p-2 rounded-md bg-muted/40'>
                <div className='flex items-center gap-1.5'>
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
                      <Field data-invalid={fieldState.invalid} className='w-20'>
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

                  <div className='w-20 text-right text-xs text-muted-foreground tabular-nums'>
                    {amount.toFixed(2)}
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
              </div>
            )
          })}
        </div>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <Controller
          name='totalAmount'
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className='sr-only'>Total (incl. taxes)</FieldLabel>
              <div className='relative'>
                <Input
                  {...field}
                  type='number'
                  readOnly
                  className='peer ps-6 bg-muted'
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                  <FaDollarSign size={11} />
                </div>
              </div>
            </Field>
          )}
        />
        <Controller
          name='paymentMethod'
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className='sr-only'>Payment Method</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='cash'>Cash</SelectItem>
                  <SelectItem value='upi'>UPI</SelectItem>
                  <SelectItem value='card'>Card</SelectItem>
                  <SelectItem value='other'>Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      </div>

      <div className='flex items-center justify-between p-3 rounded-lg border bg-muted/30'>
        <div className='flex items-center gap-2 mr-2'>
          <Mail className='w-4 h-4 text-muted-foreground' />
          <div>
            <p className='text-xs font-medium'>Email Already Sent</p>
            <p className='text-2xs text-muted-foreground'>
              Mark if receipt was already emailed
            </p>
          </div>
        </div>
        <Controller
          name='emailSent'
          control={form.control}
          render={({ field }) => (
            <Switch
              checked={field.value || false}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <Controller
        name='notes'
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel className='sr-only'>Notes</FieldLabel>
            <div className='relative'>
              <AutosizeTextarea
                {...field}
                placeholder='Any additional notes...'
                className='peer ps-7 resize-none'
              />
              <div className='pointer-events-none absolute top-2.5 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <FileText size={12} />
              </div>
            </div>
          </Field>
        )}
      />

      {isEditing && (
        <>
          <Controller
            name='status'
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel className='text-xs'>Status</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className='h-7'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pending'>
                      <div className='flex items-center gap-2'>
                        <CircleDot className='w-3 h-3 text-yellow-500' />
                        Pending
                      </div>
                    </SelectItem>
                    <SelectItem value='sent'>
                      <div className='flex items-center gap-2'>
                        <CircleCheck className='w-3 h-3 text-green-500' />
                        Sent
                      </div>
                    </SelectItem>
                    <SelectItem value='failed'>
                      <div className='flex items-center gap-2'>
                        <CircleSlash className='w-3 h-3 text-red-500' />
                        Failed
                      </div>
                    </SelectItem>
                    <SelectItem value='refunded'>
                      <div className='flex items-center gap-2'>
                        <RotateCcw className='w-3 h-3 text-orange-500' />
                        Refunded
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <div className='grid grid-cols-2 gap-2'>
            <Controller
              name='createdAt'
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className='text-xs'>Created At</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className={cn(
                          'w-full justify-start text-left font-normal h-9 text-xs',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className='w-3.5 h-3.5 mr-1.5' />
                        {field.value ? (
                          format(field.value, 'MMM d, yyyy h:mm a')
                        ) : (
                          <span>Pick date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              )}
            />

            <Controller
              name='emailSentAt'
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className='text-xs'>Email Sent At</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className={cn(
                          'w-full justify-start text-left font-normal h-9 text-xs',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <Mail className='w-3.5 h-3.5 mr-1.5' />
                        {field.value ? (
                          format(field.value, 'MMM d, yyyy h:mm a')
                        ) : (
                          <span>Not sent</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              )}
            />
          </div>
        </>
      )}

      <div className='flex items-center justify-between p-3 rounded-lg border bg-muted/30'>
        <div className='flex items-center gap-2 mr-2'>
          <RotateCcw className='w-4 h-4 text-muted-foreground' />
          <div>
            <p className='text-xs font-medium'>Refunded</p>
            <p className='text-2xs text-muted-foreground'>
              Mark if this receipt was refunded
            </p>
          </div>
        </div>
        <Controller
          name='refunded'
          control={form.control}
          render={({ field }) => (
            <Switch
              checked={field.value || false}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {form.watch('refunded') && (
        <Controller
          name='refundReason'
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className='text-xs'>Refund Reason</FieldLabel>
              <Input
                {...field}
                placeholder='Reason for refund...'
                className='text-sm'
              />
            </Field>
          )}
        />
      )}

      <div className='flex justify-end gap-2 pt-1 pb-3'>
        <Button type='button' variant='outline' size='sm' onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type='submit'
          size='sm'
          disabled={submitting}
          className='min-w-20'
        >
          {submitting && <Loader2 className='w-4 h-4 mr-1 animate-spin' />}
          {submitting
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save'
              : 'Create Receipt'}
        </Button>
      </div>
    </form>
  )
}
