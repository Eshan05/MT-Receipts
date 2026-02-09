import { describe, expect, it } from 'vitest'
import { validateCsv } from '@/utils/csv-validation-worker'

describe('validateCsv (node fallback)', () => {
  it('falls back to sync parsing and returns duplicates', async () => {
    const csvText = [
      'Customer Name,Customer Email,Customer Phone,Customer Address,Items,Payment Method,Notes,Email Sent',
      'A,a@example.com,,,"T-Shirt x1 @500",cash,,no',
      'B,a@example.com,,,"T-Shirt x1 @500",cash,,no',
    ].join('\n')

    const { validationResult, duplicates } = await validateCsv(
      csvText,
      {
        eventItems: [{ name: 'T-Shirt' }],
        existingEntries: [],
      },
      undefined
    )

    expect(validationResult.errors).toHaveLength(0)
    expect(validationResult.validRowCount).toBe(2)

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0]).toMatchObject({ type: 'within_csv' })
  })
})
