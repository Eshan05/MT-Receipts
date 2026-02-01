import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import React from 'react'
import { UseFormReturn, Controller } from 'react-hook-form'
import { z } from 'zod'
import { PasswordCompare } from './password-compare'
import { MailIcon, User2Icon } from 'lucide-react'

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

type SignUpFormValues = z.infer<typeof signUpFormSchema>

interface FirstFormProps {
  form: UseFormReturn<SignUpFormValues>
  isLoading?: boolean
}

const FirstForm: React.FC<FirstFormProps> = ({ form, isLoading = false }) => {
  return (
    <article className='max-w-sm sm:max-md lg:w-lg p-1 flex flex-col items-center space-y-4'>
      <header className='flex flex-col gap-1 my-2 max-w-sm'>
        <p className='text-muted-foreground text-sm mb-6 text-left'>
          Enter your preferred username (Unique) and email address. If you get
          an error please recall if you have used the email or username
          beforehand. If you haven&apos;t then drop a message in the WP group.
        </p>
      </header>
      <FieldGroup className='gap-2'>
        <Controller
          name='username'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              {/* <FieldLabel htmlFor='username'>Preferred Name</FieldLabel> */}
              <div className='relative w-full '>
                <Input
                  {...field}
                  id='username'
                  className='w-full peer ps-7'
                  tabIndex={1}
                  placeholder='Enter your username'
                  disabled={isLoading}
                  aria-invalid={fieldState.invalid}
                  value={field.value ?? ''}
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80 peer-disabled:opacity-50'>
                  <User2Icon aria-hidden='true' size={12} />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </div>
            </Field>
          )}
        />
        <Controller
          name='email'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              {/* <FieldLabel htmlFor='email'>Email</FieldLabel> */}
              <div className='relative'>
                <Input
                  {...field}
                  id='email'
                  className='w-full peer ps-7'
                  tabIndex={1}
                  placeholder='Enter your email'
                  disabled={isLoading}
                  aria-invalid={fieldState.invalid}
                  value={field.value ?? ''}
                />
                <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80 peer-disabled:opacity-50'>
                  <MailIcon aria-hidden='true' size={12} />
                </div>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <PasswordCompare
          form={form}
          className='w-80 mx-auto flex flex-col items-start justify-start gap-2 my-2'
          isLoading={isLoading}
        />
      </FieldGroup>
    </article>
  )
}

export default FirstForm
