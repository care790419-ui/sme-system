/**
 * adCopyAI — AI 文案產生服務介面
 * ──────────────────────────────────────────────────────────────────────────────
 * 現在：MockAdCopyAIService（本地範本引擎，不需 API key）
 * 未來：ClaudeAdCopyService（呼叫後端 /api/ai/generate-ad-copy，後端串 Claude API）
 *
 * 切換方式（Phase 2）：
 *   1. 在 server/index.js 新增路由 POST /api/ai/generate-ad-copy
 *      並安裝 npm install @anthropic-ai/sdk，設定 ANTHROPIC_API_KEY env var
 *   2. 解除本檔底部 ClaudeAdCopyService 的注釋
 *   3. 將 createAdCopyService() 改為 return new ClaudeAdCopyService()
 */

import type { AdObjective } from '../types'

// ── Input / Output Types ──────────────────────────────────────────────────────

export type AdCopyStyle =
  | 'professional'    // 專業信賴
  | 'casual'          // 輕鬆親切
  | 'urgent'          // 限時緊迫
  | 'emotional'       // 情感共鳴
  | 'storytelling'    // 故事敘述

export type CtaType =
  | 'shop_now'   | 'learn_more' | 'sign_up'
  | 'contact'    | 'book_now'   | 'get_offer'

export interface AdCopyInput {
  product:    string        // 商品名稱
  audience:   string        // 目標受眾描述
  objective:  AdObjective   // 廣告目標
  style:      AdCopyStyle   // 文案風格
  theme:      string        // 季節 / 活動主題（可空）
  ctaType:    CtaType       // CTA 類型
}

export type AdCopyItemStatus = 'pending' | 'reviewed' | 'approved'

export interface AdCopyItem {
  id:     string
  text:   string
  status: AdCopyItemStatus
}

export interface AdCopyOutput {
  primaryTexts:   AdCopyItem[]   // 5 組
  headlines:      AdCopyItem[]   // 5 組
  descriptions:   AdCopyItem[]   // 3 組
  ctaSuggestions: string[]       // 3 組
  generatedAt:    string
  input:          AdCopyInput
}

// ── Service Interface ─────────────────────────────────────────────────────────
// To swap to Claude API: implement this interface and return it from createAdCopyService()

export interface IAdCopyAIService {
  generate(input: AdCopyInput): Promise<AdCopyOutput>
}

// ── CTA Label Map ─────────────────────────────────────────────────────────────

const CTA_LABELS: Record<CtaType, string[]> = {
  shop_now:   ['立即購買', '馬上搶購', '現在下單', '立即結帳', '搶先購買'],
  learn_more: ['了解更多', '探索詳情', '查看介紹', '深入了解', '查看全部'],
  sign_up:    ['立即加入', '免費註冊', '馬上訂閱', '加入會員', '立即報名'],
  contact:    ['立即諮詢', '聯絡我們', '免費諮詢', '預約諮詢', '聯繫專員'],
  book_now:   ['立即預約', '馬上預訂', '搶先預約', '線上預約', '立即訂位'],
  get_offer:  ['領取優惠', '索取折扣', '立即兌換', '取得優惠碼', '限時領取'],
}

// ── Mock Template Engine ──────────────────────────────────────────────────────

function uid() { return `gi-${Math.random().toString(36).slice(2, 9)}` }

function item(text: string): AdCopyItem {
  return { id: uid(), text: text.trim(), status: 'pending' }
}

function buildPrimaryTexts(i: AdCopyInput): AdCopyItem[] {
  const p  = i.product  || '商品'
  const a  = i.audience || '您'
  const th = i.theme    ? `${i.theme}` : ''
  const thPrefix = th ? `【${th}限定】` : ''
  const thSuffix = th ? `，把握${th}優惠機會！` : '，現在就是最好的時機！'

  return [
    // 1. 問題 → 解決方案
    item(`還在為找不到適合${a}的${p}而煩惱嗎？\n\n我們聽到你的聲音了。${thPrefix}特別為${a}量身打造的${p}，從選材到品質控管，每一個細節都不妥協。用一次就知道差在哪裡${thSuffix}`),

    // 2. 好處清單 + 社群證明
    item(`${thPrefix}${a}都在說的${p}到底有什麼魔力？\n\n✅ 品質有目共睹，口碑超過 98%\n✅ 快速出貨，最快隔日送達\n✅ 售後服務零死角，讓你買得安心\n\n加入數千位${a}的行列${thSuffix}`),

    // 3. 情感 / 生活場景
    item(`有些選擇，改變的不只是一個瞬間，而是整個生活的質感。\n\n${p} 為${a}而生——不是因為它最貴，而是因為它最懂你。${th ? `趁${th}，送自己一份真正值得的禮物` : '從今天開始，讓生活更美好'}。`),

    // 4. 限時緊迫
    item(`⚡ ${thPrefix}倒數計時！\n\n${p} ${th ? `${th}` : '限時'}特惠，${a}專屬優惠只有這幾天。\n\n🔥 名額有限，搶完即止\n⏰ 猶豫只會讓你錯過\n\n現在行動，明天後悔就來不及了！`),

    // 5. 問答 + 數據
    item(`【${a}最常問的問題】\n\n「${p}真的值得買嗎？」\n\n數字說話：超過 5,000 位${a}回購率達 73%，平均評分 4.9 顆星。${th ? `\n\n${th}期間限定優惠，讓你用最划算的價格體驗` : '\n\n現在就讓你用最划算的價格體驗'}一次，就知道答案了。`),
  ]
}

function buildHeadlines(i: AdCopyInput): AdCopyItem[] {
  const p  = i.product  || '商品'
  const a  = i.audience || '您'
  const th = i.theme    || ''

  return [
    item(`${p} — 專為${a}打造的最佳選擇`),
    item(th ? `${th}限定！${p}超值優惠倒數中` : `${p}｜口碑熱銷，${a}搶著要`),
    item(`${a}，你等這個等很久了吧？`),
    item(`告別將就！讓${p}改變你的日常`),
    item(th ? `${th} × ${p} — 限時特惠，錯過等明年` : `現在入手${p}，是你今年最聰明的決定`),
  ]
}

function buildDescriptions(i: AdCopyInput): AdCopyItem[] {
  const p  = i.product  || '商品'
  const a  = i.audience || '您'
  const th = i.theme    || ''

  return [
    item(`精選品質｜快速配送｜${th ? `${th}優惠` : '售後無憂'}｜${a}首選`),
    item(`專為${a}設計的${p}，結合頂級品質與貼心服務。${th ? `${th}期間享限定優惠。` : '立即體驗不同。'}`),
    item(`超過 5,000+ 滿意顧客｜30 天退換保障｜${th ? `${th}限定優惠` : '品質保證'}，值得信賴`),
  ]
}

function buildCtaSuggestions(i: AdCopyInput): string[] {
  const pool = CTA_LABELS[i.ctaType]
  const th   = i.theme
  const extras: Record<string, string[]> = {
    CONVERSIONS:      ['立即搶購', '現在下單'],
    TRAFFIC:          ['探索更多', '查看詳情'],
    AWARENESS:        ['了解我們', '認識品牌'],
    ENGAGEMENT:       ['留言告訴我', '分享給朋友'],
    LEAD_GENERATION:  ['免費索取', '立即諮詢'],
  }
  const base  = pool.slice(0, 2)
  const extra = extras[i.objective]?.[0] ?? '立即了解'
  const themed = th ? `${th}限定優惠，立即把握` : pool[2] ?? '不要錯過'
  return [base[0], extra, themed].slice(0, 3)
}

// ── Style post-processing ─────────────────────────────────────────────────────
// Adjusts generated text tone based on style selection

function applyStyle(items: AdCopyItem[], style: AdCopyStyle): AdCopyItem[] {
  if (style === 'professional') {
    return items.map(it => ({ ...it, text: it.text
      .replace(/搶/g, '選購').replace(/⚡|🔥|⏰/g, '').replace(/！！/g, '！').trim()
    }))
  }
  if (style === 'casual') {
    return items.map(it => ({ ...it, text: it.text
      .replace(/現在行動/g, '快來試試看').replace(/消費者/g, '大家').replace(/您/g, '你')
    }))
  }
  return items
}

// ── Mock Service Class ────────────────────────────────────────────────────────

class MockAdCopyAIService implements IAdCopyAIService {
  async generate(input: AdCopyInput): Promise<AdCopyOutput> {
    // Simulate generation delay (0.8–1.4 s)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600))

    const primaryTexts   = applyStyle(buildPrimaryTexts(input), input.style)
    const headlines      = applyStyle(buildHeadlines(input),    input.style)
    const descriptions   = applyStyle(buildDescriptions(input), input.style)
    const ctaSuggestions = buildCtaSuggestions(input)

    return {
      primaryTexts,
      headlines,
      descriptions,
      ctaSuggestions,
      generatedAt: new Date().toISOString(),
      input,
    }
  }
}

// ── Claude API Service (uncomment for Phase 2) ────────────────────────────────
//
// class ClaudeAdCopyService implements IAdCopyAIService {
//   async generate(input: AdCopyInput): Promise<AdCopyOutput> {
//     // Calls our backend which proxies to Claude API (keeps ANTHROPIC_API_KEY server-side)
//     const res = await fetch('/api/ai/generate-ad-copy', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(input),
//     })
//     if (!res.ok) throw new Error(`AI API error: ${res.status}`)
//     return res.json()
//   }
// }
//
// Backend route to add in server/index.js:
// ─────────────────────────────────────────
// const Anthropic = require('@anthropic-ai/sdk')
// app.post('/api/ai/generate-ad-copy', async (req, res) => {
//   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
//   const input  = req.body
//   const prompt = `
//     你是頂級廣告文案專家。根據以下資訊產生繁體中文廣告文案，輸出 JSON 格式：
//     商品: ${input.product}，受眾: ${input.audience}，目標: ${input.objective}，
//     風格: ${input.style}，主題: ${input.theme || '無'}，CTA: ${input.ctaType}
//
//     回傳格式：
//     { "primaryTexts": ["...","...","...","...","..."],
//       "headlines": ["...","...","...","...","..."],
//       "descriptions": ["...","...","..."],
//       "ctaSuggestions": ["...","...","..."] }
//   `
//   const msg = await client.messages.create({
//     model: 'claude-opus-4-6',
//     max_tokens: 3000,
//     messages: [{ role: 'user', content: prompt }],
//   })
//   const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
//   const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
//   const wrap = (arr: string[]) => arr.map((t, i) => ({
//     id: `ai-${Date.now()}-${i}`, text: t, status: 'pending',
//   }))
//   res.json({
//     primaryTexts: wrap(json.primaryTexts ?? []),
//     headlines:    wrap(json.headlines ?? []),
//     descriptions: wrap(json.descriptions ?? []),
//     ctaSuggestions: json.ctaSuggestions ?? [],
//     generatedAt: new Date().toISOString(),
//     input,
//   })
// })

// ── Export ────────────────────────────────────────────────────────────────────

export function createAdCopyService(): IAdCopyAIService {
  // Phase 2: return new ClaudeAdCopyService()
  return new MockAdCopyAIService()
}

export const adCopyService = createAdCopyService()
