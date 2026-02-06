/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { formatReceiptNumber } from '@/lib/tenants/receipt-number'

describe('formatReceiptNumber', () => {
  it('uses default format when custom format is missing', () => {
    const output = formatReceiptNumber(undefined, {
      eventCode: 'SEM2026',
      initials: 'AR',
      sequenceNumber: '00012',
    })

    expect(output).toBe('RCP-SEM2026-AR00012')
  })

  it('supports all custom placeholders', () => {
    const output = formatReceiptNumber(
      '{orgCode}-{year}-{month}-{type}-{eventCode}-{initials}-{seq}-{yy}',
      {
        eventCode: 'WORK007',
        initials: 'MK',
        sequenceNumber: '00129',
        organizationName: 'ACES Club',
        organizationSlug: 'aces',
        eventType: 'workshop',
        date: new Date('2026-11-10T00:00:00.000Z'),
      }
    )

    expect(output).toBe('ACES-2026-11-WOR-WORK007-MK-00129-26')
  })

  it('falls back to organization slug for orgCode', () => {
    const output = formatReceiptNumber('{orgCode}-{seq}', {
      eventCode: 'ABC',
      initials: 'XY',
      sequenceNumber: '00001',
      organizationSlug: 'robo-club',
    })

    expect(output).toBe('ROBO-00001')
  })

  it('pads short orgCode and type code', () => {
    const output = formatReceiptNumber('{orgCode}-{type}-{seq}', {
      eventCode: 'AB',
      initials: 'CD',
      sequenceNumber: '00001',
      organizationName: 'AI',
      eventType: 'x',
    })

    expect(output).toBe('AIXX-XXX-00001')
  })
})
