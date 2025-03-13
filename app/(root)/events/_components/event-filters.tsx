'use client'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/derived/multi-select'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { typeIcons, typeStyles } from '@/utils/mappings'
import {
  CalendarIcon,
  DollarSign,
  Package,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  Type,
} from 'lucide-react'
import React from 'react'
import type { IconType } from 'react-icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export interface EventFilters {
  search: string
  types: string[]
  tags: string[]
  minItems: string
  maxItems: string
  minPrice: string
  maxPrice: string
  startDateAfter: Date | undefined
  startDateBefore: Date | undefined
  includeDeleted: boolean
}

interface EventFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  availableTags: string[]
}

const eventTypeOptions = Object.keys(typeIcons).map((type) => {
  const Icon = typeIcons[type]
  const style = typeStyles[type] || typeStyles.other
  return {
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type,
    icon: Icon as IconType,
  }
})

function DatePicker({
  date,
  onDateChange,
  placeholder,
}: {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  placeholder: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          className={cn(
            'w-full justify-start text-left font-normal h-9 text-xs',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className='w-3.5 h-3.5 mr-1.5' />
          {date ? format(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={date}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function EventFilters({
  filters,
  onFiltersChange,
  availableTags,
}: EventFiltersProps) {
  const tagOptions = availableTags.map((tag) => ({
    label: tag,
    value: tag,
  }))

  const handleReset = () => {
    onFiltersChange({
      search: '',
      types: [],
      tags: [],
      minItems: '',
      maxItems: '',
      minPrice: '',
      maxPrice: '',
      startDateAfter: undefined,
      startDateBefore: undefined,
      includeDeleted: false,
    })
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.types.length > 0 ||
    filters.tags.length > 0 ||
    filters.minItems !== '' ||
    filters.maxItems !== '' ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.startDateAfter !== undefined ||
    filters.startDateBefore !== undefined ||
    filters.includeDeleted

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='p-1.5 rounded-md bg-muted'>
            <Type className='w-4 h-4 text-muted-foreground' />
          </div>
          <span className='font-medium'>Filters</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleReset}
            className='h-7 text-xs gap-1'
          >
            <RotateCcw className='w-3 h-3' />
            Reset
          </Button>
        )}
      </div>

      <div className='space-y-3'>
        <Field>
          <FieldLabel className='text-xs flex items-center'>
            <Search className='w-3 h-3' />
            Search
          </FieldLabel>
          <div className='relative'>
            <Input
              type='text'
              placeholder='Search by name, description, or code...'
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              className='peer ps-7 h-9 text-xs'
            />
            <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
              <Search size={12} />
            </div>
          </div>
        </Field>

        <Field>
          <FieldLabel className='text-xs flex items-center'>
            <Type className='w-3 h-3' />
            Event Type
          </FieldLabel>
          <MultiSelect
            options={eventTypeOptions}
            onValueChange={(values) =>
              onFiltersChange({ ...filters, types: values })
            }
            defaultValue={filters.types}
            placeholder='Select types...'
            maxCount={2}
            className='text-xs h-9'
          />
          <p className='text-muted-foreground text-xs'>
            Select from the list above to filter on basis of types of events.
            You can select multiple events.
          </p>
        </Field>

        {availableTags.length > 0 && (
          <Field>
            <FieldLabel className='text-xs flex items-center'>
              <Tag className='w-3 h-3' />
              Tags
            </FieldLabel>
            <MultiSelect
              options={tagOptions}
              onValueChange={(values) =>
                onFiltersChange({ ...filters, tags: values })
              }
              defaultValue={filters.tags}
              placeholder='Select tags...'
              maxCount={2}
              className='text-xs h-9'
            />
          </Field>
        )}

        <Field>
          <FieldLabel className='text-xs flex items-center gap-1.5'>
            <Package className='w-3 h-3' />
            Number of Items
          </FieldLabel>
          <div className='flex items-center gap-2'>
            <div className='relative flex-1'>
              <Input
                type='number'
                placeholder='Minimum'
                min={0}
                value={filters.minItems}
                onChange={(e) =>
                  onFiltersChange({ ...filters, minItems: e.target.value })
                }
                className='peer ps-7 h-9 text-xs'
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Package size={12} />
              </div>
            </div>
            <span className='text-muted-foreground text-xs'>--</span>
            <div className='relative flex-1'>
              <Input
                type='number'
                placeholder='Maximum'
                min={0}
                value={filters.maxItems}
                onChange={(e) =>
                  onFiltersChange({ ...filters, maxItems: e.target.value })
                }
                className='peer ps-7 h-9 text-xs'
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <Package size={12} />
              </div>
            </div>
          </div>
        </Field>

        <Field>
          <FieldLabel className='text-xs flex items-center gap-1.5'>
            <DollarSign className='w-3 h-3' />
            Item Price Range
          </FieldLabel>
          <div className='flex items-center gap-2'>
            <div className='relative flex-1'>
              <Input
                type='number'
                placeholder='Min $'
                min={0}
                step='0.01'
                value={filters.minPrice}
                onChange={(e) =>
                  onFiltersChange({ ...filters, minPrice: e.target.value })
                }
                className='peer ps-7 h-9 text-xs'
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <DollarSign size={12} />
              </div>
            </div>
            <span className='text-muted-foreground text-xs'>--</span>
            <div className='relative flex-1'>
              <Input
                type='number'
                placeholder='Max $'
                min={0}
                step='0.01'
                value={filters.maxPrice}
                onChange={(e) =>
                  onFiltersChange({ ...filters, maxPrice: e.target.value })
                }
                className='peer ps-7 h-9 text-xs'
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/80'>
                <DollarSign size={12} />
              </div>
            </div>
          </div>
        </Field>

        <Field>
          <FieldLabel className='text-xs flex items-center gap-1.5'>
            <CalendarIcon className='w-3 h-3' />
            Start Date
          </FieldLabel>
          <div className='flex items-center gap-2'>
            <div className='flex-1'>
              <DatePicker
                date={filters.startDateAfter}
                onDateChange={(date) =>
                  onFiltersChange({ ...filters, startDateAfter: date })
                }
                placeholder='After'
              />
            </div>
            <span className='text-muted-foreground text-xs'>--</span>
            <div className='flex-1'>
              <DatePicker
                date={filters.startDateBefore}
                onDateChange={(date) =>
                  onFiltersChange({ ...filters, startDateBefore: date })
                }
                placeholder='Before'
              />
            </div>
          </div>
        </Field>

        <Field>
          <div className='flex items-center justify-between rounded-md border p-3'>
            <div className='flex items-center gap-2'>
              <Trash2 className='w-4 h-4 text-muted-foreground' />
              <div>
                <p className='text-xs font-medium'>Include Deleted</p>
                <p className='text-[10px] text-muted-foreground'>
                  Show soft-deleted events
                </p>
              </div>
            </div>
            <Switch
              checked={filters.includeDeleted}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, includeDeleted: checked })
              }
            />
          </div>
        </Field>
      </div>
    </div>
  )
}
