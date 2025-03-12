'use client'

import { AutosizeTextarea } from '@/components/ui/autoresize-textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
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
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const eventItemSchema = z.object({
  id: z.string().optional(), // Only for useFieldArray
  name: z.string().min(1, 'Name is required').max(64, 'Max 64 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(128, 'Max 128 characters'),
  price: z
    .number({
      required_error: 'Price is required',
      invalid_type_error: 'Price should be a number',
    })
    .positive({ message: 'Price must be positive' })
    .min(1, 'Price must be 1 or more'),
})

const eventSchema = z.object({
  eventCode: z.string().min(1, 'Event code is required'),
  type: z.enum(['seminar', 'workshop', 'other'], {
    required_error: 'Event type is required',
  }),
  name: z
    .string()
    .min(1, 'Event name is required')
    .max(64, 'Max 64 characters'),
  desc: z.string().max(128, 'Max 128 characters').optional(),
  items: z.array(eventItemSchema),
})

type EventFormValues = z.infer<typeof eventSchema>

export default function CreateEventPage() {
  const [loading, setLoading] = useState(false)

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      eventCode: '',
      type: 'seminar',
      name: '',
      desc: '',
      items: [{ id: 'initial', name: '', description: '', price: 0 }],
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const onSubmit = async (data: EventFormValues) => {
    setLoading(true)
    try {
      const cleanedData = {
        ...data,
        items: data.items.map(({ id, ...rest }) => rest),
      }

      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${await getTokenServer()}`,
        },
        body: JSON.stringify(cleanedData),
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
    <main className='p-4 flex flex-col gap-4 mx-auto max-w-4xl lg:max-w-4xl 2xl:max-w-5xl min-h-screen items-center justify-center'>
      <article className='w-full'>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6 p-4'
          >
            <div className='grid md:grid-cols-2 grid-cols-1 gap-4'>
              <section className='flex flex-col gap-2'>
                <FormField
                  control={form.control}
                  name='eventCode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Code</FormLabel>
                      <FormControl>
                        <Input type='text' placeholder='1234' {...field} />
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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
              </section>
              <section>
                <FormField
                  control={form.control}
                  name='desc'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Description</FormLabel>
                      <FormControl>
                        <AutosizeTextarea
                          placeholder='Event Description'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </div>
            <div className='rounded-md p-2'>
              <h2 className='text-3xl text-center font-semibold mb-4 shadow-heading'>
                Items
              </h2>
              {fields.map((item, index) => (
                <Card key={item.id} className='mb-4'>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardHeader>{index + 1}</CardHeader>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => remove(index)}
                    >
                      <Trash2 className='h-4 w-4 text-red-500' />
                    </Button>
                  </CardHeader>
                  <CardContent className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    {/* Item Name */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='hidden'>Item Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className='border-0'
                              placeholder='Item Name'
                            />
                          </FormControl>
                          {/* <FormMessage /> */}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='hidden'>Description</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className='border-0'
                              placeholder='Description'
                            />
                          </FormControl>
                          {/* <FormMessage /> */}
                        </FormItem>
                      )}
                    />

                    {/* Item Price */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='hidden'>Price</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              className='border-0'
                              placeholder='Price'
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              value={field.value}
                            />
                          </FormControl>
                          {/* <FormMessage /> */}
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
              <Button
                type='button'
                variant='outline'
                onClick={() => append({ name: '', description: '', price: 0 })}
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Add Item
              </Button>
            </div>

            <Button type='submit' disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </form>
        </Form>
      </article>
    </main>
  )
}
