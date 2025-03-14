import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const createStyles = (primaryColor: string) =>
  StyleSheet.create({
    page: {
      padding: 50,
      fontSize: 11,
      fontFamily: 'Helvetica',
      backgroundColor: '#FAFAFA',
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 35,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    header: {
      marginBottom: 25,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    organizationName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: primaryColor,
    },
    receiptBadge: {
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    receiptBadgeText: {
      fontSize: 10,
      color: '#6B7280',
      fontWeight: 'bold',
    },
    infoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 20,
      padding: 15,
      backgroundColor: '#F9FAFB',
      borderRadius: 6,
    },
    infoBlock: {
      width: '30%',
    },
    infoLabel: {
      fontSize: 8,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    infoValue: {
      fontSize: 12,
      color: '#111827',
      fontWeight: 'bold',
      marginBottom: 2,
    },
    infoValueSmall: {
      fontSize: 10,
      color: '#6B7280',
    },
    table: {
      marginTop: 15,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
    },
    tableHeaderText: {
      fontSize: 9,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    colItem: { width: '50%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '17.5%', textAlign: 'right' },
    colTotal: { width: '17.5%', textAlign: 'right' },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    tableRowAlt: {
      backgroundColor: '#F9FAFB',
    },
    itemName: {
      fontSize: 10,
      color: '#111827',
    },
    itemDesc: {
      fontSize: 8,
      color: '#9CA3AF',
      marginTop: 2,
    },
    tableValue: {
      fontSize: 10,
      color: '#374151',
    },
    totalSection: {
      marginTop: 20,
      padding: 15,
      backgroundColor: '#F9FAFB',
      borderRadius: 6,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    totalLabel: {
      fontSize: 10,
      color: '#6B7280',
    },
    totalValue: {
      fontSize: 10,
      color: '#374151',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#111827',
    },
    grandTotalValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: primaryColor,
    },
    footer: {
      marginTop: 25,
      textAlign: 'center',
    },
    footerText: {
      fontSize: 9,
      color: '#9CA3AF',
    },
    dateInfo: {
      marginTop: 10,
      padding: 10,
      backgroundColor: '#F3F4F6',
      borderRadius: 4,
    },
    dateText: {
      fontSize: 9,
      color: '#6B7280',
    },
  })

export default function CleanTemplate({
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
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.organizationName}>{orgName}</Text>
              <View style={styles.receiptBadge}>
                <Text style={styles.receiptBadgeText}>#{receiptNumber}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Bill To</Text>
              <Text style={styles.infoValue}>{customer.name}</Text>
              <Text style={styles.infoValueSmall}>{customer.email}</Text>
            </View>
            <View style={[styles.infoBlock, { alignItems: 'center' }]}>
              <Text style={styles.infoLabel}>Event</Text>
              <Text style={styles.infoValue}>{event.name}</Text>
              <Text style={styles.infoValueSmall}>{event.code}</Text>
            </View>
            <View style={[styles.infoBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{date}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>
                Price
              </Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>
                Total
              </Text>
            </View>

            {items.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  idx % 2 === 1 ? styles.tableRowAlt : {},
                ]}
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
            {paymentMethod && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Payment Method</Text>
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
            <Text style={styles.footerText}>
              {config.footerText || 'Thank you for your purchase'}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
