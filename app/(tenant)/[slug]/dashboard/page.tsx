'use client'

import useSWR from 'swr'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

type UsageResponse = {
  organization: { id: string; slug: string; name: string }
  limits: { maxEvents: number; maxReceiptsPerMonth: number; maxUsers: number }
  usage: {
    eventsActive: number
    receiptsLast30Days: number
    usersAccepted: number
    usersPendingSlots: number
    usersTotal: number
  }
  window: {
    kind: 'rolling-30-days'
    start: string
    end: string
  }
}

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

export default function DashboardPage() {
  const { currentOrganization } = useAuth()
  const isAdmin = currentOrganization?.role === 'admin'

  const { data, error, isLoading } = useSWR<UsageResponse>(
    isAdmin ? '/api/usages' : null,
    fetcher
  )

  if (!isAdmin) {
    return (
      <div className=''>
        <Card className='mx-auto w-full max-w-md ring-0'>
          <CardHeader className='text-center'>
            <div className='p-1 bg-muted rounded-full grid place-items-center size-10 mx-auto border'>
              <ShieldAlert className='mx-auto size-6 text-muted-foreground' />
            </div>
            <CardTitle className='text-2xl shadow-heading font-bold mt-2'>
              Admin Dashboard
            </CardTitle>
            <CardDescription className='-mt-1'>
              This area is available to organization admins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='mx-auto max-w-md rounded-lg border border-dashed bg-muted/30 p-3 text-center'>
              <p className='text-xs text-muted-foreground'>
                You currently don’t have permission to view usage and limit
                details. Contact an admin if you need access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='container py-6 space-y-4'>
      <header>
        <h1 className='text-4xl font-semibold shadow-heading'>
          Admin Dashboard
        </h1>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          Usage and limits for your organization.
        </p>
      </header>

      {isLoading ? (
        <Card className='mx-auto w-full max-w-lg'>
          <CardContent className='p-6'>
            <div className='space-y-2'>
              <Skeleton className='h-5 w-64' />
              <Skeleton className='h-5 w-64' />
              <Skeleton className='h-5 w-64' />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className='mx-auto w-full max-w-lg'>
          <CardContent className='p-6'>
            <p className='text-sm text-destructive'>{error.message}</p>
          </CardContent>
        </Card>
      ) : data ? (
        (() => {
          const items: UsageCardItem[] = [
            {
              name: 'Active events',
              value: formatUsage(
                data.usage.eventsActive,
                data.limits.maxEvents
              ),
              description: 'Total number of active events in this tenant.',
              percentage: percentUsed(
                data.usage.eventsActive,
                data.limits.maxEvents
              ),
              interactive: true,
            },
            {
              name: 'Receipts',
              value: formatUsage(
                data.usage.receiptsLast30Days,
                data.limits.maxReceiptsPerMonth
              ),
              description:
                'Usage count of receipts created in the last 30 days.',
              percentage: percentUsed(
                data.usage.receiptsLast30Days,
                data.limits.maxReceiptsPerMonth
              ),
              interactive: true,
            },
            {
              name: 'Users',
              value: formatUsage(data.usage.usersTotal, data.limits.maxUsers),
              description:
                'Total of accepted members and pending invite slots.',
              percentage: percentUsed(
                data.usage.usersTotal,
                data.limits.maxUsers
              ),
              interactive: true,
            },
          ]

          return (
            <div className='mx-auto w-full max-w-sm'>
              <UsageCard
                title='Last 30 days'
                items={items}
                renderItem={(item, row) => (
                  <Popover>
                    <PopoverTrigger asChild>{row}</PopoverTrigger>
                    <PopoverContent align='start' className='w-80'>
                      <PopoverHeader>
                        <PopoverTitle>{item.name}</PopoverTitle>
                        <PopoverDescription>
                          {item.description}
                        </PopoverDescription>
                      </PopoverHeader>
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          )
        })()
      ) : null}
    </div>
  )
}
