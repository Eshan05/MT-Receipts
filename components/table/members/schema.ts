import { z } from 'zod'

export const memberSchema = z.object({
  userId: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'member']),
  joinedVia: z
    .enum(['signup', 'invite_email', 'invite_code', 'manual'])
    .default('manual'),
  invitedById: z.string().optional(),
  invitedByName: z.string().optional(),
  invitedAt: z.coerce.date().optional(),
  joinedAt: z.coerce.date(),
  lastSignedInAt: z.coerce.date().optional(),
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
  invitedById: z.string().optional(),
  invitedByName: z.string().optional(),
})

export type Member = z.infer<typeof memberSchema>
export type Invite = z.infer<typeof inviteSchema>
