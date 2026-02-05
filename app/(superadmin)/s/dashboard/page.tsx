'use client'

import useSWR from 'swr'
import {
  Building2,
  Users,
  ShieldCheck,
  Clock3,
  FileBoxIcon,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  UsageCard,
  type UsageCardItem,
} from '@/components/organization/usage-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message =
      (payload as { error?: string }).error || `Failed to fetch ${url}`
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

interface OrganizationsResponse {
  organizations: { status: string }[]
}

interface UsersResponse {
  users: { isSuperAdmin: boolean }[]
}

type OrgDistributionRow = {
  id: string
  slug: string
  name: string
  description?: string
  logoUrl?: string
  memberCount: number
  used: number
  limit: number
}

type SystemUsagesResponse = {
  totals: {
    eventsActive: number
    receiptsLast30Days: number
    usersTotal: number
  }
  limits: {
    maxEvents: number
    maxReceiptsPerMonth: number
    maxUsers: number
  }
  distribution: {
    events: OrgDistributionRow[]
    receipts: OrgDistributionRow[]
    users: OrgDistributionRow[]
  }
  window: {
    kind: 'rolling-30-days'
    start: string
    end: string
  }
}

function formatUsage(used: number, limit: number): string {
  if (limit < 0) return `${used} / ∞`
  return `${used} / ${limit}`
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function percentUsed(used: number, limit: number): number | null {
  if (limit < 0) return null
  if (limit === 0) return used > 0 ? 100 : 0
  return clampPercent((used / limit) * 100)
}

export default function SuperadminDashboardPage() {
  const { data: organizationsData } = useSWR<OrganizationsResponse>(
    '/api/admins/organizations?limit=100',
    fetcher
  )
  const { data: usersData } = useSWR<UsersResponse>(
    '/api/admins/users?limit=100',
    fetcher
  )
  const {
    data: systemUsages,
    error: systemUsagesError,
    isLoading: systemUsagesLoading,
  } = useSWR<SystemUsagesResponse>('/api/admins/usages', fetcher)

  const organizations = organizationsData?.organizations || []
  const users = usersData?.users || []

  const activeOrganizations = organizations.filter(
    (o) => o.status === 'active'
  ).length
  const pendingOrganizations = organizations.filter(
    (o) => o.status === 'pending'
  ).length
  const suspendedOrganizations = organizations.filter(
    (o) => o.status === 'suspended'
  ).length

  const distributions = systemUsages
    ? {
        events: systemUsages.distribution.events,
        receipts: systemUsages.distribution.receipts,
        users: systemUsages.distribution.users,
      }
    : null

  const usageItems: UsageCardItem[] | null = systemUsages
    ? [
        {
          id: 'events',
          name: 'Active events',
          value: formatUsage(
            systemUsages.totals.eventsActive,
            systemUsages.limits.maxEvents
          ),
          description: 'Sum of active events across all tenants.',
          percentage: percentUsed(
            systemUsages.totals.eventsActive,
            systemUsages.limits.maxEvents
          ),
          interactive: true,
        },
        {
          id: 'receipts',
          name: 'Receipts',
          value: formatUsage(
            systemUsages.totals.receiptsLast30Days,
            systemUsages.limits.maxReceiptsPerMonth
          ),
          description:
            'Sum of receipts created across all tenants in the last 30 days.',
          percentage: percentUsed(
            systemUsages.totals.receiptsLast30Days,
            systemUsages.limits.maxReceiptsPerMonth
          ),
          interactive: true,
        },
        {
          id: 'users',
          name: 'Users',
          value: formatUsage(
            systemUsages.totals.usersTotal,
            systemUsages.limits.maxUsers
          ),
          description: 'Total number of users registered in the system.',
          percentage: percentUsed(
            systemUsages.totals.usersTotal,
            systemUsages.limits.maxUsers
          ),
          interactive: true,
        },
      ]
    : null

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <h1 className='text-4xl shadow-heading font-bold'>
            Superadmin Dashboard
          </h1>
        </div>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          System-wide overview of organizations, users, and platform status.
        </p>
      </header>

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Building2 className='h-4 w-4 text-muted-foreground' />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{organizations.length}</p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Users className='h-4 w-4 text-muted-foreground' />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{users.length}</p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <ShieldCheck className='h-4 w-4 text-muted-foreground' />
              Active Orgs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>{activeOrganizations}</p>
            <p className='text-xs text-muted-foreground'>
              Pending: {pendingOrganizations} • Suspended:{' '}
              {suspendedOrganizations}
            </p>
          </CardContent>
        </Card>

        <Card className='gap-2'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Clock3 className='h-4 w-4 text-muted-foreground' />
              Superadmins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-semibold'>
              {users.filter((u) => u.isSuperAdmin).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className=''>
        {systemUsagesLoading ? (
          <Card className='border-none! border-transparent!'>
            <CardContent className=''>
              <div className='space-y-2'>
                <Skeleton className='h-5 w-64' />
                <Skeleton className='h-5 w-64' />
                <Skeleton className='h-5 w-64' />
              </div>
            </CardContent>
          </Card>
        ) : systemUsagesError ? (
          <Card>
            <CardContent className=''>
              <p className='text-sm text-destructive'>
                {systemUsagesError.message}
              </p>
            </CardContent>
          </Card>
        ) : usageItems ? (
          <div className='w-full max-w-sm'>
            <UsageCard
              title='Overall system limits'
              rangeLabel='Last 30 days'
              items={usageItems}
              renderItem={(item, row) => {
                if (!distributions) return row

                const distribution =
                  item.id === 'events'
                    ? distributions.events
                    : item.id === 'receipts'
                      ? distributions.receipts
                      : distributions.users

                return (
                  <Popover>
                    <PopoverTrigger asChild>{row}</PopoverTrigger>
                    <PopoverContent align='start'>
                      <PopoverHeader>
                        <PopoverTitle>{item.name}</PopoverTitle>
                        <PopoverDescription>
                          {item.description}
                        </PopoverDescription>
                      </PopoverHeader>
                      <div className='max-h-64 overflow-auto no-scrollbar'>
                        <div className='space-y-1'>
                          {distribution.length ? (
                            distribution.map((org) => (
                              <div
                                key={org.id}
                                className='rounded-md px-2 py-1 hover:bg-muted/40'
                              >
                                <div className='flex items-start justify-between gap-3'>
                                  <div className='min-w-0 flex-1'>
                                    <div className='flex items-center gap-2 min-w-0'>
                                      <Avatar
                                        size='default'
                                        className='shrink-0'
                                      >
                                        <AvatarImage
                                          src={org.logoUrl || ''}
                                          alt={org.name}
                                        />
                                        <AvatarFallback>
                                          {(org.name || org.slug || '?')
                                            .slice(0, 1)
                                            .toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className='flex flex-col gpa-0'>
                                        <div className='flex items-center gap-1.5'>
                                          <Link
                                            href={`/${org.slug}/dashboard`}
                                            className='min-w-0 truncate text-sm font-medium hover:underline'
                                          >
                                            {org.name}
                                          </Link>
                                          <Badge
                                            variant='outline'
                                            className='text-tiny rounded-md gap-1'
                                          >
                                            <Users className='size-2.5' />
                                            {org.memberCount}
                                          </Badge>
                                        </div>
                                        <div className='flex items-center gap-1 min-w-0'>
                                          <FileBoxIcon className='size-3 shrink-0' />
                                          <div className='min-w-0 truncate max-w-20 text-2xs text-muted-foreground'>
                                            {org.description ||
                                              'No description'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className='shrink-0 pt-1 text-xs tabular-nums text-muted-foreground'>
                                    {formatUsage(org.used, org.limit)}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className='px-2 py-1.5 text-xs text-muted-foreground'>
                              No organizations found.
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
