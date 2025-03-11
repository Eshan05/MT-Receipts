import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import React from 'react'
import { PasswordCompare } from './password-compare'

interface FirstFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  // form: UseFormReturn<z.infer<typeof signUpFormSchema>>
}

const FirstForm: React.FC<FirstFormProps> = ({ form }) => {
  const router = useRouter()

  return (
    <article className='max-w-sm sm:max-md lg:w-lg p-1 flex flex-col items-center space-y-4'>
      <header className='flex flex-col gap-1 my-2 max-w-sm'>
        {/* <h2 className='shadow-heading text-center text-5xl'>Register</h2> */}
        <p className='text-muted-foreground text-sm mb-6 text-left'>
          Enter your preferred username (Unique) and email address. If you get
          an error please recall if you have used the email or username
          beforehand. If you haven&apos;t then drop a message in the WP group.
        </p>
      </header>
      <FormField
        control={form.control}
        name='username'
        render={({ field }) => (
          <FormItem className=''>
            <FormLabel className=''>Preferred Name</FormLabel>
            <FormControl>
              <Input
                placeholder='Enter your username'
                className='w-80'
                tabIndex={1}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='email'
        render={({ field }) => (
          <FormItem className=''>
            <FormLabel className=''>Email</FormLabel>
            <FormControl>
              <Input
                placeholder='Enter your email'
                className='w-80'
                tabIndex={1}
                {...field}
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
          <FormItem className=''>
            {/* <FormLabel className='text-base'>Password</FormLabel> */}
            <FormControl>
              {/* <PasswordInput form={form} field={field} /> */}
              <PasswordCompare
                form={form}
                className='w-80 mx-auto flex flex-col items-start justify-start gap-4'
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </article>
  )
}

export default FirstForm
