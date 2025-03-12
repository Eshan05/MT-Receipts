import { z } from 'zod'

export const eventItemSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, { error: 'Name is required' })
    .max(64, { error: 'Max 64 characters' }),
  description: z
    .string()
    .min(1, { error: 'Description is required' })
    .max(128, { error: 'Max 128 characters' }),
  price: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Price is required'
          : 'Price should be a number',
    })
    .positive({ error: 'Price must be positive' })
    .min(1, { error: 'Price must be 1 or more' }),
})

export const eventSchema = z.object({
  eventCode: z.string().min(1, { error: 'Event code is required' }),
  type: z.enum(
    [
      'seminar',
      'workshop',
      'conference',
      'competition',
      'meetup',
      'training',
      'webinar',
      'hackathon',
      'concert',
      'fundraiser',
      'networking',
      'internal',
      'other',
    ],
    {
      error: 'Event type is required',
    }
  ),
  name: z
    .string()
    .min(1, { error: 'Event name is required' })
    .max(64, { error: 'Max 64 characters' }),
  desc: z.string().max(128, { error: 'Max 128 characters' }).optional(),
  items: z
    .array(eventItemSchema)
    .min(1, { error: 'At least one item is required' }),
})

export type EventFormValues = z.infer<typeof eventSchema>
