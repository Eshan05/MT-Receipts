import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Define the interface for receipt data
interface ReceiptData {
  customer: {
    name: string
    email: string
  }
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
}

// Create styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
})

// Receipt template component
const ReceiptTemplate = ({ customer, items, total }: ReceiptData) => (
  <Document>
    <Page size='A7' style={styles.page}>
      <Text style={styles.header}>Receipt</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Customer Details</Text>
        <Text style={styles.value}>Name: {customer.name}</Text>
        <Text style={styles.value}>Email: {customer.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Items</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.value}>
              {item.name} (x{item.quantity})
            </Text>
            <Text style={styles.value}>${item.price.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Total</Text>
        <Text style={styles.value}>${total.toFixed(2)}</Text>
      </View>

      <Text style={styles.footer}>Thank you for your purchase!</Text>
    </Page>
  </Document>
)

export default ReceiptTemplate
