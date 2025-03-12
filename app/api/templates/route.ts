import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    templates: [
      {
        id: 'simple',
        name: 'Simple Invoice',
        description: 'A clean, straightforward invoice layout',
      },
      {
        id: 'professional',
        name: 'Professional Invoice',
        description: 'A sleek, business-focused invoice with a modern look',
      },
      {
        id: 'detailed',
        name: 'Detailed Invoice',
        description:
          'A comprehensive invoice with detailed sections and elegant styling',
      },
    ],
  })
}
