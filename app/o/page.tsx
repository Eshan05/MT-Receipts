'use client'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Building2Icon,
  CheckCircleIcon,
  InboxIcon,
  KeyRoundIcon,
  Link2Icon,
  Loader2Icon,
  Text,
  Users,
  XCircleIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { JoinWithCodeCredenza } from '@/components/organization/join-with-code-credenza'
import { InvitationsApplicationsCredenza } from '@/components/organization/invitations-applications-credenza'

const createOrgSchema = z.object({
  name: z
    .string()
    .min(3, { error: 'Name must be at least 3 characters' })
    .max(100, { error: 'Name must be at most 100 characters' })
    .trim(),
  description: z
    .string()
    .min(3, { error: 'Description must be at least 3 characters' })
    .max(500, { error: 'Description must be at most 500 characters' })
    .trim(),
  expectedMembers: z
    .string()
    .trim()
    .min(1, { error: 'Expected members is required' })
    .refine((value) => Number.isFinite(Number(value)), {
      error: 'Expected members must be a number',
    })
    .refine((value) => Number.isInteger(Number(value)), {
      error: 'Expected members must be a whole number',
    })
    .refine((value) => Number(value) >= 1, {
      error: 'Expected members must be at least 1',
    })
    .refine((value) => Number(value) <= 100000, {
      error: 'Expected members is too large',
    }),
  slug: z
    .string()
    .min(3, { error: 'Slug must be at least 3 characters' })
    .max(20, { error: 'Slug must be at most 20 characters' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z][a-z0-9]*$/, {
      error:
        'Slug must start with a letter and contain only letters, numbers, and hyphens',
    }),
})

type SlugStatus = 'checking' | 'available' | 'unavailable' | 'invalid' | 'idle'

function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
}

function CreateOrgContent() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugMessage, setSlugMessage] = useState<string>('')
  const [joinCodeOpen, setJoinCodeOpen] = useState(false)
  const [invitationsOpen, setInvitationsOpen] = useState(false)

  const form = useForm<z.infer<typeof createOrgSchema>>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '', description: '', expectedMembers: '', slug: '' },
    mode: 'onChange',
  })

  const nameValue = form.watch('name')
  const slugValue = form.watch('slug')

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push('/v?redirect=/o')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const currentSlug = form.getValues('slug')
    const generatedSlug = generateSlugFromName(nameValue)
    if (generatedSlug && !currentSlug) {
      form.setValue('slug', generatedSlug)
    }
  }, [nameValue, form])

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (slug.length < 3) {
      setSlugStatus('invalid')
      setSlugMessage('Slug must be at least 3 characters')
      return
    }

    if (!/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z][a-z0-9]*$/.test(slug)) {
      setSlugStatus('invalid')
      setSlugMessage('Invalid slug format')
      return
    }

    setSlugStatus('checking')
    setSlugMessage('')

    try {
      const response = await fetch(`/api/organizations?slug=${slug}`)
      const data = await response.json()

      if (data.available) {
        setSlugStatus('available')
        setSlugMessage('Slug is available')
      } else {
        setSlugStatus('unavailable')
        setSlugMessage(data.message || 'Slug is not available')
      }
    } catch (error) {
      setSlugStatus('idle')
      setSlugMessage('Could not verify slug')
    }
  }, [])

  useEffect(() => {
    if (!slugValue || slugValue.length < 3) {
      setSlugStatus('idle')
      setSlugMessage('')
      return
    }

    const timeoutId = setTimeout(() => {
      checkSlugAvailability(slugValue)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [slugValue, checkSlugAvailability])

  async function onSubmit(values: z.infer<typeof createOrgSchema>) {
    if (slugStatus !== 'available') {
      toast.error('Please choose an available slug')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          expectedMembers: Number(values.expectedMembers),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to create organization')
        return
      }

      toast.success('Organization created! Awaiting approval.')
      router.push('/o/202')
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <main className='flex items-center justify-center min-h-screen p-4'>
        <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
      </main>
    )
  }

  return (
    <main className='flex flex-col items-center justify-center min-h-screen p-4'>
      <div className='w-full max-w-md space-y-6'>
        <div className='text-center space-y-2'>
          <div className='flex justify-center'>
            <Building2Icon className='h-12 w-12 text-muted-foreground' />
          </div>
          <h1 className='text-3xl font-bold'>Create Organization</h1>
          <p className='text-muted-foreground'>
            Set up your organization to start managing receipts
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <FieldGroup>
            <Controller
              name='name'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Organization Name</FieldLabel>
                  <p className='text-2xs text-muted-foreground -mt-1.5'>
                    This is changeable later.
                  </p>
                  <div className='relative'>
                    <Input
                      {...field}
                      placeholder='ACES - Association of Computer Engineers'
                      aria-invalid={fieldState.invalid}
                      className='peer ps-7'
                    />
                    <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80 peer-disabled:opacity-50'>
                      <Building2Icon aria-hidden='true' size={12} />
                    </div>
                  </div>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name='description'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Organization Description</FieldLabel>
                  <p className='text-2xs text-muted-foreground -mt-1.5'>
                    This will appear in your application.
                  </p>
                  <div className='relative'>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder='Briefly describe your organization'
                      aria-invalid={fieldState.invalid}
                      className='peer ps-7 resize-none'
                    />
                    <div className='pointer-events-none absolute top-2.5 start-0 flex items-center justify-center ps-2 text-muted-foreground/80 peer-disabled:opacity-50'>
                      <Text aria-hidden='true' size={12} />
                    </div>
                  </div>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name='expectedMembers'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Expected Members</FieldLabel>
                  <p className='text-2xs text-muted-foreground -mt-1.5'>
                    Rough estimate for your initial team size.
                  </p>
                  <div className='relative'>
                    <Input
                      {...field}
                      inputMode='numeric'
                      placeholder='e.g. 25'
                      aria-invalid={fieldState.invalid}
                      className='peer ps-7'
                    />
                    <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80 peer-disabled:opacity-50'>
                      <Users aria-hidden='true' size={12} />
                    </div>
                  </div>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name='slug'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={
                    fieldState.invalid || slugStatus === 'unavailable'
                  }
                >
                  <FieldLabel>Organization Slug</FieldLabel>
                  <p className='text-2xs text-muted-foreground -mt-1.5'>
                    Used in URLs. Not changeable.
                  </p>
                  <div className='relative'>
                    <Input
                      {...field}
                      placeholder='This will appear in URL'
                      aria-invalid={
                        fieldState.invalid || slugStatus === 'unavailable'
                      }
                      className='peer ps-7 pr-10'
                    />
                    <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80 peer-disabled:opacity-50'>
                      <Link2Icon aria-hidden='true' size={12} />
                    </div>
                    {slugStatus !== 'idle' && (
                      <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                        {slugStatus === 'checking' && (
                          <Loader2Icon className='h-4 w-4 animate-spin text-muted-foreground' />
                        )}
                        {slugStatus === 'available' && (
                          <CheckCircleIcon className='h-4 w-4 text-green-500' />
                        )}
                        {(slugStatus === 'unavailable' ||
                          slugStatus === 'invalid') && (
                          <XCircleIcon className='h-4 w-4 text-destructive' />
                        )}
                      </div>
                    )}
                  </div>
                  {slugMessage && (
                    <p
                      className={`text-xs ${
                        slugStatus === 'available'
                          ? 'text-green-500'
                          : 'text-destructive'
                      }`}
                    >
                      {slugMessage}
                    </p>
                  )}
                  {fieldState.error && !slugMessage && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <div className='flex gap-3'>
            <Button
              type='submit'
              disabled={isSubmitting || slugStatus !== 'available'}
              className='flex-1'
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className='h-4 w-4 animate-spin mr-2' />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
            <Link href='/'>
              <Button type='button' variant='outline'>
                Cancel
              </Button>
            </Link>
          </div>
        </form>

        <div className='border-t pt-6 space-y-4'>
          <p className='text-center text-sm text-muted-foreground'>
            Already have an invite or pending application?
          </p>
          <div className='flex flex-col sm:flex-row gap-2 justify-center'>
            <Button
              variant='outline'
              className='w-full sm:w-auto gap-2'
              onClick={() => setJoinCodeOpen(true)}
            >
              <KeyRoundIcon className='w-4 h-4' />
              Join with Code
            </Button>
            <Button
              variant='outline'
              className='w-full sm:w-auto gap-2'
              onClick={() => setInvitationsOpen(true)}
            >
              <InboxIcon className='w-4 h-4' />
              View Invitations
            </Button>
          </div>
        </div>
      </div>

      <JoinWithCodeCredenza
        open={joinCodeOpen}
        onOpenChange={setJoinCodeOpen}
      />
      <InvitationsApplicationsCredenza
        open={invitationsOpen}
        onOpenChange={setInvitationsOpen}
      />
    </main>
  )
}

export default function CreateOrgPage() {
  return (
    <Suspense
      fallback={
        <main className='flex items-center justify-center min-h-screen p-4'>
          <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
        </main>
      }
    >
      <CreateOrgContent />
    </Suspense>
  )
}
