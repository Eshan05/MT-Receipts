export interface TemplateConfig {
  primaryColor: string
  secondaryColor?: string
  logoUrl?: string
  showQrCode: boolean
  footerText?: string
  organizationName?: string
}

export interface TemplateTaxLine {
  name: string
  rate: number
  amount: number
}

export interface TemplateCustomer {
  name: string
  email: string
  phone?: string
  address?: string
}

export interface TemplateEvent {
  name: string
  code: string
  type: string
  location?: string
  startDate?: string
  endDate?: string
}

export interface TemplateItem {
  name: string
  description?: string
  quantity: number
  price: number
  total: number
}

export interface TemplateProps {
  receiptNumber: string
  customer: TemplateCustomer
  event: TemplateEvent
  items: TemplateItem[]
  taxes?: TemplateTaxLine[]
  totalAmount: number
  paymentMethod?: string
  date: string
  config: TemplateConfig
  notes?: string
  qrCodeData?: string
}

export type TemplateComponent = (props: TemplateProps) => React.ReactElement

export interface TemplateInfo {
  slug: string
  name: string
  description: string
  category: 'minimal' | 'professional' | 'modern' | 'classic' | 'themed'
}
