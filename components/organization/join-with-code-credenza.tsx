'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Loader2, Users } from 'lucide-react'

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

interface JoinWithCodeCredenzaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JoinWithCodeCredenza({
  open,
  onOpenChange,
}: JoinWithCodeCredenzaProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    const trimmedCode = code.trim().toUpperCase()

    if (!trimmedCode) {
      toast.error('Please enter a code')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: trimmedCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join organization')
      }

      toast.success(data.message || 'Successfully joined organization!')
      setCode('')
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to join organization'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className='sm:max-w-md'>
        <CredenzaHeader>
          <CredenzaTitle className='flex items-center gap-2'>
            <KeyRound className='w-4 h-4' />
            Join with Code
          </CredenzaTitle>
          <CredenzaDescription>
            Enter the invite code shared with you to join an organization.
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className='space-y-4'>
          <Field>
            <FieldLabel>Invite Code</FieldLabel>
            <div className='relative'>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder='ABCD1234'
                className='peer ps-7 uppercase tracking-wider font-mono'
                maxLength={12}
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Users size={12} />
              </div>
            </div>
          </Field>
        </CredenzaBody>

        <CredenzaFooter>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size='sm' onClick={handleJoin} disabled={loading}>
            {loading ? (
              <Loader2 className='w-4 h-4 animate-spin mr-1.5' />
            ) : null}
            Join Organization
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  )
}
