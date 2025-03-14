import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Template from '../models/template.model'

dotenv.config()

const defaultTemplates = [
  {
    name: 'Minimal',
    slug: 'minimal',
    description: 'Clean whitespace, elegant typography, minimal elements',
    isDefault: true,
    config: {
      primaryColor: '#1E40AF',
      showQrCode: true,
      organizationName: 'Organization',
    },
    category: 'minimal',
    version: 1,
  },
  {
    name: 'Corporate',
    slug: 'corporate',
    description: 'Bold headers, structured tables, professional layout',
    isDefault: false,
    config: {
      primaryColor: '#1E293B',
      secondaryColor: '#F8FAFC',
      showQrCode: true,
      organizationName: 'Organization',
    },
    category: 'professional',
    version: 1,
  },
  {
    name: 'Modern',
    slug: 'modern',
    description: 'Modern colors, rounded corners, fresh aesthetic',
    isDefault: false,
    config: {
      primaryColor: '#7C3AED',
      secondaryColor: '#F3F4F6',
      showQrCode: true,
      organizationName: 'Organization',
    },
    category: 'modern',
    version: 1,
  },
  {
    name: 'Classic',
    slug: 'classic',
    description: 'Classic black & white, no frills, utilitarian',
    isDefault: false,
    config: {
      primaryColor: '#000000',
      showQrCode: false,
      organizationName: 'Organization',
    },
    category: 'classic',
    version: 1,
  },
  {
    name: 'Elegant',
    slug: 'elegant',
    description: 'Centered layout, decorative borders, refined feel',
    isDefault: false,
    config: {
      primaryColor: '#B91C1C',
      showQrCode: true,
      organizationName: 'Organization',
    },
    category: 'themed',
    version: 1,
  },
  {
    name: 'Clean',
    slug: 'clean',
    description: 'Light background, simple borders, balanced spacing',
    isDefault: false,
    config: {
      primaryColor: '#059669',
      showQrCode: true,
      organizationName: 'Organization',
    },
    category: 'minimal',
    version: 1,
  },
  {
    name: 'Dark Mode',
    slug: 'dark',
    description: 'Dark theme, bold contrasts, sleek appearance',
    isDefault: false,
    config: {
      primaryColor: '#10B981',
      secondaryColor: '#374151',
      showQrCode: true,
      organizationName: 'Organization',
    },
    category: 'themed',
    version: 1,
  },
  {
    name: 'Receipt Style',
    slug: 'receipt-style',
    description: 'Compact, printer-friendly, thermal receipt format',
    isDefault: false,
    config: {
      primaryColor: '#000000',
      showQrCode: false,
      organizationName: 'Organization',
    },
    category: 'classic',
    version: 1,
  },
]

async function seedTemplates() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  for (const template of defaultTemplates) {
    const existing = await Template.findOne({ slug: template.slug })
    if (existing) {
      console.log(`Template "${template.slug}" already exists, updating...`)
      await Template.updateOne({ slug: template.slug }, template)
    } else {
      await Template.create(template)
      console.log(`Created template "${template.slug}"`)
    }
  }

  console.log(`Seeded ${defaultTemplates.length} templates`)

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB')
}

async function clearTemplates() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const result = await Template.deleteMany({})
  console.log(`Deleted ${result.deletedCount} templates`)

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB')
}

const command = process.argv[2]

if (command === 'seed') {
  seedTemplates().catch(console.error)
} else if (command === 'clear') {
  clearTemplates().catch(console.error)
} else {
  console.log('Usage:')
  console.log(
    '  pnpm tsx scripts/seed-templates.ts seed   - Seed default templates'
  )
  console.log(
    '  pnpm tsx scripts/seed-templates.ts clear  - Clear all templates'
  )
}
