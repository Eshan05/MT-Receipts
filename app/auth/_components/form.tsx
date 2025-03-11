import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { formSchema } from '../page'

const ALLOW_PASSWORD = true
interface SignInFormProps {
  form: UseFormReturn<z.infer<typeof formSchema>>
}

const SignInForm = ({ form }: SignInFormProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  return (
    <main className='flex flex-col gap-2 mt-8 w-full sm:w-2/3'>
      <section className='flex flex-col gap-2 items-center w-full *:w-full my-2'>
        {ALLOW_PASSWORD && (
          <>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor='email' className='hidden'></FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter your email'
                      tabIndex={1}
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor='password' className='hidden'></FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder='Enter your password'
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <section className='flex justify-between items-center'>
              <aside className='flex items-center space-x-2 my-2 px-1'>
                <Checkbox id='remember' className='rounded-full' />
                <Label
                  htmlFor='remember'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  Remember me
                </Label>
              </aside>
              <p className='text-sm text-muted-foreground'>
                <Link
                  className='inline-block text-foreground font-medium underline'
                  href='/auth/forgot-password'
                >
                  Forgot password?
                </Link>
              </p>
            </section>
            <Button type='submit'>Sign in</Button>
          </>
        )}
        <Button
          className='flex items-center shadow-md font-medium'
          variant={'outline'}
        >
          <svg
            className='h-5 w-5 mr-2'
            xmlns='http://www.w3.org/2000/svg'
            xmlnsXlink='http://www.w3.org/1999/xlink'
            width='800px'
            height='800px'
            viewBox='-0.5 0 48 48'
            version='1.1'
          >
            {' '}
            <title>Google-color</title> <desc>Created with Sketch.</desc>{' '}
            <defs> </defs>{' '}
            <g
              id='Icons'
              stroke='none'
              strokeWidth='1'
              fill='none'
              fillRule='evenodd'
            >
              {' '}
              <g id='Color-' transform='translate(-401.000000, -860.000000)'>
                {' '}
                <g id='Google' transform='translate(401.000000, 860.000000)'>
                  {' '}
                  <path
                    d='M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24'
                    id='Fill-1'
                    fill='#FBBC05'
                  >
                    {' '}
                  </path>{' '}
                  <path
                    d='M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333'
                    id='Fill-2'
                    fill='#EB4335'
                  >
                    {' '}
                  </path>{' '}
                  <path
                    d='M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667'
                    id='Fill-3'
                    fill='#34A853'
                  >
                    {' '}
                  </path>{' '}
                  <path
                    d='M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24'
                    id='Fill-4'
                    fill='#4285F4'
                  >
                    {' '}
                  </path>{' '}
                </g>{' '}
              </g>{' '}
            </g>{' '}
          </svg>
          <span>Continue with Google</span>
        </Button>
      </section>
    </main>
  )
}

export default SignInForm
