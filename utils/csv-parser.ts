import { csvTemplateFields } from './csv-template'

export interface ParsedCSVRow {
  rowNumber: number
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  items: {
    name: string
    quantity: number
    price: number
  }[]
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  notes: string
  emailSent: boolean
  rawData: Record<string, string>
}

export interface ValidationError {
  rowNumber: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface DuplicateInfo {
  rowNumber: number
  type: 'existing' | 'within_csv'
  existingReceiptNumber?: string
  duplicateRowNumber?: number
  customerEmail: string
}

export interface CSVValidationResult {
  rows: ParsedCSVRow[]
  errors: ValidationError[]
  warnings: ValidationError[]
  duplicates: DuplicateInfo[]
  validRowCount: number
  invalidRowCount: number
  invalidItems: Map<number, string[]>
}

export interface EventItem {
  name: string
  price?: number
}

export interface ParseCSVOptions {
  onProgress?: (info: { current: number; total: number }) => void
  shouldCancel?: () => boolean
  allowMissingEmail?: boolean
  defaultCustomerAddress?: string
}

function normalizeHeaderToken(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '')
}

function parseItemsString(itemsStr: string): ParsedCSVRow['items'] {
  const items: ParsedCSVRow['items'] = []

  if (!itemsStr || !itemsStr.trim()) return items

  const itemParts = itemsStr.split(';').map((s) => s.trim())

  for (const part of itemParts) {
    if (!part) continue

    // Format: Name xQty @Price
    const match = part.match(/^(.+?)\s*x(\d+)\s*@\s*(\d+(?:\.\d+)?)$/i)

    if (match) {
      items.push({
        name: match[1].trim(),
        quantity: parseInt(match[2], 10),
        price: parseFloat(match[3]),
      })
    } else {
      // Try alternate format: Name, Qty, Price
      const altMatch = part.match(/^(.+?),\s*(\d+),\s*(\d+(?:\.\d+)?)$/)
      if (altMatch) {
        items.push({
          name: altMatch[1].trim(),
          quantity: parseInt(altMatch[2], 10),
          price: parseFloat(altMatch[3]),
        })
      }
    }
  }

  return items
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function normalizePaymentMethod(
  method: string
): ParsedCSVRow['paymentMethod'] | null {
  const normalized = method.toLowerCase().trim()
  if (['cash', 'upi', 'card', 'other'].includes(normalized)) {
    return normalized as ParsedCSVRow['paymentMethod']
  }
  return null
}

export function parseCSV(
  csvText: string,
  eventItems?: EventItem[],
  options?: ParseCSVOptions
): CSVValidationResult {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim())
  const result: CSVValidationResult = {
    rows: [],
    errors: [],
    warnings: [],
    duplicates: [],
    validRowCount: 0,
    invalidRowCount: 0,
    invalidItems: new Map(),
  }

  if (lines.length < 2) {
    result.errors.push({
      rowNumber: 0,
      field: 'file',
      message: 'CSV file must have at least a header row and one data row',
      severity: 'error',
    })
    return result
  }

  const eventItemNames = eventItems
    ? eventItems.map((i) => i.name.trim())
    : null

  const templateHeaderTokens = csvTemplateFields.map((field) => {
    const labelNormalized = normalizeHeaderToken(field.label)
    const keyNormalized = normalizeHeaderToken(field.key)
    return { labelNormalized, keyNormalized }
  })

  const requiredHeaderTokens = ['customername', 'items', 'paymentmethod']

  const headerIndex = (() => {
    let foundIndex = -1
    for (let idx = 0; idx < lines.length; idx++) {
      const candidate = lines[idx]
      const normalized = parseCSVLine(candidate).map(normalizeHeaderToken)
      if (normalized.length < 3) continue

      const hasRequired = requiredHeaderTokens.every((token) =>
        normalized.includes(token)
      )

      if (!hasRequired) continue

      let matchCount = 0
      for (const token of templateHeaderTokens) {
        if (
          normalized.includes(token.labelNormalized) ||
          normalized.includes(token.keyNormalized)
        ) {
          matchCount++
        }
      }

      // Must look like our template header line, not just a random CSV line.
      // Allow minimal headers (e.g., only required columns).
      if (matchCount >= requiredHeaderTokens.length) foundIndex = idx
    }

    return foundIndex !== -1 ? foundIndex : 0
  })()

  // Parse header
  const headerLine = lines[headerIndex]
  const headers = parseCSVLine(headerLine).map(normalizeHeaderToken)

  // Map headers to field indices
  const fieldIndices: Record<string, number> = {}
  csvTemplateFields.forEach((field) => {
    const labelNormalized = normalizeHeaderToken(field.label)
    const index = headers.findIndex(
      (h) => h === labelNormalized || h === field.key.toLowerCase()
    )
    if (index !== -1) {
      fieldIndices[field.key] = index
    }
  })

  // Parse data rows
  const totalDataRows = Math.max(lines.length - headerIndex - 1, 0)
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (options?.shouldCancel?.()) {
      result.errors.push({
        rowNumber: 0,
        field: 'file',
        message: 'Parsing cancelled',
        severity: 'error',
      })
      return result
    }

    if (options?.onProgress && (i - headerIndex) % 25 === 0) {
      options.onProgress({ current: i - headerIndex - 1, total: totalDataRows })
    }

    const line = lines[i]
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    if (trimmedLine.startsWith('--')) continue
    if (trimmedLine.startsWith('```')) continue

    // Ignore repeated header lines (common when CSV content is pasted twice).
    const maybeHeader = parseCSVLine(trimmedLine).map(normalizeHeaderToken)
    if (
      maybeHeader.length === headers.length &&
      maybeHeader.every((h, idx) => h === headers[idx])
    ) {
      continue
    }

    const values = parseCSVLine(line)
    const rowNumber = i + 1

    const rawData: Record<string, string> = {}
    headers.forEach((header, idx) => {
      rawData[header] = values[idx] || ''
    })

    const getValue = (key: string): string => {
      const idx = fieldIndices[key]
      return idx !== undefined ? values[idx] || '' : ''
    }

    const customerName = getValue('customerName').trim()
    const customerEmailRaw = getValue('customerEmail').trim()
    const customerEmail = customerEmailRaw.toLowerCase()
    const customerPhone = getValue('customerPhone').trim()
    let customerAddress = getValue('customerAddress').trim()
    const itemsStr = getValue('items').trim()
    const paymentMethodStr = getValue('paymentMethod').trim()
    const notes = getValue('notes').trim()
    const emailSentStr = getValue('emailSent').trim().toLowerCase()

    if (!customerAddress && options?.defaultCustomerAddress) {
      customerAddress = options.defaultCustomerAddress.trim()
    }

    let hasError = false

    // Validate required fields
    if (!customerName) {
      result.errors.push({
        rowNumber,
        field: 'customerName',
        message: 'Customer name is required',
        severity: 'error',
      })
      hasError = true
    }

    if (!customerEmail) {
      if (options?.allowMissingEmail) {
        result.warnings.push({
          rowNumber,
          field: 'customerEmail',
          message:
            'Customer email missing (receipt can be saved but not emailed)',
          severity: 'warning',
        })
      } else {
        result.errors.push({
          rowNumber,
          field: 'customerEmail',
          message: 'Customer email is required',
          severity: 'error',
        })
        hasError = true
      }
    } else if (!isValidEmail(customerEmail)) {
      if (options?.allowMissingEmail) {
        result.warnings.push({
          rowNumber,
          field: 'customerEmail',
          message:
            'Invalid email format (receipt can be saved but not emailed)',
          severity: 'warning',
        })
      } else {
        result.errors.push({
          rowNumber,
          field: 'customerEmail',
          message: 'Invalid email format',
          severity: 'error',
        })
        hasError = true
      }
    }

    if (!itemsStr) {
      result.errors.push({
        rowNumber,
        field: 'items',
        message: 'Items are required',
        severity: 'error',
      })
      hasError = true
    }

    // Parse items
    const items = parseItemsString(itemsStr)
    if (items.length === 0 && itemsStr) {
      result.errors.push({
        rowNumber,
        field: 'items',
        message:
          'Invalid items format. Use: Name xQty @Price; Name xQty @Price',
        severity: 'error',
      })
      hasError = true
    }

    // Validate items against event items
    if (items.length > 0 && eventItemNames) {
      const invalidItemNames: string[] = []
      for (const item of items) {
        const itemFound = eventItemNames.some(
          (eventName) => eventName === item.name.trim()
        )
        if (!itemFound) {
          invalidItemNames.push(item.name)
        }
      }
      if (invalidItemNames.length > 0) {
        result.warnings.push({
          rowNumber,
          field: 'items',
          message: `Items not in event: ${invalidItemNames.join(', ')}`,
          severity: 'warning',
        })
        result.invalidItems.set(rowNumber, invalidItemNames)
      }
    }

    // Validate payment method
    const paymentMethod = normalizePaymentMethod(paymentMethodStr)
    if (!paymentMethod) {
      result.errors.push({
        rowNumber,
        field: 'paymentMethod',
        message: 'Invalid payment method. Must be: cash, upi, card, or other',
        severity: 'error',
      })
      hasError = true
    }

    const emailSent = ['yes', 'true', '1', 'y'].includes(emailSentStr)

    if (!hasError) {
      result.rows.push({
        rowNumber,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items,
        paymentMethod: paymentMethod!,
        notes,
        emailSent,
        rawData,
      })
      result.validRowCount++
    } else {
      result.invalidRowCount++
    }
  }

  options?.onProgress?.({ current: totalDataRows, total: totalDataRows })

  return result
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function checkDuplicates(
  parsedRows: ParsedCSVRow[],
  existingEntries: { customerEmail: string; items: { name: string }[] }[]
): DuplicateInfo[] {
  const duplicates: DuplicateInfo[] = []
  const seenEmails: Map<string, number> = new Map()

  // Check within CSV
  for (const row of parsedRows) {
    if (!row.customerEmail) continue
    const prevRow = seenEmails.get(row.customerEmail)
    if (prevRow !== undefined) {
      duplicates.push({
        rowNumber: row.rowNumber,
        type: 'within_csv',
        duplicateRowNumber: prevRow,
        customerEmail: row.customerEmail,
      })
    } else {
      seenEmails.set(row.customerEmail, row.rowNumber)
    }
  }

  // Check against existing entries
  for (const row of parsedRows) {
    if (!row.customerEmail) continue
    const existing = existingEntries.find(
      (e) =>
        e.customerEmail.toLowerCase() === row.customerEmail.toLowerCase() &&
        e.items.some((item) =>
          row.items.some(
            (ri) => ri.name.toLowerCase() === item.name.toLowerCase()
          )
        )
    )

    if (existing) {
      const alreadyFlagged = duplicates.find(
        (d) => d.rowNumber === row.rowNumber && d.type === 'existing'
      )
      if (!alreadyFlagged) {
        duplicates.push({
          rowNumber: row.rowNumber,
          type: 'existing',
          customerEmail: row.customerEmail,
        })
      }
    }
  }

  return duplicates
}
