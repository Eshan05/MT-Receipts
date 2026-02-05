'use client'
'use no memo'

import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Search, Shield, X } from 'lucide-react'
import { DataTableFacetedFilter } from '../data-table-faceted-filter'
import { DataTableViewOptions } from '../data-table-view-options'
import { Button } from '@/components/ui/button'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const statusOptions = [
  { label: 'Pending', value: 'pending', icon: Shield },
  { label: 'Active', value: 'active', icon: Shield },
  { label: 'Suspended', value: 'suspended', icon: Shield },
  { label: 'Deleted', value: 'deleted', icon: Shield },
]

const idToName: Record<string, string> = {
  name: 'Name',
  slug: 'Slug',
  status: 'Status',
  memberCount: 'Members',
  createdAt: 'Created At',
  createdBy: 'Created By',
  approvedBy: 'Approved By',
  restoreInDays: 'Restore In (Days)',
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
            placeholder='Search organizations...'
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className='h-7 w-[200px] peer ps-7'
          />
          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
            <Search size={12} />
          </div>
        </div>
        <div className='relative'>
          <Input
            placeholder='Search slug...'
            value={(table.getColumn('slug')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('slug')?.setFilterValue(event.target.value)
            }
            className='h-7 w-[180px] peer ps-7'
          />
          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
            <Search size={12} />
          </div>
        </div>
        {table.getColumn('status') && (
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title='Status'
            options={statusOptions}
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
