'use client'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import FirstForm from './_components/first-form'
import SignInForm from './_components/form'

export const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const signUpFormSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
})

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/'
  const [isSignUp, setIsSignUp] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/v')
      const data = await response.json()
      if (data.isAuthenticated) {
        router.replace(redirectPath)
      }
    }
    checkAuth()
  }, [router, redirectPath])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const endpoint = isSignUp ? '/api/signup' : '/api/login'
    console.log(values)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'An unexpected error occurred')
        return
      }

      toast.success(data.message || 'Success!')
      router.push(redirectPath)
    } catch (error) {
      if (error instanceof Error)
        toast.error(error.message || 'An error occurred')
      else toast.error('An error occurred')
    }
  }

  async function onSignUpSubmit(values: z.infer<typeof signUpFormSchema>) {
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    }
  }

  return (
    <main className='p-4 flex flex-col gap-4 mx-auto min-w-80 max-w-xl min-h-screen items-center justify-center'>
      <Form {...form}>
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
              src='https://res.cloudinary.com/dygc8r0pv/image/upload/v1734452294/ACES_Logo_ACE_White_d6rz6a.png'
              alt='logo'
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
            <FirstForm form={signUpForm} />
          ) : (
            <SignInForm form={form} />
          )}
          <footer className='flex justify-end mt-4 gap-4 flex-wrap flex-col md:flex-row'>
            {isSignUp && (
              <Button type='submit'>{isSignUp ? 'Sign Up' : 'Sign In'}</Button>
            )}
            <Button
              variant='secondary'
              type='button'
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Switch to Sign In' : 'Switch to Sign Up'}
            </Button>
          </footer>
        </form>
      </Form>
    </main>
  )
}
