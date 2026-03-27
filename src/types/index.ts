export interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: 'income' | 'expense'
  status: 'completed' | 'pending' | 'cancelled'
}

export interface Invoice {
  id: string
  client: string
  date: string
  dueDate: string
  amount: number        // 含稅總金額
  taxRate: number       // 稅率，預設 0.05（5%）
  taxMonth: string      // 報稅月份 YYYY-MM（對應訂單月份）
  status: 'paid' | 'unpaid' | 'overdue'
  items: InvoiceItem[]
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface CostItem {
  id: string
  category: string
  subcategory: string
  description: string
  budget: number
  actual: number
  month: string
  costType: 'variable' | 'fixed'
}

export interface Campaign {
  id: string
  name: string
  platform: string
  startDate: string
  endDate: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  status: 'active' | 'paused' | 'ended'
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
  profit: number
}

export interface CostCategory {
  id: string
  name: string
  type: 'variable' | 'fixed'
  color: string
}

export interface Vendor {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  paymentTerms: number
}

export interface CostRecord {
  id: string
  date: string
  categoryId: string | null
  vendorId: string | null
  description: string
  amount: number
  paidAmount: number
  status: 'paid' | 'partial' | 'unpaid' | 'refunded'
  costType: 'variable' | 'fixed'
  isRecurring: number
  recurringPeriod: string
  month: string
  notes: string
  category?: CostCategory | null
  vendor?: Vendor | null
}

export interface ProductCost {
  id: string
  productName: string
  channel: string
  revenue: number
  cogs: number
  adSpend: number
  otherCosts: number
  orders: number
  month: string
}

export interface SalesChannel {
  id: string
  name: string
  platform: string
  commission: number
  revenue: number
  cogs: number
  adSpend: number
  orders: number
  month: string
}
