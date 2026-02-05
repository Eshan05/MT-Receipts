import { z } from 'zod'

export const membershipSchema = z.object({
  organizationSlug: z.string(),
  organizationName: z.string().nullable().optional(),
  organizationDescription: z.string().nullable().optional(),
  role: z.enum(['admin', 'member']),
})

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  isSuperAdmin: z.boolean(),
  isActive: z.boolean(),
  memberships: z.array(membershipSchema),
  organizationNames: z.array(z.string()).default([]),
  organizationSlugs: z.array(z.string()).default([]),
  membershipCount: z.number(),
  lastSignIn: z.string().optional(),
  createdAt: z.string(),
})

export type UserRow = z.infer<typeof userSchema>
