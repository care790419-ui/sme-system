/**
 * Ad Management Mock Data — Phase 1
 * ─────────────────────────────────
 * These are used while USE_MOCK = true in useAdData.ts.
 * Swap to real API by flipping that flag and wiring backend endpoints.
 */
import type {
  MetaIntegrationSettings,
  AdCampaign,
  AdCopyVersion,
  AdCreative,
  AdPerformance,
} from '../types'

export const MOCK_BRAND_ID   = 'BRAND-001'
export const MOCK_PRODUCT_ID = 'PROD-001'

// ── Meta Integration Settings ─────────────────────────────────────────────────
export const mockMetaSettings: MetaIntegrationSettings = {
  id:                   'META-001',
  brandId:              MOCK_BRAND_ID,
  accessToken:          '***mock-token-hidden***',
  defaultAdAccountId:   'act_123456789',
  defaultPageId:        '987654321',
  defaultPixelId:       '111222333',
  isConnected:          true,
  lastCheckedAt:        '2026-03-25T08:00:00Z',
  status:               'active',
  updatedAt:            '2026-03-25T08:00:00Z',
}

// ── Ad Campaigns ──────────────────────────────────────────────────────────────
export const mockCampaigns: AdCampaign[] = [
  {
    id:                'CAM-001',
    brandId:           MOCK_BRAND_ID,
    productId:         'PROD-001',
    name:              '薑母鴨禮盒 春節轉換活動',
    objective:         'CONVERSIONS',
    budget:            30000,
    startDate:         '2026-01-15',
    endDate:           '2026-02-05',
    landingPageUrl:    'https://shop.example.com/gift-box',
    audienceProfileId: 'AUD-001',
    styleType:         'promotional',
    status:            'ended',
    createdAt:         '2026-01-10T09:00:00Z',
    updatedAt:         '2026-02-05T23:59:59Z',
  },
  {
    id:                'CAM-002',
    brandId:           MOCK_BRAND_ID,
    productId:         'PROD-002',
    name:              '有機蔬菜箱 健康生活推廣',
    objective:         'TRAFFIC',
    budget:            15000,
    startDate:         '2026-03-01',
    endDate:           '2026-03-31',
    landingPageUrl:    'https://shop.example.com/veggie-box',
    audienceProfileId: 'AUD-002',
    styleType:         'lifestyle',
    status:            'active',
    createdAt:         '2026-02-20T10:00:00Z',
    updatedAt:         '2026-03-01T08:00:00Z',
  },
  {
    id:                'CAM-003',
    brandId:           MOCK_BRAND_ID,
    productId:         'PROD-001',
    name:              '禮盒品牌認知 Q2',
    objective:         'AWARENESS',
    budget:            20000,
    startDate:         '2026-04-01',
    endDate:           '2026-06-30',
    landingPageUrl:    'https://shop.example.com',
    audienceProfileId: 'AUD-001',
    styleType:         'product',
    status:            'draft',
    createdAt:         '2026-03-20T14:00:00Z',
    updatedAt:         '2026-03-20T14:00:00Z',
  },
]

// ── Ad Copy Versions ──────────────────────────────────────────────────────────
export const mockCopyVersions: AdCopyVersion[] = [
  {
    id:           'CV-001',
    campaignId:   'CAM-001',
    productId:    'PROD-001',
    primaryText:  '年節送禮首選！精選薑母鴨禮盒，暖胃又暖心。限時特惠，送完為止！',
    headline:     '薑母鴨禮盒 — 暖冬首選',
    description:  '精選食材｜真空包裝｜全台配送',
    callToAction: '立即搶購',
    audienceType: '30-55歲家庭主婦',
    styleType:    'promotional',
    status:       'archived',
    createdAt:    '2026-01-10T10:00:00Z',
  },
  {
    id:           'CV-002',
    campaignId:   'CAM-001',
    productId:    'PROD-001',
    primaryText:  '用一碗薑母鴨，讓家人感受到你的心意。精心製作，只為最重要的人。',
    headline:     '送給你最在乎的人',
    description:  '用心製作｜傳遞情感',
    callToAction: '探索更多',
    audienceType: '25-45歲上班族',
    styleType:    'lifestyle',
    status:       'archived',
    createdAt:    '2026-01-10T10:05:00Z',
  },
  {
    id:           'CV-003',
    campaignId:   'CAM-002',
    productId:    'PROD-002',
    primaryText:  '每週新鮮直送的有機蔬菜箱，讓健康飲食變得超簡單！首單 9 折優惠中。',
    headline:     '有機蔬菜箱 — 健康直送到家',
    description:  '有機認證｜每週新鮮｜彈性訂購',
    callToAction: '立即了解',
    audienceType: '25-40歲健康意識消費者',
    styleType:    'lifestyle',
    status:       'running',
    createdAt:    '2026-02-25T11:00:00Z',
  },
]

// ── Ad Creatives ──────────────────────────────────────────────────────────────
export const mockCreatives: AdCreative[] = [
  {
    id:          'CR-001',
    campaignId:  'CAM-001',
    imageUrl:    'https://placehold.co/1080x1080/f97316/white?text=薑母鴨禮盒',
    imageRatio:  '1:1',
    title:       '年節首選禮盒',
    overlayText: '限時特惠 NT$1,980',
    status:      'archived',
    createdAt:   '2026-01-12T09:00:00Z',
  },
  {
    id:          'CR-002',
    campaignId:  'CAM-002',
    imageUrl:    'https://placehold.co/1080x1350/22c55e/white?text=有機蔬菜箱',
    imageRatio:  '4:5',
    title:       '新鮮有機每週到家',
    overlayText: '首單 9 折',
    status:      'running',
    createdAt:   '2026-02-28T10:00:00Z',
  },
  {
    id:          'CR-003',
    campaignId:  'CAM-003',
    imageUrl:    'https://placehold.co/1080x1920/3b82f6/white?text=品牌故事',
    imageRatio:  '9:16',
    title:       '我們的品牌故事',
    overlayText: '',
    status:      'draft',
    createdAt:   '2026-03-22T14:00:00Z',
  },
]

// ── Ad Performance ────────────────────────────────────────────────────────────
export const mockPerformance: AdPerformance[] = [
  {
    id:          'PERF-001',
    campaignId:  'CAM-001',
    spend:       28450,
    impressions: 342000,
    clicks:      8550,
    ctr:         2.5,
    cpc:         3.33,
    purchases:   285,
    roas:        4.2,
    status:      'ended',
    updatedAt:   '2026-02-05T23:59:59Z',
  },
  {
    id:          'PERF-002',
    campaignId:  'CAM-002',
    spend:       8200,
    impressions: 156000,
    clicks:      4680,
    ctr:         3.0,
    cpc:         1.75,
    purchases:   98,
    roas:        3.1,
    status:      'live',
    updatedAt:   '2026-03-28T08:00:00Z',
  },
  {
    id:          'PERF-003',
    campaignId:  'CAM-003',
    spend:       0,
    impressions: 0,
    clicks:      0,
    ctr:         0,
    cpc:         0,
    purchases:   0,
    roas:        0,
    status:      'paused',
    updatedAt:   '2026-03-20T14:00:00Z',
  },
]
