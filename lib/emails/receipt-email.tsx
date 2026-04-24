import {
  Html,
  Body,
  Container,
  Head,
  Heading,
  Text,
  Hr,
  Preview,
  Section,
  Row,
  Column,
  Img,
  Link,
} from '@react-email/components'
import { Tailwind } from '@react-email/tailwind'
import * as React from 'react'

interface ReceiptItem {
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}

interface ReceiptEmailProps {
  receiptNumber: string
  customerName: string
  customerEmail: string
  eventName: string
  eventCode: string
  items: ReceiptItem[]
  totalAmount: number
  paymentMethod?: string
  date: string
  organizationName?: string
  organizationEmail: string
  organizationLogo?: string
  primaryColor?: string
  secondaryColor?: string
  emailFromAddress?: string
}

export function ReceiptEmail({
  receiptNumber,
  customerName,
  customerEmail,
  eventName,
  eventCode,
  items,
  totalAmount,
  paymentMethod,
  date,
  organizationName = 'Acquittance',
  organizationEmail,
  organizationLogo,
  primaryColor = '#0f172a',
  secondaryColor = '#334155',
  emailFromAddress,
}: ReceiptEmailProps) {
  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    card: 'Card',
    other: 'Other',
  }

  return (
    <Html>
      <Tailwind>
        <Head />
        <Preview>
          Your receipt #{receiptNumber} for {eventName} - {organizationName}
        </Preview>
        <Body className='bg-gray-50 font-sans'>
          <Container className='bg-white my-8 mx-auto max-w-xl rounded-lg overflow-hidden shadow-sm'>
            <Section
              className='px-8 py-8'
              style={{ backgroundColor: primaryColor }}
            >
              <Row>
                <Column>
                  <Heading className='text-white text-2xl font-bold m-0'>
                    {organizationName}
                  </Heading>
                  <Text className='text-slate-400 text-sm m-0 mt-1'>
                    Official Receipt
                  </Text>
                </Column>
                <Column className='text-right'>
                  {organizationLogo ? (
                    <Img
                      src={organizationLogo}
                      alt={organizationName}
                      width='52'
                      height='52'
                      className='rounded-full inline-block'
                    />
                  ) : (
                    <Section className='bg-white/10 rounded-lg px-3 py-2 inline-block'>
                      <Text className='text-white/60 text-xs m-0 uppercase tracking-wider'>
                        Receipt
                      </Text>
                      <Text className='text-white text-lg font-bold m-0 font-mono'>
                        #{receiptNumber}
                      </Text>
                    </Section>
                  )}
                </Column>
              </Row>
            </Section>

            <Section className='px-8 py-6'>
              <Row>
                <Column className='w-1/2 pr-4'>
                  <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0 mb-2'>
                    Billed To
                  </Text>
                  <Text className='text-slate-900 font-semibold m-0 text-base'>
                    {customerName}
                  </Text>
                  <Text className='text-slate-600 text-sm m-0 mt-1'>
                    {customerEmail}
                  </Text>
                </Column>
                <Column className='w-1/2 pl-4 text-right'>
                  <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0 mb-2'>
                    Event
                  </Text>
                  <Text className='text-slate-900 font-semibold m-0 text-base'>
                    {eventName}
                  </Text>
                  <Text className='text-slate-600 text-sm m-0 mt-1'>
                    Code: {eventCode}
                  </Text>
                </Column>
              </Row>
              <Row className='mt-4'>
                <Column>
                  <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0 mb-1'>
                    Date
                  </Text>
                  <Text className='text-slate-900 text-sm m-0'>{date}</Text>
                </Column>
              </Row>
            </Section>

            <Hr className='border-gray-100 mx-8' />

            <Section className='px-8 py-4'>
              <Row className='bg-slate-50 rounded-t-lg'>
                <Column className='w-2/5 px-4 py-3'>
                  <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0'>
                    Item
                  </Text>
                </Column>
                <Column className='w-1/5 px-2 py-3 text-center'>
                  <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0'>
                    Qty
                  </Text>
                </Column>
                <Column className='w-1/5 px-2 py-3 text-right'>
                  <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0'>
                    Price
                  </Text>
                </Column>
                <Column className='w-1/5 px-4 py-3 text-right'>
                  <Text className='text-slate-500 text-xs uppercase tracking-wider font-semibold m-0'>
                    Total
                  </Text>
                </Column>
              </Row>

              {items.map((item, index) => (
                <Row
                  key={index}
                  style={{
                    borderBottom:
                      index === items.length - 1 ? 'none' : '1px solid #f1f5f9',
                  }}
                >
                  <Column className='w-2/5 px-4 py-3'>
                    <Text className='text-slate-900 font-medium m-0 text-sm'>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text className='text-slate-500 text-xs m-0 mt-0.5'>
                        {item.description}
                      </Text>
                    )}
                  </Column>
                  <Column className='w-1/5 px-2 py-3 text-center'>
                    <Text className='text-slate-700 m-0 text-sm'>
                      {item.quantity}
                    </Text>
                  </Column>
                  <Column className='w-1/5 px-2 py-3 text-right'>
                    <Text className='text-slate-700 m-0 text-sm'>
                      ₹{item.price.toLocaleString('en-IN')}
                    </Text>
                  </Column>
                  <Column className='w-1/5 px-4 py-3 text-right'>
                    <Text className='text-slate-900 font-medium m-0 text-sm'>
                      ₹{item.total.toLocaleString('en-IN')}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            <Section
              className='px-8 py-5'
              style={{ backgroundColor: primaryColor }}
            >
              <Row>
                <Column className='w-3/5'>
                  {paymentMethod && (
                    <Section>
                      <Text className='text-slate-400 text-xs uppercase tracking-wider font-semibold m-0 mb-1'>
                        Payment Method
                      </Text>
                      <Text className='text-white font-medium m-0'>
                        {paymentMethodLabels[paymentMethod] || paymentMethod}
                      </Text>
                    </Section>
                  )}
                </Column>
                <Column className='w-2/5 text-right'>
                  <Text className='text-slate-400 text-xs uppercase tracking-wider font-semibold m-0 mb-1'>
                    Total Amount
                  </Text>
                  <Text className='text-white text-2xl font-bold m-0'>
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section className='px-8 py-6 text-center'>
              <Text className='text-slate-900 font-semibold text-base m-0 mb-2'>
                Thank you for your purchase!
              </Text>
              <Text className='text-slate-500 text-sm m-0 mb-4'>
                Your receipt is attached to this email as a PDF document.
              </Text>
              <Section className='bg-slate-50 rounded-lg p-4'>
                <Text className='text-slate-500 text-xs m-0'>
                  This is a computer-generated receipt and does not require a
                  signature.
                </Text>
                <Text className='text-slate-500 text-xs m-0 mt-1'>
                  For any queries, please contact us at{' '}
                  <Link
                    href={`mailto:${emailFromAddress || `${organizationEmail}`}`}
                    className='text-slate-700 underline'
                    style={{ color: secondaryColor }}
                  >
                    {emailFromAddress || `${organizationEmail}`}
                  </Link>
                </Text>
              </Section>
            </Section>

            <Hr className='border-gray-100 mx-8' />

            <Section className='px-8 py-4 bg-slate-50'>
              <Row>
                <Column className='text-center'>
                  <Text className='text-slate-400 text-xs m-0'>
                    © {new Date().getFullYear()} {organizationName}. All rights
                    reserved.
                  </Text>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default ReceiptEmail
