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
import { defaultIcons, iconMap } from '@/utils/mappings'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, Package, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import type { IconType } from 'react-icons'
import { toast } from 'sonner'
import { z } from 'zod'
import { createElement } from 'react'

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

export function EntryForm({ event, onSuccess, onCancel }: EntryFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [itemIcons, setItemIcons] = useState<Record<string, IconType>>({})

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
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
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create receipt'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <Field>
          <FieldLabel>Customer Name</FieldLabel>
          <Input {...form.register('customer.name')} placeholder='John Doe' />
          <FieldError errors={[form.formState.errors.customer?.name]} />
        </Field>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            {...form.register('customer.email')}
            type='email'
            placeholder='john@example.com'
          />
          <FieldError errors={[form.formState.errors.customer?.email]} />
        </Field>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <Field>
          <FieldLabel>Phone (Optional)</FieldLabel>
          <Input
            {...form.register('customer.phone')}
            placeholder='+91 9876543210'
          />
        </Field>
        <Field>
          <FieldLabel>Address (Optional)</FieldLabel>
          <Input
            {...form.register('customer.address')}
            placeholder='City, Country'
          />
        </Field>
      </div>

      <Field>
        <FieldLabel className='flex items-center gap-1.5'>
          <Package className='w-3.5 h-3.5' />
          Items
        </FieldLabel>
        <div className='space-y-2'>
          {fields.map((field, index) => {
            const ItemIcon = itemIcons[field.id] || Package
            return (
              <div
                key={field.id}
                className='flex items-center gap-2 p-2 rounded-lg border bg-muted/30'
              >
                <div className='p-1.5 rounded bg-background'>
                  {createElement(ItemIcon, {
                    className: 'w-4 h-4 text-muted-foreground',
                  })}
                </div>
                <div className='flex-1 grid grid-cols-4 gap-2'>
                  <Input
                    {...form.register(`items.${index}.name`)}
                    placeholder='Item name'
                    className='col-span-2 h-8'
                  />
                  <Input
                    {...form.register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    type='number'
                    min={1}
                    placeholder='Qty'
                    className='h-8'
                  />
                  <Input
                    {...form.register(`items.${index}.price`, {
                      valueAsNumber: true,
                    })}
                    type='number'
                    min={0}
                    placeholder='Price'
                    className='h-8'
                  />
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 p-0'
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            )
          })}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='w-full'
            onClick={() =>
              append({
                id: crypto.randomUUID(),
                name: '',
                description: '',
                quantity: 1,
                price: 0,
              })
            }
          >
            <Plus className='w-4 h-4 mr-1' />
            Add Item
          </Button>
        </div>
        <FieldError errors={[form.formState.errors.items]} />
      </Field>

      <div className='grid grid-cols-2 gap-4'>
        <Field>
          <FieldLabel>Total Amount</FieldLabel>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground'>₹</span>
            <Input
              {...form.register('totalAmount', { valueAsNumber: true })}
              type='number'
              readOnly
              className='bg-muted'
            />
          </div>
        </Field>
        <Field>
          <FieldLabel>Payment Method</FieldLabel>
          <Controller
            name='paymentMethod'
            control={form.control}
            render={({ field }) => (
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
            )}
          />
        </Field>
      </div>

      <div className='flex items-center justify-between p-3 rounded-lg border bg-muted/30'>
        <div className='flex items-center gap-2'>
          <Mail className='w-4 h-4 text-muted-foreground' />
          <div>
            <p className='text-sm font-medium'>Email Already Sent</p>
            <p className='text-xs text-muted-foreground'>
              Mark if receipt was already emailed to customer
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

      <Field>
        <FieldLabel>Notes (Optional)</FieldLabel>
        <AutosizeTextarea
          {...form.register('notes')}
          placeholder='Any additional notes...'
          className='resize-none'
        />
      </Field>

      <div className='flex justify-end gap-2 pt-4'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' disabled={submitting}>
          {submitting && <Loader2 className='w-4 h-4 mr-1 animate-spin' />}
          Create Receipt
        </Button>
      </div>
    </form>
  )
}
