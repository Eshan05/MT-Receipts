'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileJson, FileSpreadsheet, Mail, X } from 'lucide-react'
import { UserRow } from './schema'
import { toast } from 'sonner'

interface DataTableBulkActionsProps {
  selectedUsers: UserRow[]
  onClearSelection: () => void
}

export function DataTableBulkActions({
  selectedUsers,
  onClearSelection,
}: DataTableBulkActionsProps) {
  const selectedCount = selectedUsers.length

  if (selectedCount === 0) return null

  const exportSelectedToCSV = () => {
    const csvData = selectedUsers.map((user) => ({
      username: user.username,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      membershipCount: user.membershipCount,
      organizations: user.organizationNames.join('; '),
      createdAt: user.createdAt,
      lastSignIn: user.lastSignIn || '',
    }))

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
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
    anchor.download = `users-selected-${new Date().toISOString().split('T')[0]}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportSelectedToJSON = () => {
    const blob = new Blob([JSON.stringify(selectedUsers, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `users-selected-${new Date().toISOString().split('T')[0]}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const copyEmails = async () => {
    const emails = selectedUsers.map((user) => user.email).join(', ')
    await navigator.clipboard.writeText(emails)
    toast.success('Selected emails copied')
  }

  return (
    <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50'>
      <div className='flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg'>
        <Badge variant='secondary' className='gap-1'>
          {selectedCount} <span className='max-md:hidden'>selected</span>
        </Badge>

        <Button
          size='sm'
          variant='ghost'
          className='h-7 px-2'
          onClick={onClearSelection}
        >
          <X className='w-3 h-3' />
          <span className='max-md:hidden'>Clear</span>
        </Button>

        <Button
          size='sm'
          variant='outline'
          className='h-7 gap-1'
          onClick={() => void copyEmails()}
        >
          <Mail className='w-3 h-3' />
          <span className='max-md:hidden'>Copy Emails</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='sm' variant='outline' className='h-7 gap-1'>
              <FileSpreadsheet className='w-3 h-3' />
              <span className='max-md:hidden'>Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={exportSelectedToCSV}>
              <FileSpreadsheet className='w-3 h-3 mr-2' />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportSelectedToJSON}>
              <FileJson className='w-3 h-3 mr-2' />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
