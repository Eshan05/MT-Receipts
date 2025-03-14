import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#000000',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  organizationName: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 5,
  },
  receiptTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#000000',
    marginVertical: 15,
  },
  receiptInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  receiptNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 10,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoColumn: {
    width: '45%',
  },
  infoLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 11,
    marginBottom: 3,
  },
  infoValueSmall: {
    fontSize: 10,
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  colItem: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '17.5%', textAlign: 'right' },
  colTotal: { width: '17.5%', textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  itemName: {
    fontSize: 10,
  },
  tableValue: {
    fontSize: 10,
  },
  totalSection: {
    marginTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingTop: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  totalLabel: {
    width: 150,
    textAlign: 'right',
    fontSize: 10,
    marginRight: 15,
  },
  totalValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 10,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  grandTotalLabel: {
    width: 150,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 15,
  },
  grandTotalValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentInfo: {
    marginTop: 15,
    fontSize: 10,
  },
  footer: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 15,
  },
})

export default function ClassicTemplate({
  receiptNumber,
  customer,
  event,
  items,
  totalAmount,
  paymentMethod,
  date,
  config,
}: TemplateProps) {
  const orgName = config.organizationName || 'Organization'

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.organizationName}>{orgName}</Text>
          <Text style={styles.receiptTitle}>Receipt</Text>
        </View>

        <View style={styles.receiptInfo}>
          <Text style={styles.receiptNumber}>No. {receiptNumber}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
            <Text style={styles.infoValueSmall}>{customer.email}</Text>
            {customer.phone && (
              <Text style={styles.infoValueSmall}>{customer.phone}</Text>
            )}
          </View>
          <View style={[styles.infoColumn, { textAlign: 'right' }]}>
            <Text style={styles.infoLabel}>Event</Text>
            <Text style={styles.infoValue}>{event.name}</Text>
            <Text style={styles.infoValueSmall}>{event.code}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.itemName, styles.colItem]}>{item.name}</Text>
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
        </View>

        <View style={styles.totalSection}>
          {paymentMethod && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Payment</Text>
              <Text style={styles.totalValue}>
                {paymentMethod.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{config.footerText || 'Thank you for your purchase'}</Text>
        </View>
      </Page>
    </Document>
  )
}
