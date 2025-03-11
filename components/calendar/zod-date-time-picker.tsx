'use client'

import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl } from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface DateTimePickerFormProps {
  setValue: (date: Date) => void
  fieldValue: Date | undefined
}

export function DateTimePickerForm({
  setValue,
  fieldValue,
}: DateTimePickerFormProps) {
  function handleDateSelect(date: Date | undefined) {
    if (date) {
      setValue(date)
    }
  }

  function handleTimeChange(type: 'hour' | 'minute' | 'ampm', value: string) {
    const currentDate = fieldValue || new Date()
    // eslint-disable-next-line prefer-const
    let newDate = new Date(currentDate)

    if (type === 'hour') {
      const hour = parseInt(value, 10)
      newDate.setHours(hour)
    } else if (type === 'minute') {
      newDate.setMinutes(parseInt(value, 10))
    } else if (type === 'ampm') {
      const hours = newDate.getHours()
      if (value === 'AM' && hours >= 12) {
        newDate.setHours(hours - 12)
      } else if (value === 'PM' && hours < 12) {
        newDate.setHours(hours + 12)
      }
    }

    setValue(newDate)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant={'outline'}
            className={cn(
              'w-full pl-3 text-left font-normal',
              !fieldValue && 'text-muted-foreground'
            )}
          >
            {fieldValue ? (
              format(fieldValue, 'MM/dd/yyyy hh:mm aa')
            ) : (
              <span>MM/DD/YYYY hh:mm aa</span>
            )}
            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0 pointer-events-auto'>
        <div className='sm:flex'>
          <Calendar
            mode='single'
            selected={fieldValue}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className='flex flex-col sm:flex-row sm:h-[250px] divide-y sm:divide-y-0 sm:divide-x'>
            <ScrollArea className='w-64 sm:w-auto'>
              <div className='flex sm:flex-col p-2'>
                {Array.from({ length: 12 }, (_, i) => i + 1)
                  .reverse()
                  .map((hour) => (
                    <Button
                      key={hour}
                      size='icon'
                      variant={
                        fieldValue && fieldValue.getHours() % 12 === hour % 12
                          ? 'default'
                          : 'ghost'
                      }
                      className='sm:w-full shrink-0 aspect-square'
                      onClick={() => handleTimeChange('hour', hour.toString())}
                    >
                      {hour}
                    </Button>
                  ))}
              </div>
              <ScrollBar orientation='horizontal' className='sm:hidden' />
            </ScrollArea>
            <ScrollArea className='w-64 sm:w-auto'>
              <div className='flex sm:flex-col p-2'>
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <Button
                    key={minute}
                    size='icon'
                    variant={
                      fieldValue && fieldValue.getMinutes() === minute
                        ? 'default'
                        : 'ghost'
                    }
                    className='sm:w-full shrink-0 aspect-square'
                    onClick={() =>
                      handleTimeChange('minute', minute.toString())
                    }
                  >
                    {minute.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation='horizontal' className='sm:hidden' />
            </ScrollArea>
            <ScrollArea className=''>
              <div className='flex sm:flex-col p-2'>
                {['AM', 'PM'].map((ampm) => (
                  <Button
                    key={ampm}
                    size='icon'
                    variant={
                      fieldValue &&
                      ((ampm === 'AM' && fieldValue.getHours() < 12) ||
                        (ampm === 'PM' && fieldValue.getHours() >= 12))
                        ? 'default'
                        : 'ghost'
                    }
                    className='sm:w-full shrink-0 aspect-square'
                    onClick={() => handleTimeChange('ampm', ampm)}
                  >
                    {ampm}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
