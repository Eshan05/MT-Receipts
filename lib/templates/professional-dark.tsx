import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  Link,
} from '@react-pdf/renderer'
import type { TemplateProps } from './types'
import path from 'path'

const isServer = typeof window === 'undefined'
const getFontPath = (fontFile: string) => {
  if (isServer) {
    return path.join(process.cwd(), 'public', 'fonts', fontFile)
  }
  return `/fonts/${fontFile}`
}

Font.register({
  family: 'Fjalla One',
  src: getFontPath('FjallaOne-Regular.ttf'),
})
Font.register({ family: 'Geist', src: getFontPath('Geist-Variable.ttf') })
Font.register({
  family: 'Dancing Script',
  src: getFontPath('ImperialScript-Regular.ttf'),
})

const createStyles = (primaryColor: string, secondaryColor?: string) =>
  StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 9,
      backgroundColor: '#181818',
      color: '#e4e4e7',
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
      fontSize: 48,
      fontWeight: 'bold',
      color: '#fafafa',
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
      color: '#fafafa',
    },
    orgAddress: {
      fontSize: 9,
      color: '#a1a1aa',
      lineHeight: 1.2,
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#272727',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoText: {
      color: '#fafafa',
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
      color: primaryColor,
      marginBottom: 5,
      textTransform: 'uppercase',
    },
    infoValue: {
      fontFamily: 'Geist',
      fontSize: 9,
      color: '#d4d4d8',
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
      color: primaryColor,
      textTransform: 'uppercase',
      marginRight: 10,
    },
    infoRowValue: {
      fontSize: 9,
      color: '#a1a1aa',
      textAlign: 'right',
    },
    tableHeader: {
      flexDirection: 'row',
      borderTopWidth: 1.5,
      borderTopColor: primaryColor,
      borderBottomWidth: 1.5,
      borderBottomColor: '#3f3f46',
      paddingVertical: 4,
      marginTop: 10,
      fontFamily: 'Fjalla One',
    },
    tableHeaderText: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#fafafa',
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
      color: '#e4e4e7',
    },
    totalsSection: {
      marginTop: 20,
      alignItems: 'flex-end',
    },
    totalsWithQrContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 20,
    },
    qrCodeSection: {
      width: 80,
      height: 80,
      backgroundColor: '#ffffff',
      borderRadius: 4,
      padding: 4,
    },
    qrCode: {
      width: 72,
      height: 72,
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
      color: '#fafafa',
    },
    totalValue: {
      fontSize: 9,
      color: '#a1a1aa',
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
      color: '#fafafa',
    },
    grandTotalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: primaryColor,
    },
    signatureContainer: {
      marginTop: 30,
      marginBottom: 20,
      alignItems: 'flex-end',
      paddingRight: 30,
    },
    signature: {
      fontSize: 42,
      fontFamily: 'Dancing Script',
      color: '#52525b',
    },
    footerLine: {
      borderTopWidth: 1,
      borderTopColor: '#3f3f46',
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
      fontSize: 48,
      fontFamily: 'Dancing Script',
      color: primaryColor,
    },
    termsSection: {
      width: '45%',
      paddingLeft: 20,
      borderLeftWidth: 0,
      marginLeft: 'auto',
      borderLeftColor: '#3f3f46',
    },
    termsTitle: {
      fontSize: 9,
      fontWeight: 'bold',
      color: secondaryColor || primaryColor,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    termsText: {
      fontSize: 8,
      color: '#717171',
      lineHeight: 1.5,
    },
    notesSection: {
      marginBottom: 10,
    },
    notesTitle: {
      fontSize: 9,
      fontWeight: 'bold',
      color: secondaryColor || primaryColor,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    notesText: {
      fontSize: 8,
      color: '#717171',
      lineHeight: 1.5,
    },
  })

export default function ProfessionalDarkTemplate({
  receiptNumber,
  customer,
  event,
  items,
  totalAmount,
  paymentMethod,
  date,
  config,
  notes,
  qrCodeData,
}: TemplateProps) {
  const styles = createStyles(config.primaryColor, config.secondaryColor)
  const orgName = config.organizationName || 'ACES'
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
                Association of Computer Engineers{'\n'}
                RMDSSOE, Pune, MH, India{'\n'}
                <Link
                  style={{ color: config.primaryColor }}
                  src='https://aces-rmdssoe.in'
                >
                  Website
                </Link>{' '}
                |{' '}
                <Link
                  style={{ color: config.primaryColor }}
                  src='mailto:aces.rmdssoe@sinhgad.edu'
                >
                  Email
                </Link>
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
            <Text style={styles.infoValue}>{customer.email}</Text>
            {customer.phone && (
              <Text style={styles.infoValue}>{customer.phone}</Text>
            )}
            {customer.address && (
              <Text style={styles.infoValue}>{customer.address}</Text>
            )}
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Event</Text>
            <Text style={styles.infoValue}>{event.name}</Text>
            <Text style={styles.infoValue}>
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </Text>
            {event.location && (
              <Text style={styles.infoValue}>{event.location}</Text>
            )}
            {event.startDate && (
              <Text style={styles.infoValue}>
                {event.endDate
                  ? `${event.startDate} - ${event.endDate}`
                  : event.startDate}
              </Text>
            )}
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
            {paymentMethod && (
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>Payment Method</Text>
                <Text style={styles.infoRowValue}>
                  {paymentMethod.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>
            Description
          </Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>
            Unit Price (₹)
          </Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>
            Amount (₹)
          </Text>
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

        <View style={styles.totalsWithQrContainer}>
          {qrCodeData && (
            <View style={styles.qrCodeSection}>
              <Image
                style={styles.qrCode}
                src={(() => {
                  if (!qrCodeData.startsWith('data:image/')) return qrCodeData
                  const [header, base64] = qrCodeData.split(',')
                  const mime = header.slice(5, header.indexOf(';'))
                  const ext = mime.split('/')[1]
                  const format = ext === 'jpeg' ? 'jpg' : ext
                  return {
                    data: Buffer.from(base64, 'base64'),
                    format: format as 'png' | 'jpg',
                  }
                })()}
              />
            </View>
          )}
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
            {notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            )}
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
