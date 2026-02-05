import { z } from 'zod'

export const organizationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  expectedMembers: z.number().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  status: z.enum(['pending', 'active', 'suspended', 'deleted']),
  memberCount: z.number(),
  createdAt: z.string(),
  approvedAt: z.string().optional().nullable(),
  restoresBefore: z.string().optional().nullable(),
  createdBy: z
    .object({
      id: z.string(),
      username: z.string(),
      email: z.string(),
    })
    .nullable()
    .optional(),
  approvedBy: z
    .object({
      id: z.string(),
      username: z.string(),
      email: z.string(),
    })
    .nullable()
    .optional(),
})

export type OrganizationRow = z.infer<typeof organizationSchema>
