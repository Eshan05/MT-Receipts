import {
  Html,
  Body,
  Container,
  Head,
  Heading,
  Text,
  Hr,
  Preview,
  Row,
  Column,
  Section,
} from '@react-email/components'
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
  organizationLogo?: string
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
  organizationName = 'ACES',
}: ReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Receipt #{receiptNumber} - {eventName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={header}>{organizationName}</Heading>
            <Text style={subHeader}>Official Receipt</Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as='h2' style={receiptTitle}>
              Receipt #{receiptNumber}
            </Heading>
            <Text style={dateText}>{date}</Text>
          </Section>

          <Section style={infoSection}>
            <Row>
              <Column style={infoColumn}>
                <Text style={infoLabel}>Bill To:</Text>
                <Text style={infoValue}>{customerName}</Text>
                <Text style={infoValueSmall}>{customerEmail}</Text>
              </Column>
              <Column style={infoColumnRight}>
                <Text style={infoLabel}>Event:</Text>
                <Text style={infoValue}>{eventName}</Text>
                <Text style={infoValueSmall}>Code: {eventCode}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section>
            <Row style={tableHeader}>
              <Column style={{ width: '40%' }}>
                <Text style={tableHeaderText}>Item</Text>
              </Column>
              <Column style={{ width: '20%', textAlign: 'center' }}>
                <Text style={tableHeaderText}>Qty</Text>
              </Column>
              <Column style={{ width: '20%', textAlign: 'right' }}>
                <Text style={tableHeaderText}>Price</Text>
              </Column>
              <Column style={{ width: '20%', textAlign: 'right' }}>
                <Text style={tableHeaderText}>Total</Text>
              </Column>
            </Row>

            {items.map((item, index) => (
              <Row key={index} style={tableRow}>
                <Column style={{ width: '40%' }}>
                  <Text style={tableItemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={tableItemDesc}>{item.description}</Text>
                  )}
                </Column>
                <Column style={{ width: '20%', textAlign: 'center' }}>
                  <Text style={tableValue}>{item.quantity}</Text>
                </Column>
                <Column style={{ width: '20%', textAlign: 'right' }}>
                  <Text style={tableValue}>₹{item.price.toFixed(2)}</Text>
                </Column>
                <Column style={{ width: '20%', textAlign: 'right' }}>
                  <Text style={tableValue}>₹{item.total.toFixed(2)}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={hr} />

          <Section style={totalSection}>
            <Row>
              <Column style={{ width: '60%' }}>
                {paymentMethod && (
                  <Text style={paymentMethodText}>
                    Payment Method: {paymentMethod.toUpperCase()}
                  </Text>
                )}
              </Column>
              <Column style={{ width: '40%', textAlign: 'right' }}>
                <Text style={totalLabel}>Total Amount:</Text>
                <Text style={totalValue}>₹{totalAmount.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>Thank you for your purchase!</Text>
            <Text style={footerTextSmall}>
              This is a computer-generated receipt and does not require a
              signature.
            </Text>
            <Text style={footerTextSmall}>
              For any queries, please contact us at{' '}
              {organizationName.toLowerCase()}@example.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const headerSection = {
  padding: '32px 48px',
  textAlign: 'center' as const,
  backgroundColor: '#1a1a2e',
}

const header = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const subHeader = {
  color: '#a0a0a0',
  fontSize: '14px',
  margin: '0',
}

const hr = {
  borderColor: '#e6e8eb',
  margin: '20px 48px',
}

const receiptTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a2e',
  margin: '0 0 8px 0',
  paddingLeft: '48px',
}

const dateText = {
  color: '#666666',
  fontSize: '14px',
  margin: '0',
  paddingLeft: '48px',
}

const infoSection = {
  padding: '0 48px',
}

const infoColumn = {
  width: '50%',
  verticalAlign: 'top' as const,
}

const infoColumnRight = {
  width: '50%',
  verticalAlign: 'top' as const,
  textAlign: 'right' as const,
}

const infoLabel = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px 0',
}

const infoValue = {
  color: '#1a1a2e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 4px 0',
}

const infoValueSmall = {
  color: '#666666',
  fontSize: '14px',
  margin: '0',
}

const tableHeader = {
  backgroundColor: '#f6f9fc',
  padding: '12px 48px',
}

const tableHeaderText = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0',
}

const tableRow = {
  padding: '16px 48px',
  borderBottom: '1px solid #e6e8eb',
}

const tableItemName = {
  color: '#1a1a2e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 2px 0',
}

const tableItemDesc = {
  color: '#666666',
  fontSize: '12px',
  margin: '0',
}

const tableValue = {
  color: '#1a1a2e',
  fontSize: '14px',
  margin: '0',
}

const totalSection = {
  padding: '20px 48px',
  backgroundColor: '#f6f9fc',
}

const paymentMethodText = {
  color: '#666666',
  fontSize: '12px',
  margin: '0',
}

const totalLabel = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px 0',
}

const totalValue = {
  color: '#1a1a2e',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const footerSection = {
  padding: '32px 48px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#1a1a2e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const footerTextSmall = {
  color: '#666666',
  fontSize: '12px',
  margin: '0 0 4px 0',
}

export default ReceiptEmail
