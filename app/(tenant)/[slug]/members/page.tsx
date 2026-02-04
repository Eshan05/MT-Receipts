'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  ArrowRight,
  UserPlusIcon,
  Loader2Icon,
  CalendarIcon,
  KeyRound,
  Mail,
  UserRoundPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DataTable,
  createColumns,
  type Member,
  type Invite,
} from '@/components/table/members'
import useSWR from 'swr'

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  return response.json() as Promise<T>
}

export default function MembersPage() {
  const { currentOrganization, user } = useAuth()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteType, setInviteType] = useState<'email' | 'code'>('email')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const isAdmin = currentOrganization?.role === 'admin'
  const orgSlug = currentOrganization?.slug
  const currentUserId = user?.id

  const membersEndpoint = orgSlug
    ? `/api/organizations/${orgSlug}/members`
    : null
  const invitesEndpoint = orgSlug
    ? `/api/organizations/${orgSlug}/invites`
    : null

  const {
    data: membersData,
    isLoading: membersLoading,
    mutate: mutateMembers,
  } = useSWR<{ members: Member[] }>(membersEndpoint, fetcher)

  const {
    data: invitesData,
    isLoading: invitesLoading,
    mutate: mutateInvites,
  } = useSWR<{ invites: Invite[] }>(invitesEndpoint, fetcher)

  const members = useMemo(() => membersData?.members || [], [membersData])
  const invites = useMemo(() => invitesData?.invites || [], [invitesData])
  const loading = membersLoading || invitesLoading

  const refreshData = async () => {
    await Promise.all([mutateMembers(), mutateInvites()])
  }

  const handleInvite = async () => {
    if (!inviteEmail && inviteType === 'email') {
      toast.error('Email is required')
      return
    }

    setInviteLoading(true)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: inviteType,
          organizationSlug: orgSlug,
          email: inviteType === 'email' ? inviteEmail : undefined,
          role: inviteRole,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (inviteType === 'code') {
          setGeneratedCode(data.code)
        } else {
          toast.success('Invitation sent!')
          setInviteOpen(false)
        }
        await refreshData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to send invitation')
      }
    } catch {
      toast.error('Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  if (!orgSlug) {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='text-muted-foreground'>No organization selected</p>
      </div>
    )
  }

  const columns = createColumns({
    isAdmin,
    currentUserId,
    onUpdate: () => {
      void refreshData()
    },
  })

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Members</h1>
          <p className='text-muted-foreground'>
            Manage your organization's members and invitations
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlusIcon className='h-4 w-4 mr-2' />
            Invite Member
          </Button>
        )}
      </div>

      {loading ? (
        <div className='flex items-center justify-center h-64'>
          <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={members}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            onUpdate={() => {
              void refreshData()
            }}
          />

          {invites.length > 0 && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold'>Pending Invitations</h2>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {invites.map((invite) => {
                  const isEmailInvite = invite.type === 'email'
                  const contactLabel = isEmailInvite
                    ? invite.email
                    : invite.code

                  return (
                    <div
                      key={invite._id}
                      className='rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors border-l-2 border-border'
                    >
                      <div className='px-3 py-1.5 flex items-center justify-between bg-muted/60'>
                        <div className='flex items-center gap-1.5'>
                          {isEmailInvite ? (
                            <Mail className='h-3 w-3 text-muted-foreground' />
                          ) : (
                            <KeyRound className='h-3 w-3 text-muted-foreground' />
                          )}
                          <span className='text-xs font-medium capitalize'>
                            {invite.type}
                          </span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <Badge variant='secondary' className='capitalize h-5'>
                            {invite.status}
                          </Badge>
                          <span className='text-tiny text-muted-foreground capitalize'>
                            {invite.role}
                          </span>
                        </div>
                      </div>

                      <div className='p-3'>
                        <div className='flex items-start gap-2.5'>
                          <div className='mt-0.5 p-1.5 rounded-md bg-background'>
                            {isEmailInvite ? (
                              <Mail className='h-4 w-4 text-muted-foreground' />
                            ) : (
                              <KeyRound className='h-4 w-4 text-muted-foreground' />
                            )}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <h3 className='font-medium text-sm truncate'>
                              {contactLabel || '-'}
                            </h3>
                            <p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
                              Invited by {invite.invitedByName || 'Unknown'}
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center justify-between mt-3 pt-2 border-t border-border/30'>
                          <div className='flex items-center gap-3 text-2xs text-muted-foreground'>
                            <span className='flex items-center gap-1'>
                              <UserRoundPlus className='h-3 w-3' />
                              {invite.invitedByName || 'Unknown'}
                            </span>
                            <span className='flex items-center gap-1'>
                              <CalendarIcon className='h-3 w-3' />
                              {new Date(invite.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <ArrowRight className='w-3.5 h-3.5 text-muted-foreground/50' />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Credenza open={inviteOpen} onOpenChange={setInviteOpen}>
        <CredenzaContent className='sm:max-w-md'>
          <CredenzaHeader>
            <CredenzaTitle className='flex items-center gap-2'>
              <UserPlusIcon className='h-4 w-4' />
              Invite Member
            </CredenzaTitle>
            <CredenzaDescription>
              Send an email invitation or generate a shareable code.
            </CredenzaDescription>
          </CredenzaHeader>

          <CredenzaBody className='space-y-4'>
            <div className='space-y-2'>
              <Label>Invite Type</Label>
              <Select
                value={inviteType}
                onValueChange={(v) => setInviteType(v as 'email' | 'code')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='email'>Email Invitation</SelectItem>
                  <SelectItem value='code'>Shareable Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteType === 'email' && (
              <div className='space-y-2'>
                <Label htmlFor='email'>Email Address</Label>
                <Input
                  id='email'
                  type='email'
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder='user@example.com'
                />
              </div>
            )}

            <div className='space-y-2'>
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='member'>Member</SelectItem>
                  <SelectItem value='admin'>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {generatedCode && (
              <div className='space-y-2 p-4 bg-muted rounded-lg'>
                <Label>Shareable Code</Label>
                <p className='text-2xl font-mono font-bold tracking-wider'>
                  {generatedCode}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Share this code with the person you want to invite.
                </p>
              </div>
            )}
          </CredenzaBody>

          <CredenzaFooter>
            <Button
              variant='outline'
              onClick={() => {
                setInviteOpen(false)
                setGeneratedCode(null)
                setInviteEmail('')
              }}
            >
              {generatedCode ? 'Close' : 'Cancel'}
            </Button>
            {!generatedCode && (
              <Button
                onClick={() => void handleInvite()}
                disabled={inviteLoading}
              >
                {inviteLoading && (
                  <Loader2Icon className='h-4 w-4 animate-spin mr-2' />
                )}
                {inviteType === 'email' ? 'Send Invitation' : 'Generate Code'}
              </Button>
            )}
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </div>
  )
}
