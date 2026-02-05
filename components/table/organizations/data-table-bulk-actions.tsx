'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  X,
  ShieldCheck,
  Ban,
  RotateCcw,
  Trash2,
  Loader2,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { OrganizationRow } from './schema'
import { toast } from 'sonner'

interface DataTableBulkActionsProps {
  selectedOrganizations: OrganizationRow[]
  onClearSelection: () => void
  onAction: (
    slug: string,
    action: 'approve' | 'suspend' | 'restore' | 'delete'
  ) => Promise<void>
  onUpdate: () => void
}

export function DataTableBulkActions({
  selectedOrganizations,
  onClearSelection,
  onAction,
  onUpdate,
}: DataTableBulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const selectedCount = selectedOrganizations.length

  const hasPending = useMemo(
    () => selectedOrganizations.some((o) => o.status === 'pending'),
    [selectedOrganizations]
  )
  const hasActive = useMemo(
    () => selectedOrganizations.some((o) => o.status === 'active'),
    [selectedOrganizations]
  )
  const hasSuspended = useMemo(
    () => selectedOrganizations.some((o) => o.status === 'suspended'),
    [selectedOrganizations]
  )
  const hasDeleted = useMemo(
    () => selectedOrganizations.some((o) => o.status === 'deleted'),
    [selectedOrganizations]
  )

  const runBulkAction = async (
    action: 'approve' | 'suspend' | 'restore' | 'delete',
    allowedStatuses: OrganizationRow['status'][]
  ) => {
    const candidates = selectedOrganizations.filter((organization) =>
      allowedStatuses.includes(organization.status)
    )

    if (!candidates.length) return

    setIsProcessing(action)

    const result = await Promise.allSettled(
      candidates.map((organization) => onAction(organization.slug, action))
    )

    const failed = result.filter((item) => item.status === 'rejected').length
    const success = result.length - failed

    if (failed === 0) {
      toast.success(`${success} organization(s) updated`)
    } else {
      toast.warning(`${success} updated, ${failed} failed`)
    }

    onUpdate()
    onClearSelection()
    setIsProcessing(null)
  }

  const exportSelectedToCSV = () => {
    const csvData = selectedOrganizations.map((organization) => ({
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      memberCount: organization.memberCount,
      createdBy: organization.createdBy?.username || '',
      createdByEmail: organization.createdBy?.email || '',
      createdAt: organization.createdAt,
    }))

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `organizations-selected-${new Date().toISOString().split('T')[0]}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportSelectedToJSON = () => {
    const blob = new Blob([JSON.stringify(selectedOrganizations, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `organizations-selected-${new Date().toISOString().split('T')[0]}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (selectedCount === 0) return null

  return (
    <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50'>
      <div className='flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg'>
        <Badge variant='secondary' className='gap-1'>
          {selectedCount} <span className='max-md:hidden'>selected</span>
        </Badge>

        <Button
          size='sm'
          variant='ghost'
          className='h-7 px-2'
          onClick={onClearSelection}
        >
          <X className='w-3 h-3' />
          <span className='max-md:hidden'>Clear</span>
        </Button>

        <div className='w-px h-5 bg-border mx-1' />

        <Button
          size='sm'
          variant='outline'
          className='h-7 gap-1'
          disabled={!hasPending || isProcessing !== null}
          onClick={() => void runBulkAction('approve', ['pending'])}
        >
          {isProcessing === 'approve' ? (
            <Loader2 className='w-3 h-3 animate-spin' />
          ) : (
            <ShieldCheck className='w-3 h-3' />
          )}
          <span className='max-md:hidden'>Approve</span>
        </Button>

        <Button
          size='sm'
          variant='outline'
          className='h-7 gap-1'
          disabled={!hasActive || isProcessing !== null}
          onClick={() => void runBulkAction('suspend', ['active'])}
        >
          {isProcessing === 'suspend' ? (
            <Loader2 className='w-3 h-3 animate-spin' />
          ) : (
            <Ban className='w-3 h-3' />
          )}
          <span className='max-md:hidden'>Suspend</span>
        </Button>

        <Button
          size='sm'
          variant='outline'
          className='h-7 gap-1'
          disabled={(!hasSuspended && !hasDeleted) || isProcessing !== null}
          onClick={() =>
            void runBulkAction('restore', ['suspended', 'deleted'])
          }
        >
          {isProcessing === 'restore' ? (
            <Loader2 className='w-3 h-3 animate-spin' />
          ) : (
            <RotateCcw className='w-3 h-3' />
          )}
          <span className='max-md:hidden'>Restore</span>
        </Button>

        <Button
          size='sm'
          variant='destructive'
          className='h-7 gap-1'
          disabled={!(hasActive || hasSuspended) || isProcessing !== null}
          onClick={() => void runBulkAction('delete', ['active', 'suspended'])}
        >
          {isProcessing === 'delete' ? (
            <Loader2 className='w-3 h-3 animate-spin' />
          ) : (
            <Trash2 className='w-3 h-3' />
          )}
          <span className='max-md:hidden'>Delete</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='sm' variant='outline' className='h-7 gap-1'>
              <FileSpreadsheet className='w-3 h-3' />
              <span className='max-md:hidden'>Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={exportSelectedToCSV}>
              <FileSpreadsheet className='w-3 h-3 mr-2' />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportSelectedToJSON}>
              <FileJson className='w-3 h-3 mr-2' />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
