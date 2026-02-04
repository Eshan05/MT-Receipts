'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  ArrowRight,
  MailIcon,
  ShieldIcon,
  UserIcon,
  UserPlusIcon,
  Loader2Icon,
  CalendarIcon,
  KeyRound,
  Mail,
  UserRoundPlus,
} from 'lucide-react'
import { format } from 'date-fns'
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
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

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
  const [inviteMaxUses, setInviteMaxUses] = useState('')
  const [inviteExpiresAt, setInviteExpiresAt] = useState<Date | undefined>(
    undefined
  )
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

    if (
      inviteType === 'code' &&
      inviteMaxUses.trim() !== '' &&
      (!Number.isInteger(Number(inviteMaxUses)) || Number(inviteMaxUses) < 1)
    ) {
      toast.error('Max uses must be a whole number greater than 0')
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
          maxUses:
            inviteType === 'code' && inviteMaxUses.trim() !== ''
              ? Number(inviteMaxUses)
              : undefined,
          expiresAt: inviteExpiresAt
            ? inviteExpiresAt.toISOString()
            : undefined,
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
      <header className='mb-6'>
        <div className='flex justify-between items-center gap-4 my-2'>
          <h1 className='text-4xl shadow-heading font-bold'>Members</h1>
          {isAdmin && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlusIcon className='' />
              Invite Member
            </Button>
          )}
        </div>
        <p className='text-base text-muted-foreground max-w-md text-justify leading-5.5'>
          Manage your organization's members and invitations. Only admins can
          invite new members, or accept applications.
        </p>
      </header>

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
            <CredenzaTitle className='flex items-center gap-1'>
              <UserPlusIcon className='size-3.5' />
              Invite Member
            </CredenzaTitle>
            <CredenzaDescription>
              Send an email invitation or generate a shareable code.
            </CredenzaDescription>
          </CredenzaHeader>

          <CredenzaBody className='space-y-1'>
            <Field>
              <FieldLabel className='sr-only'>Invite Type</FieldLabel>
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
            </Field>

            {inviteType === 'email' && (
              <Field>
                <FieldLabel className='sr-only' htmlFor='email'>
                  Email Address
                </FieldLabel>
                <div className='relative'>
                  <Input
                    id='email'
                    type='email'
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder='user@example.com'
                    className='peer ps-7'
                  />
                  <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                    <MailIcon size={12} />
                  </div>
                </div>
              </Field>
            )}

            {inviteType === 'code' && (
              <Field>
                <FieldLabel className='sr-only' htmlFor='maxUses'>
                  Max Uses (Optional)
                </FieldLabel>
                <div className='relative'>
                  <Input
                    id='maxUses'
                    type='number'
                    min={1}
                    step={1}
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(e.target.value)}
                    placeholder='Max uses (optional)'
                    className='peer ps-7'
                  />
                  <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                    <KeyRound size={12} />
                  </div>
                </div>
              </Field>
            )}

            <Field>
              <FieldLabel className='sr-only' htmlFor='expiresAt'>
                Expiry Date (Optional)
              </FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className={cn(
                      'w-full justify-start text-left font-normal h-9 text-xs',
                      !inviteExpiresAt && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className='w-3.5 h-3.5 mr-1.5' />
                    {inviteExpiresAt ? (
                      format(inviteExpiresAt, 'PPP')
                    ) : (
                      <span>Expiry date (optional)</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={inviteExpiresAt}
                    captionLayout='dropdown'
                    onSelect={setInviteExpiresAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>

            <Field>
              <FieldLabel className='sr-only'>Role</FieldLabel>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='member'>
                    <span className='inline-flex items-center gap-1.5'>
                      <UserIcon className='h-3.5 w-3.5' />
                      Member
                    </span>
                  </SelectItem>
                  <SelectItem value='admin'>
                    <span className='inline-flex items-center gap-1.5'>
                      <ShieldIcon className='h-3.5 w-3.5' />
                      Admin
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {generatedCode && (
              <div className='space-y-1 p-3 bg-muted dark:bg-muted/50 rounded-lg'>
                <FieldLabel>Shareable Code</FieldLabel>
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
                setInviteMaxUses('')
                setInviteExpiresAt(undefined)
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
