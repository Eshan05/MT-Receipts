'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '../data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Calendar,
  Mail,
  ShieldCheck,
  User,
  Users,
  Clock,
  Building2,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { UserRow } from './schema'
import { DataTableRowActions } from './data-table-row-actions'
import { formatTime } from '@/utils/formatters'
import Link from 'next/link'

export function createColumns(): ColumnDef<UserRow>[] {
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
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='User' />
      ),
      cell: ({ row }) => {
        const user = row.original
        const avatar = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(user.email)}`

        return (
          <div className='flex items-center gap-2 min-w-0 max-w-64'>
            <img
              src={avatar}
              alt={user.username}
              className='size-7 rounded-full shrink-0 bg-muted'
            />
            <div className='flex flex-col min-w-0 flex-1'>
              <div className='flex items-center gap-1 min-w-0'>
                <User className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-sm font-medium'>
                  {user.username}
                </span>
              </div>
              <div className='flex items-center gap-1 min-w-0'>
                <Mail className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-xs text-muted-foreground'>
                  {user.email}
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'organizationNames',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Memberships' />
      ),
      cell: ({ row }) => {
        const user = row.original

        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' size='sm' className='font-mono gap-1.5'>
                <Building2 className='w-3.5 h-3.5 text-muted-foreground' />
                {user.membershipCount}
                {user.membershipCount === 1 ? '' : ''}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-72 p-1.5 gap-1'>
              <div className='px-2 py-1 border-b border-border/50'>
                <p className='text-xs font-medium'>Memberships</p>
              </div>
              <div className='space-y-1 px-1'>
                {user.memberships.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>
                    No memberships
                  </p>
                ) : (
                  user.memberships.map((membership, index) => (
                    <div
                      key={`${membership.organizationSlug}-${index}`}
                      className='px-2 py-1 flex items-center gap-2 rounded hover:bg-muted/50'
                    >
                      <Building2 className='size-3 text-muted-foreground shrink-0' />
                      <div className='min-w-0 flex-1'>
                        <div className='text-xs font-medium truncate'>
                          <Link
                            href={`/${membership.organizationSlug}`}
                            className='hover:underline underline-offset-4'
                          >
                            {membership.organizationName ||
                              membership.organizationSlug}
                          </Link>
                        </div>
                        <div className='text-tiny text-muted-foreground truncate'>
                          {membership.organizationDescription || '-'}
                        </div>
                      </div>
                      <Badge
                        variant='secondary'
                        className='text-tiny capitalize'
                      >
                        {membership.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )
      },
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string[]
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.some((item) => rowValue.includes(item))
      },
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'secondary' : 'outline'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        const rowValue = String(row.getValue(id))
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(rowValue)
      },
    },
    {
      accessorKey: 'isSuperAdmin',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Role' />
      ),
      cell: ({ row }) =>
        row.original.isSuperAdmin ? (
          <Badge className='gap-1'>
            <ShieldCheck className='h-3 w-3' />
            Superadmin
          </Badge>
        ) : (
          <Badge variant='outline' className='gap-1'>
            <Users className='h-3 w-3' />
            User
          </Badge>
        ),
      filterFn: (row, id, value) => {
        const rowValue = String(row.getValue(id))
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(rowValue)
      },
    },
    {
      accessorKey: 'lastSignIn',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Last Sign-In' />
      ),
      cell: ({ row }) => {
        const value = row.original.lastSignIn
        if (!value)
          return <span className='text-muted-foreground text-xs'>Never</span>

        const formatted = formatTime(value, false)
        return (
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Clock className='size-3 shrink-0' />
            <div className='flex flex-col text-muted-foreground!'>
              <span className='font-mono'>{formatted.date},</span>
              <span className='opacity-70'>{formatted.time}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Created' />
      ),
      cell: ({ row }) => {
        const formatted = formatTime(row.original.createdAt, false)
        return (
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
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
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ]
}
