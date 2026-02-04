'use client'

import { Row } from '@tanstack/react-table'
import { MoreHorizontal, ShieldIcon, UserIcon, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Member } from './schema'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  isAdmin: boolean
  currentUserId?: string
  onUpdate?: () => void
}

export function DataTableRowActions<TData>({
  row,
  isAdmin,
  currentUserId,
  onUpdate,
}: DataTableRowActionsProps<TData>) {
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const member = row.original as Member
  const { currentOrganization } = useAuth()
  const orgSlug = currentOrganization?.slug

  const isCurrentUser = member.userId === currentUserId

  const handleRoleChange = async (newRole: 'admin' | 'member') => {
    if (!orgSlug) return

    try {
      const res = await fetch(
        `/api/organizations/${orgSlug}/members/${member.userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      )

      if (res.ok) {
        toast.success('Role updated')
        onUpdate?.()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update role')
      }
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleRemove = async () => {
    if (!orgSlug) return

    setIsRemoving(true)
    try {
      const res = await fetch(
        `/api/organizations/${orgSlug}/members/${member.userId}`,
        {
          method: 'DELETE',
        }
      )

      if (res.ok) {
        toast.success('Member removed')
        setIsRemoveOpen(false)
        onUpdate?.()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove member')
      }
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setIsRemoving(false)
    }
  }

  if (!isAdmin) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          >
            <MoreHorizontal className='size-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-40'>
          {member.role === 'admin' ? (
            <DropdownMenuItem onClick={() => handleRoleChange('member')}>
              <UserIcon className='mr-1 size-3' />
              Make Member
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleRoleChange('admin')}>
              <ShieldIcon className='mr-1 size-3' />
              Make Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsRemoveOpen(true)}
            className='text-destructive focus:text-destructive'
            disabled={isCurrentUser}
          >
            <UserMinus className='mr-1 size-3' />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className='font-medium'>{member.username}</span> from this
              organization? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive! text-white hover:bg-destructive/90'
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
