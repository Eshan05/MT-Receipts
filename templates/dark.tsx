import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const createStyles = (primaryColor: string, secondaryColor?: string) =>
  StyleSheet.create({
    page: {
      padding: 45,
      fontSize: 11,
      fontFamily: 'Helvetica',
      backgroundColor: '#111827',
      color: '#FFFFFF',
    },
    header: {
      marginBottom: 30,
      padding: 25,
      backgroundColor: '#1F2937',
      borderRadius: 8,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    organizationName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: primaryColor,
    },
    receiptBadge: {
      backgroundColor: primaryColor,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 4,
    },
    receiptBadgeText: {
      fontSize: 10,
      color: '#111827',
      fontWeight: 'bold',
    },
    headerDivider: {
      height: 1,
      backgroundColor: '#374151',
      marginBottom: 15,
    },
    receiptNumber: {
      fontSize: 14,
      color: '#F3F4F6',
      fontWeight: 'bold',
    },
    date: {
      fontSize: 10,
      color: '#9CA3AF',
      marginTop: 4,
    },
    infoSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 25,
    },
    infoCard: {
      width: '48%',
      backgroundColor: '#1F2937',
      padding: 18,
      borderRadius: 8,
    },
    infoLabel: {
      fontSize: 8,
      color: primaryColor,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    infoValue: {
      fontSize: 13,
      color: '#F3F4F6',
      fontWeight: 'bold',
      marginBottom: 4,
    },
    infoValueSmall: {
      fontSize: 10,
      color: '#9CA3AF',
      marginBottom: 2,
    },
    table: {
      backgroundColor: '#1F2937',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: secondaryColor || '#374151',
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    tableHeaderText: {
      fontSize: 9,
      color: '#F3F4F6',
      fontWeight: 'bold',
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
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: '#374151',
    },
    tableRowAlt: {
      backgroundColor: '#0F172A',
    },
    itemName: {
      fontSize: 11,
      color: '#F3F4F6',
    },
    itemDesc: {
      fontSize: 8,
      color: '#6B7280',
      marginTop: 3,
    },
    tableValue: {
      fontSize: 11,
      color: '#D1D5DB',
    },
    totalSection: {
      backgroundColor: '#1F2937',
      borderRadius: 8,
      padding: 20,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 10,
      color: '#9CA3AF',
    },
    totalValue: {
      fontSize: 10,
      color: '#D1D5DB',
    },
    grandTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
    },
    grandTotalLabel: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#F3F4F6',
    },
    grandTotalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: primaryColor,
    },
    paymentBadge: {
      marginTop: 15,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: '#0F172A',
      alignSelf: 'flex-start',
    },
    paymentText: {
      fontSize: 9,
      color: '#9CA3AF',
    },
    footer: {
      marginTop: 30,
      textAlign: 'center',
    },
    footerText: {
      fontSize: 10,
      color: '#6B7280',
    },
  })

export default function DarkTemplate({
  receiptNumber,
  customer,
  event,
  items,
  totalAmount,
  paymentMethod,
  date,
  config,
}: TemplateProps) {
  const styles = createStyles(config.primaryColor, config.secondaryColor)
  const orgName = config.organizationName || 'Organization'

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.organizationName}>{orgName}</Text>
            <View style={styles.receiptBadge}>
              <Text style={styles.receiptBadgeText}>RECEIPT</Text>
            </View>
          </View>
          <View style={styles.headerDivider} />
          <Text style={styles.receiptNumber}>#{receiptNumber}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
            <Text style={styles.infoValueSmall}>{customer.email}</Text>
            {customer.phone && (
              <Text style={styles.infoValueSmall}>{customer.phone}</Text>
            )}
          </View>
          <View style={[styles.infoCard, { alignItems: 'flex-end' }]}>
            <Text style={styles.infoLabel}>Event</Text>
            <Text style={styles.infoValue}>{event.name}</Text>
            <Text style={styles.infoValueSmall}>{event.code}</Text>
            <Text style={styles.infoValueSmall}>
              {event.type.toUpperCase()}
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
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
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
        </View>

        <View style={styles.totalSection}>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
          {paymentMethod && (
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentText}>
                Paid via {paymentMethod.toUpperCase()}
              </Text>
            </View>
          )}
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
