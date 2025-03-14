import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const createStyles = (primaryColor: string) =>
  StyleSheet.create({
    page: {
      padding: 50,
      fontSize: 11,
      fontFamily: 'Helvetica',
    },
    header: {
      marginBottom: 30,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      borderBottomStyle: 'solid',
    },
    organizationName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 4,
    },
    receiptTitle: {
      fontSize: 12,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    receiptInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    receiptNumber: {
      fontSize: 10,
      color: '#374151',
    },
    date: {
      fontSize: 10,
      color: '#6B7280',
    },
    infoSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 25,
    },
    infoColumn: {
      width: '45%',
    },
    infoLabel: {
      fontSize: 9,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    infoValue: {
      fontSize: 11,
      color: '#111827',
      marginBottom: 3,
    },
    infoValueLight: {
      fontSize: 10,
      color: '#6B7280',
    },
    table: {
      marginTop: 15,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    tableHeaderText: {
      fontSize: 9,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    colItem: { width: '50%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '17.5%', textAlign: 'right' },
    colTotal: { width: '17.5%', textAlign: 'right' },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    itemName: {
      fontSize: 10,
      color: '#111827',
    },
    tableValue: {
      fontSize: 10,
      color: '#374151',
    },
    totalSection: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    totalColumn: {
      width: 200,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    totalLabel: {
      fontSize: 10,
      color: '#6B7280',
    },
    totalValue: {
      fontSize: 10,
      color: '#374151',
    },
    grandTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#111827',
    },
    grandTotalValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: primaryColor,
    },
    footer: {
      marginTop: 40,
      textAlign: 'center',
    },
    footerText: {
      fontSize: 9,
      color: '#9CA3AF',
    },
  })

export default function MinimalTemplate({
  receiptNumber,
  customer,
  event,
  items,
  totalAmount,
  paymentMethod,
  date,
  config,
}: TemplateProps) {
  const styles = createStyles(config.primaryColor)
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

        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
            <Text style={styles.infoValueLight}>{customer.email}</Text>
            {customer.phone && (
              <Text style={styles.infoValueLight}>{customer.phone}</Text>
            )}
          </View>
          <View style={styles.infoColumn}>
            <Text style={[styles.infoLabel, { textAlign: 'right' }]}>
              Event
            </Text>
            <Text style={[styles.infoValue, { textAlign: 'right' }]}>
              {event.name}
            </Text>
            <Text style={[styles.infoValueLight, { textAlign: 'right' }]}>
              {event.code}
            </Text>
          </View>
        </View>

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
          <View style={styles.totalColumn}>
            {paymentMethod && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Payment</Text>
                <Text style={styles.totalValue}>
                  {paymentMethod.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                ₹{totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {config.footerText || 'Thank you for your purchase'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
