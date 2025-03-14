import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TemplateProps } from './types'

const createStyles = (primaryColor: string, secondaryColor?: string) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Helvetica',
    },
    header: {
      backgroundColor: primaryColor,
      padding: 25,
      marginBottom: 25,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    organizationName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    receiptBadge: {
      backgroundColor: secondaryColor || '#FFFFFF',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 4,
    },
    receiptBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: primaryColor,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    receiptInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      padding: 15,
      backgroundColor: '#F8FAFC',
      borderRadius: 4,
    },
    receiptNumber: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1E293B',
    },
    date: {
      fontSize: 10,
      color: '#64748B',
      marginTop: 4,
    },
    infoSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    infoColumn: {
      width: '48%',
      padding: 15,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 4,
    },
    infoLabel: {
      fontSize: 8,
      color: primaryColor,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      fontWeight: 'bold',
      marginBottom: 10,
      paddingBottom: 5,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
    },
    infoValue: {
      fontSize: 11,
      color: '#0F172A',
      marginBottom: 4,
      fontWeight: 'bold',
    },
    infoValueLight: {
      fontSize: 10,
      color: '#475569',
      marginBottom: 2,
    },
    table: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 4,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      paddingVertical: 12,
      paddingHorizontal: 15,
    },
    tableHeaderText: {
      fontSize: 9,
      color: '#FFFFFF',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    colItem: { width: '45%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    tableRowAlt: {
      backgroundColor: '#F8FAFC',
    },
    itemName: {
      fontSize: 10,
      color: '#0F172A',
      fontWeight: 'bold',
    },
    itemDesc: {
      fontSize: 8,
      color: '#64748B',
      marginTop: 2,
    },
    tableValue: {
      fontSize: 10,
      color: '#334155',
    },
    totalSection: {
      marginTop: 20,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    totalBox: {
      width: 220,
      backgroundColor: '#F8FAFC',
      padding: 15,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: primaryColor,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 10,
      color: '#64748B',
    },
    totalValue: {
      fontSize: 10,
      color: '#0F172A',
    },
    grandTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      marginTop: 5,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#0F172A',
    },
    grandTotalValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: primaryColor,
    },
    paymentInfo: {
      marginTop: 15,
      padding: 10,
      backgroundColor: '#F8FAFC',
      borderRadius: 4,
    },
    paymentLabel: {
      fontSize: 8,
      color: primaryColor,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: 'bold',
    },
    paymentValue: {
      fontSize: 10,
      color: '#0F172A',
      marginTop: 4,
    },
    footer: {
      marginTop: 30,
      textAlign: 'center',
      padding: 15,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
    },
    footerText: {
      fontSize: 10,
      color: '#64748B',
    },
  })

export default function CorporateTemplate({
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
          <View style={styles.headerContent}>
            <Text style={styles.organizationName}>{orgName}</Text>
            <View style={styles.receiptBadge}>
              <Text style={styles.receiptBadgeText}>Official Receipt</Text>
            </View>
          </View>
        </View>

        <View style={styles.receiptInfo}>
          <View>
            <Text style={styles.receiptNumber}>Receipt #{receiptNumber}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.infoValue}>{event.name}</Text>
            <Text style={styles.infoValueLight}>{event.code}</Text>
          </View>
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
          <View style={[styles.infoColumn, { alignItems: 'flex-end' }]}>
            <Text style={styles.infoLabel}>Event Details</Text>
            <Text style={styles.infoValue}>{event.type.toUpperCase()}</Text>
            {customer.address && (
              <Text style={styles.infoValueLight}>{customer.address}</Text>
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
          <View style={styles.totalBox}>
            {paymentMethod && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Payment Method</Text>
                <Text style={styles.totalValue}>
                  {paymentMethod.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
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
            {config.footerText || 'Thank you for your business'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
