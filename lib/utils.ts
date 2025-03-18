import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function generateCustomerInitials(customerName: string): string {
  if (!customerName || !customerName.trim()) {
    return 'XX'
  }

  const name = customerName.trim()

  const hasLatinChars = /[a-zA-Z]/.test(name)
  if (!hasLatinChars) {
    const transliterated = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')

    if (transliterated && /[a-zA-Z]/.test(transliterated)) {
      return generateInitialsFromName(transliterated)
    }
    return 'XX'
  }

  return generateInitialsFromName(name)
}

function generateInitialsFromName(name: string): string {
  const parts = name
    .split(/[\s-]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length === 0) {
    return 'XX'
  }

  if (parts.length === 1) {
    const single = parts[0].toUpperCase()
    return single.length >= 2 ? single.substring(0, 2) : single.padEnd(2, 'X')
  }

  const firstInitial = parts[0].charAt(0).toUpperCase()
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()

  return firstInitial + lastInitial
}
