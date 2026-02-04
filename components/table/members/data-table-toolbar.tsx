'use client'
'use no memo'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table } from '@tanstack/react-table'
import {
  Search,
  X,
  ShieldIcon,
  UserIcon,
  KeyRound,
  MailPlus,
  UserPlus,
  UserRoundPlus,
} from 'lucide-react'
import { DataTableFacetedFilter } from '../data-table-faceted-filter'
import { DataTableViewOptions } from '../data-table-view-options'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const roleOptions = [
  { label: 'Admin', value: 'admin', icon: ShieldIcon },
  { label: 'Member', value: 'member', icon: UserIcon },
]

const joinedViaOptions = [
  { label: 'Code', value: 'invite_code', icon: KeyRound },
  { label: 'Email', value: 'invite_email', icon: MailPlus },
  { label: 'Signup', value: 'signup', icon: UserPlus },
  { label: 'Manual', value: 'manual', icon: UserIcon },
]

const idToName: Record<string, string> = {
  user: 'User',
  email: 'Email',
  role: 'Role',
  invitedByName: 'Invited By',
  joinedVia: 'Joined Via',
  joinedAt: 'Joined',
  lastSignedInAt: 'Last Signed In',
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const inviterOptions = Array.from(
    new Set(
      table
        .getPreFilteredRowModel()
        .rows.map(
          (row) =>
            (row.original as { invitedByName?: string }).invitedByName || ''
        )
        .filter(Boolean)
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      label: name,
      value: name,
      icon: UserRoundPlus,
    }))

  return (
    <div className='flex items-center justify-between gap-2'>
      <div className='flex flex-1 items-center gap-2 flex-wrap'>
        <div className='relative'>
          <Input
            placeholder='Search users...'
            value={(table.getColumn('user')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('user')?.setFilterValue(event.target.value)
            }
            className='h-7 w-[150px] lg:w-[200px] peer ps-7'
          />
          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
            <Search size={12} />
          </div>
        </div>
        <div className='relative'>
          <Input
            placeholder='Search email...'
            value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('email')?.setFilterValue(event.target.value)
            }
            className='h-7 w-[150px] lg:w-[180px] peer ps-7'
          />
          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
            <Search size={12} />
          </div>
        </div>
        {table.getColumn('role') && (
          <DataTableFacetedFilter
            column={table.getColumn('role')}
            title='Role'
            options={roleOptions}
          />
        )}
        {table.getColumn('joinedVia') && (
          <DataTableFacetedFilter
            column={table.getColumn('joinedVia')}
            title='Joined Via'
            options={joinedViaOptions}
          />
        )}
        {table.getColumn('invitedByName') && inviterOptions.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn('invitedByName')}
            title='Invited By'
            options={inviterOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            Reset
            <X className='ml-2 size-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions
        table={table}
        idToName={idToName}
        scrollHeight='h-fit'
      />
    </div>
  )
}
