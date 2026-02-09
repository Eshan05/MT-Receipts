'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { KeyRound, Loader2 } from 'lucide-react'

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
import {
  PasswordCompare,
  defaultFlags,
} from '@/app/v/_components/password-compare'

interface ChangePasswordCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PasswordCompareFormValues = {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export function ChangePasswordCredenza({
  open,
  onOpenChange,
}: ChangePasswordCredenzaProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const form = useForm<PasswordCompareFormValues>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  })

  const nextPasswordValue = form.watch('password') || ''
  const confirmPasswordValue = form.watch('confirmPassword') || ''

  const isNextPasswordValid = useMemo(() => {
    const meetsRules = defaultFlags.every((flag) =>
      flag.regex.test(nextPasswordValue)
    )
    return meetsRules && nextPasswordValue === confirmPasswordValue
  }, [nextPasswordValue, confirmPasswordValue])

  useEffect(() => {
    if (!open) {
      setCurrentPassword('')
      form.reset({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      })
    }
  }, [open, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    const currentPasswordTrimmed = currentPassword.trim()
    if (!currentPasswordTrimmed) {
      toast.error('Current password is required')
      return
    }

    if (!isNextPasswordValid) {
      toast.error('Please satisfy all new password requirements')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/users/me/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPasswordTrimmed,
          newPassword: values.password,
          confirmPassword: values.confirmPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'Failed to update password'
        )
      }

      toast.success('Password changed successfully')
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update password'
      )
    } finally {
      setSaving(false)
    }
  })

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className=''>
        <CredenzaHeader>
          <CredenzaTitle className='flex items-center max-sm:justify-center gap-2'>
            <KeyRound className='w-4 h-4' />
            Change Password
          </CredenzaTitle>
          <CredenzaDescription>
            Verify your current password first, then set a new one.
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className='space-y-2 overflow-y-auto no-scrollbar'>
          <Field>
            <FieldLabel htmlFor='currentPassword'>Current Password</FieldLabel>
            <p className='text-xs text-muted-foreground -mt-1'>
              Enter your current password correctly to proceed.
            </p>
            <div className='relative'>
              <Input
                id='currentPassword'
                type='password'
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder='Enter current password'
                className='peer ps-7'
                disabled={saving}
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <KeyRound size={12} />
              </div>
            </div>
          </Field>

          <div className='flex flex-col gap-1'>
            <FieldLabel htmlFor='password' className='mt-1'>
              New Password
            </FieldLabel>
            <p className='text-xs text-muted-foreground -mt-1'>
              Enter a new password as per requirements and re-enter to confirm
              it.
            </p>
            <PasswordCompare
              form={form}
              isLoading={saving}
              className='mx-auto w-full flex flex-col items-start justify-start gap-2 my-2'
            />
          </div>
        </CredenzaBody>

        <CredenzaFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className='h-4 w-4 animate-spin mr-2' /> : null}
            Update Password
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  )
}
