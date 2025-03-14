import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const createStyles = (primaryColor: string, secondaryColor?: string) =>
  StyleSheet.create({
    page: {
      padding: 45,
      fontSize: 11,
      fontFamily: 'Helvetica',
    },
    header: {
      marginBottom: 30,
    },
    topBar: {
      height: 8,
      backgroundColor: primaryColor,
      borderRadius: 4,
      marginBottom: 25,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    organizationName: {
      fontSize: 26,
      fontWeight: 'bold',
      color: primaryColor,
    },
    receiptBadge: {
      backgroundColor: secondaryColor || '#F3F4F6',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    receiptBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: primaryColor,
    },
    divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginVertical: 20,
    },
    infoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 25,
    },
    infoBlock: {
      width: '30%',
    },
    infoLabel: {
      fontSize: 9,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 12,
      color: '#111827',
      fontWeight: '600',
      marginBottom: 3,
    },
    infoValueSmall: {
      fontSize: 10,
      color: '#6B7280',
    },
    table: {
      backgroundColor: '#FAFAFA',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    tableHeaderText: {
      fontSize: 10,
      color: '#FFFFFF',
      fontWeight: 'bold',
      letterSpacing: 0.3,
    },
    colItem: { width: '50%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '17.5%', textAlign: 'right' },
    colTotal: { width: '17.5%', textAlign: 'right' },
    tableBody: {
      padding: 15,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    tableRowLast: {
      borderBottomWidth: 0,
    },
    itemName: {
      fontSize: 11,
      color: '#111827',
      fontWeight: '500',
    },
    itemDesc: {
      fontSize: 9,
      color: '#9CA3AF',
      marginTop: 3,
    },
    tableValue: {
      fontSize: 11,
      color: '#374151',
    },
    totalCard: {
      backgroundColor: secondaryColor || '#F9FAFB',
      borderRadius: 12,
      padding: 20,
      marginLeft: 'auto',
      width: 200,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
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
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
    },
    grandTotalLabel: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#111827',
    },
    grandTotalValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: primaryColor,
    },
    paymentBadge: {
      marginTop: 15,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      alignSelf: 'flex-start',
    },
    paymentText: {
      fontSize: 9,
      color: '#6B7280',
    },
    footer: {
      marginTop: 35,
      textAlign: 'center',
    },
    footerText: {
      fontSize: 10,
      color: '#9CA3AF',
    },
  })

export default function ModernTemplate({
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
        <View style={styles.topBar} />

        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.organizationName}>{orgName}</Text>
            <View style={styles.receiptBadge}>
              <Text style={styles.receiptBadgeText}>#{receiptNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

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
            {paymentMethod && (
              <Text style={styles.infoValueSmall}>
                {paymentMethod.toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>
          <View style={styles.tableBody}>
            {items.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  idx === items.length - 1 ? styles.tableRowLast : {},
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
        </View>

        <View style={styles.totalCard}>
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
            {config.footerText || 'Thank you for your purchase!'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
