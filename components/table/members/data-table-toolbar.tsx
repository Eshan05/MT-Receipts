'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table } from '@tanstack/react-table'
import { Search, X, ShieldIcon, UserIcon } from 'lucide-react'
import { DataTableFacetedFilter } from '../data-table-faceted-filter'
import { DataTableViewOptions } from '../data-table-view-options'
import { Member } from './schema'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const roleOptions = [
  { label: 'Admin', value: 'admin', icon: ShieldIcon },
  { label: 'Member', value: 'member', icon: UserIcon },
]

const idToName: Record<string, string> = {
  user: 'User',
  email: 'Email',
  role: 'Role',
  joinedAt: 'Joined',
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

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
