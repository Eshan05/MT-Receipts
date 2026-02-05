'use client'

import * as React from 'react'
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { CalendarDays, Receipt, Users } from 'lucide-react'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Skeleton } from '@/components/ui/skeleton'
import {
  UsageCard,
  type UsageCardItem,
} from '@/components/organization/usage-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'

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

type OrgUsageResponse = {
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

interface SuperadminOrganizationLimitsCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  orgName: string
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

function formatUsage(used: number, limit: number): string {
  if (limit < 0) return `${used} / ∞`
  return `${used} / ${limit}`
}

export function SuperadminOrganizationLimitsCredenza({
  open,
  onOpenChange,
  slug,
  orgName,
}: SuperadminOrganizationLimitsCredenzaProps) {
  const { mutate } = useSWRConfig()
  const { data, error } = useSWR<OrgUsageResponse>(
    open ? `/api/admins/organizations/${slug}/usages` : null,
    fetcher
  )

  const [limitsForm, setLimitsForm] = React.useState({
    maxEvents: '10',
    maxReceiptsPerMonth: '100',
    maxUsers: '25',
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open || !data) return
    setLimitsForm({
      maxEvents: String(data.limits.maxEvents),
      maxReceiptsPerMonth: String(data.limits.maxReceiptsPerMonth),
      maxUsers: String(data.limits.maxUsers),
    })
  }, [open, data])

  const items: UsageCardItem[] | null = data
    ? [
        {
          name: 'Active events',
          value: formatUsage(data.usage.eventsActive, data.limits.maxEvents),
          percentage: percentUsed(
            data.usage.eventsActive,
            data.limits.maxEvents
          ),
        },
        {
          name: 'Receipts',
          value: formatUsage(
            data.usage.receiptsLast30Days,
            data.limits.maxReceiptsPerMonth
          ),
          percentage: percentUsed(
            data.usage.receiptsLast30Days,
            data.limits.maxReceiptsPerMonth
          ),
        },
        {
          name: 'Users',
          value: formatUsage(data.usage.usersTotal, data.limits.maxUsers),
          percentage: percentUsed(data.usage.usersTotal, data.limits.maxUsers),
        },
      ]
    : null

  const parseLimit = (raw: string, label: string): number => {
    const value = Number.parseInt(raw, 10)
    if (Number.isNaN(value)) {
      throw new Error(`${label} must be a number`)
    }
    if (value < -1) {
      throw new Error(`${label} must be -1 or higher`)
    }
    return value
  }

  const saveLimits = () => {
    if (saving) return
    setSaving(true)

    const promise = (async () => {
      const maxEvents = parseLimit(limitsForm.maxEvents, 'Events')
      const maxReceiptsPerMonth = parseLimit(
        limitsForm.maxReceiptsPerMonth,
        'Receipts'
      )
      const maxUsers = parseLimit(limitsForm.maxUsers, 'Users')

      const response = await fetch(`/api/admins/organizations/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'limits',
          limits: { maxEvents, maxReceiptsPerMonth, maxUsers },
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message =
          (payload as { error?: string }).error || 'Failed to update limits'
        throw new Error(message)
      }

      await mutate(`/api/admins/organizations/${slug}/usages`)
    })()

    toast.promise(promise, {
      loading: 'Saving limits...',
      success: 'Limits updated',
      error: (err) => (err instanceof Error ? err.message : 'Save failed'),
    })

    promise.finally(() => setSaving(false))
  }

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-lg'>
        <CredenzaHeader>
          <CredenzaTitle>Limits</CredenzaTitle>
          <CredenzaDescription>
            Rolling 30-day receipts window for {orgName} ({slug}).
          </CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody className='space-y-4'>
          {error ? (
            <p className='text-sm text-destructive'>{error.message}</p>
          ) : !data || !items ? (
            <div className='space-y-2'>
              <Skeleton className='h-5 w-64' />
              <Skeleton className='h-28 w-full' />
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex justify-center'>
                <UsageCard title='Last 30 days' items={items} />
              </div>

              <div className='space-y-3'>
                <div className='text-sm font-medium'>Set limits</div>
                <div className='grid gap-3 sm:grid-cols-3'>
                  <div className='space-y-1'>
                    <Label htmlFor='limit-max-events'>Events</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <CalendarDays className='size-3.5' />
                      </InputGroupAddon>
                      <InputGroupInput
                        id='limit-max-events'
                        type='number'
                        min={-1}
                        step={1}
                        value={limitsForm.maxEvents}
                        onChange={(e) =>
                          setLimitsForm((prev) => ({
                            ...prev,
                            maxEvents: e.target.value,
                          }))
                        }
                      />
                    </InputGroup>
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor='limit-max-receipts'>Receipts</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <Receipt className='size-3.5' />
                      </InputGroupAddon>
                      <InputGroupInput
                        id='limit-max-receipts'
                        type='number'
                        min={-1}
                        step={1}
                        value={limitsForm.maxReceiptsPerMonth}
                        onChange={(e) =>
                          setLimitsForm((prev) => ({
                            ...prev,
                            maxReceiptsPerMonth: e.target.value,
                          }))
                        }
                      />
                    </InputGroup>
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor='limit-max-users'>Users</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <Users className='size-3.5' />
                      </InputGroupAddon>
                      <InputGroupInput
                        id='limit-max-users'
                        type='number'
                        min={-1}
                        step={1}
                        value={limitsForm.maxUsers}
                        onChange={(e) =>
                          setLimitsForm((prev) => ({
                            ...prev,
                            maxUsers: e.target.value,
                          }))
                        }
                      />
                    </InputGroup>
                  </div>
                </div>

                <div className='flex justify-end'>
                  <Button onClick={saveLimits} disabled={saving}>
                    {saving ? 'Saving…' : 'Save limits'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CredenzaBody>
      </CredenzaContent>
    </Credenza>
  )
}
