'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Building2,
  CalendarIcon,
  CheckCircle2,
  Users,
  XCircle,
} from 'lucide-react'
import {
  createColumns,
  DataTable,
  organizationSchema,
  type OrganizationRow,
} from '@/components/table/organizations'
import { toast } from 'sonner'

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.json() as Promise<T>
}

interface OrganizationsResponse {
  organizations: OrganizationRow[]
}

export default function SuperadminOrganizationsPage() {
  const { data, mutate } = useSWR<OrganizationsResponse>(
    '/api/admins/organizations?limit=100',
    fetcher
  )

  const organizations = useMemo(
    () =>
      (data?.organizations || []).filter(
        (item) => organizationSchema.safeParse(item).success
      ),
    [data?.organizations]
  )

  const pendingApplications = useMemo(
    () =>
      organizations.filter((organization) => organization.status === 'pending'),
    [organizations]
  )

  const runAction = async (
    slug: string,
    action: 'approve' | 'suspend' | 'restore' | 'delete'
  ) => {
    const response = await fetch(`/api/admins/organizations/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'Action failed')
    }

    await mutate()
  }

  const columns = useMemo(
    () =>
      createColumns({
        onAction: runAction,
        onUpdate: () => {
          void mutate()
        },
      }),
    [mutate]
  )

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <h1 className='text-4xl shadow-heading font-bold'>Organizations</h1>
        </div>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          Manage organization lifecycle, approvals, suspensions, and restores.
        </p>
      </header>

      <DataTable
        columns={columns}
        data={organizations}
        onAction={runAction}
        onUpdate={mutate}
      />

      {pendingApplications.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold'>Organization Applications</h2>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {pendingApplications.map((organization) => {
              const logo =
                organization.logoUrl ||
                `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(organization.slug)}`

              return (
                <div
                  key={organization.id}
                  className='rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors border-l-2 border-border group'
                >
                  <div className='px-3 py-1.5 flex items-center justify-between bg-muted/60'>
                    <div className='flex items-center gap-1.5'>
                      <Building2 className='h-3 w-3 text-muted-foreground' />
                      <span className='text-xs font-medium'>Application</span>
                    </div>
                    <Badge variant='secondary' className='capitalize h-5'>
                      pending
                    </Badge>
                  </div>

                  <div className='p-3'>
                    <div className='flex items-start gap-2.5'>
                      <div className='mt-0.5 p-1.5 rounded-md bg-background'>
                        <img
                          src={logo}
                          alt={organization.name}
                          className='size-4 rounded shrink-0'
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-medium text-sm truncate'>
                          {organization.name}
                        </h3>
                        <p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
                          {organization.description || 'No description'}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center justify-between mt-3 pt-2 border-t border-border/30'>
                      <div className='flex items-center gap-3 text-2xs text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <Users className='h-3 w-3' />
                          {organization.expectedMembers
                            ? organization.expectedMembers
                            : '-'}
                        </span>
                        <span className='flex items-center gap-1'>
                          <CalendarIcon className='h-3 w-3' />
                          {new Date(
                            organization.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>

                      <div className='flex items-center gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-6 px-2 text-xs'
                          onClick={() =>
                            toast.promise(
                              runAction(organization.slug, 'approve'),
                              {
                                loading: 'Accepting application...',
                                success: 'Organization accepted',
                                error: (error) =>
                                  error instanceof Error
                                    ? error.message
                                    : 'Action failed',
                              }
                            )
                          }
                        >
                          <CheckCircle2 className='h-3.5 w-3.5 mr-1' />
                          Accept
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          className='h-6 px-2 text-xs'
                          onClick={() =>
                            toast.promise(
                              runAction(organization.slug, 'suspend'),
                              {
                                loading: 'Rejecting application...',
                                success: 'Organization rejected',
                                error: (error) =>
                                  error instanceof Error
                                    ? error.message
                                    : 'Action failed',
                              }
                            )
                          }
                        >
                          <XCircle className='h-3.5 w-3.5 mr-1' />
                          Reject
                        </Button>
                        <ArrowRight className='w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all' />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
