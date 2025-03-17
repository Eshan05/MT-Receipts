export interface CSVTemplateField {
  key: string
  label: string
  required: boolean
  description: string
  example: string
}

export const csvTemplateFields: CSVTemplateField[] = [
  {
    key: 'customerName',
    label: 'Customer Name',
    required: true,
    description: 'Full name of the customer',
    example: 'John Doe',
  },
  {
    key: 'customerEmail',
    label: 'Customer Email',
    required: true,
    description: 'Email address for sending receipt',
    example: 'john@example.com',
  },
  {
    key: 'customerPhone',
    label: 'Customer Phone',
    required: false,
    description: 'Phone number (optional)',
    example: '+91 9876543210',
  },
  {
    key: 'customerAddress',
    label: 'Customer Address',
    required: false,
    description: 'Address (optional)',
    example: 'Mumbai, India',
  },
  {
    key: 'items',
    label: 'Items',
    required: true,
    description: 'Items in format: Name xQty @Price; Name xQty @Price',
    example: 'T-Shirt x2 @500; Cap x1 @200',
  },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    required: true,
    description: 'One of: cash, upi, card, other',
    example: 'cash',
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    description: 'Additional notes (optional)',
    example: 'Team order',
  },
  {
    key: 'emailSent',
    label: 'Email Sent',
    required: false,
    description: 'Mark as yes if receipt already emailed manually',
    example: 'no',
  },
]

export function generateCSVTemplate(): string {
  const headers = csvTemplateFields.map((f) => f.label).join(',')
  const exampleRow = csvTemplateFields.map((f) => f.example).join(',')
  const descriptions = csvTemplateFields.map((f) => f.description).join(',')

  return `${headers}
${exampleRow}

-- Field Descriptions --
${descriptions}`
}

export function downloadCSVTemplate(eventName: string) {
  const headers = csvTemplateFields.map((f) => f.label).join(',')
  const exampleRow = csvTemplateFields
    .map((f) => (f.required ? f.example : ''))
    .join(',')

  const template = `${headers}
${exampleRow}`

  const blob = new Blob([template], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${eventName}-import-template.csv`
  a.click()
  URL.revokeObjectURL(url)
}
