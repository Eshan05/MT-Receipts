import ReactPDF from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import {
  templateRegistry,
  templateInfo,
  getTemplateComponent,
  getAllTemplateInfo,
} from '@/lib/templates'
import type {
  TemplateProps,
  TemplateItem,
  TemplateConfig,
} from '@/lib/templates/types'
import { generateReceiptQRCode } from '@/lib/qr-code'

interface PreviewOptions {
  customer?: { name: string; email: string; phone?: string; address?: string }
  event?: {
    name: string
    code: string
    type: string
    location?: string
    startDate?: string
    endDate?: string
  }
  items?: TemplateItem[]
  itemCount?: number
  template?: string
  output?: string
  totalAmount?: number
  paymentMethod?: string
  notes?: string
  config?: Partial<TemplateConfig>
}

const defaultCustomer = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  address: '123 Main Street, New York, NY 10001',
}

const defaultEvent = {
  name: 'Tech Innovation Summit 2026',
  code: 'TIS2026',
  type: 'conference',
  location: 'RMDSSOE, Pune, Maharashtra',
  startDate: '15 March 2026',
  endDate: '17 March 2026',
}

const defaultNotes =
  'Please bring a valid ID for entry. Workshop materials will be provided on-site.'

const sampleItemNames = [
  { name: 'General Admission', basePrice: 99 },
  { name: 'VIP Pass', basePrice: 249 },
  { name: 'Early Bird Ticket', basePrice: 79 },
  { name: 'Student Ticket', basePrice: 49 },
  { name: 'Workshop Kit', basePrice: 35 },
  { name: 'Lunch Voucher', basePrice: 25 },
  { name: 'Parking Pass', basePrice: 15 },
  { name: 'Merchandise Bundle', basePrice: 45 },
  { name: 'Digital Access Pass', basePrice: 59 },
  { name: 'Group Package (5)', basePrice: 399 },
]

const defaultConfig: TemplateConfig = {
  primaryColor: '#1E40AF',
  secondaryColor: '#3B82F6',
  showQrCode: true,
  footerText:
    'Thank you for your purchase! For support, contact support@example.com',
  organizationName: 'Acquittance',
  logoUrl: 'https://avatars.githubusercontent.com/u/140711476?v=4',
}

function generateSampleItems(count: number): TemplateItem[] {
  const shuffled = [...sampleItemNames].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)

  return selected.map((item) => {
    const quantity = Math.floor(Math.random() * 3) + 1
    const price = item.basePrice + Math.floor(Math.random() * 20) - 10
    return {
      name: item.name,
      description: `Access to ${item.name.toLowerCase()} benefits`,
      quantity,
      price,
      total: quantity * price,
    }
  })
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RCP-${timestamp}-${random}`
}

function generateQrCodeDataUrl(receiptNumber: string): string {
  const size = 60
  const cellSize = 2
  const pattern = []
  for (let i = 0; i < size / cellSize; i++) {
    const row = []
    for (let j = 0; j < size / cellSize; j++) {
      const isCorner =
        (i < 7 && j < 7) ||
        (i < 7 && j >= size / cellSize - 7) ||
        (i >= size / cellSize - 7 && j < 7)
      const isBorder =
        i === 0 ||
        j === 0 ||
        i === size / cellSize - 1 ||
        j === size / cellSize - 1
      row.push(
        isCorner || isBorder || Math.random() > 0.5 ? '#000000' : '#FFFFFF'
      )
    }
    pattern.push(row)
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
  svg += `<rect width="${size}" height="${size}" fill="#FFFFFF"/>`
  for (let i = 0; i < pattern.length; i++) {
    for (let j = 0; j < pattern[i].length; j++) {
      if (pattern[i][j] === '#000000') {
        svg += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000000"/>`
      }
    }
  }
  svg += '</svg>'
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function parseArgs(): PreviewOptions {
  const args = process.argv.slice(2)
  const options: PreviewOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--customer':
      case '-c':
        options.customer = {
          ...defaultCustomer,
          name: nextArg || defaultCustomer.name,
        }
        i++
        break
      case '--email':
      case '-e':
        options.customer = {
          ...(options.customer || defaultCustomer),
          email: nextArg || defaultCustomer.email,
        }
        i++
        break
      case '--phone':
        options.customer = {
          ...(options.customer || defaultCustomer),
          phone: nextArg,
        }
        i++
        break
      case '--event':
        options.event = { ...defaultEvent, name: nextArg || defaultEvent.name }
        i++
        break
      case '--items':
      case '-n':
        options.itemCount = parseInt(nextArg, 10) || 5
        i++
        break
      case '--template':
      case '-t':
        options.template = nextArg
        i++
        break
      case '--output':
      case '-o':
        options.output = nextArg
        i++
        break
      case '--payment':
      case '-p':
        options.paymentMethod = nextArg
        i++
        break
      case '--color':
        options.config = { ...options.config, primaryColor: nextArg }
        i++
        break
      case '--org':
        options.config = { ...options.config, organizationName: nextArg }
        i++
        break
      case '--logo':
        options.config = { ...options.config, logoUrl: nextArg }
        i++
        break
      case '--notes':
        options.notes = nextArg
        i++
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
Template Preview Generator
==========================

Generate sample PDF receipts for each template to preview their appearance.

Usage:
  pnpm tsx scripts/preview-templates.ts [options]

Options:
  -c, --customer <name>    Customer name (default: "John Doe")
  -e, --email <email>      Customer email (default: "john.doe@example.com")
  --phone <phone>          Customer phone number
  --event <name>           Event name (default: "Tech Innovation Summit 2026")
  -n, --items <count>      Number of items to generate (default: 4, max: 10)
  -t, --template <slug>    Generate only this template (default: all)
  -o, --output <dir>       Output directory (default: "previews")
  -p, --payment <method>   Payment method (e.g., "credit_card", "upi")
  --color <hex>            Primary color (e.g., "#FF0000")
  --org <name>             Organization name
  --logo <url>             Logo URL
  --notes <text>           Notes to display on receipt
  -h, --help               Show this help message

Available Templates:
  minimal, corporate, modern, classic, elegant, clean, dark, receipt-style

Examples:
  # Generate all templates with defaults
  pnpm tsx scripts/preview-templates.ts

  # Generate only the modern template
  pnpm tsx scripts/preview-templates.ts -t modern

  # Custom customer and event with 6 items
  pnpm tsx scripts/preview-templates.ts -c "Jane Smith" --event "Workshop 2026" -n 6

  # Custom output directory
  pnpm tsx scripts/preview-templates.ts -o ./test-pdfs
`)
}

async function generatePreview(
  slug: string,
  props: TemplateProps,
  outputDir: string
): Promise<void> {
  const TemplateComponent = getTemplateComponent(slug)
  const info = templateInfo[slug]

  if (!TemplateComponent) {
    console.log(`  ✗ Template "${slug}" not found`)
    return
  }

  const outputPath = path.join(outputDir, `${slug}.pdf`)

  try {
    await ReactPDF.renderToFile(<TemplateComponent {...props} />, outputPath)
    console.log(`  ✓ ${info?.name || slug} → ${outputPath}`)
  } catch (error) {
    console.log(
      `  ✗ ${slug} failed: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function main(): Promise<void> {
  const options = parseArgs()

  const outputDir = options.output || path.join(process.cwd(), 'previews')

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const items = options.items || generateSampleItems(options.itemCount || 4)
  const totalAmount = items.reduce((sum, item) => sum + item.total, 0)
  const receiptNumber = generateReceiptNumber()
  const orgName =
    options.config?.organizationName ||
    defaultConfig.organizationName ||
    'Acquittance'

  const qrCodeData = await generateReceiptQRCode(receiptNumber)

  const props: TemplateProps = {
    receiptNumber,
    customer: options.customer || defaultCustomer,
    event: options.event || defaultEvent,
    items,
    totalAmount,
    paymentMethod: options.paymentMethod || 'credit_card',
    date: formatDate(),
    config: { ...defaultConfig, ...options.config },
    notes: options.notes || defaultNotes,
    qrCodeData,
  }

  console.log('\n📄 Template Preview Generator')
  console.log('━'.repeat(40))
  console.log(`Customer: ${props.customer.name} <${props.customer.email}>`)
  console.log(`Event: ${props.event.name} (${props.event.code})`)
  console.log(`Items: ${items.length} | Total: ₹${totalAmount.toFixed(2)}`)
  console.log(`Output: ${outputDir}`)
  console.log('━'.repeat(40))

  let templates: string[]

  if (options.template) {
    if (!templateRegistry[options.template]) {
      console.log(`\n✗ Template "${options.template}" not found.`)
      console.log(`Available: ${Object.keys(templateRegistry).join(', ')}`)
      process.exit(1)
    }
    templates = [options.template]
  } else {
    templates = Object.keys(templateRegistry)
  }

  console.log(`\nGenerating ${templates.length} template(s)...\n`)

  for (const slug of templates) {
    await generatePreview(slug, props, outputDir)
  }

  console.log('\n✓ Done!\n')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
