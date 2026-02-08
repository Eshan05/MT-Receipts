'use client'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import FirstForm from './_components/first-form'
import SignInForm from './_components/form'

const formSchema = z.object({
  email: z
    .string()
    .email({ error: 'Invalid email address' })
    .trim()
    .min(1, { error: 'Email is required' })
    .max(48, { error: 'Email must be at most 48 characters' })
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters' })
    .max(48, { error: 'Password must be at most 48 characters' }),
})

const signUpFormSchema = z
  .object({
    username: z.string().min(3).max(20),
    email: z
      .string()
      .email({ error: 'Invalid email address' })
      .trim()
      .min(1, { error: 'Email is required' })
      .max(48, { error: 'Email must be at most 48 characters' })
      .transform((val) => val.trim().toLowerCase()),
    password: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters' })
      .max(48, { error: 'Password must be at most 48 characters' })
      .regex(/[A-Z]/, {
        error: 'Password must contain at least one uppercase letter',
      })
      .regex(/[a-z]/, {
        error: 'Password must contain at least one lowercase letter',
      })
      .regex(/[0-9]/, { error: 'Password must contain at least one number' })
      .regex(/[!@#$%^&*]/, {
        error: 'Password must contain at least one special character',
      }),
    confirmPassword: z
      .string()
      .min(8, { error: 'Confirm Password must be at least 8 characters' })
      .max(48, { error: 'Confirm Password must be at most 48 characters' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  })

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/'
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const signupDisabled = process.env.NEXT_PUBLIC_DISABLE_SIGNUP === 'true'

  const resolveRedirectPath = useCallback(
    (data?: {
      currentOrganization?: { slug?: string }
      memberships?: { organizationSlug?: string }[]
    }) => {
      const hasExplicitRedirect =
        !!redirectPath &&
        redirectPath !== '/' &&
        redirectPath !== '/v' &&
        !redirectPath.startsWith('/o/')

      if (hasExplicitRedirect) {
        return redirectPath
      }

      const slug =
        data?.currentOrganization?.slug ||
        data?.memberships?.[0]?.organizationSlug

      if (slug) {
        return `/${slug}/events`
      }

      return '/o'
    },
    [redirectPath]
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  const signUpForm = useForm<z.infer<typeof signUpFormSchema>>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/sessions')
      const data = await response.json()
      if (data.authenticated) router.replace(resolveRedirectPath(data))
    }
    checkAuth()
  }, [router, resolveRedirectPath])

  useEffect(() => {
    if (signupDisabled && isSignUp) setIsSignUp(false)
  }, [signupDisabled, isSignUp])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'An unexpected error occurred')
        return
      }
      toast.success(data.message || 'Success!')
      router.push(resolveRedirectPath(data))
    } catch (error) {
      if (error instanceof Error)
        toast.error(error.message || 'An error occurred')
      else toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  async function onSignUpSubmit(values: z.infer<typeof signUpFormSchema>) {
    if (signupDisabled) {
      toast.error('Sign up is currently disabled')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'An unexpected error occurred')
        return
      }
      toast.success(data.message || 'Account created!  Please log in.')
      setIsSignUp(false)
    } catch (error) {
      if (error instanceof Error)
        toast.error(error.message || 'An error occurred')
      else toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className='p-4 flex flex-col gap-4 mx-auto min-w-80 max-w-xl min-h-screen items-center justify-center'>
      <form
        onSubmit={
          isSignUp
            ? signUpForm.handleSubmit(onSignUpSubmit)
            : form.handleSubmit(onSubmit)
        }
        className='flex flex-col p-2 w-full mx-auto rounded-md gap-2 items-center'
      >
        <header className='flex flex-col items-center space-y-1'>
          <Image
            src='https://avatars.githubusercontent.com/u/140711476?v=4'
            alt='Eshan avatar'
            width={100}
            height={100}
            className='w-[3.33em] h-[3.33em] rounded-full'
          />
          <h1 className='text-3xl font-bold !mt-3'>Welcome Back</h1>
          <p className='text-sm text-muted-foreground'>
            Please {!isSignUp ? 'login' : 'register'}
          </p>
        </header>
        {isSignUp ? (
          <FirstForm form={signUpForm} isLoading={isLoading} />
        ) : (
          <SignInForm form={form} isLoading={isLoading} />
        )}
        <footer className='flex justify-center mt-4 gap-2 flex-wrap flex-col md:flex-row'>
          {isSignUp && (
            <Button type='submit' disabled={isLoading}>
              {isLoading ? 'Signing Up...' : 'Sign Up'}
            </Button>
          )}
          {!signupDisabled && (
            <Button
              variant='secondary'
              type='button'
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              {isSignUp ? 'Switch to Sign In' : 'Switch to Sign Up'}
            </Button>
          )}
        </footer>
      </form>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className='p-4 flex flex-col gap-4 mx-auto min-w-80 max-w-xl min-h-screen items-center justify-center'>
          <div className='animate-pulse'>Loading...</div>
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  )
}
