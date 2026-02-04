'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '../data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import { Member } from './schema'
import { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Clock,
  ShieldIcon,
  UserIcon,
  Mail,
  Calendar,
  UserRoundPlus,
  KeyRound,
  MailPlus,
  UserPlus,
  User,
} from 'lucide-react'
import { formatTime } from '@/utils/formatters'

interface ColumnOptions {
  isAdmin: boolean
  currentUserId?: string
  onUpdate?: () => void
}

export function createColumns({
  isAdmin,
  currentUserId,
  onUpdate,
}: ColumnOptions): ColumnDef<Member>[] {
  const joinedViaLabel = (value: Member['joinedVia']) => {
    switch (value) {
      case 'invite_code':
        return 'Code'
      case 'invite_email':
        return 'Email'
      case 'signup':
        return 'Signup'
      default:
        return 'Manual'
    }
  }

  const columns: ColumnDef<Member>[] = [
    {
      id: 'select',
      header: ({ table }) =>
        isAdmin ? (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='Select all'
            className='flex items-center'
          />
        ) : null,
      cell: ({ row }) =>
        isAdmin ? (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
            className='flex items-center'
          />
        ) : null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'user',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='User' className='ml-2' />
      ),
      cell: ({ row }) => {
        const member = row.original
        const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(member.username)}`
        return (
          <div className='flex items-center gap-2 min-w-0 max-w-50'>
            <Avatar className='size-7 shrink-0'>
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>
                {member.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-col min-w-0 flex-1 max-w-40'>
              <div className='flex items-center gap-1 min-w-0'>
                <User className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-sm font-medium'>
                  {member.username}
                </span>
              </div>
              {/* {member.userId === currentUserId && (
                <span className='text-xs text-muted-foreground'>(you)</span>
              )} */}
              <div className='flex items-center gap-1 min-w-0'>
                <Mail className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-2xs text-muted-foreground'>
                  {member.email}
                </span>
              </div>
            </div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: false,
      accessorFn: (row) => row.username,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Email' />
      ),
      cell: ({ row }) => {
        const email = row.original.email
        return (
          <div className='flex items-center gap-1'>
            <Mail className='size-3 text-muted-foreground shrink-0' />
            <span className='truncate text-xs'>{email}</span>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Role' />
      ),
      cell: ({ row }) => {
        const role = row.original.role
        return (
          <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
            {role === 'admin' ? (
              <ShieldIcon className='h-3 w-3' />
            ) : (
              <UserIcon className='h-3 w-3' />
            )}
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        )
      },
      enableSorting: true,
      enableHiding: false,
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(rowValue)
      },
    },
    {
      accessorKey: 'joinedVia',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Joined Via' />
      ),
      cell: ({ row }) => {
        const joinedVia = row.original.joinedVia
        const date = row.original.joinedAt
        const formatted = formatTime(
          typeof date === 'string' ? date : date?.toISOString() || '',
          false
        )

        const Icon =
          joinedVia === 'invite_code'
            ? KeyRound
            : joinedVia === 'invite_email'
              ? MailPlus
              : joinedVia === 'signup'
                ? UserPlus
                : UserIcon

        return (
          <div className='flex flex-col gap-0.5 text-xs'>
            <Badge variant='outline' className='w-fit'>
              <Icon className='size-3 mr-1' />
              {joinedViaLabel(joinedVia)}
            </Badge>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(rowValue)
      },
    },
    {
      accessorKey: 'invitedByName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Invited By' />
      ),
      cell: ({ row }) => {
        const invitedByName = row.original.invitedByName
        return (
          <div className='flex items-center gap-1 text-xs'>
            <UserRoundPlus className='size-3 text-muted-foreground' />
            <span>{invitedByName || '-'}</span>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        const rowValue = (row.getValue(id) as string | undefined) || ''
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.includes(rowValue)
      },
    },

    {
      accessorKey: 'joinedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Joined At' />
      ),
      cell: ({ row }) => {
        const isRelative = false
        const date = row.original.joinedAt
        if (!date) {
          return <span className='text-muted-foreground text-xs'>Unknown</span>
        }

        const formatted = formatTime(
          typeof date === 'string' ? date : date?.toISOString() || '',
          isRelative
        )

        return (
          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
            <div className='flex flex-col text-muted-foreground!'>
              <span className='font-mono'>
                {formatted.date}
                {!isRelative ? ',' : ''}
              </span>
              {!isRelative && date && (
                <span className='opacity-70'>{formatted.time}</span>
              )}
            </div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'lastSignedInAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Last Signed In' />
      ),
      cell: ({ row }) => {
        const isRelative = false
        const date = row.original.lastSignedInAt
        if (!date) {
          return <span className='text-muted-foreground text-xs'>Never</span>
        }

        const formatted = formatTime(
          typeof date === 'string' ? date : date?.toISOString() || '',
          isRelative
        )

        return (
          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
            <div className='flex flex-col text-muted-foreground!'>
              <span className='font-mono'>
                {formatted.date}
                {!isRelative ? ',' : ''}
              </span>
              {!isRelative && date && (
                <span className='opacity-70'>{formatted.time}</span>
              )}
            </div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true,
    },
  ]

  if (isAdmin) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onUpdate={onUpdate}
        />
      ),
    })
  }

  return columns
}
