import { describe, expect, it, vi } from 'vitest'
import { parseCSV } from '@/utils/csv-parser'

describe('parseCSV', () => {
  it('reports progress and finishes at total', () => {
    const header =
      'Customer Name,Customer Email,Customer Phone,Customer Address,Items,Payment Method,Notes,Email Sent'

    const makeRow = (i: number) =>
      `Name ${i},person${i}@example.com,,,"T-Shirt x1 @500",cash,,no`

    const rows = Array.from({ length: 51 }, (_, idx) => makeRow(idx + 1))

    const csvText = [header, ...rows].join('\n')

    const onProgress = vi.fn()

    const result = parseCSV(csvText, [{ name: 'T-Shirt' }], { onProgress })

    expect(result.errors).toHaveLength(0)
    expect(result.validRowCount).toBe(51)

    // Should emit intermediate progress at multiples of 25 and a final emit.
    expect(onProgress).toHaveBeenCalled()

    const calls = onProgress.mock.calls.map((c) => c[0])
    const last = calls[calls.length - 1]

    expect(last).toEqual({ current: 51, total: 51 })
    // Intermediate ticks are emitted at i % 25 === 0 with current = i - 1.
    expect(calls.some((c) => c.current === 24 && c.total === 51)).toBe(true)
    expect(calls.some((c) => c.current === 49 && c.total === 51)).toBe(true)
  })

  it('can be cancelled via shouldCancel()', () => {
    const header =
      'Customer Name,Customer Email,Customer Phone,Customer Address,Items,Payment Method,Notes,Email Sent'

    const makeRow = (i: number) =>
      `Name ${i},person${i}@example.com,,,"T-Shirt x1 @500",cash,,no`

    const rows = Array.from({ length: 100 }, (_, idx) => makeRow(idx + 1))
    const csvText = [header, ...rows].join('\n')

    let seen = 0
    const result = parseCSV(csvText, [{ name: 'T-Shirt' }], {
      shouldCancel: () => {
        seen++
        return seen > 5
      },
    })

    expect(result.errors.some((e) => e.message === 'Parsing cancelled')).toBe(
      true
    )
    expect(result.validRowCount).toBeLessThan(100)
  })

  it('detects the header even when not on the first line', () => {
    const csvText = [
      '```python',
      'print("not a csv")',
      '```',
      'Customer Name,Customer Email,Customer Phone,Customer Address,Items,Payment Method,Notes,Email Sent',
      'Jane,,,+91 9999999999,"T-Shirt x1 @500",cash,,no',
    ].join('\n')

    const result = parseCSV(csvText, [{ name: 'T-Shirt' }], {
      allowMissingEmail: true,
    })

    expect(result.errors).toHaveLength(0)
    expect(result.validRowCount).toBe(1)
    expect(result.warnings.some((w) => w.field === 'customerEmail')).toBe(true)
  })

  it('applies default customer address when blank', () => {
    const header =
      'Customer Name,Customer Email,Customer Phone,Customer Address,Items,Payment Method,Notes,Email Sent'
    const row = 'A,a@example.com,,,"T-Shirt x1 @500",cash,,no'
    const csvText = [header, row].join('\n')

    const result = parseCSV(csvText, [{ name: 'T-Shirt' }], {
      defaultCustomerAddress: 'Pune',
    })

    expect(result.errors).toHaveLength(0)
    expect(result.validRowCount).toBe(1)
    expect(result.rows[0].customerAddress).toBe('Pune')
  })
})
