'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '../data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import { EventEntry } from './schema'
import { ColumnDef } from '@tanstack/react-table'
import { formatTime, formatPaymentMethod } from '@/utils/formatters'
import {
  Banknote,
  CircleCheck,
  CircleDot,
  CircleSlash,
  Clock,
  CreditCard,
  Mail,
  Phone,
  Receipt,
  RotateCcw,
  Smartphone,
  User,
  Wallet,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { IEvent } from '@/models/event.model'

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

interface ColumnOptions {
  event: IEvent
  onUpdate?: () => void
}

export function createColumns({
  event,
  onUpdate,
}: ColumnOptions): ColumnDef<EventEntry>[] {
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
      accessorKey: 'customer',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title='Customer'
          className='md:ml-1 ml-2'
        />
      ),
      cell: ({ row }) => {
        const customer = row.original.customer
        const avatarUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(customer.name)}`
        return (
          <div className='flex items-center gap-2 min-w-0 max-w-50'>
            <img
              src={avatarUrl}
              alt={customer.name}
              className='size-7 rounded-full shrink-0 bg-muted'
            />
            <div className='flex flex-col min-w-0 flex-1'>
              <div className='flex items-center gap-1 min-w-0'>
                <User className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-sm font-medium'>
                  {customer.name}
                </span>
              </div>
              <div className='flex items-center gap-1 min-w-0'>
                <Mail className='size-3 text-muted-foreground shrink-0' />
                <span className='truncate text-xs text-muted-foreground'>
                  {customer.email}
                </span>
              </div>
            </div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: false,
      accessorFn: (row) => row.customer.name,
    },
    {
      accessorKey: 'customerPhone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Phone' />
      ),
      accessorFn: (row) => row.customer.phone || '',
      cell: ({ row }) => {
        const phone = row.original.customer.phone
        if (!phone) return <span className='text-muted-foreground'>-</span>
        return <span className='font-mono text-xs'>{phone}</span>
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      accessorKey: 'receiptNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Receipt #' />
      ),
      cell: ({ row }) => {
        const receiptNumber = row.original.receiptNumber
        const date = row.original.createdAt
        const formatted = formatTime(
          typeof date === 'string' ? date : date?.toISOString() || '',
          true
        )
        return (
          <div className='flex flex-col gap-0.5'>
            <div className='flex items-center gap-1'>
              <Receipt className='size-3 text-muted-foreground' />
              <span className='font-mono text-xs'>{receiptNumber || '-'}</span>
            </div>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Clock className='size-3' />
              <span>{formatted.date}</span>
            </div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'items',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Items' />
      ),
      cell: ({ row }) => {
        const items = row.original.items
        const visibleItems = items.slice(0, 2)
        const remainingItems = items.slice(2)

        if (items.length <= 2) {
          return (
            <div className='flex flex-wrap gap-1 max-w-50 w-min'>
              {items.map((item, index) => {
                const Icon = getIconForName(item.name)
                return (
                  <Badge
                    key={`${item.name}-${index}`}
                    variant='secondary'
                    title={`${item.name} x${item.quantity}`}
                    className='gap-1 text-tiny font-normal whitespace-nowrap'
                  >
                    {createElement(Icon, { className: 'size-3' })}
                    <span className='truncate max-w-14'>{item.name}</span>
                    <span className='text-muted-foreground'>
                      x{item.quantity}
                    </span>
                  </Badge>
                )
              })}
            </div>
          )
        }

        return (
          <div className='flex flex-wrap gap-1 max-w-50 max-sm:max-60'>
            {visibleItems.map((item, index) => {
              const Icon = getIconForName(item.name)
              return (
                <Badge
                  key={`${item.name}-${index}`}
                  variant='secondary'
                  className='gap-1 text-xs font-normal whitespace-nowrap'
                >
                  {createElement(Icon, { className: 'size-3' })}
                  <span className='truncate max-w-14'>{item.name}</span>
                  <span className='text-muted-foreground'>
                    x{item.quantity}
                  </span>
                </Badge>
              )
            })}
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant='outline'
                  className='gap-1 text-xs font-normal cursor-pointer hover:bg-muted whitespace-nowrap'
                >
                  +{remainingItems.length}
                  {remainingItems.slice(0, 2).map((item, index) => {
                    const Icon = getIconForName(item.name)
                    return createElement(Icon, {
                      key: index,
                      className: 'size-3',
                    })
                  })}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className='w-56 p-1.5'>
                <div className='px-2 py-1.5 border-b border-border/50'>
                  <p className='text-xs font-medium'>All Items</p>
                </div>
                <div>
                  {items.map((item, idx) => {
                    const Icon = getIconForName(item.name)
                    return (
                      <div
                        key={idx}
                        className='px-2 py-1 flex items-center gap-1.5 rounded hover:bg-muted/50'
                      >
                        {createElement(Icon, {
                          className: 'size-3 text-muted-foreground shrink-0',
                        })}
                        <span className='text-xs flex-1 truncate'>
                          {item.name}
                        </span>
                        <span className='text-xs text-muted-foreground font-mono'>
                          ${item.price}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          x{item.quantity}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: 'itemNames',
      header: () => null,
      accessorFn: (row) => row.items.map((item) => item.name),
      cell: () => null,
      enableSorting: false,
      enableHiding: true,
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string[]
        const filterValue = value as string[]
        if (!filterValue || filterValue.length === 0) return true
        return filterValue.some((item) => rowValue.includes(item))
      },
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
        const methodConfig: Record<
          string,
          { style: string; icon: typeof Banknote }
        > = {
          cash: {
            style: 'bg-green-500/10 text-green-600 border-green-500/30',
            icon: Banknote,
          },
          upi: {
            style: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
            icon: Smartphone,
          },
          card: {
            style: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
            icon: CreditCard,
          },
          other: {
            style: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
            icon: Wallet,
          },
        }
        const config = methodConfig[method] || methodConfig.other
        const Icon = config.icon
        return (
          <Badge variant='outline' className={config.style}>
            <Icon className='size-3 mr-0.5' />
            {formatPaymentMethod(method)}
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
      accessorFn: (row) => {
        if (row.refunded) return 'refunded'
        if (row.emailSent) return 'sent'
        if (row.emailError) return 'failed'
        return 'pending'
      },
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
              className='bg-green-500/30 text-green-600 border-green-500/30'
            >
              <CircleCheck className='size-3 mr-1' />
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
                    className='bg-red-500/30 text-red-600 border-red-500/30'
                  >
                    <CircleSlash className='size-3 mr-1' />
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
            <CircleDot className='size-3 mr-0.5' />
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
        const isRelative = false
        const formatted = formatTime(
          typeof date === 'string' ? date : date?.toISOString() || '',
          isRelative
        )
        return (
          <div className='flex items-center gap-1 text-xs'>
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
      accessorKey: 'emailSentAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Email Sent At' />
      ),
      cell: ({ row }) => {
        const date = row.original.emailSentAt
        if (!date) return <span className='text-muted-foreground'>-</span>
        const isRelative = false
        const formatted = formatTime(
          typeof date === 'string' ? date : date?.toISOString() || '',
          isRelative
        )
        return (
          <div className='flex items-center gap-1 text-xs'>
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
      cell: ({ row }) => (
        <DataTableRowActions row={row} event={event} onUpdate={onUpdate} />
      ),
    },
  ]
}
