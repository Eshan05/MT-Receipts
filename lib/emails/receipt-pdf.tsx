import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import * as React from 'react'

interface ReceiptItem {
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}

interface ReceiptPDFProps {
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
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#a0a0a0',
    fontSize: 10,
  },
  receiptInfo: {
    marginBottom: 20,
  },
  receiptNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  date: {
    color: '#666666',
    fontSize: 10,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e8eb',
    borderBottomStyle: 'solid',
  },
  infoColumn: {
    width: '45%',
  },
  infoLabel: {
    color: '#666666',
    fontSize: 8,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  infoValue: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  infoValueSmall: {
    color: '#666666',
    fontSize: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f6f9fc',
    padding: 10,
    marginBottom: 4,
  },
  tableHeaderText: {
    color: '#666666',
    fontSize: 8,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  colItem: { width: '40%' },
  colQty: { width: '20%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e8eb',
    borderBottomStyle: 'solid',
  },
  itemName: {
    color: '#1a1a2e',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#666666',
    fontSize: 8,
    marginTop: 2,
  },
  tableValue: {
    color: '#1a1a2e',
    fontSize: 10,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f6f9fc',
    padding: 15,
    marginTop: 20,
  },
  paymentMethod: {
    color: '#666666',
    fontSize: 10,
  },
  totalRight: {
    textAlign: 'right',
  },
  totalLabel: {
    color: '#666666',
    fontSize: 8,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalValue: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    textAlign: 'center',
  },
  footerText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  footerTextSmall: {
    color: '#666666',
    fontSize: 8,
    marginBottom: 4,
  },
})

export function ReceiptPDF({
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
}: ReceiptPDFProps) {
  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{organizationName}</Text>
          <Text style={styles.headerSubtitle}>Official Receipt</Text>
        </View>

        <View style={styles.receiptInfo}>
          <Text style={styles.receiptNumber}>Receipt #{receiptNumber}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{customerName}</Text>
            <Text style={styles.infoValueSmall}>{customerEmail}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={[styles.infoLabel, { textAlign: 'right' }]}>
              Event
            </Text>
            <Text style={[styles.infoValue, { textAlign: 'right' }]}>
              {eventName}
            </Text>
            <Text style={[styles.infoValueSmall, { textAlign: 'right' }]}>
              Code: {eventCode}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
        </View>

        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={styles.colItem}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.description && (
                <Text style={styles.itemDesc}>{item.description}</Text>
              )}
            </View>
            <Text style={[styles.tableValue, styles.colQty]}>
              {item.quantity}
            </Text>
            <Text style={[styles.tableValue, styles.colPrice]}>
              ₹{item.price.toFixed(2)}
            </Text>
            <Text style={[styles.tableValue, styles.colTotal]}>
              ₹{item.total.toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.totalSection}>
          <View>
            {paymentMethod && (
              <Text style={styles.paymentMethod}>
                Payment Method: {paymentMethod.toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.totalRight}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your purchase!</Text>
          <Text style={styles.footerTextSmall}>
            This is a computer-generated receipt and does not require a
            signature.
          </Text>
          <Text style={styles.footerTextSmall}>
            For any queries, please contact us at{' '}
            {organizationName.toLowerCase()}@example.com
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default ReceiptPDF
