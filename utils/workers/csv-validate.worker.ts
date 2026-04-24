import {
  parseCSV,
  checkDuplicates,
  type EventItem,
  type ParseCSVOptions,
} from '@/utils/csv-parser'

type ExistingEntry = { customerEmail: string; items: { name: string }[] }

type ValidateRequest = {
  type: 'validate'
  id: string
  csvText: string
  eventItems?: EventItem[]
  existingEntries: ExistingEntry[]
  parseOptions?: Pick<
    ParseCSVOptions,
    'allowMissingEmail' | 'defaultCustomerAddress'
  >
}

type CancelRequest = {
  type: 'cancel'
  id?: string
}

type RequestMessage = ValidateRequest | CancelRequest

let cancelled = false

function post(message: unknown) {
  ;(self as unknown as Worker).postMessage(message)
}

self.onmessage = (event: MessageEvent<RequestMessage>) => {
  const msg = event.data

  if (msg.type === 'cancel') {
    cancelled = true
    return
  }

  if (msg.type !== 'validate') return

  cancelled = false

  try {
    post({ type: 'progress', id: msg.id, current: 0, total: 1 })

    const validationResult = parseCSV(msg.csvText, msg.eventItems, {
      onProgress: ({ current, total }) => {
        post({ type: 'progress', id: msg.id, current, total })
      },
      shouldCancel: () => cancelled,
      ...(msg.parseOptions || {}),
    })

    if (cancelled) {
      post({ type: 'cancelled', id: msg.id })
      return
    }

    const duplicates =
      validationResult.rows.length > 0
        ? checkDuplicates(validationResult.rows, msg.existingEntries)
        : []

    const invalidItemsEntries = Array.from(validationResult.invalidItems)

    post({
      type: 'result',
      id: msg.id,
      validationResult: {
        ...validationResult,
        invalidItemsEntries,
      },
      duplicates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    post({ type: 'error', id: msg.id, message })
  }
}
