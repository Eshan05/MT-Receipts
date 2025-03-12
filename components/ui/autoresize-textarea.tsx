'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'

interface AutosizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number
  maxHeight?: number
}

function AutosizeTextarea({
  className,
  minHeight = 80,
  maxHeight = 400,
  ...props
}: AutosizeTextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [height, setHeight] = React.useState(minHeight)

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(
        Math.max(textarea.scrollHeight, minHeight),
        maxHeight
      )
      setHeight(newHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [minHeight, maxHeight])

  React.useEffect(() => {
    adjustHeight()
  }, [adjustHeight, props.value])

  return (
    <Textarea
      {...props}
      ref={textareaRef}
      className={cn('resize-none overflow-hidden', className)}
      style={{ height }}
      onInput={(e) => {
        props.onInput?.(e)
        adjustHeight()
      }}
    />
  )
}

export { AutosizeTextarea }
