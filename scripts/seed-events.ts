import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Event from '../models/event.model'

dotenv.config()

const eventTypes = [
  'seminar',
  'workshop',
  'conference',
  'competition',
  'meetup',
  'training',
  'webinar',
  'hackathon',
  'concert',
  'fundraiser',
  'networking',
  'internal',
  'other',
] as const

const itemNames = [
  'General Admission',
  'VIP Pass',
  'Early Bird Ticket',
  'Student Ticket',
  'Workshop Kit',
  'Lunch Voucher',
  'Parking Pass',
  'Merchandise Bundle',
  'Digital Access',
  'Group Package',
]

const eventNames = [
  'Tech Innovation Summit',
  'Annual Developer Conference',
  'Startup Pitch Night',
  'Code Workshop Series',
  'Leadership Seminar',
  'AI & Machine Learning Workshop',
  'Cybersecurity Training',
  'Cloud Computing Bootcamp',
  'Mobile Dev Meetup',
  'Open Source Hackathon',
  'Data Science Symposium',
  'Product Management Workshop',
  'UX Design Sprint',
  'DevOps Days',
  'Blockchain Summit',
  'Women in Tech Conference',
  'Junior Developer Bootcamp',
  'Senior Leadership Retreat',
  'Innovation Lab Demo Day',
  'Tech Career Fair',
  'API Design Workshop',
  'Testing & QA Summit',
  'Agile Methodology Training',
  'System Architecture Deep Dive',
  'Frontend Masters Class',
  'Backend Engineering Workshop',
  'Full Stack Developer Day',
  'Security Awareness Training',
  'Cloud Migration Workshop',
  'Microservices Architecture Talk',
  'GraphQL Fundamentals',
  'React Advanced Patterns',
  'Node.js Performance Tuning',
  'Python for Data Analysis',
  'Kubernetes Hands-on Lab',
  'Serverless Architecture Day',
  'Database Optimization Seminar',
  'API Security Workshop',
  'Mobile App Launch Party',
  'Tech Team Building Event',
  'Code Review Best Practices',
  'Continuous Integration Workshop',
  'Technical Writing Bootcamp',
  'Open Source Contribution Day',
  'Tech Interview Prep Session',
  'Algorithms & Data Structures',
  'System Design Interview Prep',
  'Career Growth in Tech',
  'Freelancing Workshop',
  'Remote Work Best Practices',
]

const descriptions = [
  'Join us for an exciting event filled with learning and networking opportunities.',
  'A comprehensive workshop designed for professionals looking to expand their skills.',
  'Connect with industry leaders and peers at this flagship event.',
  'Hands-on training session with real-world applications.',
  'Expert-led session covering the latest trends and best practices.',
  'Interactive workshop with practical exercises and group activities.',
  'Deep dive into advanced concepts with experienced practitioners.',
  'Beginner-friendly introduction to key concepts and tools.',
  'Networking event with structured activities and open discussions.',
  'Demo day featuring innovative projects and solutions.',
]

const tags = [
  'tech',
  'developer',
  'networking',
  'workshop',
  'conference',
  'training',
  'career',
  'startup',
  'AI',
  'cloud',
  'security',
  'design',
  'mobile',
  'web',
  'data',
  'opensource',
]

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomElements<T>(arr: readonly T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function generateEventCode(type: string): string {
  const prefix = type.substring(0, 3).toUpperCase()
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${randomNum}`
}

async function seedEvents(count: number = 50) {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const events = []
  for (let i = 0; i < count; i++) {
    const type = randomElement(eventTypes)
    const eventCode = generateEventCode(type)
    const itemCount = Math.floor(Math.random() * 4) + 1

    const event = {
      eventCode,
      type,
      name: randomElement(eventNames),
      desc: randomElement(descriptions),
      items: randomElements(itemNames, 1, itemCount).map((name) => ({
        name,
        description: `${name} for this event`,
        price: Math.floor(Math.random() * 100) + 10,
      })),
      tags: randomElements(tags, 0, 4),
      startDate: new Date(
        Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000
      ),
      isActive: true,
    }

    events.push(event)
  }

  await Event.insertMany(events)
  console.log(`Seeded ${count} events`)

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB')
}

async function clearEvents() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const result = await Event.deleteMany({})
  console.log(`Deleted ${result.deletedCount} events`)

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB')
}

const command = process.argv[2]
const count = parseInt(process.argv[3], 10) || 50

if (command === 'seed') {
  seedEvents(count).catch(console.error)
} else if (command === 'clear') {
  clearEvents().catch(console.error)
} else {
  console.log('Usage:')
  console.log(
    '  pnpm tsx scripts/seed-events.ts seed [count]  - Seed events (default: 50)'
  )
  console.log(
    '  pnpm tsx scripts/seed-events.ts clear        - Clear all events'
  )
}
