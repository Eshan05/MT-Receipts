'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { UserPlusIcon, Loader2Icon } from 'lucide-react'
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

export default function MembersPage() {
  const { currentOrganization, user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteType, setInviteType] = useState<'email' | 'code'>('email')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const isAdmin = currentOrganization?.role === 'admin'
  const orgSlug = currentOrganization?.slug
  const currentUserId = user?.id

  useEffect(() => {
    if (orgSlug) {
      void loadData()
    }
  }, [orgSlug])

  const loadData = async () => {
    setLoading(true)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/organizations/${orgSlug}/members`),
        fetch(`/api/organizations/${orgSlug}/invites`),
      ])

      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data.members || [])
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json()
        setInvites(data.invites || [])
      }
    } catch {
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
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
        void loadData()
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
    onUpdate: loadData,
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
            onUpdate={loadData}
          />

          {invites.length > 0 && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold'>Pending Invitations</h2>
              <div className='rounded-lg border'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b'>
                        <th className='h-10 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Type
                        </th>
                        <th className='h-10 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Email / Code
                        </th>
                        <th className='h-10 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Role
                        </th>
                        <th className='h-10 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Status
                        </th>
                        <th className='h-10 px-4 text-left align-middle font-medium text-muted-foreground'>
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((invite) => (
                        <tr key={invite._id} className='border-b last:border-0'>
                          <td className='p-4'>
                            <Badge variant='outline'>{invite.type}</Badge>
                          </td>
                          <td className='p-4'>
                            {invite.type === 'email'
                              ? invite.email
                              : invite.code}
                          </td>
                          <td className='p-4'>{invite.role}</td>
                          <td className='p-4'>
                            <Badge variant='secondary'>{invite.status}</Badge>
                          </td>
                          <td className='p-4'>
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
