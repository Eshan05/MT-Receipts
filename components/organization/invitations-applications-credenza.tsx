'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Building2Icon,
  CheckCircleIcon,
  InboxIcon,
  Loader2Icon,
  SendIcon,
  XCircleIcon,
} from 'lucide-react'

import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface Invitation {
  id: string
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationLogo?: string
  role: 'admin' | 'member'
  expiresAt?: string
  createdAt: string
}

interface Application {
  id: string
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationLogo?: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

interface InvitationsApplicationsCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvitationsApplicationsCredenza({
  open,
  onOpenChange,
}: InvitationsApplicationsCredenzaProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/invitations')
      const data = await response.json()

      if (response.ok) {
        setInvitations(data || [])
        setApplications([])
      }
    } catch (error) {
      console.error('Failed to load invitations/applications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  const handleAcceptInvite = async (inviteId: string) => {
    setActionLoading(inviteId)
    try {
      const response = await fetch(`/api/invites/${inviteId}/accept`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      toast.success('Invitation accepted!')
      loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to accept invitation'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectInvite = async (inviteId: string) => {
    setActionLoading(inviteId)
    try {
      const response = await fetch(`/api/invites/${inviteId}/reject`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject invitation')
      }

      toast.success('Invitation rejected')
      loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reject invitation'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleWithdrawApplication = async (applicationId: string) => {
    setActionLoading(applicationId)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to withdraw application')
      }

      toast.success('Application withdrawn')
      loadData()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to withdraw application'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const getOrgAvatar = (name: string) => {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`
  }

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-lg'>
        <CredenzaHeader>
          <CredenzaTitle className='flex items-center gap-2'>
            <InboxIcon className='w-4 h-4' />
            Invitations & Applications
          </CredenzaTitle>
          <CredenzaDescription>
            Manage your organization invitations and membership applications.
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className='space-y-2'>
          <Tabs defaultValue='invited' className='w-full flex flex-col'>
            <TabsList className='w-full'>
              <TabsTrigger value='invited' className='flex-1 gap-1.5'>
                <SendIcon className='w-3.5 h-3.5' />
                Invited
                {invitations.length > 0 && (
                  <Badge
                    variant='secondary'
                    className='ml-1 h-4 px-1 text-[10px]'
                  >
                    {invitations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='applied' className='flex-1 gap-1.5'>
                <Building2Icon className='w-3.5 h-3.5' />
                Applied
                {applications.length > 0 && (
                  <Badge
                    variant='secondary'
                    className='ml-1 h-4 px-1 text-[10px]'
                  >
                    {applications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value='invited' className='mt-3 space-y-2'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2Icon className='w-6 h-6 animate-spin text-muted-foreground' />
                </div>
              ) : invitations.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground text-sm'>
                  No pending invitations
                </div>
              ) : (
                invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className='flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30'
                  >
                    <img
                      src={
                        invite.organizationLogo ||
                        getOrgAvatar(invite.organizationName)
                      }
                      alt={invite.organizationName}
                      className='w-10 h-10 rounded-full bg-muted shrink-0'
                    />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-sm truncate'>
                          {invite.organizationName}
                        </span>
                        <Badge variant='outline' className='text-[10px] h-4'>
                          {invite.role}
                        </Badge>
                      </div>
                      <p className='text-xs text-muted-foreground truncate'>
                        Invited to join as {invite.role}
                      </p>
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        className='text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                        onClick={() => handleAcceptInvite(invite.id)}
                        disabled={actionLoading === invite.id}
                      >
                        {actionLoading === invite.id ? (
                          <Loader2Icon className='w-3.5 h-3.5 animate-spin' />
                        ) : (
                          <CheckCircleIcon className='w-3.5 h-3.5' />
                        )}
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        className='text-destructive hover:text-destructive'
                        onClick={() => handleRejectInvite(invite.id)}
                        disabled={actionLoading === invite.id}
                      >
                        <XCircleIcon className='w-3.5 h-3.5' />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value='applied' className='mt-3 space-y-2'>
              {loading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2Icon className='w-6 h-6 animate-spin text-muted-foreground' />
                </div>
              ) : applications.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground text-sm'>
                  No pending applications
                </div>
              ) : (
                applications.map((app) => (
                  <div
                    key={app.id}
                    className='flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30'
                  >
                    <img
                      src={
                        app.organizationLogo ||
                        getOrgAvatar(app.organizationName)
                      }
                      alt={app.organizationName}
                      className='w-10 h-10 rounded-full bg-muted shrink-0'
                    />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-sm truncate'>
                          {app.organizationName}
                        </span>
                        <Badge
                          variant={
                            app.status === 'pending'
                              ? 'secondary'
                              : app.status === 'accepted'
                                ? 'default'
                                : 'destructive'
                          }
                          className='text-[10px] h-4'
                        >
                          {app.status}
                        </Badge>
                      </div>
                      <p className='text-xs text-muted-foreground truncate'>
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {app.status === 'pending' && (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-xs text-destructive hover:text-destructive shrink-0'
                        onClick={() => handleWithdrawApplication(app.id)}
                        disabled={actionLoading === app.id}
                      >
                        {actionLoading === app.id ? (
                          <Loader2Icon className='w-3.5 h-3.5 animate-spin mr-1' />
                        ) : null}
                        Withdraw
                      </Button>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CredenzaBody>

        <CredenzaFooter>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  )
}
