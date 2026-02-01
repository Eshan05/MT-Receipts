'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CircleCheck,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  User,
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { fetchSmtpVaults, type SmtpVaultMeta } from '@/lib/smtp-vault-client'

interface EmailVaultCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailVaultCredenza({
  open,
  onOpenChange,
}: EmailVaultCredenzaProps) {
  const [vaults, setVaults] = useState<SmtpVaultMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [newSenderName, setNewSenderName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIsDefault, setNewIsDefault] = useState(false)

  const loadVaults = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSmtpVaults()
      setVaults(data)
      if (!newIsDefault) {
        setNewIsDefault(data.length === 0)
      }
    } catch {
      toast.error('Failed to load email vault')
    } finally {
      setLoading(false)
    }
  }, [newIsDefault])

  useEffect(() => {
    if (open) {
      void loadVaults()
    }
  }, [open, loadVaults])

  const defaultVault = useMemo(
    () => vaults.find((vault) => vault.isDefault),
    [vaults]
  )

  const orderedVaults = useMemo(() => {
    return [...vaults].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return a.email.localeCompare(b.email)
    })
  }, [vaults])

  const filteredVaults = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return orderedVaults
    return orderedVaults.filter((vault) =>
      `${vault.label || ''} ${vault.email}`.toLowerCase().includes(search)
    )
  }, [orderedVaults, query])

  const handleAdd = async () => {
    const senderName = newSenderName.trim()
    const email = newEmail.trim().toLowerCase()
    const appPassword = newPassword.trim()

    if (!email || !appPassword) {
      toast.error('Email and app password are required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/smtp-vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          email,
          appPassword,
          isDefault: newIsDefault,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add sender')
      }

      setNewSenderName('')
      setNewEmail('')
      setNewPassword('')
      setNewIsDefault(false)
      await loadVaults()
      toast.success('Sender added to vault')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add sender'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (vaultId: string) => {
    try {
      const response = await fetch(`/api/smtp-vaults/${vaultId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set default sender')
      }

      await loadVaults()
      toast.success('Default sender updated')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to set default sender'
      )
    }
  }

  const handleDelete = async (vaultId: string) => {
    try {
      const response = await fetch(`/api/smtp-vaults/${vaultId}`, {
        method: 'DELETE',
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete sender')
      }

      await loadVaults()
      toast.success('Sender removed')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete sender'
      )
    }
  }

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-xl'>
        <CredenzaHeader>
          <CredenzaTitle className='flex items-center gap-2'>
            <Mail className='w-4 h-4' />
            Email Vault
          </CredenzaTitle>
          <CredenzaDescription>
            Search and manage all senders. Add a new sender from the + button.
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className='space-y-2 overflow-y-auto no-scrollbar'>
          <Command className=''>
            <div className='flex items-center p-1 pb-0'>
              <div className='flex-1 min-w-0'>
                <CommandInput
                  placeholder='Search senders...'
                  value={query}
                  onValueChange={setQuery}
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant='outline' size='icon-sm' className='mt-1'>
                    <Plus />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align='end' className='w-60 p-2.5'>
                  <p className='text-xs font-medium'>Add Sender</p>

                  <Field>
                    <FieldLabel className='sr-only'>Sender Name</FieldLabel>
                    <div className='relative'>
                      <Input
                        placeholder='Sender name'
                        value={newSenderName}
                        onChange={(event) =>
                          setNewSenderName(event.target.value)
                        }
                        className='peer ps-7'
                      />
                      <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                        <User size={12} />
                      </div>
                    </div>
                  </Field>

                  <Field className='-mt-3'>
                    <FieldLabel className='sr-only'>Sender Email</FieldLabel>
                    <div className='relative'>
                      <Input
                        type='email'
                        placeholder='Sender mail'
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        className='peer ps-7'
                      />
                      <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                        <Mail size={12} />
                      </div>
                    </div>
                  </Field>

                  <Field className='-mt-3'>
                    <FieldLabel className='sr-only'>App Password</FieldLabel>
                    <div className='relative'>
                      <Input
                        type='password'
                        placeholder='App password'
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className='peer ps-7'
                      />
                      <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                        <KeyRound size={12} />
                      </div>
                    </div>
                  </Field>

                  <div className='flex items-center justify-between p-2 -mt-1 rounded-md border bg-muted/30'>
                    <div className='mr-2'>
                      <p className='text-xs font-medium'>Set as default</p>
                      <p className='text-2xs text-muted-foreground'>
                        Use this sender by default.
                      </p>
                    </div>
                    <Switch
                      checked={newIsDefault}
                      onCheckedChange={setNewIsDefault}
                    />
                  </div>

                  <Button
                    className='w-full text-xs'
                    onClick={handleAdd}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className='w-4 h-4 animate-spin mr-1.5' />
                    ) : null}
                    Save Sender
                  </Button>
                </PopoverContent>
              </Popover>
            </div>

            <CommandList className='max-h-80'>
              <CommandEmpty>
                {loading ? 'Loading senders...' : 'No senders found.'}
              </CommandEmpty>
              <CommandGroup heading='All Senders'>
                {filteredVaults.map((vault) => {
                  const avatarUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(vault.email)}`
                  const senderLabel = vault.label?.trim() || 'Unknown Sender'

                  return (
                    <CommandItem
                      key={vault.id}
                      value={vault.email}
                      disableCheckmark
                      className='gap-2'
                    >
                      <img
                        src={avatarUrl}
                        alt={vault.email}
                        className='size-7 rounded-full shrink-0 bg-muted'
                      />

                      <div className='flex flex-col min-w-0 flex-1'>
                        <div className='flex items-center gap-1 min-w-0'>
                          <User className='size-3 text-muted-foreground shrink-0' />
                          <span className='truncate text-sm font-medium'>
                            {senderLabel}
                          </span>
                        </div>
                        <div className='flex items-center gap-1 min-w-0'>
                          <Mail className='size-3 text-muted-foreground shrink-0' />
                          <span className='truncate text-xs text-muted-foreground'>
                            {vault.email}
                          </span>
                        </div>
                      </div>

                      {vault.isDefault ? (
                        <span className='inline-flex items-center gap-1 text-tiny text-emerald-600 shrink-0'>
                          <ShieldCheck className='size-3' />
                        </span>
                      ) : (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 px-2 text-xs shrink-0'
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleSetDefault(vault.id)
                          }}
                        >
                          <CircleCheck className='size-3 mr-1' />
                        </Button>
                      )}

                      <Button
                        variant='ghost'
                        size='icon-sm'
                        className='text-destructive hover:text-destructive shrink-0'
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDelete(vault.id)
                        }}
                        disabled={orderedVaults.length === 1 && vault.isDefault}
                      >
                        <Trash2 className='size-3' />
                      </Button>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
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
