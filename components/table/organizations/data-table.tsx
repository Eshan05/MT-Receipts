'use client'

import * as React from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '../data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { OrganizationRow } from './schema'
import { Button } from '@/components/ui/button'
import { FileJson, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onAction: (
    slug: string,
    action: 'approve' | 'suspend' | 'restore' | 'delete'
  ) => Promise<void>
  onUpdate: () => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onAction,
  onUpdate,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      slug: false,
      restoreInDays: false,
    })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: 'createdAt',
      desc: true,
    },
  ])

  const table = useReactTable({
    data,
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

  const exportRows = table
    .getFilteredRowModel()
    .rows.map((row) => row.original as OrganizationRow)

  const exportToCSV = () => {
    if (!exportRows.length) {
      toast.error('No rows to export')
      return
    }

    const csvData = exportRows.map((organization) => ({
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      memberCount: organization.memberCount,
      createdBy: organization.createdBy?.username || '',
      createdByEmail: organization.createdBy?.email || '',
      approvedBy: organization.approvedBy?.username || '',
      approvedByEmail: organization.approvedBy?.email || '',
      createdAt: organization.createdAt,
      approvedAt: organization.approvedAt || '',
      restoreBefore: organization.restoresBefore || '',
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `organizations-${new Date().toISOString().split('T')[0]}.csv`
    anchor.click()
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
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `organizations-${new Date().toISOString().split('T')[0]}.json`
    anchor.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${exportRows.length} rows to JSON`)
  }

  return (
    <>
      <div className='space-y-4'>
        <DataTableToolbar table={table} />
        <div className='rounded-md'>
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
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
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
                      className='h-18 text-center'
                    >
                      No organizations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>
        <DataTablePagination table={table} />
      </div>

      <div className='flex items-center gap-2 justify-end'>
        <Button
          size='sm'
          variant='outline'
          className='gap-1.5'
          onClick={() => void onUpdate()}
        >
          <RefreshCw className='w-4 h-4' />
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

      <DataTableBulkActions
        selectedOrganizations={table
          .getSelectedRowModel()
          .rows.map((row) => row.original as OrganizationRow)}
        onClearSelection={() => setRowSelection({})}
        onAction={onAction}
        onUpdate={onUpdate}
      />
    </>
  )
}
