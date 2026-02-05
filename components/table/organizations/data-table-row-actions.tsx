'use client'

import { Row } from '@tanstack/react-table'
import {
  MoreHorizontal,
  ShieldCheck,
  Ban,
  RotateCcw,
  Trash2,
  Settings,
  Users,
  Gauge,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrganizationRow } from './schema'
import { toast } from 'sonner'
import { useState } from 'react'
import { OrganizationSettingsCredenza } from '@/components/organization/organization-settings-dropdown'
import { SuperadminOrganizationMembersCredenza } from '@/components/organization/superadmin-organization-members-credenza'
import { SuperadminOrganizationLimitsCredenza } from '@/components/organization/superadmin-organization-limits-credenza'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onAction: (
    slug: string,
    action: 'approve' | 'suspend' | 'restore' | 'delete'
  ) => Promise<void>
  onUpdated?: () => void
}

export function DataTableRowActions<TData>({
  row,
  onAction,
  onUpdated,
}: DataTableRowActionsProps<TData>) {
  const organization = row.original as OrganizationRow
  const [configOpen, setConfigOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [limitsOpen, setLimitsOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          >
            <MoreHorizontal className='size-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44'>
          <DropdownMenuItem onClick={() => setMembersOpen(true)}>
            <Users className='mr-1 size-3.5' />
            View Members
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLimitsOpen(true)}>
            <Gauge className='mr-1 size-3.5' />
            View Limits
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfigOpen(true)}>
            <Settings className='mr-1 size-3.5' />
            View Config
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {organization.status === 'pending' && (
            <DropdownMenuItem
              onClick={() =>
                toast.promise(onAction(organization.slug, 'approve'), {
                  loading: 'Approving...',
                  success: 'Organization approved',
                  error: (error) =>
                    error instanceof Error ? error.message : 'Action failed',
                })
              }
            >
              <ShieldCheck className='mr-1 size-3.5' />
              Approve
            </DropdownMenuItem>
          )}

          {organization.status === 'active' && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  toast.promise(onAction(organization.slug, 'suspend'), {
                    loading: 'Suspending...',
                    success: 'Organization suspended',
                    error: (error) =>
                      error instanceof Error ? error.message : 'Action failed',
                  })
                }
              >
                <Ban className='mr-1 size-3.5' />
                Suspend
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() =>
                  toast.promise(onAction(organization.slug, 'delete'), {
                    loading: 'Deleting...',
                    success: 'Organization moved to deleted',
                    error: (error) =>
                      error instanceof Error ? error.message : 'Action failed',
                  })
                }
              >
                <Trash2 className='mr-1 size-3.5' />
                Delete
              </DropdownMenuItem>
            </>
          )}

          {organization.status === 'suspended' && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  toast.promise(onAction(organization.slug, 'approve'), {
                    loading: 'Activating...',
                    success: 'Organization activated',
                    error: (error) =>
                      error instanceof Error ? error.message : 'Action failed',
                  })
                }
              >
                <RotateCcw className='mr-1 size-3.5' />
                Activate
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() =>
                  toast.promise(onAction(organization.slug, 'delete'), {
                    loading: 'Deleting...',
                    success: 'Organization moved to deleted',
                    error: (error) =>
                      error instanceof Error ? error.message : 'Action failed',
                  })
                }
              >
                <Trash2 className='mr-1 size-3.5' />
                Delete
              </DropdownMenuItem>
            </>
          )}

          {organization.status === 'deleted' && (
            <DropdownMenuItem
              onClick={() =>
                toast.promise(onAction(organization.slug, 'restore'), {
                  loading: 'Restoring...',
                  success: 'Organization restored',
                  error: (error) =>
                    error instanceof Error ? error.message : 'Action failed',
                })
              }
            >
              <RotateCcw className='mr-1 size-3.5' />
              Restore
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <OrganizationSettingsCredenza
        open={configOpen}
        onOpenChange={setConfigOpen}
        mode='superadmin'
        organizationSlug={organization.slug}
        onUpdated={onUpdated}
      />

      <SuperadminOrganizationMembersCredenza
        open={membersOpen}
        onOpenChange={setMembersOpen}
        slug={organization.slug}
        orgName={organization.name}
      />

      <SuperadminOrganizationLimitsCredenza
        open={limitsOpen}
        onOpenChange={setLimitsOpen}
        slug={organization.slug}
        orgName={organization.name}
      />
    </>
  )
}
