'use client'
'use no memo'

import { Table } from '@tanstack/react-table'
import { Settings2 } from 'lucide-react'
import { DropdownMenu as DDM } from 'radix-ui'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  idToName: { [key: string]: string }
}

export function DataTableViewOptions<TData>({
  table,
  idToName,
}: DataTableViewOptionsProps<TData>) {
  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== 'undefined' && column.getCanHide()
    )

  return (
    <DropdownMenu>
      <DDM.DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto hidden h-7 lg:flex'
        >
          <Settings2 className='mr-1' />
          View
        </Button>
      </DDM.DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        <ScrollArea className='h-60'>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== 'undefined' && column.getCanHide()
            )
            .map((column) => {
              const columnName = idToName[column.id] || column.id
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className='capitalize'
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {columnName}
                </DropdownMenuCheckboxItem>
              )
            })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
