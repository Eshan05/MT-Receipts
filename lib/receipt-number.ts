const DEFAULT_RECEIPT_NUMBER_FORMAT = 'RCP-{eventCode}-{initials}{seq}'

interface ReceiptNumberParams {
  eventCode: string
  initials: string
  sequenceNumber: string
  organizationName?: string
  organizationSlug?: string
  eventType?: string
  date?: Date
}

function toOrgCode(name?: string, slug?: string): string {
  const source = (name || slug || 'ORG').replace(/[^a-zA-Z0-9]/g, '')
  const normalized = source.toUpperCase()
  return normalized.length >= 4
    ? normalized.slice(0, 4)
    : normalized.padEnd(4, 'X')
}

function toTypeCode(eventType?: string): string {
  const source = (eventType || 'OTH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (source.length >= 3) return source.slice(0, 3)
  return source.padEnd(3, 'X')
}

export function formatReceiptNumber(
  format: string | undefined,
  params: ReceiptNumberParams
): string {
  const date = params.date || new Date()
  const normalizedFormat = format?.trim() || DEFAULT_RECEIPT_NUMBER_FORMAT

  return normalizedFormat
    .replaceAll('{eventCode}', params.eventCode)
    .replaceAll('{initials}', params.initials)
    .replaceAll('{seq}', params.sequenceNumber)
    .replaceAll(
      '{orgCode}',
      toOrgCode(params.organizationName, params.organizationSlug)
    )
    .replaceAll('{year}', String(date.getFullYear()))
    .replaceAll('{yy}', String(date.getFullYear()).slice(-2))
    .replaceAll('{month}', String(date.getMonth() + 1).padStart(2, '0'))
    .replaceAll('{type}', toTypeCode(params.eventType))
}
