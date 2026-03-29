/**
 * creativeAI — 圖文素材 AI 生成服務介面
 * ──────────────────────────────────────────────────────────────────────────────
 * 現在：MockCreativeAIService（placehold.co 佔位圖 + 本地範本 prompt）
 * 未來：可接 DALL-E 3 / Stable Diffusion / Midjourney
 *
 * 切換方式（Phase 2）：
 *   1. server/index.js 新增 POST /api/ai/generate-image
 *      安裝 openai SDK 並設定 OPENAI_API_KEY env var（DALL-E 3）
 *   2. 解除本檔 DalleCreativeAIService 的注釋
 *   3. createCreativeAIService() 改為 return new DalleCreativeAIService()
 */

import type { AdCreative } from '../types'

// ── Input / Output Types ──────────────────────────────────────────────────────

export interface CreativePromptInput {
  productName:  string
  styleType:    string     // product / lifestyle / testimonial / promotional
  imageRatio:   string     // 1:1 / 4:5 / 9:16 / 1.91:1
  theme?:       string     // 季節主題
  overlayText?: string     // 參考文字
  copyHeadline?: string    // 綁定的文案標題（提示用）
}

export interface CreativePromptOutput {
  prompt:           string    // English prompt for DALL-E / SD
  negativePrompt:   string    // 排除元素
  styleSuggestions: string[]  // 3 個風格建議
}

export interface CreativeImageInput extends CreativePromptInput {
  prompt?: string    // 若使用者自訂 prompt，覆蓋生成的
}

export interface CreativeImageOutput {
  imageUrl: string    // 生成圖片 URL（目前為 placehold.co）
  prompt:   string    // 實際使用的 prompt
  model:    string    // 使用的模型
}

// ── Service Interface ─────────────────────────────────────────────────────────
// Implement this interface to swap the generation engine

export interface ICreativeAIService {
  /** 根據素材輸入，產生 AI 圖片生成 prompt */
  generateCreativePrompt(input: CreativePromptInput): Promise<CreativePromptOutput>
  /** 呼叫圖片生成 API，回傳圖片 URL */
  generateCreativeImage(input: CreativeImageInput): Promise<CreativeImageOutput>
  /** 驗證並格式化素材資料，回傳可儲存物件 */
  saveCreative(data: Omit<AdCreative, 'id' | 'createdAt'>): Promise<Omit<AdCreative, 'id' | 'createdAt'>>
}

// ── Mock Implementation ───────────────────────────────────────────────────────

const STYLE_PROMPTS: Record<string, string> = {
  product:       'clean product photography, white background, studio lighting, high detail',
  lifestyle:     'lifestyle photography, natural light, real people using product, warm tones',
  testimonial:   'portrait photo, happy customer, clean modern background, authentic expression',
  promotional:   'promotional banner design, bold colors, sale elements, eye-catching layout',
}

const RATIO_DIMENSION: Record<string, string> = {
  '1:1':    '1080x1080',
  '4:5':    '1080x1350',
  '9:16':   '1080x1920',
  '1.91:1': '1200x628',
}

const PALETTE_BG: Record<string, string> = {
  product:       'f8fafc',
  lifestyle:     'd1fae5',
  testimonial:   'eff6ff',
  promotional:   'fef3c7',
}

class MockCreativeAIService implements ICreativeAIService {
  async generateCreativePrompt(input: CreativePromptInput): Promise<CreativePromptOutput> {
    await new Promise(r => setTimeout(r, 400))
    const styleDesc = STYLE_PROMPTS[input.styleType] ?? STYLE_PROMPTS.product
    const themeTag  = input.theme ? `, ${input.theme} themed` : ''
    const prompt = `Professional ${input.styleType} photo of ${input.productName}, ${styleDesc}${themeTag}, high quality, commercial photography, 4K resolution`

    return {
      prompt,
      negativePrompt: 'blurry, low quality, watermark, text overlay, distorted, ugly',
      styleSuggestions: [
        `${input.productName} on clean ${input.styleType} background with natural props`,
        `Close-up detail shot of ${input.productName} showing quality`,
        `${input.productName} in use, lifestyle ${input.theme ?? 'everyday'} context`,
      ],
    }
  }

  async generateCreativeImage(input: CreativeImageInput): Promise<CreativeImageOutput> {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
    const dim      = RATIO_DIMENSION[input.imageRatio] ?? '1080x1080'
    const bg       = PALETTE_BG[input.styleType] ?? 'e5e7eb'
    const textSlug = encodeURIComponent(input.productName.slice(0, 12))
    const imageUrl = `https://placehold.co/${dim}/${bg}/374151?text=${textSlug}`
    const prompt: string = input.prompt ?? await this.generateCreativePrompt(input).then(r => r.prompt)

    return { imageUrl, prompt, model: 'mock-v1' }
  }

  async saveCreative(data: Omit<AdCreative, 'id' | 'createdAt'>) {
    // Validation / formatting before real save
    if (!data.title.trim())    throw new Error('請填寫素材標題')
    if (!data.imageUrl.trim()) throw new Error('請上傳圖片')
    return data
  }
}

// ── DALL-E 3 Service (uncomment for Phase 2) ──────────────────────────────────
//
// class DalleCreativeAIService implements ICreativeAIService {
//   async generateCreativePrompt(input: CreativePromptInput): Promise<CreativePromptOutput> {
//     const res = await fetch('/api/ai/creative-prompt', {
//       method: 'POST', headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(input),
//     })
//     if (!res.ok) throw new Error(`Prompt API error: ${res.status}`)
//     return res.json()
//   }
//
//   async generateCreativeImage(input: CreativeImageInput): Promise<CreativeImageOutput> {
//     const promptResult = input.prompt
//       ? { prompt: input.prompt }
//       : await this.generateCreativePrompt(input)
//     const res = await fetch('/api/ai/generate-image', {
//       method: 'POST', headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ ...input, prompt: promptResult.prompt }),
//     })
//     if (!res.ok) throw new Error(`Image API error: ${res.status}`)
//     return res.json()
//   }
//
//   async saveCreative(data: Omit<AdCreative, 'id' | 'createdAt'>) { return data }
// }
//
// Backend route to add (server/index.js):
// ─────────────────────────────────────────
// const OpenAI = require('openai')
// app.post('/api/ai/generate-image', async (req, res) => {
//   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
//   const { prompt, imageRatio } = req.body
//   const sizeMap = { '1:1': '1024x1024', '4:5': '1024x1792', '9:16': '1024x1792', '1.91:1': '1792x1024' }
//   const response = await openai.images.generate({
//     model: 'dall-e-3',
//     prompt,
//     n: 1,
//     size: sizeMap[imageRatio] ?? '1024x1024',
//   })
//   res.json({ imageUrl: response.data[0].url, prompt, model: 'dall-e-3' })
// })
//
// Alternative: Stable Diffusion via Replicate API
// app.post('/api/ai/generate-image', async (req, res) => {
//   const r = await fetch('https://api.replicate.com/v1/predictions', {
//     method: 'POST',
//     headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
//     body: JSON.stringify({ version: 'stability-ai/sdxl:...', input: { prompt: req.body.prompt } }),
//   })
//   const data = await r.json()
//   res.json({ imageUrl: data.output?.[0], prompt: req.body.prompt, model: 'sdxl' })
// })

// ── Export ────────────────────────────────────────────────────────────────────

export function createCreativeAIService(): ICreativeAIService {
  // Phase 2: return new DalleCreativeAIService()
  return new MockCreativeAIService()
}

export const creativeAIService = createCreativeAIService()
