'use client'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const eventItemSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(128),
  price: z
    .number({
      required_error: 'Item price is required',
      invalid_type_error: 'Price should be a number',
    })
    .positive({ message: 'Item price must be positive' })
    .min(1, 'Price must be 1 or more'),
})

const eventSchema = z.object({
  eventCode: z
    .number({
      required_error: 'Event code is required',
      invalid_type_error: 'Event code should be a number',
    })
    .positive({ message: 'Event code must be positive' }),
  type: z.enum(['seminar', 'workshop', 'other'], {
    required_error: 'Event type is required',
  }),
  name: z.string().min(1).max(64),
  desc: z.string().min(1).max(128).optional(),
  items: z.array(eventItemSchema),
})

type EventFormValues = z.infer<typeof eventSchema>

export default function CreateEventPage() {
  const [loading, setLoading] = useState(false)

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      eventCode: undefined as unknown as number,
      type: 'seminar',
      name: '',
      desc: '',
      items: [{ name: '', description: '', price: 0 }],
    },
  })

  const onSubmit = async (data: EventFormValues) => {
    setLoading(true)
    try {
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${await getTokenServer()}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create event')
      }

      const eventData = await response.json()
      toast.success(`Event "${eventData.event.name}" created successfully!`)
      // router.push(`/events/${eventData.event.eventCode}`)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to create event')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-3xl font-bold mb-4'>Create Event</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='eventCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Code</FormLabel>
                  <FormControl>
                    <Input type='number' placeholder='1234' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select event type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='seminar'>Seminar</SelectItem>
                      <SelectItem value='workshop'>Workshop</SelectItem>
                      <SelectItem value='other'>Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input placeholder='Event Name' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='desc'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Description</FormLabel>
                <FormControl>
                  <Input placeholder='Event Description' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Items Section (Dynamic) */}
          <div className='border rounded-md p-4'>
            <h2 className='text-xl font-semibold mb-4'>Items</h2>
            {form.watch('items').map((item, index) => (
              <div key={index} className='grid grid-cols-3 gap-4 mb-4'>
                <FormField
                  control={form.control}
                  name={`items.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.price`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type='number' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='mt-4'
                  onClick={() => form.unregister(`items.${index}`)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            ))}
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                form.setValue('items', [
                  ...form.watch('items'),
                  { name: '', description: '', price: 0 },
                ])
              }
            >
              <PlusCircle className='mr-2 h-4 w-4' /> Add Item
            </Button>
          </div>

          <Button type='submit' disabled={loading}>
            {loading ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
