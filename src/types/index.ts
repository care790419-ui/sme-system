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
  invoiceNumber: string  // 使用者自訂發票號碼
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

export type AdCopyTone = 'professional' | 'casual' | 'urgent' | 'emotional'
export type AdCopyStatus = 'draft' | 'approved' | 'running' | 'archived'

export interface AdCopy {
  id: string
  groupId: string          // 同一次產生的群組 ID
  version: number          // 同 groupId 下的版本號
  status: AdCopyStatus
  platform: string         // Facebook | Instagram | Google | LINE | YouTube | TikTok
  format: string           // feed | story | reels | search | display
  productName: string      // 商品名稱（產生文案用）
  targetAudience: string   // 目標受眾描述
  tone: AdCopyTone
  headline: string         // 主標題
  primaryText: string      // 主文案
  description: string      // 描述/副標
  callToAction: string     // CTA 按鈕文字
  notes: string            // 備註
  createdAt: string
}

// ── Meta API ──────────────────────────────────────────────────────────────────

export interface MetaAdAccount {
  id: string
  name: string
  currency: string
  account_status: number   // 1=active
}

export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective: string
}

export interface MetaAdSet {
  id: string
  name: string
  status: string
}

export interface MetaPage {
  id: string
  name: string
  access_token: string
}

export interface MetaStatus {
  connected: boolean
  userName?: string
  userId?: string
  adAccountId?: string
  adAccountName?: string
  connectedAt?: string
}

// ── Ad Management Models (Phase 1 — Mock → API ready) ─────────────────────────

export type AdObjective = 'CONVERSIONS' | 'TRAFFIC' | 'AWARENESS' | 'ENGAGEMENT' | 'LEAD_GENERATION'
export type AdStyleType = 'product' | 'lifestyle' | 'testimonial' | 'promotional'
export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'ended' | 'error'

export interface MetaIntegrationSettings {
  id: string
  brandId: string
  accessToken: string          // masked in UI, real value server-side only
  defaultAdAccountId: string
  defaultPageId: string
  defaultPixelId: string
  isConnected: boolean
  lastCheckedAt: string        // ISO
  status: 'active' | 'expired' | 'error' | 'disconnected'
  updatedAt: string
}

export interface AdCampaign {
  id: string
  brandId: string
  productId: string
  name: string
  objective: AdObjective
  budget: number               // NT$
  startDate: string
  endDate: string
  landingPageUrl: string
  audienceProfileId: string
  styleType: AdStyleType
  status: AdCampaignStatus
  createdAt: string
  updatedAt: string
}

export interface AdCopyVersion {
  id: string
  campaignId: string
  productId: string
  primaryText: string
  headline: string
  description: string
  callToAction: string
  audienceType: string
  styleType: string
  status: 'draft' | 'approved' | 'running' | 'archived'
  createdAt: string
}

export interface AdCreative {
  id: string
  campaignId: string
  imageUrl: string             // file:// / blob: / https://  (後端改為 CDN URL)
  imageRatio: '1:1' | '4:5' | '9:16' | '1.91:1'
  title: string
  overlayText: string
  status: 'draft' | 'approved' | 'running' | 'archived'
  createdAt: string
  // Extended fields (Phase 1+)
  copyVersionId?: string       // 綁定文案版本
  productName?: string         // 商品名稱（方便顯示）
  aiPrompt?: string            // AI 圖片生成 prompt（Phase 2）
}

export interface AdPerformance {
  id: string
  campaignId: string
  spend: number                // NT$
  impressions: number
  clicks: number
  ctr: number                  // %
  cpc: number                  // NT$ per click
  purchases: number
  roas: number                 // x multiplier
  status: 'live' | 'paused' | 'ended'
  updatedAt: string
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
