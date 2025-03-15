'use client'

import { DropdownMenu as DDM } from 'radix-ui'
import { Table } from '@tanstack/react-table'
import { Settings2 } from 'lucide-react'

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
  return (
    <DropdownMenu>
      <DDM.DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto hidden h-8 lg:flex'
        >
          <Settings2 className='mr-2 h-3.5 w-3.5' />
          View
        </Button>
      </DDM.DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[150px]'>
        <ScrollArea className='h-72'>
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
