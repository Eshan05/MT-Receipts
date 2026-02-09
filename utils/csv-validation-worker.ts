import {
  parseCSV,
  checkDuplicates,
  type CSVValidationResult,
  type DuplicateInfo,
  type EventItem,
} from '@/utils/csv-parser'

type ExistingEntry = { customerEmail: string; items: { name: string }[] }

type WorkerResultPayload = {
  validationResult: Omit<CSVValidationResult, 'invalidItems'> & {
    invalidItemsEntries: Array<[number, string[]]>
  }
  duplicates: DuplicateInfo[]
}

type ValidateOptions = {
  signal?: AbortSignal
  onProgress?: (info: { current: number; total: number }) => void
}

let workerSingleton: Worker | null = null

function getWorker(): Worker {
  if (workerSingleton) return workerSingleton

  workerSingleton = new Worker(
    new URL('./workers/csv-validate.worker.ts', import.meta.url),
    { type: 'module' }
  )

  return workerSingleton
}

function canUseWorker(): boolean {
  return typeof Worker !== 'undefined'
}

export async function validateCsv(
  csvText: string,
  params: {
    eventItems?: EventItem[]
    existingEntries: ExistingEntry[]
  },
  options?: ValidateOptions
): Promise<{
  validationResult: CSVValidationResult
  duplicates: DuplicateInfo[]
}> {
  if (!canUseWorker()) {
    const validationResult = parseCSV(csvText, params.eventItems)
    const duplicates =
      validationResult.rows.length > 0
        ? checkDuplicates(validationResult.rows, params.existingEntries)
        : []
    return { validationResult, duplicates }
  }

  const worker = getWorker()
  const id = crypto.randomUUID()

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      try {
        worker.postMessage({ type: 'cancel', id })
      } catch {
        // ignore
      }
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const cleanup = () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      options?.signal?.removeEventListener('abort', onAbort)
    }

    const onError = () => {
      cleanup()
      reject(new Error('CSV worker error'))
    }

    const onMessage = (event: MessageEvent<any>) => {
      const msg = event.data
      if (!msg || msg.id !== id) return

      if (msg.type === 'progress') {
        options?.onProgress?.({
          current: Number(msg.current) || 0,
          total: Number(msg.total) || 0,
        })
        return
      }

      if (msg.type === 'cancelled') {
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }

      if (msg.type === 'error') {
        cleanup()
        reject(new Error(String(msg.message || 'CSV validation failed')))
        return
      }

      if (msg.type === 'result') {
        cleanup()

        const payload = msg as WorkerResultPayload & {
          type: 'result'
          id: string
        }

        const invalidItems = new Map<number, string[]>(
          payload.validationResult.invalidItemsEntries || []
        )

        const validationResult: CSVValidationResult = {
          ...(payload.validationResult as any),
          invalidItems,
        }

        resolve({ validationResult, duplicates: payload.duplicates })
      }
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)

    if (options?.signal) {
      if (options.signal.aborted) {
        onAbort()
        return
      }
      options.signal.addEventListener('abort', onAbort)
    }

    worker.postMessage({
      type: 'validate',
      id,
      csvText,
      eventItems: params.eventItems,
      existingEntries: params.existingEntries,
    })
  })
}
