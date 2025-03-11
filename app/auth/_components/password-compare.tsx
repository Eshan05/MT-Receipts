import * as React from 'react'
import { CheckCircle, Eye, EyeOff, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UseFormReturn } from 'react-hook-form'
import { signUpFormSchema } from '../page'
import { z } from 'zod'

export interface PasswordCompareProps {
  form: UseFormReturn<z.infer<typeof signUpFormSchema>>
  className?: string
}

export interface PasswordFlag {
  name: string
  value: boolean
  message: string
  regex: RegExp
}

export const defaultFlags: PasswordFlag[] = [
  {
    name: 'hasUpper',
    value: false,
    message: 'At least one uppercase letter',
    regex: /[A-Z]/,
  },
  {
    name: 'hasLower',
    value: false,
    message: 'At least one lowercase letter',
    regex: /[a-z]/,
  },
  {
    name: 'hasNumber',
    value: false,
    message: 'At least one number',
    regex: /[0-9]/,
  },
  {
    name: 'hasSpecial',
    value: false,
    message: 'At least one special character',
    regex: /[!@#$%^&*]/,
  },
  {
    name: 'hasLength',
    value: false,
    message: 'At least 8 characters',
    regex: /.{8,}/,
  },
]

const PasswordCompare = React.forwardRef<HTMLDivElement, PasswordCompareProps>(
  ({ form, className, ...props }, ref) => {
    const flagFactory = React.useCallback((inputFlags: PasswordFlag[]) => {
      const flagsObject: Record<string, PasswordFlag> = {}
      inputFlags.forEach((flag) => {
        flagsObject[flag.message] = flag
      })
      return flagsObject
    }, [])
    const [flags, setFlags] = React.useState(flagFactory(defaultFlags))

    const arePasswordsEqual = React.useMemo(() => {
      const passwordValue = form.getValues('password')
      const confirmPasswordValue = form.getValues('confirmPassword')
      return passwordValue === confirmPasswordValue
    }, [form.watch('password'), form.watch('confirmPassword')])

    const isValid = React.useMemo(() => {
      const passwordValue = form.getValues('password')
      const flagsCopy = { ...flags }
      for (const key in flagsCopy) {
        if (Object.prototype.hasOwnProperty.call(flagsCopy, key)) {
          flagsCopy[key as keyof typeof flagsCopy].value = flagsCopy[
            key as keyof typeof flagsCopy
          ].regex.test(passwordValue!)
        }
      }
      setFlags(flagsCopy)
      return (
        Object.keys(flags).every(
          (key) => flags[key as keyof typeof flags].value === true
        ) && arePasswordsEqual
      )
    }, [form.watch('password'), arePasswordsEqual])

    return (
      <div ref={ref} className={className} {...props}>
        <PasswordField
          form={form}
          id='password'
          label='Password'
          fieldName='password'
        />
        <PasswordField
          form={form}
          id='confirmPassword'
          label='Confirm password'
          fieldName='confirmPassword'
        />
        <div className='flex w-full flex-col items-start justify-center'>
          <div className='mx-auto flex flex-col items-start justify-start gap-2'>
            {Object.keys(flags).map((key) => (
              <PasswordValidityChip
                key={key}
                value={flags[key as keyof typeof flags].value}
                message={flags[key as keyof typeof flags].message}
              />
            ))}
            <PasswordValidityChip
              value={arePasswordsEqual}
              message='Passwords match'
            />
          </div>
        </div>
      </div>
    )
  }
)

PasswordCompare.displayName = 'PasswordCompare'

export interface PasswordFieldProps {
  form: UseFormReturn<z.infer<typeof signUpFormSchema>>
  id: string
  placeholder?: string
  label?: string
  fieldclassName?: string
  fieldName: keyof z.infer<typeof signUpFormSchema>
}

const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ form, id, placeholder, label, fieldName }, ref) => {
    const [visible, setVisible] = React.useState<boolean>(false)
    const { register } = form
    const field = form.watch(fieldName)
    return (
      <div
        ref={ref}
        className='flex w-full flex-col items-start justify-start gap-1'
      >
        <Label htmlFor={id} className=''>
          {label}
        </Label>
        <div className='inline-flex w-full items-center justify-start gap-2'>
          <Input
            {...register(fieldName as keyof z.infer<typeof signUpFormSchema>, {
              onChange: () => {
                form.trigger(fieldName)
                if (fieldName === 'password') form.trigger('confirmPassword')
              },
            })}
            type={visible ? 'text' : 'password'}
            id={id}
            tabIndex={2}
            value={field?.toString() || ''}
            placeholder={placeholder}
          />
          <Button
            className='min-w-10'
            variant={'outline'}
            size={'icon'}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </Button>
        </div>
      </div>
    )
  }
)

PasswordField.displayName = 'PasswordField'

interface PasswordValidityChipProps {
  value: boolean
  message: string
}

const PasswordValidityChip = React.forwardRef<
  HTMLDivElement,
  PasswordValidityChipProps
>(({ value, message }, ref) => {
  return (
    <div ref={ref} className='inline-flex gap-2 text-xs'>
      {value ? (
        <CheckCircle className='text-primary' size={16} />
      ) : (
        <XCircle className='text-muted-foreground' size={16} />
      )}
      <p className={value ? 'text-primary' : 'text-muted-foreground'}>
        {message}
      </p>
    </div>
  )
})

PasswordValidityChip.displayName = 'PasswordValidityChip'

export { PasswordCompare, PasswordField, PasswordValidityChip }
