'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ShieldIcon, UserIcon, UserMinus, X, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Member } from './schema'
import { useAuth } from '@/contexts/AuthContext'

interface DataTableBulkActionsProps {
  selectedMembers: Member[]
  currentUserId?: string
  onClearSelection: () => void
  onUpdate: () => void
  mode?: 'tenant' | 'superadmin'
  organizationSlug?: string
}

export function DataTableBulkActions({
  selectedMembers,
  currentUserId,
  onClearSelection,
  onUpdate,
  mode = 'tenant',
  organizationSlug,
}: DataTableBulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { currentOrganization } = useAuth()
  const targetSlug = organizationSlug ?? currentOrganization?.slug
  const apiBase =
    mode === 'superadmin' ? '/api/admins/organizations' : '/api/organizations'

  const selectedCount = selectedMembers.length
  const userIds = selectedMembers.map((m) => m.userId)

  const nonCurrentUserMembers = selectedMembers.filter(
    (m) => m.userId !== currentUserId
  )
  const canRemove = nonCurrentUserMembers.length > 0
  const hasNonAdmins = selectedMembers.some((m) => m.role !== 'admin')
  const hasAdmins = selectedMembers.some((m) => m.role === 'admin')

  const handleBulkRoleChange = async (newRole: 'admin' | 'member') => {
    if (!targetSlug) return

    setIsProcessing(`change to ${newRole}`)
    try {
      const res = await fetch(`${apiBase}/${targetSlug}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, role: newRole }),
      })

      if (res.ok) {
        toast.success(`Updated ${selectedCount} members to ${newRole}`)
        onUpdate()
        onClearSelection()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update roles')
      }
    } catch {
      toast.error('Failed to update roles')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleBulkRemove = async () => {
    if (!targetSlug) return

    const membersToRemove = nonCurrentUserMembers.map((m) => m.userId)
    if (membersToRemove.length === 0) return

    setIsProcessing('remove')
    try {
      const res = await fetch(`${apiBase}/${targetSlug}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: membersToRemove }),
      })

      if (res.ok) {
        toast.success(`Removed ${membersToRemove.length} members`)
        setDeleteDialogOpen(false)
        onUpdate()
        onClearSelection()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove members')
      }
    } catch {
      toast.error('Failed to remove members')
    } finally {
      setIsProcessing(null)
    }
  }

  if (selectedCount === 0) return null

  return (
    <>
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

          <div className='w-px h-5 bg-border mx-1' />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-7 gap-1'
                disabled={isProcessing !== null}
              >
                <ShieldIcon className='w-3 h-3' />
                <span className='max-md:hidden'>Role</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => handleBulkRoleChange('admin')}
                disabled={!hasNonAdmins || isProcessing !== null}
              >
                <ShieldIcon className='w-3 h-3 mr-2' />
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleBulkRoleChange('member')}
                disabled={!hasAdmins || isProcessing !== null}
              >
                <UserIcon className='w-3 h-3 mr-2' />
                Make Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size='sm'
            variant='destructive'
            className='h-7 gap-1'
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!canRemove || isProcessing !== null}
          >
            {isProcessing === 'remove' ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <UserMinus className='w-3 h-3' />
            )}
            <span className='max-md:hidden'>Remove</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {nonCurrentUserMembers.length} Members
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {nonCurrentUserMembers.length}{' '}
              member{nonCurrentUserMembers.length > 1 ? 's' : ''} from this
              organization? They will lose access immediately.
              {selectedMembers.some((m) => m.userId === currentUserId) && (
                <span className='block mt-2 text-muted-foreground'>
                  Note: You cannot remove yourself from bulk actions.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing === 'remove'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90'
              onClick={handleBulkRemove}
              disabled={isProcessing === 'remove'}
            >
              {isProcessing === 'remove' ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
