'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  Building2Icon,
  MoreHorizontalIcon,
  ShieldIcon,
  UserIcon,
  UserPlusIcon,
  Loader2Icon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

interface Member {
  userId: string
  username: string
  email: string
  role: 'admin' | 'member'
  joinedAt: string
}

interface Invite {
  _id: string
  type: 'email' | 'code'
  email?: string
  code?: string
  role: 'admin' | 'member'
  status: string
  createdAt: string
  expiresAt?: string
  maxUses?: number
  usedCount?: number
}

export default function MembersPage() {
  const { currentOrganization } = useAuth()
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

  const handleRoleChange = async (
    userId: string,
    newRole: 'admin' | 'member'
  ) => {
    try {
      const res = await fetch(
        `/api/organizations/${orgSlug}/members/${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      )

      if (res.ok) {
        toast.success('Role updated')
        void loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update role')
      }
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(
        `/api/organizations/${orgSlug}/members/${userId}`,
        {
          method: 'DELETE',
        }
      )

      if (res.ok) {
        toast.success('Member removed')
        void loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove member')
      }
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const getAvatar = (name: string) => {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`
  }

  if (!orgSlug) {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='text-muted-foreground'>No organization selected</p>
      </div>
    )
  }

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
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isAdmin && <TableHead className='w-12'></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Avatar className='h-8 w-8'>
                          <AvatarImage src={getAvatar(member.username)} />
                          <AvatarFallback>
                            {member.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className='font-medium'>{member.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === 'admin' ? 'default' : 'secondary'
                        }
                      >
                        {member.role === 'admin' ? (
                          <ShieldIcon className='h-3 w-3 mr-1' />
                        ) : (
                          <UserIcon className='h-3 w-3 mr-1' />
                        )}
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon-sm'>
                              <MoreHorizontalIcon className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(
                                  member.userId,
                                  member.role === 'admin' ? 'member' : 'admin'
                                )
                              }
                            >
                              Change to{' '}
                              {member.role === 'admin' ? 'Member' : 'Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive'
                              onClick={() => handleRemoveMember(member.userId)}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {invites.length > 0 && (
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold'>Pending Invitations</h2>
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Email / Code</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite._id}>
                        <TableCell>
                          <Badge variant='outline'>{invite.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {invite.type === 'email' ? invite.email : invite.code}
                        </TableCell>
                        <TableCell>{invite.role}</TableCell>
                        <TableCell>
                          <Badge variant='secondary'>{invite.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
