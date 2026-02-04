import { z } from 'zod'

export const memberSchema = z.object({
  userId: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'member']),
  joinedAt: z.coerce.date(),
})

export const inviteSchema = z.object({
  _id: z.string(),
  type: z.enum(['email', 'code']),
  email: z.string().optional(),
  code: z.string().optional(),
  role: z.enum(['admin', 'member']),
  status: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  maxUses: z.number().optional(),
  usedCount: z.number().optional(),
})

export type Member = z.infer<typeof memberSchema>
export type Invite = z.infer<typeof inviteSchema>
