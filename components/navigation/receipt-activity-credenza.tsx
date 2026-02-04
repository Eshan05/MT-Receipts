'use client'

import * as React from 'react'
import useSWR from 'swr'
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { DataTablePagination } from '@/components/table/data-table-pagination'
import { DataTableColumnHeader } from '@/components/table/data-table-column-header'
import { DataTableFacetedFilter } from '@/components/table/data-table-faceted-filter'
import { DataTableViewOptions } from '@/components/table/data-table-view-options'
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Mail,
  RefreshCw,
  Search,
  UserIcon,
  X,
} from 'lucide-react'
import { formatTime } from '@/utils/formatters'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface ReceiptEmailLogEntry {
  id: string
  receiptNumber: string
  sentTo: string
  sentAt: string | Date
  sentByName: string
  smtpSender: string
  downloadUrl: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.json() as Promise<T>
}

const idToName: Record<string, string> = {
  receiptNumber: 'Receipt #',
  sentTo: 'Sent To',
  sentByName: 'Sent By',
  smtpSender: 'SMTP Sender',
  sentAt: 'Sent At',
}

export function ReceiptActivityCredenza({ open, onOpenChange }: Props) {
  const { data, isLoading, isValidating, mutate } = useSWR<{
    logs: ReceiptEmailLogEntry[]
  }>(open ? '/api/receipts/emails?limit=300' : null, fetcher)

  const logs = React.useMemo(() => data?.logs || [], [data])

  const columns = React.useMemo<ColumnDef<ReceiptEmailLogEntry>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
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
        cell: ({ row }) => (
          <span className='font-mono text-xs'>
            {row.original.receiptNumber}
          </span>
        ),
      },
      {
        accessorKey: 'sentTo',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sent To' />
        ),
        cell: ({ row }) => (
          <div className='flex items-center gap-1 text-xs'>
            <Mail className='size-3 text-muted-foreground' />
            <span className='truncate max-w-56'>{row.original.sentTo}</span>
          </div>
        ),
      },
      {
        accessorKey: 'sentByName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sent By' />
        ),
        cell: ({ row }) => (
          <div className='flex items-center gap-1 text-xs'>
            <UserIcon className='size-3 text-muted-foreground' />
            <span>{row.original.sentByName}</span>
          </div>
        ),
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string
          const filterValue = value as string[]
          if (!filterValue || filterValue.length === 0) return true
          return filterValue.includes(rowValue)
        },
      },
      {
        accessorKey: 'smtpSender',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='SMTP Sender' />
        ),
        cell: ({ row }) => (
          <Badge variant='outline' className='text-xs font-normal'>
            {row.original.smtpSender}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string
          const filterValue = value as string[]
          if (!filterValue || filterValue.length === 0) return true
          return filterValue.includes(rowValue)
        },
      },
      {
        accessorKey: 'sentAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Sent At' />
        ),
        cell: ({ row }) => {
          const value = row.original.sentAt
          const formatted = formatTime(
            typeof value === 'string' ? value : value?.toISOString() || '',
            false
          )
          return (
            <div className='text-xs text-muted-foreground'>
              <span className='font-mono'>{formatted.date}</span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: () => 'PDF',
        cell: ({ row }) => (
          <Button variant='outline' size='sm' asChild className='h-7 gap-1'>
            <a href={row.original.downloadUrl} target='_blank' rel='noreferrer'>
              <Download className='size-3' />
              Download
            </a>
          </Button>
        ),
      },
    ],
    []
  )

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: 'sentAt',
      desc: true,
    },
  ])

  const table = useReactTable({
    data: logs,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original as ReceiptEmailLogEntry)

  const exportRows =
    selectedRows.length > 0
      ? selectedRows
      : (table
          .getFilteredRowModel()
          .rows.map((row) => row.original) as ReceiptEmailLogEntry[])

  const exportToCSV = () => {
    if (!exportRows.length) {
      toast.error('No rows to export')
      return
    }

    const csvData = exportRows.map((row) => ({
      receiptNumber: row.receiptNumber,
      sentTo: row.sentTo,
      sentBy: row.sentByName,
      smtpSender: row.smtpSender,
      sentAt:
        typeof row.sentAt === 'string'
          ? row.sentAt
          : row.sentAt?.toISOString() || '',
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((record) =>
        Object.values(record)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-delivery-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${csvData.length} rows to CSV`)
  }

  const exportToJSON = () => {
    if (!exportRows.length) {
      toast.error('No rows to export')
      return
    }

    const blob = new Blob([JSON.stringify(exportRows, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-delivery-log-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${exportRows.length} rows to JSON`)
  }

  const isFiltered = table.getState().columnFilters.length > 0

  const sentByOptions = Array.from(
    new Set(logs.map((item) => item.sentByName).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value, icon: UserIcon }))

  const senderOptions = Array.from(
    new Set(logs.map((item) => item.smtpSender).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value, icon: Mail }))

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-6xl'>
        <CredenzaHeader>
          <CredenzaTitle>Receipt Delivery Log</CredenzaTitle>
          <CredenzaDescription>
            Track who sent receipts, which SMTP sender was used, and when they
            were delivered.
          </CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody className='space-y-4'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex flex-1 items-center gap-2 flex-wrap'>
              <div className='relative'>
                <Input
                  placeholder='Search receipt...'
                  value={
                    (table
                      .getColumn('receiptNumber')
                      ?.getFilterValue() as string) ?? ''
                  }
                  onChange={(event) =>
                    table
                      .getColumn('receiptNumber')
                      ?.setFilterValue(event.target.value)
                  }
                  className='h-7 w-[150px] peer ps-7'
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                  <Search size={12} />
                </div>
              </div>
              <div className='relative'>
                <Input
                  placeholder='Search recipient...'
                  value={
                    (table.getColumn('sentTo')?.getFilterValue() as string) ??
                    ''
                  }
                  onChange={(event) =>
                    table
                      .getColumn('sentTo')
                      ?.setFilterValue(event.target.value)
                  }
                  className='h-7 w-[200px] peer ps-7'
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                  <Search size={12} />
                </div>
              </div>
              {table.getColumn('sentByName') && sentByOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn('sentByName')}
                  title='Sent By'
                  options={sentByOptions}
                />
              )}
              {table.getColumn('smtpSender') && senderOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn('smtpSender')}
                  title='SMTP Sender'
                  options={senderOptions}
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

          <div className='rounded-md border'>
            <ScrollArea className='w-full'>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className='h-24 text-center'
                      >
                        Loading delivery logs...
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className='h-24 text-center'
                      >
                        No delivery logs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation='horizontal' />
            </ScrollArea>
          </div>
          <DataTablePagination table={table} />

          <div className='flex items-center gap-2 justify-end'>
            <Button
              size='sm'
              variant='outline'
              className='gap-1.5'
              onClick={() => void mutate()}
              disabled={isValidating}
            >
              <RefreshCw
                className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='gap-1.5'
              onClick={exportToCSV}
            >
              <FileSpreadsheet className='w-4 h-4' />
              Export CSV
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='gap-1.5'
              onClick={exportToJSON}
            >
              <FileJson className='w-4 h-4' />
              Export JSON
            </Button>
          </div>
        </CredenzaBody>
      </CredenzaContent>
    </Credenza>
  )
}
