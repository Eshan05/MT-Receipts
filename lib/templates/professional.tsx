import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import type { TemplateProps } from './types'

Font.register({
  family: 'Fjalla One',
  src: './public/fonts/FjallaOne-Regular.ttf',
})
Font.register({ family: 'Geist', src: './public/fonts/Geist-Variable.ttf' })
Font.register({
  family: 'Dancing Script',
  src: './public/fonts/DancingScript-Variable.ttf',
})

const createStyles = (primaryColor: string) =>
  StyleSheet.create({
    page: {
      padding: 30, // Reduced padding to ensure single page
      fontSize: 9, // Reduced base font size
      backgroundColor: '#FFFFFF',
      color: '#1F2937',
      fontFamily: 'Geist',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      fontFamily: 'Fjalla One',
      marginBottom: 20,
    },
    receiptTitle: {
      fontSize: 48, // Reduced from 64
      fontWeight: 'bold',
      color: '#25345b',
      letterSpacing: 0.5,
      marginBottom: 15,
    },
    orgSection: {
      marginBottom: 10,
    },
    orgName: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 2,
      color: '#000000',
    },
    orgAddress: {
      fontSize: 9,
      color: '#374151',
      lineHeight: 1.2,
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#AFB4BD',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
    infoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      fontFamily: 'Fjalla One',
    },
    infoColumn: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#25345b',
      marginBottom: 5,
      textTransform: 'uppercase',
    },
    infoValue: {
      fontFamily: 'Geist',
      fontSize: 9,
      color: '#222',
      lineHeight: 1.2,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
      alignItems: 'center',
    },
    infoRowLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#25345b',
      textTransform: 'uppercase',
      marginRight: 10,
    },
    infoRowValue: {
      fontSize: 9,
      color: '#374151',
      textAlign: 'right',
    },
    tableHeader: {
      flexDirection: 'row',
      borderTopWidth: 1.5,
      borderTopColor: '#25345b',
      borderBottomWidth: 1.5,
      borderBottomColor: '#d65147',
      paddingVertical: 4,
      marginTop: 10,
      fontFamily: 'Fjalla One',
    },
    tableHeaderText: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#25345b',
      textTransform: 'uppercase',
    },
    colQty: { width: '8%', textAlign: 'center' },
    colDesc: { width: '52%', paddingLeft: 10 },
    colPrice: { width: '20%', textAlign: 'right' },
    colAmount: { width: '20%', textAlign: 'right' },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      alignItems: 'center',
    },
    tableRowText: {
      fontWeight: '900',
      fontSize: 9,
      color: '#222',
    },
    totalsSection: {
      marginTop: 20,
      alignItems: 'flex-end',
    },
    totalRow: {
      flexDirection: 'row',
      width: 180,
      justifyContent: 'space-between',
      marginBottom: 8,
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#25345b',
    },
    totalValue: {
      fontSize: 9,
      color: '#374151',
    },
    grandTotalRow: {
      flexDirection: 'row',
      width: 180,
      justifyContent: 'space-between',
      marginTop: 10,
      alignItems: 'center',
      fontFamily: 'Fjalla One',
    },
    grandTotalLabel: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#25345b',
    },
    grandTotalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#25345b',
    },
    signatureContainer: {
      marginTop: 30, // Reduced space
      marginBottom: 20,
      alignItems: 'flex-end',
      paddingRight: 30,
    },
    signature: {
      fontSize: 48, // Reduced from 70
      fontFamily: 'Dancing Script',
      color: '#000000',
    },
    footerLine: {
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      width: '100%',
      marginBottom: 20,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 'auto',
    },
    thankYou: {
      fontSize: 48, // Reduced from 64
      fontFamily: 'Dancing Script',
      color: '#25345b',
    },
    termsSection: {
      width: '45%',
      paddingLeft: 20,
      borderLeftWidth: 0,
      marginLeft: 'auto',
      borderLeftColor: '#25345b',
    },
    termsTitle: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#d65147',
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    termsText: {
      fontSize: 8,
      color: '#374151',
      lineHeight: 1.5,
    },
  })

export default function ProfessionalTemplate({
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
  const orgName = config.organizationName || 'ACES Events'
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxRate = 0.0625
  const taxAmount = subtotal * taxRate

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.receiptTitle}>RECEIPT</Text>
            <View style={styles.orgSection}>
              <Text style={styles.orgName}>{orgName}</Text>
              <Text style={styles.orgAddress}>
                1912 Harvest Lane{'\n'}
                New York, NY 12210
              </Text>
            </View>
          </View>
          <View style={styles.logoCircle}>
            {config.logoUrl ? (
              <Image
                src={config.logoUrl}
                style={{ width: '100%', borderRadius: 45 }}
              />
            ) : (
              <Text style={styles.logoText}>LOGO</Text>
            )}
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
            <Text style={styles.infoValue}>
              {customer.address || '123 Main Street, New York, NY 10001'}
            </Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Ship To</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
            <Text style={styles.infoValue}>
              3787 Pineview Drive{'\n'}
              Cambridge, MA 12210
            </Text>
          </View>
          <View style={[styles.infoColumn, { flex: 1.2 }]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Receipt #</Text>
              <Text style={styles.infoRowValue}>{receiptNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Receipt Date</Text>
              <Text style={styles.infoRowValue}>{date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>P.O.#</Text>
              <Text style={styles.infoRowValue}>2312/2019</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Due Date</Text>
              <Text style={styles.infoRowValue}>26/02/2019</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>
            Description
          </Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>
            Unit Price
          </Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
        </View>

        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableRowText, styles.colQty]}>
              {item.quantity}
            </Text>
            <Text style={[styles.tableRowText, styles.colDesc]}>
              {item.name}
            </Text>
            <Text style={[styles.tableRowText, styles.colPrice]}>
              {item.price.toFixed(2)}
            </Text>
            <Text style={[styles.tableRowText, styles.colAmount]}>
              {item.total.toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sales Tax 6.25%</Text>
            <Text style={styles.totalValue}>{taxAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>
              $
              {totalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        <View style={styles.signatureContainer}>
          <Text style={styles.signature}>{customer.name}</Text>
        </View>

        <View style={styles.footerLine} />

        <View style={styles.footer}>
          <View>
            <Text style={styles.thankYou}>Thank you</Text>
          </View>
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              Payment is due within 15 days{'\n'}
              Please make checks payable to: {orgName}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
