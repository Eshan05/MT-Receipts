'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '../data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Building2,
  Calendar,
  CheckCircle,
  Link2Icon,
  Mail,
  Shield,
  User,
  UserRound,
  XCircle,
  Clock,
} from 'lucide-react'
import { OrganizationRow } from './schema'
import { DataTableRowActions } from './data-table-row-actions'
import { formatTime } from '@/utils/formatters'

interface ColumnOptions {
  onAction: (
    slug: string,
    action: 'approve' | 'suspend' | 'restore' | 'delete'
  ) => Promise<void>
  onUpdate?: () => void
}

export function createColumns({
  onAction,
  onUpdate,
}: ColumnOptions): ColumnDef<OrganizationRow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='flex items-center'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='flex items-center'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title='Organization'
          className='ml-2'
        />
      ),
      cell: ({ row }) => {
        const organization = row.original
        const logo =
          organization.logoUrl ||
          `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(organization.slug)}`

        return (
          <div className='flex items-center gap-2 min-w-0 max-w-64'>
            <img
              src={logo}
              alt={organization.name}
              className='size-7 rounded-full shrink-0 bg-muted'
            />
            <div className='flex flex-col min-w-0 flex-1'>
              <div className='flex items-center gap-1 min-w-0'>
                <Building2 className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-sm font-medium'>
                  {organization.name}
                </span>
              </div>
              <div className='flex items-center gap-1 min-w-0'>
                <Link2Icon className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-2xs text-muted-foreground font-mono'>
                  /{organization.slug}
                </span>
              </div>
            </div>
          </div>
        )
      },
      accessorFn: (row) => row.name,
    },
    {
      accessorKey: 'createdBy',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Created By' />
      ),
      cell: ({ row }) => {
        const creator = row.original.createdBy
        if (!creator)
          return <span className='text-muted-foreground text-xs'>Unknown</span>

        const avatar = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(creator.email)}`

        return (
          <div className='flex items-center gap-2 min-w-0 max-w-64'>
            <img
              src={avatar}
              alt={creator.username}
              className='size-7 rounded-full shrink-0 bg-muted'
            />
            <div className='flex flex-col min-w-0 flex-1'>
              <div className='flex items-center gap-1 min-w-0'>
                <User className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-sm font-medium'>
                  {creator.username}
                </span>
              </div>
              <div className='flex items-center gap-1 min-w-0'>
                <Mail className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-2xs text-muted-foreground'>
                  {creator.email}
                </span>
              </div>
            </div>
          </div>
        )
      },
      accessorFn: (row) => row.createdBy?.username || '',
    },
    {
      accessorKey: 'approvedBy',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Approved By' />
      ),
      cell: ({ row }) => {
        const approver = row.original.approvedBy
        if (!approver)
          return <span className='text-muted-foreground text-xs'>-</span>

        const avatar = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(approver.email)}`

        return (
          <div className='flex items-center gap-2 min-w-0 max-w-64'>
            <img
              src={avatar}
              alt={approver.username}
              className='size-7 rounded-full shrink-0 bg-muted'
            />
            <div className='flex flex-col min-w-0 flex-1'>
              <div className='flex items-center gap-1 min-w-0'>
                <User className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-sm font-medium'>
                  {approver.username}
                </span>
              </div>
              <div className='flex items-center gap-1 min-w-0'>
                <Mail className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-2xs text-muted-foreground'>
                  {approver.email}
                </span>
              </div>
            </div>
          </div>
        )
      },
      accessorFn: (row) => row.approvedBy?.username || '',
    },
    {
      accessorKey: 'slug',
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        if (status === 'active') {
          return (
            <Badge
              variant='outline'
              className='bg-green-500/10 text-green-600 border-green-500/30 capitalize'
            >
              <CheckCircle className='size-3 mr-0.5' />
              {status}
            </Badge>
          )
        }

        if (status === 'suspended') {
          return (
            <Badge
              variant='outline'
              className='bg-yellow-500/10 text-yellow-600 border-yellow-500/30 capitalize'
            >
              <XCircle className='size-3 mr-0.5' />
              {status}
            </Badge>
          )
        }

        if (status === 'deleted') {
          return (
            <Badge
              variant='outline'
              className='bg-red-500/10 text-red-600 border-red-500/30 capitalize'
            >
              <XCircle className='size-3 mr-0.5' />
              {status}
            </Badge>
          )
        }

        return (
          <Badge
            variant='outline'
            className='bg-blue-500/10 text-blue-600 border-blue-500/30 capitalize'
          >
            <Shield className='size-3 mr-0.5' />
            {status}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(rowValue)
      },
    },
    {
      accessorKey: 'memberCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Members' />
      ),
      cell: ({ row }) => (
        <div className='inline-flex items-center gap-1'>
          <UserRound className='size-3 text-muted-foreground' />
          <span>{row.original.memberCount}</span>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Created' />
      ),
      cell: ({ row }) => {
        const formatted = formatTime(row.original.createdAt, false)
        return (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Calendar className='size-3 shrink-0' />
            <div className='flex flex-col text-muted-foreground!'>
              <span className='font-mono'>{formatted.date},</span>
              <span className='opacity-70'>{formatted.time}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'restoreInDays',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Restore In (Days)' />
      ),
      accessorFn: (row) => {
        if (row.status !== 'deleted' || !row.restoresBefore) return null
        const remainingMs = new Date(row.restoresBefore).getTime() - Date.now()
        const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
        return Math.max(0, days)
      },
      cell: ({ row }) => {
        if (row.original.status !== 'deleted' || !row.original.restoresBefore) {
          return <span className='text-muted-foreground text-xs'>-</span>
        }

        const remainingMs =
          new Date(row.original.restoresBefore).getTime() - Date.now()
        const days = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))

        return (
          <div className='inline-flex items-center gap-1 text-xs'>
            <Clock className='size-3 text-muted-foreground' />
            <span>{days}</span>
          </div>
        )
      },
      enableHiding: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onAction={onAction}
          onUpdated={onUpdate}
        />
      ),
    },
  ]
}
