'use client'

import * as React from 'react'
import { format, getMonth, getYear, setMonth, setYear } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar-dropdown'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface SingleDatePickerProps {
  startYear?: number
  endYear?: number
  buttonWidth?: string
  buttonClasses?: string
  formatDateType?: string
}
export function SingleDatePicker({
  startYear = getYear(new Date()) - 100,
  endYear = getYear(new Date()) + 100,
  buttonWidth = 'w-40',
  formatDateType = 'PPP',
  buttonClasses,
}: SingleDatePickerProps) {
  const [date, setDate] = React.useState<Date>(new Date())

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  )

  const handleMonthChange = (month: string) => {
    const newDate = setMonth(date, months.indexOf(month))
    setDate(newDate)
  }

  const handleYearChange = (year: string) => {
    const newDate = setYear(date, parseInt(year))
    setDate(newDate)
  }

  const handleSelect = (selectedData: Date | undefined) => {
    if (selectedData) {
      setDate(selectedData)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            `w-${buttonWidth} justify-start text-left font-normal ${buttonClasses}`,
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className='mr-2 h-4 w-4' />
          {date ? format(date, `${formatDateType}`) : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0'>
        <div className='flex justify-center items-center gap-1 absolute w-full p-2 -mb-2'>
          <Select
            onValueChange={handleMonthChange}
            value={months[getMonth(date)]}
          >
            <SelectTrigger className='w-max cursor-pointer focus:ring-offset-0 hover:bg-secondary'>
              <SelectValue placeholder='Month' />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={handleYearChange}
            value={getYear(date).toString()}
          >
            <SelectTrigger className='w-max cursor-pointer focus:ring-offset-0 hover:bg-secondary'>
              <SelectValue placeholder='Year' />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()} className=''>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Calendar
          mode='single'
          selected={date}
          onSelect={handleSelect}
          initialFocus
          month={date}
          onMonthChange={setDate}
        />
      </PopoverContent>
    </Popover>
  )
}
