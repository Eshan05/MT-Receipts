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
  Package,
  RotateCcw,
  Search,
  Smartphone,
  Wallet,
  X,
  Phone,
} from 'lucide-react'
import { DataTableFacetedFilter } from '../data-table-faceted-filter'
import { DataTableViewOptions } from '../data-table-view-options'
import { IEvent } from '@/models/event.model'
import { defaultIcons, iconMap } from '@/utils/mappings'
import type { IconType } from 'react-icons'
import { createElement } from 'react'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  event: IEvent
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
  customerPhone: 'Phone',
  items: 'Items',
  itemNames: 'Item Names',
  totalAmount: 'Total',
  paymentMethod: 'Payment Method',
  status: 'Status',
  createdAt: 'Created At',
  emailSentAt: 'Email Sent At',
  createdBy: 'Created By',
}

function getIconForName(name: string): IconType {
  const normalizedName = name.toLowerCase().trim()
  if (iconMap[normalizedName]) {
    return iconMap[normalizedName]
  }
  const words = normalizedName.split(/\s+/)
  for (const word of words) {
    if (iconMap[word]) {
      return iconMap[word]
    }
  }
  const hashCode = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }
  return defaultIcons[
    Math.floor(Math.abs(hashCode(name)) % defaultIcons.length)
  ]
}

export function DataTableToolbar<TData>({
  table,
  event,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const itemOptions = event.items.map((item) => ({
    label: item.name,
    value: item.name,
    icon: getIconForName(item.name),
  }))

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
        <div className='relative'>
          <Input
            placeholder='Search phone...'
            value={
              (table.getColumn('customerPhone')?.getFilterValue() as string) ??
              ''
            }
            onChange={(event) =>
              table
                .getColumn('customerPhone')
                ?.setFilterValue(event.target.value)
            }
            className='h-7 w-[120px] peer ps-7'
          />
          <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
            <Phone size={12} />
          </div>
        </div>
        {table.getColumn('itemNames') && itemOptions.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn('itemNames')}
            title='Items'
            options={itemOptions}
            popoverWidth='w-xs'
          />
        )}
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
