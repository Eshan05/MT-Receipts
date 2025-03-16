'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '../data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import { EventEntry } from './schema'
import { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import {
  Mail,
  Phone,
  Clock,
  CreditCard,
  User,
  Receipt,
  RotateCcw,
} from 'lucide-react'
import { defaultIcons, iconMap } from '@/utils/mappings'
import type { IconType } from 'react-icons'
import { createElement } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const columns: ColumnDef<EventEntry>[] = [
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
    accessorKey: 'receiptNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Receipt #' />
    ),
    cell: ({ row }) => {
      const receiptNumber = row.original.receiptNumber
      return (
        <div className='flex items-center gap-1.5'>
          <Receipt className='size-3.5 text-muted-foreground' />
          <span className='font-mono text-xs'>{receiptNumber || '-'}</span>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'customer',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Customer' />
    ),
    cell: ({ row }) => {
      const customer = row.original.customer
      return (
        <div className='flex flex-col gap-0.5 min-w-[150px]'>
          <span className='font-medium truncate'>{customer.name}</span>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span className='truncate max-w-[120px]'>{customer.email}</span>
            {customer.phone && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Phone className='size-3 shrink-0' />
                  </TooltipTrigger>
                  <TooltipContent>{customer.phone}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: false,
    accessorFn: (row) => row.customer.name,
  },
  {
    accessorKey: 'items',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Items' />
    ),
    cell: ({ row }) => {
      const items = row.original.items
      return (
        <div className='flex flex-wrap gap-1 max-w-[200px]'>
          {items.map((item, index) => {
            const Icon = getIconForName(item.name)
            return (
              <Badge
                key={`${item.name}-${index}`}
                variant='secondary'
                className='gap-1 text-xs font-normal'
              >
                {createElement(Icon, { className: 'size-3' })}
                <span className='truncate max-w-[60px]'>{item.name}</span>
                <span className='text-muted-foreground'>x{item.quantity}</span>
              </Badge>
            )
          })}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total' />
    ),
    cell: ({ row }) => {
      const amount = row.original.totalAmount
      return (
        <span className='font-medium tabular-nums'>
          {formatCurrency(amount)}
        </span>
      )
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'paymentMethod',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Payment' />
    ),
    cell: ({ row }) => {
      const method = row.original.paymentMethod
      if (!method) return <span className='text-muted-foreground'>-</span>
      const methodStyles: Record<string, string> = {
        cash: 'bg-green-500/10 text-green-600 border-green-500/30',
        upi: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
        card: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
        other: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
      }
      return (
        <Badge variant='outline' className={methodStyles[method] || ''}>
          <CreditCard className='size-3 mr-1' />
          {method.toUpperCase()}
        </Badge>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const entry = row.original

      if (entry.refunded) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant='outline'
                  className='bg-orange-500/10 text-orange-600 border-orange-500/30'
                >
                  <RotateCcw className='size-3 mr-1' />
                  Refunded
                </Badge>
              </TooltipTrigger>
              {entry.refundReason && (
                <TooltipContent>{entry.refundReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )
      }

      if (entry.emailSent) {
        return (
          <Badge
            variant='outline'
            className='bg-green-500/10 text-green-600 border-green-500/30'
          >
            <Mail className='size-3 mr-1' />
            Sent
          </Badge>
        )
      }
      if (entry.emailError) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant='outline'
                  className='bg-red-500/10 text-red-600 border-red-500/30'
                >
                  <Mail className='size-3 mr-1' />
                  Failed
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{entry.emailError}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }
      return (
        <Badge
          variant='outline'
          className='bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
        >
          <Mail className='size-3 mr-1' />
          Pending
        </Badge>
      )
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => {
      const date = row.original.createdAt
      return (
        <div className='flex items-center gap-1 text-sm text-muted-foreground'>
          <Clock className='size-3' />
          <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'emailSentAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Email Sent At' />
    ),
    cell: ({ row }) => {
      const date = row.original.emailSentAt
      if (!date) return <span className='text-muted-foreground'>-</span>
      return (
        <span className='text-sm text-muted-foreground'>
          {formatDistanceToNow(date, { addSuffix: true })}
        </span>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'createdBy',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created By' />
    ),
    cell: ({ row }) => {
      const userId = row.original.createdBy
      if (!userId) return <span className='text-muted-foreground'>-</span>
      return (
        <div className='flex items-center gap-1.5'>
          <User className='size-3 text-muted-foreground' />
          <span className='text-xs font-mono'>{userId.slice(-6)}</span>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
