import React, { useState, useCallback } from 'react'
import {
  Sparkles, CheckCircle2, Eye, Edit2, Save, RotateCcw,
  ChevronDown, ChevronRight, Copy, Check,
} from 'lucide-react'
import type { AdObjective } from '../types'
import type {
  AdCopyInput, AdCopyOutput, AdCopyItem, AdCopyItemStatus,
  AdCopyStyle, CtaType,
} from '../services/adCopyAI'
import { adCopyService } from '../services/adCopyAI'
import { useAdData } from '../hooks/useAdData'

// ── Constants ─────────────────────────────────────────────────────────────────

const OBJECTIVES: { value: AdObjective; label: string }[] = [
  { value: 'CONVERSIONS',     label: '轉換（購買）' },
  { value: 'TRAFFIC',         label: '流量（點擊）' },
  { value: 'AWARENESS',       label: '品牌認知' },
  { value: 'ENGAGEMENT',      label: '互動（留言分享）' },
  { value: 'LEAD_GENERATION', label: '開發潛在客戶' },
]
const STYLES: { value: AdCopyStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'professional', label: '專業信賴', emoji: '💼', desc: '強調品質、可靠' },
  { value: 'casual',       label: '輕鬆親切', emoji: '😊', desc: '口語、像朋友推薦' },
  { value: 'urgent',       label: '限時緊迫', emoji: '⏰', desc: '稀缺感、立即行動' },
  { value: 'emotional',    label: '情感共鳴', emoji: '❤️', desc: '觸動情感、建立連結' },
  { value: 'storytelling', label: '故事敘述', emoji: '📖', desc: '場景帶入、說故事' },
]
const CTA_TYPES: { value: CtaType; label: string }[] = [
  { value: 'shop_now',   label: '立即購買' },
  { value: 'learn_more', label: '了解更多' },
  { value: 'sign_up',    label: '立即註冊' },
  { value: 'contact',    label: '聯絡諮詢' },
  { value: 'book_now',   label: '立即預約' },
  { value: 'get_offer',  label: '領取優惠' },
]
const STATUS_CFG: Record<AdCopyItemStatus, { label: string; bg: string; text: string }> = {
  pending:  { label: '待審',  bg: 'bg-gray-100',   text: 'text-gray-500' },
  reviewed: { label: '已看',  bg: 'bg-blue-50',    text: 'text-blue-700' },
  approved: { label: '已核',  bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdCopyItemStatus }) {
  const c = STATUS_CFG[status]
  return (
    <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

interface CopyItemCardProps {
  item: AdCopyItem
  isSelected: boolean
  multiline?: boolean
  onSelect: () => void
  onStatusChange: (s: AdCopyItemStatus) => void
  onTextChange: (t: string) => void
}

function CopyItemCard({
  item, isSelected, multiline = false,
  onSelect, onStatusChange, onTextChange,
}: CopyItemCardProps) {
  const [editing, setEditing]       = useState(false)
  const [draft, setDraft]           = useState(item.text)
  const [copied, setCopied]         = useState(false)
  const [expanded, setExpanded]     = useState(false)

  const isLong = item.text.length > 80
  const displayText = (!expanded && isLong && !editing) ? item.text.slice(0, 80) + '…' : item.text

  const saveEdit = () => { onTextChange(draft); setEditing(false) }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(item.text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={`rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-400 bg-blue-50/60 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="p-3">
        {/* Text area */}
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            rows={multiline ? 5 : 2}
            className="w-full text-sm text-gray-700 border border-blue-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        ) : (
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
            {displayText}
          </p>
        )}

        {/* Expand toggle */}
        {!editing && isLong && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {expanded ? '收起' : '展開全文'}
          </button>
        )}

        {/* Actions row */}
        <div
          className="flex items-center gap-1.5 mt-2.5 flex-wrap"
          onClick={e => e.stopPropagation()}
        >
          <StatusBadge status={item.status} />

          {/* Status buttons */}
          {item.status === 'pending' && (
            <button
              onClick={() => onStatusChange('reviewed')}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Eye size={9} />標記已看
            </button>
          )}
          {item.status === 'reviewed' && (
            <button
              onClick={() => onStatusChange('approved')}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle2 size={9} />核准
            </button>
          )}
          {item.status === 'approved' && (
            <button
              onClick={() => onStatusChange('pending')}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={9} />重設
            </button>
          )}

          <span className="flex-1" />

          {/* Copy to clipboard */}
          <button
            onClick={copyToClipboard}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="複製文字"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>

          {/* Edit */}
          {editing ? (
            <>
              <button onClick={saveEdit}
                className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                套用
              </button>
              <button onClick={() => { setDraft(item.text); setEditing(false) }}
                className="text-[10px] px-2 py-0.5 border border-gray-200 text-gray-500 rounded hover:bg-gray-50">
                取消
              </button>
            </>
          ) : (
            <button
              onClick={() => { setDraft(item.text); setEditing(true) }}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="編輯"
            >
              <Edit2 size={12} />
            </button>
          )}

          {/* Selection indicator */}
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
          }`}>
            {isSelected && <Check size={9} className="text-white" />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section component ─────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  subtitle: string
  items: AdCopyItem[]
  selectedId: string
  multiline?: boolean
  onSelect: (id: string) => void
  onStatusChange: (id: string, s: AdCopyItemStatus) => void
  onTextChange: (id: string, t: string) => void
}

function CopySection({
  title, subtitle, items, selectedId, multiline = false,
  onSelect, onStatusChange, onTextChange,
}: SectionProps) {
  const approvedCount = items.filter(i => i.status === 'approved').length
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-bold text-gray-700">{title}</h4>
          <p className="text-[10px] text-gray-400">{subtitle}</p>
        </div>
        {approvedCount > 0 && (
          <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
            {approvedCount} 已核准
          </span>
        )}
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <CopyItemCard
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            multiline={multiline}
            onSelect={() => onSelect(item.id)}
            onStatusChange={s => onStatusChange(item.id, s)}
            onTextChange={t => onTextChange(item.id, t)}
          />
        ))}
      </div>
    </div>
  )
}

// ── CTA Section ───────────────────────────────────────────────────────────────

function CtaSection({
  suggestions, selectedCta, onSelect,
}: {
  suggestions: string[]
  selectedCta: string
  onSelect: (s: string) => void
}) {
  const [customCta, setCustomCta] = useState('')
  return (
    <div>
      <div className="mb-2">
        <h4 className="text-xs font-bold text-gray-700">CTA 建議</h4>
        <p className="text-[10px] text-gray-400">選擇一個 CTA 按鈕文字</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map(s => (
          <button key={s} onClick={() => onSelect(s)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              selectedCta === s
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {s}
          </button>
        ))}
        {/* Custom CTA */}
        <div className="flex items-center gap-1">
          <input
            value={customCta}
            onChange={e => setCustomCta(e.target.value)}
            onBlur={() => customCta.trim() && onSelect(customCta.trim())}
            placeholder="自訂…"
            className="text-xs border border-gray-200 rounded-full px-3 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const DEFAULT_INPUT: AdCopyInput = {
  product:   '',
  audience:  '',
  objective: 'CONVERSIONS',
  style:     'casual',
  theme:     '',
  ctaType:   'shop_now',
}

interface ItemsState {
  primaryTexts:  AdCopyItem[]
  headlines:     AdCopyItem[]
  descriptions:  AdCopyItem[]
}

const AdCopyFactory: React.FC = () => {
  const { createCopyVersion, isMock } = useAdData()

  const [input, setInput]         = useState<AdCopyInput>(DEFAULT_INPUT)
  const [output, setOutput]       = useState<AdCopyOutput | null>(null)
  const [items, setItems]         = useState<ItemsState | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]   = useState('')

  // Selections for composing a version
  const [selPrimary, setSelPrimary]       = useState('')
  const [selHeadline, setSelHeadline]     = useState('')
  const [selDescription, setSelDescription] = useState('')
  const [selCta, setSelCta]               = useState('')

  // Saved feedback
  const [savedCount, setSavedCount] = useState(0)

  const setIn = <K extends keyof AdCopyInput>(k: K, v: AdCopyInput[K]) =>
    setInput(f => ({ ...f, [k]: v }))

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!input.product.trim()) return
    setGenerating(true)
    setGenError('')
    setOutput(null)
    setItems(null)
    setSelPrimary('')
    setSelHeadline('')
    setSelDescription('')
    setSelCta('')
    try {
      const result = await adCopyService.generate(input)
      setOutput(result)
      setItems({
        primaryTexts: result.primaryTexts,
        headlines:    result.headlines,
        descriptions: result.descriptions,
      })
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : '產生失敗，請重試')
    }
    setGenerating(false)
  }, [input])

  // ── Item state updates ────────────────────────────────────────────────────
  const updateStatus = (category: keyof ItemsState, id: string, status: AdCopyItemStatus) => {
    setItems(prev => prev ? {
      ...prev,
      [category]: prev[category].map(it => it.id === id ? { ...it, status } : it),
    } : prev)
  }
  const updateText = (category: keyof ItemsState, id: string, text: string) => {
    setItems(prev => prev ? {
      ...prev,
      [category]: prev[category].map(it => it.id === id ? { ...it, text } : it),
    } : prev)
  }

  // ── Save version ──────────────────────────────────────────────────────────
  const canSave = selPrimary && selHeadline && selDescription && selCta && items

  const handleSave = useCallback(async () => {
    if (!canSave || !items) return
    const primary = items.primaryTexts.find(it => it.id === selPrimary)
    const headline = items.headlines.find(it => it.id === selHeadline)
    const desc = items.descriptions.find(it => it.id === selDescription)
    if (!primary || !headline || !desc) return

    await createCopyVersion({
      campaignId:   '',
      productId:    '',
      primaryText:  primary.text,
      headline:     headline.text,
      description:  desc.text,
      callToAction: selCta,
      audienceType: input.audience,
      styleType:    input.style,
      status:       'approved',
    })
    setSavedCount(v => v + 1)
    // Reset selections
    setSelPrimary('')
    setSelHeadline('')
    setSelDescription('')
    setSelCta('')
  }, [canSave, items, selPrimary, selHeadline, selDescription, selCta, input, createCopyVersion])

  const validInput = input.product.trim().length > 0

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI 文案工廠</h3>
            <p className="text-xs text-white/70">輸入商品資訊，自動產出多組廣告文案</p>
          </div>
        </div>
        {isMock && (
          <div className="mt-3 bg-white/10 rounded-lg px-3 py-2 text-xs text-white/80">
            目前使用範本引擎 — 解除 <code className="bg-white/20 px-1 rounded">adCopyAI.ts</code> 中 <code className="bg-white/20 px-1 rounded">ClaudeAdCopyService</code> 的注釋即可串接 Claude API
          </div>
        )}
      </div>

      {/* ── Input Panel ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide">輸入資訊</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">商品名稱 *</span>
            <input value={input.product} onChange={e => setIn('product', e.target.value)}
              placeholder="例：薑母鴨禮盒、有機蔬菜訂閱箱"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">目標受眾</span>
            <input value={input.audience} onChange={e => setIn('audience', e.target.value)}
              placeholder="例：30-45歲家庭主婦、健康意識上班族"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">廣告目標</span>
            <select value={input.objective} onChange={e => setIn('objective', e.target.value as AdObjective)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
              {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">季節 / 活動主題</span>
            <input value={input.theme} onChange={e => setIn('theme', e.target.value)}
              placeholder="例：母親節、週年慶、暑假、中秋節"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </label>
        </div>

        {/* Style selector */}
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-500 block mb-2">文案風格</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STYLES.map(s => (
              <button key={s.value} onClick={() => setIn('style', s.value)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                  input.style === s.value
                    ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <span className="text-base mb-0.5">{s.emoji}</span>
                <span className={`text-xs font-semibold ${input.style === s.value ? 'text-violet-700' : 'text-gray-700'}`}>
                  {s.label}
                </span>
                <span className="text-[10px] text-gray-400 leading-tight">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CTA type */}
        <div className="mb-5">
          <span className="text-xs font-medium text-gray-500 block mb-2">CTA 類型</span>
          <div className="flex flex-wrap gap-1.5">
            {CTA_TYPES.map(c => (
              <button key={c.value} onClick={() => setIn('ctaType', c.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  input.ctaType === c.value
                    ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {genError && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{genError}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={!validInput || generating}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Sparkles size={15} className={generating ? 'animate-spin' : ''} />
          {generating ? '產生中…' : '✨ 產生文案'}
        </button>
      </div>

      {/* ── Output Panel ── */}
      {items && output && (
        <div className="space-y-5">
          {/* Generation info */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Sparkles size={13} className="text-violet-500" />
              <span>已產生</span>
              <span className="font-semibold text-gray-700">
                {items.primaryTexts.length + items.headlines.length + items.descriptions.length} 組
              </span>
              文案 — {new Date(output.generatedAt).toLocaleTimeString('zh-TW')}
            </div>
            <button onClick={handleGenerate}
              className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium">
              <RotateCcw size={12} />重新產生
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-0.5">
            <p className="font-semibold">使用方式</p>
            <p>1. 點擊每組文案選取（藍色框線）→ 2. 依序選主文案、標題、描述、CTA → 3. 點「儲存為文案版本」</p>
            <p>可點擊 <span className="font-mono bg-blue-100 px-1 rounded">✏</span> 編輯、<span className="font-mono bg-blue-100 px-1 rounded">眼睛</span> 標記已看、<span className="font-mono bg-blue-100 px-1 rounded">✓</span> 核准</p>
          </div>

          {/* Primary Texts */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <CopySection
              title="Primary Text（主文案）"
              subtitle="點選一組作為主文案"
              items={items.primaryTexts}
              selectedId={selPrimary}
              multiline
              onSelect={setSelPrimary}
              onStatusChange={(id, s) => updateStatus('primaryTexts', id, s)}
              onTextChange={(id, t) => updateText('primaryTexts', id, t)}
            />
          </div>

          {/* Headlines */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <CopySection
              title="Headline（標題）"
              subtitle="點選一組作為廣告標題"
              items={items.headlines}
              selectedId={selHeadline}
              onSelect={setSelHeadline}
              onStatusChange={(id, s) => updateStatus('headlines', id, s)}
              onTextChange={(id, t) => updateText('headlines', id, t)}
            />
          </div>

          {/* Descriptions */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <CopySection
              title="Description（描述）"
              subtitle="點選一組作為廣告描述"
              items={items.descriptions}
              selectedId={selDescription}
              onSelect={setSelDescription}
              onStatusChange={(id, s) => updateStatus('descriptions', id, s)}
              onTextChange={(id, t) => updateText('descriptions', id, t)}
            />
          </div>

          {/* CTAs */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <CtaSection
              suggestions={output.ctaSuggestions}
              selectedCta={selCta}
              onSelect={setSelCta}
            />
          </div>

          {/* Save Panel */}
          <div className={`rounded-xl border p-5 transition-all ${
            canSave ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-800">組合並儲存文案版本</h4>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {[
                    { label: '主文案', id: selPrimary, items: items.primaryTexts },
                    { label: '標題',   id: selHeadline, items: items.headlines },
                    { label: '描述',   id: selDescription, items: items.descriptions },
                    { label: 'CTA',    id: selCta, items: null },
                  ].map(({ label, id }) => (
                    <span key={label} className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {id ? <Check size={9} /> : '○'} {label}
                    </span>
                  ))}
                </div>
                {!canSave && (
                  <p className="text-[10px] text-gray-400 mt-1.5">請依序選取上方四個類別各一組</p>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Save size={15} />儲存為文案版本
              </button>
            </div>

            {savedCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100 rounded-lg px-3 py-2">
                <CheckCircle2 size={13} />
                已儲存 {savedCount} 個版本到「廣告活動」→「成效分析」中可查看
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdCopyFactory
