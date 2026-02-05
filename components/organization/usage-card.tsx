'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type UsageCardItem = {
  id?: string
  name: string
  value: string
  description?: string
  percentage: number | null
  interactive?: boolean
}

export interface UsageCardProps {
  title: string
  items: UsageCardItem[]
  className?: string
  rangeLabel?: string
  action?: React.ReactNode
  renderItem?: (item: UsageCardItem, row: React.ReactNode) => React.ReactNode
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function CircularGauge({ percentage }: { percentage: number | null }) {
  const normalized = percentage == null ? null : clampPercent(percentage)

  const r = 42.5
  const circumference = 2 * Math.PI * r
  const strokeLength =
    normalized == null ? 0 : (normalized / 100) * circumference

  return (
    <svg
      aria-hidden='true'
      fill='none'
      height='16'
      width='16'
      strokeWidth='2'
      viewBox='0 0 100 100'
      className='-rotate-90'
    >
      <circle
        cx='50'
        cy='50'
        r={r}
        strokeWidth='12'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='opacity-20'
        style={{
          strokeDasharray: `${circumference} ${circumference}`,
        }}
      />
      {normalized == null ? null : (
        <circle
          cx='50'
          cy='50'
          r={r}
          strokeWidth='12'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='transition-all duration-300'
          style={{
            strokeDasharray: `${strokeLength} ${circumference}`,
          }}
        />
      )}
    </svg>
  )
}

export function UsageCard({
  title,
  items,
  className,
  rangeLabel,
  action,
  renderItem,
}: UsageCardProps) {
  return (
    <Card className={['w-full max-w-sm', className].filter(Boolean).join(' ')}>
      <CardHeader className=''>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle className='px-1 text-sm font-medium'>{title}</CardTitle>
          {action ? <div className='shrink-0'>{action}</div> : null}
        </div>
        {rangeLabel ? (
          <div className='px-1 text-xs text-muted-foreground'>{rangeLabel}</div>
        ) : null}
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='space-y-0'>
          {items.map((item) => {
            const className =
              'group flex w-full items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40 even:bg-muted/50 dark:even:bg-muted/20'

            const inner = (
              <>
                <div className='text-primary'>
                  <CircularGauge percentage={item.percentage} />
                </div>
                <div className='min-w-0 flex-1 truncate text-sm'>
                  {item.name}
                </div>
                <div className='shrink-0 text-xs font-medium tabular-nums text-muted-foreground'>
                  {item.value}
                </div>
              </>
            )

            const row = item.interactive ? (
              <button
                type='button'
                className={
                  className +
                  ' text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                }
              >
                {inner}
              </button>
            ) : (
              <div className={className}>{inner}</div>
            )

            const content =
              typeof renderItem === 'function' ? renderItem(item, row) : row

            return (
              <React.Fragment key={item.id ?? item.name}>
                {content}
              </React.Fragment>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
