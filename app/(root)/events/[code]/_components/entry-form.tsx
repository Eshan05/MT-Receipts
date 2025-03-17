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
  Hash,
  FileText,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import type { IconType } from 'react-icons'
import { toast } from 'sonner'
import { z } from 'zod'
import { FaDollarSign } from 'react-icons/fa'

const entryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be non-negative'),
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
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'other']),
  emailSent: z.boolean().optional(),
  notes: z.string().optional(),
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
          totalAmount: editEntry.totalAmount,
          paymentMethod: editEntry.paymentMethod || 'cash',
          emailSent: editEntry.emailSent,
          notes: editEntry.notes || '',
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
          totalAmount: 0,
          paymentMethod: 'cash',
          emailSent: false,
          notes: '',
        },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedItems = form.watch('items')

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
    const total = watchedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    )
    form.setValue('totalAmount', total)
  }, [watchedItems, form])

  const onSubmit = async (data: EntryFormValues) => {
    setSubmitting(true)
    try {
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
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        emailSent: data.emailSent || false,
        notes: data.notes,
      }

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

        toast.success('Receipt updated successfully')
      } else {
        const response = await fetch('/api/receipts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiptData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to create receipt')
        }

        toast.success('Receipt created successfully')
      }
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? 'update' : 'create'} receipt`
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
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
                className='group flex items-center gap-1.5 p-1.5 rounded-md bg-muted/40'
              >
                <Controller
                  name={`items.${index}.name`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className='flex-1'>
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
                    <Field data-invalid={fieldState.invalid} className='w-20'>
                      <div className='relative'>
                        <Input
                          {...field}
                          type='number'
                          min={1}
                          placeholder='Qty'
                          className='peer ps-6'
                          aria-invalid={fieldState.invalid}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            field.onChange(isNaN(value) ? 1 : value)
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
                    <Field data-invalid={fieldState.invalid} className='w-24'>
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
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                          <FaDollarSign size={11} />
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
              <FieldLabel className='sr-only'>Total Amount</FieldLabel>
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
