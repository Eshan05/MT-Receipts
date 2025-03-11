'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useAuthActions } from '@convex-dev/auth/react'
import { zodResolver } from '@hookform/resolvers/zod'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { BsInfoCircle } from 'react-icons/bs'
import { z } from 'zod'
import { toast } from 'sonner'
import LinesLoader from '@/components/linesLoader'
const SignInForm = dynamic(() => import('./form'), {
  ssr: false,
  loading: () => <LinesLoader />,
})

const FirstForm = dynamic(() => import('./first-form'), {
  ssr: false,
  loading: () => <LinesLoader />,
})

export const signUpFormSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
})

export const formSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(8),
  flow: z.enum(['signIn', 'signUp']),
})

export default function SignIn() {
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      flow: 'signIn',
    },
  })

  const signUpForm = useForm<z.infer<typeof signUpFormSchema>>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const { signIn } = useAuthActions()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/'
  // const redirectPath = searchParams.get('redirect')?.replace(/%2f/g, '') || '/';

  const Submit = (data: z.infer<typeof formSchema>) => {
    signIn('password', {
      email: data.email,
      password: data.password,
      flow: data.flow,
    })
      .catch((error) => {
        setError(error.message)
      })
      .then(() => {
        toast.success('Signed in successfully.')
        router.push(redirectPath)
      })
  }

  return (
    <main className='p-4 flex flex-col gap-4 mx-auto min-w-80 max-w-xl min-h-screen items-center justify-center'>
      <Form {...form}>
        <form
          className='flex flex-col p-2 w-full mx-auto rounded-md gap-2 items-center'
          onSubmit={form.handleSubmit(Submit)}
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
              Please {flow === 'signIn' ? 'login' : 'register'}
            </p>
            {flow === 'signIn' && (
              <Alert className='max-w-sm mx-4 mt-4'>
                <BsInfoCircle className='size-4' />
                <AlertTitle>Verified Emails Only</AlertTitle>
                <AlertDescription>
                  <p className='leading-tight'>
                    Please note that you will <strong>not</strong> be able to
                    sign with emails other than your professional email. We use
                    this to verify that it is you, otherwise you will not be
                    allowed on the platform.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </header>
          {flow === 'signIn' ? (
            <SignInForm form={form} />
          ) : (
            <FirstForm form={signUpForm} />
          )}
          {error && (
            <div className='bg-red-500/20 border-2 border-red-500/50 rounded-md p-2'>
              <p className='text-foreground font-mono text-xs'>
                Error signing in: {error}
              </p>
            </div>
          )}
        </form>
      </Form>
      <footer className='flex flex-col gap-1 items-center justify-center w-full *:w-full text-center mt-4'>
        <p className='text-sm text-muted-foreground'>
          {flow === 'signIn' ? (
            <>Don&apos;t have an account?&nbsp;</>
          ) : (
            <>Already have an account?&nbsp;</>
          )}
          <Button
            className='inline-block text-foreground font-medium underline'
            size='none'
            variant='link'
            onClick={() => setFlow(flow === 'signIn' ? 'signUp' : 'signIn')}
          >
            {flow === 'signIn' ? 'Sign up' : 'Sign in'}
          </Button>
        </p>
      </footer>
    </main>
  )
}
