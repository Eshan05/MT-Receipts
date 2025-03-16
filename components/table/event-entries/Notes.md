# Event Entries Table Components

A data table component for displaying and managing event entries (purchases and receipts) for a specific event.

## Files

| File                         | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `schema.ts`                  | Zod schema and TypeScript types for event entries        |
| `columns.tsx`                | Column definitions for the data table                    |
| `data-table.tsx`             | Main table component with sorting, filtering, pagination |
| `data-table-toolbar.tsx`     | Toolbar with search and filter controls                  |
| `data-table-row-actions.tsx` | Row action dropdown menu                                 |
| `index.ts`                   | Barrel export file                                       |

## Usage

```tsx
import { DataTable, columns, type EventEntry } from '@/components/table/event-entries'

// Fetch entries from API
const entries: EventEntry[] = await getEventEntries(eventCode)

// Render table
<DataTable columns={columns} data={entries} />
```

## Data Structure

The `EventEntry` type unifies data from both `IPurchase` and `IReceipt` models:

```typescript
interface EventEntry {
  _id: string
  type: 'purchase' | 'receipt'
  receiptNumber?: string // Receipt only
  purchaseId?: string // Purchase only
  customer: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  items: Array<{
    name: string
    description?: string
    quantity: number
    price: number
    total?: number
  }>
  totalAmount: number
  paymentMethod?: 'cash' | 'upi' | 'card' | 'other'
  status?: 'pending' | 'completed' | 'cancelled' // Purchase only
  emailSent?: boolean // Receipt only
  emailSentAt?: Date // Receipt only
  emailError?: string // Receipt only
  pdfUrl?: string // Receipt only
  createdAt: Date
  createdBy?: string
}
```

## Columns

| Column        | Visible by Default | Description                       |
| ------------- | ------------------ | --------------------------------- |
| Select        | Yes                | Checkbox for row selection        |
| Entry ID      | No                 | Receipt number or Purchase ID     |
| Customer      | Yes                | Name with email and phone tooltip |
| Items         | Yes                | Badges with icons (flex-wrap)     |
| Total         | Yes                | Formatted INR currency            |
| Payment       | Yes                | Payment method badge              |
| Status        | Yes                | Email/Purchase status badge       |
| Created       | No                 | Relative timestamp                |
| Email Sent At | No                 | When email was sent               |
| Created By    | No                 | User ID                           |
| Actions       | Yes                | Dropdown menu                     |

## Row Actions

### Receipts

- View Receipt - Opens PDF preview dialog
- Send/Resend Email - Send receipt email
- Download PDF - Download PDF directly

### Purchases

- Create Receipt - Navigate to receipt creation
- View Details - Show purchase details dialog
