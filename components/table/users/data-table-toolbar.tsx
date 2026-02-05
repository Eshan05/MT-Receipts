'use client'

import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Building2, Search, Shield, UserCircle, X } from 'lucide-react'
import { DataTableFacetedFilter } from '../data-table-faceted-filter'
import { DataTableViewOptions } from '../data-table-view-options'
import { Button } from '@/components/ui/button'
import { UserRow } from './schema'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const statusOptions = [
  { label: 'Active', value: 'true', icon: UserCircle },
  { label: 'Inactive', value: 'false', icon: UserCircle },
]

const roleOptions = [
  { label: 'Superadmin', value: 'true', icon: Shield },
  { label: 'User', value: 'false', icon: UserCircle },
]

const idToName: Record<string, string> = {
  username: 'User',
  isActive: 'Status',
  isSuperAdmin: 'Role',
  organizationNames: 'Memberships',
  lastSignIn: 'Last Sign-In',
  createdAt: 'Created',
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const organizationOptions = Array.from(
    new Set(
      table
        .getPreFilteredRowModel()
        .rows.flatMap(
          (row) => (row.original as UserRow).organizationNames || []
        )
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      label: name,
      value: name,
      icon: Building2,
    }))

  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className='flex items-center justify-between gap-2'>
      <div className='flex flex-1 items-center gap-2 flex-wrap'>
        <div className='relative'>
          <Input
            placeholder='Search users...'
            value={
              (table.getColumn('username')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn('username')?.setFilterValue(event.target.value)
            }
            className='h-7 w-[200px] peer ps-7'
          />
          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
            <Search size={12} />
          </div>
        </div>
        {table.getColumn('isActive') && (
          <DataTableFacetedFilter
            column={table.getColumn('isActive')}
            title='Status'
            options={statusOptions}
          />
        )}
        {table.getColumn('isSuperAdmin') && (
          <DataTableFacetedFilter
            column={table.getColumn('isSuperAdmin')}
            title='Role'
            options={roleOptions}
          />
        )}
        {table.getColumn('organizationNames') &&
          organizationOptions.length > 0 && (
            <DataTableFacetedFilter
              column={table.getColumn('organizationNames')}
              title='Organization'
              options={organizationOptions}
              popoverWidth='w-xs'
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
