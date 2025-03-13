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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { eventSchema, type EventFormValues } from '@/lib/schemas/event'
import { cn } from '@/lib/utils'
import { IEvent } from '@/models/event.model'
import { defaultIcons, iconMap } from '@/utils/mappings'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Calendar,
  Hash,
  Package,
  Plus,
  Sparkles,
  Text,
  Trash2,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import type { IconType } from 'react-icons'
import { BsLightningCharge, BsTools } from 'react-icons/bs'
import {
  FaBook,
  FaDollarSign,
  FaGift,
  FaIdBadge,
  FaLaptop,
  FaMusic,
  FaTrophy,
} from 'react-icons/fa'
import { HiAcademicCap } from 'react-icons/hi'
import { toast } from 'sonner'

interface EventFormProps {
  onSuccess: (event: IEvent) => void
  onCancel: () => void
  event?: IEvent
}

const eventTypeConfig = {
  seminar: {
    icon: HiAcademicCap,
    color: 'bg-blue-500/10 text-blue-600',
    label: 'Seminar',
  },
  workshop: {
    icon: BsTools,
    color: 'bg-amber-500/10 text-amber-600',
    label: 'Workshop',
  },
  conference: {
    icon: FaLaptop,
    color: 'bg-indigo-500/10 text-indigo-600',
    label: 'Conference',
  },
  competition: {
    icon: FaTrophy,
    color: 'bg-red-500/10 text-red-600',
    label: 'Competition',
  },
  meetup: {
    icon: FaIdBadge,
    color: 'bg-teal-500/10 text-teal-600',
    label: 'Meetup',
  },
  training: {
    icon: FaBook,
    color: 'bg-cyan-500/10 text-cyan-600',
    label: 'Training',
  },
  webinar: {
    icon: FaLaptop,
    color: 'bg-sky-500/10 text-sky-600',
    label: 'Webinar',
  },
  hackathon: {
    icon: BsLightningCharge,
    color: 'bg-orange-500/10 text-orange-600',
    label: 'Hackathon',
  },
  concert: {
    icon: FaMusic,
    color: 'bg-pink-500/10 text-pink-600',
    label: 'Concert',
  },
  fundraiser: {
    icon: FaGift,
    color: 'bg-emerald-500/10 text-emerald-600',
    label: 'Fundraiser',
  },
  networking: {
    icon: FaIdBadge,
    color: 'bg-violet-500/10 text-violet-600',
    label: 'Networking',
  },
  internal: {
    icon: FaIdBadge,
    color: 'bg-slate-500/10 text-slate-600',
    label: 'Internal',
  },
  other: {
    icon: Package,
    color: 'bg-gray-500/10 text-gray-600',
    label: 'Other',
  },
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash
}

function getIconForName(name: string): IconType {
  if (!name) return FaGift
  const lowerName = name.toLowerCase()
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lowerName.includes(keyword)) return icon
  }
  return defaultIcons[
    Math.floor(Math.abs(hashCode(name)) % defaultIcons.length)
  ]
}

export function EventForm({ onSuccess, onCancel, event }: EventFormProps) {
  const [loading, setLoading] = useState(false)
  const [itemIcons, setItemIcons] = useState<Record<string, IconType>>({})

  const isEditing = !!event

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      eventCode: event?.eventCode || '',
      type: event?.type || 'seminar',
      name: event?.name || '',
      desc: event?.desc || '',
      items: event?.items?.length
        ? event.items.map((item) => ({
            id: crypto.randomUUID(),
            name: item.name,
            description: item.description || '',
            price: item.price,
          }))
        : [{ id: crypto.randomUUID(), name: '', description: '', price: 0 }],
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const itemNames = form.watch('items')
  const selectedType = form.watch('type')

  useEffect(() => {
    const newIcons: Record<string, IconType> = {}
    itemNames.forEach((item) => {
      if (item.id && item.name) {
        newIcons[item.id] = getIconForName(item.name)
      }
    })
    setItemIcons(newIcons)
  }, [itemNames])

  const generateEventCode = () => {
    const prefix = form.getValues('type').substring(0, 3).toUpperCase()
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}${randomNum}`
  }

  const onSubmit = async (data: EventFormValues) => {
    setLoading(true)
    try {
      const cleanedData = {
        ...data,
        items: data.items.map(({ id, ...rest }) => rest),
      }

      if (isEditing) {
        const response = await fetch(`/api/events/${event.eventCode}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData),
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to update event')
        }
        const responseData = await response.json()
        onSuccess(responseData.event)
      } else {
        const response = await fetch('/api/events/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData),
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to create event')
        }
        const responseData = await response.json()
        onSuccess(responseData.event)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(
          error.message || `Failed to ${isEditing ? 'update' : 'create'} event`
        )
      } else {
        toast.error(`Failed to ${isEditing ? 'update' : 'create'} event`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
      <div className='flex items-center gap-2'>
        <div
          className={cn(
            'p-1.5 rounded-md',
            eventTypeConfig[selectedType].color
          )}
        >
          {React.createElement(eventTypeConfig[selectedType].icon, {
            className: 'w-4 h-4',
          })}
        </div>
        <span className='font-medium'>
          {isEditing ? 'Edit Event' : 'New Event'}
        </span>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <Controller
          name='eventCode'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className='sr-only'>Event Code</FieldLabel>
              <div className='flex gap-1'>
                <div className='relative flex-1'>
                  <Input
                    {...field}
                    placeholder='Event code'
                    className='font-mono peer ps-7'
                    aria-invalid={fieldState.invalid}
                  />
                  <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                    <Hash size={12} />
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='w-8'
                        onClick={() =>
                          form.setValue('eventCode', generateEventCode())
                        }
                      >
                        <Sparkles className='w-3 h-3' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Auto-generate</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='type'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className='sr-only'>Event Type</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={(value: string) => {
                  field.onChange(value)
                  const currentCode = form.getValues('eventCode')
                  if (
                    !currentCode ||
                    currentCode.match(
                      /^(SEM|WOR|CON|COM|MEE|TRA|WEB|HAC|CON|FUN|NET|INT|OTH)\d{4}$/
                    )
                  ) {
                    form.setValue('eventCode', generateEventCode())
                  }
                }}
              >
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder='Type' />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className='flex items-center gap-1.5'>
                        <config.icon className='w-3.5 h-3.5' />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Controller
        name='name'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className='sr-only'>Event Name</FieldLabel>
            <div className='relative'>
              <Input
                {...field}
                placeholder='Event name'
                className='peer ps-7'
                aria-invalid={fieldState.invalid}
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Calendar size={12} />
              </div>
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name='desc'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className='sr-only'>Description</FieldLabel>
            <div className='relative'>
              <AutosizeTextarea
                {...field}
                placeholder='Description'
                className='peer ps-7 resize-none'
                aria-invalid={fieldState.invalid}
              />
              <div className='pointer-events-none absolute top-2.5 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Text size={12} />
              </div>
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

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
            const ItemIcon = itemIcons[item.id] || FaGift
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
                  name={`items.${index}.description`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className='flex-1'>
                      <div className='relative'>
                        <Input
                          {...field}
                          placeholder='Description'
                          className='peer ps-6'
                          aria-invalid={fieldState.invalid}
                        />
                        <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-1.5 text-muted-foreground/80'>
                          <Text size={11} />
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
                          placeholder='0'
                          min={0}
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

      <div className='flex justify-end gap-2 pt-1 pb-3'>
        <Button type='button' variant='outline' size='sm' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' size='sm' disabled={loading} className='min-w-20'>
          {loading
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save'
              : 'Create'}
        </Button>
      </div>
    </form>
  )
}
