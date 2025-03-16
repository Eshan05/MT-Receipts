'use client'
'use no memo'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table } from '@tanstack/react-table'
import {
  Banknote,
  CircleCheck,
  CircleDot,
  CircleSlash,
  CreditCard,
  RotateCcw,
  Search,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react'
import { DataTableFacetedFilter } from '../data-table-faceted-filter'
import { DataTableViewOptions } from '../data-table-view-options'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const paymentMethodOptions = [
  { label: 'Cash', value: 'cash', icon: Banknote },
  { label: 'UPI', value: 'upi', icon: Smartphone },
  { label: 'Card', value: 'card', icon: CreditCard },
  { label: 'Other', value: 'other', icon: Wallet },
]

const statusOptions = [
  { label: 'Sent', value: 'sent', icon: CircleCheck },
  { label: 'Pending', value: 'pending', icon: CircleDot },
  { label: 'Failed', value: 'failed', icon: CircleSlash },
  { label: 'Refunded', value: 'refunded', icon: RotateCcw },
]

const idToName: Record<string, string> = {
  receiptNumber: 'Receipt #',
  customer: 'Customer',
  items: 'Items',
  totalAmount: 'Total',
  paymentMethod: 'Payment Method',
  status: 'Status',
  createdAt: 'Created At',
  emailSentAt: 'Email Sent At',
  createdBy: 'Created By',
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
            placeholder='Search customers...'
            value={
              (table.getColumn('customer')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn('customer')?.setFilterValue(event.target.value)
            }
            className='h-7 w-[150px] lg:w-[200px] peer ps-7'
          />
          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
            <Search size={12} />
          </div>
        </div>
        {table.getColumn('paymentMethod') && (
          <DataTableFacetedFilter
            column={table.getColumn('paymentMethod')}
            title='Payment'
            options={paymentMethodOptions}
          />
        )}
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
