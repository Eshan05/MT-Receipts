import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const createStyles = (primaryColor: string) =>
  StyleSheet.create({
    page: {
      padding: 20,
      fontSize: 9,
      fontFamily: 'Helvetica',
      width: 280,
    },
    header: {
      textAlign: 'center',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      marginBottom: 10,
    },
    organizationName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: primaryColor,
    },
    receiptTitle: {
      fontSize: 8,
      color: '#6B7280',
      marginTop: 2,
    },
    info: {
      marginBottom: 10,
      padding: 8,
      backgroundColor: '#F9FAFB',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    infoLabel: {
      fontSize: 8,
      color: '#6B7280',
    },
    infoValue: {
      fontSize: 8,
      color: '#111827',
      fontWeight: 'bold',
    },
    divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginVertical: 8,
      borderStyle: 'dashed',
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      paddingBottom: 5,
      marginBottom: 5,
    },
    colItem: { width: '45%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },
    tableHeaderText: {
      fontSize: 7,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    itemName: {
      fontSize: 8,
    },
    tableValue: {
      fontSize: 8,
    },
    totalSection: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 2,
      borderTopColor: '#000000',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    totalLabel: {
      fontSize: 8,
    },
    totalValue: {
      fontSize: 8,
      fontWeight: 'bold',
    },
    grandTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 5,
    },
    grandTotalLabel: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    grandTotalValue: {
      fontSize: 12,
      fontWeight: 'bold',
      color: primaryColor,
    },
    footer: {
      marginTop: 15,
      textAlign: 'center',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      paddingTop: 8,
    },
    footerText: {
      fontSize: 7,
      color: '#6B7280',
    },
    barcode: {
      textAlign: 'center',
      marginTop: 10,
      fontFamily: 'Courier',
      fontSize: 8,
      letterSpacing: 2,
    },
  })

export default function ReceiptStyleTemplate({
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
      <Page size={[280, 600]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.organizationName}>{orgName}</Text>
          <Text style={styles.receiptTitle}>RECEIPT</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Receipt #</Text>
            <Text style={styles.infoValue}>{receiptNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event</Text>
            <Text style={styles.infoValue}>{event.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

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
              ₹{item.price.toFixed(0)}
            </Text>
            <Text style={[styles.tableValue, styles.colTotal]}>
              ₹{item.total.toFixed(0)}
            </Text>
          </View>
        ))}

        <View style={styles.totalSection}>
          {paymentMethod && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Payment</Text>
              <Text style={styles.totalValue}>
                {paymentMethod.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>
              ₹{totalAmount.toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {config.footerText || 'Thank you for your purchase!'}
          </Text>
        </View>

        <View style={styles.barcode}>
          <Text>*{receiptNumber}*</Text>
        </View>
      </Page>
    </Document>
  )
}
