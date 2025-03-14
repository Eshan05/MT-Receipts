import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const createStyles = (primaryColor: string) =>
  StyleSheet.create({
    page: {
      padding: 60,
      fontSize: 11,
      fontFamily: 'Helvetica',
    },
    decorativeBorder: {
      borderWidth: 2,
      borderColor: primaryColor,
      borderRadius: 8,
      padding: 30,
      height: '95%',
    },
    innerBorder: {
      borderWidth: 1,
      borderColor: primaryColor,
      borderRadius: 4,
      padding: 25,
    },
    header: {
      textAlign: 'center',
      marginBottom: 30,
      paddingBottom: 25,
      borderBottomWidth: 1,
      borderBottomColor: primaryColor,
    },
    organizationName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: primaryColor,
      marginBottom: 8,
      letterSpacing: 2,
    },
    receiptTitle: {
      fontSize: 14,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 4,
    },
    receiptInfo: {
      textAlign: 'center',
      marginBottom: 25,
    },
    receiptNumber: {
      fontSize: 16,
      fontWeight: 'bold',
      color: primaryColor,
    },
    date: {
      fontSize: 10,
      color: '#9CA3AF',
      marginTop: 5,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: primaryColor,
    },
    dividerIcon: {
      width: 30,
      textAlign: 'center',
      color: primaryColor,
      fontSize: 12,
    },
    infoSection: {
      marginBottom: 25,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 15,
    },
    infoBlock: {
      width: '40%',
      textAlign: 'center',
    },
    infoLabel: {
      fontSize: 9,
      color: primaryColor,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 8,
    },
    infoValue: {
      fontSize: 12,
      color: '#111827',
      fontWeight: 'bold',
      marginBottom: 3,
    },
    infoValueSmall: {
      fontSize: 10,
      color: '#6B7280',
    },
    table: {
      marginBottom: 25,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: primaryColor,
      paddingBottom: 10,
      marginBottom: 10,
    },
    tableHeaderText: {
      fontSize: 9,
      color: primaryColor,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: 'bold',
    },
    colItem: { width: '50%', textAlign: 'center' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '17.5%', textAlign: 'center' },
    colTotal: { width: '17.5%', textAlign: 'center' },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    itemName: {
      fontSize: 10,
      color: '#374151',
      textAlign: 'center',
    },
    tableValue: {
      fontSize: 10,
      color: '#374151',
      textAlign: 'center',
    },
    totalSection: {
      textAlign: 'center',
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: primaryColor,
    },
    totalLabel: {
      fontSize: 10,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    totalValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: primaryColor,
      marginTop: 10,
    },
    paymentInfo: {
      marginTop: 15,
      textAlign: 'center',
    },
    paymentText: {
      fontSize: 9,
      color: '#6B7280',
    },
    footer: {
      textAlign: 'center',
      marginTop: 30,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: primaryColor,
    },
    footerText: {
      fontSize: 10,
      color: '#6B7280',
      fontStyle: 'italic',
    },
  })

export default function ElegantTemplate({
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
        <View style={styles.decorativeBorder}>
          <View style={styles.innerBorder}>
            <View style={styles.header}>
              <Text style={styles.organizationName}>{orgName}</Text>
              <Text style={styles.receiptTitle}>Receipt</Text>
            </View>

            <View style={styles.receiptInfo}>
              <Text style={styles.receiptNumber}>#{receiptNumber}</Text>
              <Text style={styles.date}>{date}</Text>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerIcon}>✦</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Bill To</Text>
                  <Text style={styles.infoValue}>{customer.name}</Text>
                  <Text style={styles.infoValueSmall}>{customer.email}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Event</Text>
                  <Text style={styles.infoValue}>{event.name}</Text>
                  <Text style={styles.infoValueSmall}>{event.code}</Text>
                </View>
              </View>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colItem]}>
                  Item
                </Text>
                <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
                <Text style={[styles.tableHeaderText, styles.colPrice]}>
                  Price
                </Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>
                  Total
                </Text>
              </View>

              {items.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.itemName, styles.colItem]}>
                    {item.name}
                  </Text>
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
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
              {paymentMethod && (
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentText}>
                    Paid via {paymentMethod.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {config.footerText || 'Thank you for your patronage'}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
