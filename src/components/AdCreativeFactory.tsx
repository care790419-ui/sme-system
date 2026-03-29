import React, { useState, useRef, useCallback } from 'react'
import {
  ImagePlus, Sparkles, Edit2, Trash2, Check, ChevronDown,
  Upload, Layers, Link2,
} from 'lucide-react'
import type { AdCreative } from '../types'
import { useAdData } from '../hooks/useAdData'
import { creativeAIService } from '../services/creativeAI'
import type { CreativeImageOutput } from '../services/creativeAI'

// ── Constants ─────────────────────────────────────────────────────────────────

type ImageRatio = '1:1' | '4:5' | '9:16' | '1.91:1'

const RATIOS: { value: ImageRatio; label: string; w: number; h: number; desc: string }[] = [
  { value: '1:1',    label: '1:1',    w: 40, h: 40,   desc: '動態 / 輪播' },
  { value: '4:5',    label: '4:5',    w: 32, h: 40,   desc: 'IG 直式' },
  { value: '9:16',   label: '9:16',   w: 22, h: 40,   desc: '限時動態' },
  { value: '1.91:1', label: '1.91:1', w: 40, h: 21,   desc: '橫幅廣告' },
]

const STATUS_CFG = {
  draft:    { label: '草稿',   bg: 'bg-gray-100',   text: 'text-gray-600' },
  approved: { label: '已核准', bg: 'bg-blue-50',    text: 'text-blue-700' },
  running:  { label: '已發布', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  archived: { label: '已封存', bg: 'bg-amber-50',   text: 'text-amber-700' },
}

// ratio string → CSS aspect-ratio value
const RATIO_CSS: Record<ImageRatio, string> = {
  '1:1':    '1 / 1',
  '4:5':    '4 / 5',
  '9:16':   '9 / 16',
  '1.91:1': '1.91 / 1',
}

const EMPTY_FORM = {
  imageUrl:      '',
  imageRatio:    '1:1' as ImageRatio,
  title:         '',
  overlayText:   '',
  status:        'draft' as AdCreative['status'],
  campaignId:    '',
  copyVersionId: '',
  productName:   '',
  aiPrompt:      '',
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Visual ratio selector button */
function RatioButton({
  ratio, selected, onSelect,
}: {
  ratio: (typeof RATIOS)[number]; selected: boolean; onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg border transition-all ${
        selected
          ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Mini rect representing the ratio */}
      <div
        style={{ width: ratio.w * 0.7, height: ratio.h * 0.7 }}
        className={`rounded-sm ${selected ? 'bg-blue-400' : 'bg-gray-300'}`}
      />
      <span className={`text-[10px] font-bold ${selected ? 'text-blue-700' : 'text-gray-500'}`}>
        {ratio.label}
      </span>
      <span className="text-[9px] text-gray-400 whitespace-nowrap">{ratio.desc}</span>
    </button>
  )
}

/** Image preview card with overlay text */
function CreativePreview({
  imageUrl, overlayText, ratio, title,
}: {
  imageUrl: string; overlayText: string; ratio: ImageRatio; title?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
      style={{ aspectRatio: RATIO_CSS[ratio], maxHeight: 280 }}>
      {imageUrl ? (
        <img src={imageUrl} alt={title ?? '素材預覽'} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
          <ImagePlus size={32} />
          <span className="text-xs">尚未上傳圖片</span>
        </div>
      )}
      {overlayText && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 py-4">
          <p className="text-white text-sm font-bold leading-tight drop-shadow-md">
            {overlayText}
          </p>
        </div>
      )}
    </div>
  )
}

/** Creative card in the list */
function CreativeCard({
  creative, campaignName, copyHeadline, onEdit, onDelete, onStatusChange,
}: {
  creative: AdCreative
  campaignName?: string
  copyHeadline?: string
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: AdCreative['status']) => void
}) {
  const cfg = STATUS_CFG[creative.status]
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-blue-100 hover:shadow-sm transition-all">
      {/* Thumbnail */}
      <div className="relative bg-gray-50"
        style={{ aspectRatio: RATIO_CSS[creative.imageRatio as ImageRatio], maxHeight: 160 }}>
        {creative.imageUrl ? (
          <img src={creative.imageUrl} alt={creative.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImagePlus size={24} />
          </div>
        )}
        {/* Overlay text on thumbnail */}
        {creative.overlayText && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
            <p className="text-white text-[10px] font-bold leading-tight truncate">{creative.overlayText}</p>
          </div>
        )}
        {/* Ratio badge */}
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 bg-black/50 text-white rounded">
          {creative.imageRatio}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 flex-1">
            {creative.title || '（未填標題）'}
          </p>
          {/* Status dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
              <ChevronDown size={9} />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1 min-w-[88px]">
                {(Object.entries(STATUS_CFG) as [AdCreative['status'], typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([v, c]) => (
                  <button key={v} onClick={() => { onStatusChange(v); setShowStatusMenu(false) }}
                    className={`w-full text-left text-[10px] px-2.5 py-1.5 hover:bg-gray-50 font-medium ${c.text}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="space-y-1">
          {campaignName && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Layers size={9} />{campaignName}
            </div>
          )}
          {copyHeadline && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Link2 size={9} className="flex-shrink-0" />
              <span className="truncate">{copyHeadline}</span>
            </div>
          )}
          {creative.productName && (
            <p className="text-[10px] text-gray-400 truncate">商品：{creative.productName}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <p className="text-[9px] text-gray-300">{new Date(creative.createdAt).toLocaleDateString('zh-TW')}</p>
          <div className="flex gap-1">
            <button onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Edit2 size={12} />
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const AdCreativeFactory: React.FC = () => {
  const {
    creatives, campaigns, copyVersions,
    createCreative, updateCreative, deleteCreative,
    isMock,
  } = useAdData()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // AI generate state
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult]         = useState<CreativeImageOutput | null>(null)
  const [showAiPanel, setShowAiPanel]   = useState(false)

  // List filter
  const [filterStatus, setFilterStatus] = useState<AdCreative['status'] | 'all'>('all')

  const setF = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setSaveError('請選擇圖片檔案'); return }
    const url = URL.createObjectURL(file)
    setForm(f => ({ ...f, imageUrl: url }))
    setSaveError('')
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0] ?? null)
  }

  // ── AI generate image ─────────────────────────────────────────────────────
  const handleAiGenerate = async () => {
    if (!form.productName.trim()) { setSaveError('請先填寫商品名稱再 AI 生成'); return }
    setAiGenerating(true)
    setSaveError('')
    try {
      const result = await creativeAIService.generateCreativeImage({
        productName: form.productName,
        styleType:   'product',
        imageRatio:  form.imageRatio,
        theme:       '',
        overlayText: form.overlayText,
        prompt:      form.aiPrompt || undefined,
      })
      setAiResult(result)
      setForm(f => ({ ...f, imageUrl: result.imageUrl, aiPrompt: result.prompt }))
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'AI 生成失敗')
    }
    setAiGenerating(false)
  }

  // ── Save / Edit ───────────────────────────────────────────────────────────
  const startEdit = (c: AdCreative) => {
    setEditId(c.id)
    setForm({
      imageUrl:      c.imageUrl,
      imageRatio:    c.imageRatio as ImageRatio,
      title:         c.title,
      overlayText:   c.overlayText,
      status:        c.status,
      campaignId:    c.campaignId,
      copyVersionId: c.copyVersionId ?? '',
      productName:   c.productName ?? '',
      aiPrompt:      c.aiPrompt ?? '',
    })
    setAiResult(null)
    setSaveError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setAiResult(null)
    setSaveError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await creativeAIService.saveCreative(form)   // validates
      const data: Omit<AdCreative, 'id' | 'createdAt'> = {
        campaignId:    form.campaignId,
        imageUrl:      form.imageUrl,
        imageRatio:    form.imageRatio,
        title:         form.title,
        overlayText:   form.overlayText,
        status:        form.status,
        copyVersionId: form.copyVersionId || undefined,
        productName:   form.productName || undefined,
        aiPrompt:      form.aiPrompt || undefined,
      }
      if (editId) {
        const existing = creatives.find(c => c.id === editId)!
        await updateCreative({ ...existing, ...data })
        setEditId(null)
      } else {
        await createCreative(data)
      }
      setForm(EMPTY_FORM)
      setAiResult(null)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : '儲存失敗')
    }
    setSaving(false)
  }

  // Filtered copyVersions by selected campaign
  const filteredCopyVersions = form.campaignId
    ? copyVersions.filter(v => v.campaignId === form.campaignId)
    : copyVersions

  const filteredCreatives = creatives.filter(c =>
    filterStatus === 'all' || c.status === filterStatus
  )

  const getCampaignName = (id: string) => campaigns.find(c => c.id === id)?.name
  const getCopyHeadline  = (id?: string) => id ? copyVersions.find(v => v.id === id)?.headline : undefined

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <ImagePlus size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">圖文素材工廠</h3>
            <p className="text-xs text-white/70">上傳商品圖、設定比例與文字，預留 AI 圖片生成</p>
          </div>
        </div>
        {isMock && (
          <div className="mt-3 bg-white/10 rounded-lg px-3 py-2 text-xs text-white/80">
            AI 生成目前輸出佔位圖 — 解除 <code className="bg-white/20 px-1 rounded">creativeAI.ts</code> 中 <code className="bg-white/20 px-1 rounded">DalleCreativeAIService</code> 的注釋即可串接 DALL-E 3 / SDXL
          </div>
        )}
      </div>

      {/* ── Create / Edit Form ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">
          {editId ? '✏ 編輯素材' : '新增素材'}
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Upload + Preview */}
          <div className="space-y-3">
            {/* Upload zone */}
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
            >
              <Upload size={20} className="mx-auto mb-1.5 text-gray-400" />
              <p className="text-xs font-medium text-gray-500">拖曳圖片至此，或點擊上傳</p>
              <p className="text-[10px] text-gray-300 mt-0.5">JPG / PNG / WEBP</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFile(e.target.files?.[0] ?? null)} />

            {/* AI generate toggle */}
            <button
              onClick={() => setShowAiPanel(v => !v)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-violet-200 text-violet-600 rounded-xl text-xs font-medium hover:bg-violet-50 transition-colors"
            >
              <Sparkles size={13} />
              {showAiPanel ? '關閉 AI 生成' : '🤖 AI 生成圖片'}
            </button>

            {/* AI panel */}
            {showAiPanel && (
              <div className="border border-violet-100 bg-violet-50/40 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-700">AI 圖片生成</p>
                <label className="block">
                  <span className="text-[10px] text-gray-500 block mb-1">自訂 Prompt（可空，自動生成）</span>
                  <textarea
                    value={form.aiPrompt}
                    onChange={e => setF('aiPrompt', e.target.value)}
                    rows={2}
                    placeholder={`例：professional photo of ${form.productName || '商品'}, clean background`}
                    className="w-full text-xs border border-violet-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </label>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  <Sparkles size={12} className={aiGenerating ? 'animate-spin' : ''} />
                  {aiGenerating ? '生成中…' : '生成圖片'}
                </button>
                {aiResult && (
                  <div className="text-[10px] text-violet-700 bg-violet-100 rounded px-2 py-1">
                    ✓ 已生成（Model: {aiResult.model}）
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5">預覽</p>
              <CreativePreview
                imageUrl={form.imageUrl}
                overlayText={form.overlayText}
                ratio={form.imageRatio}
                title={form.title}
              />
            </div>
          </div>

          {/* Right: Form fields */}
          <div className="space-y-3">
            {/* Ratio selector */}
            <div>
              <span className="text-xs font-medium text-gray-500 block mb-1.5">素材比例</span>
              <div className="flex gap-2">
                {RATIOS.map(r => (
                  <RatioButton
                    key={r.value}
                    ratio={r}
                    selected={form.imageRatio === r.value}
                    onSelect={() => setF('imageRatio', r.value)}
                  />
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1">素材標題 *</span>
              <input value={form.title} onChange={e => setF('title', e.target.value)}
                placeholder="例：春節限定禮盒 — 暖胃首選"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1">Overlay 文字（圖上短句）</span>
              <input value={form.overlayText} onChange={e => setF('overlayText', e.target.value)}
                placeholder="例：限時特惠 NT$1,980 · 全台配送"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <p className="text-[10px] text-gray-400 mt-0.5">建議 15 字以內，顯示於圖片底部</p>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1">商品名稱</span>
              <input value={form.productName} onChange={e => setF('productName', e.target.value)}
                placeholder="例：薑母鴨禮盒"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-500 block mb-1">狀態</span>
                <select value={form.status} onChange={e => setF('status', e.target.value as AdCreative['status'])}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {Object.entries(STATUS_CFG).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500 block mb-1">綁定廣告活動</span>
                <select value={form.campaignId} onChange={e => { setF('campaignId', e.target.value); setF('copyVersionId', '') }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">— 不綁定 —</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-500 block mb-1 flex items-center gap-1">
                <Link2 size={11} />綁定文案版本
              </span>
              <select value={form.copyVersionId} onChange={e => setF('copyVersionId', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">— 不綁定 —</option>
                {filteredCopyVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.headline ? `${v.headline.slice(0, 20)}…` : v.id}
                  </option>
                ))}
              </select>
              {form.campaignId && filteredCopyVersions.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">此活動尚無文案版本</p>
              )}
            </label>

            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
            )}

            <div className="flex gap-2 pt-1">
              {editId && (
                <button onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  取消
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.imageUrl}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Check size={15} />
                {saving ? '儲存中…' : editId ? '更新素材' : '儲存素材'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Creative List ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Layers size={14} className="text-rose-500" />
              素材列表
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">共 {creatives.length} 個素材</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as AdCreative['status'] | 'all')}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="all">全部狀態</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status summary */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.entries(STATUS_CFG) as [AdCreative['status'], typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([s, c]) => {
            const count = creatives.filter(cr => cr.status === s).length
            if (!count) return null
            return (
              <span key={s} className={`text-[10px] px-2 py-1 rounded-lg font-medium ${c.bg} ${c.text}`}>
                {c.label} {count}
              </span>
            )
          })}
        </div>

        {filteredCreatives.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ImagePlus size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">尚無素材</p>
            <p className="text-xs mt-1">使用上方表單上傳第一個素材</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCreatives.map(c => (
              <CreativeCard
                key={c.id}
                creative={c}
                campaignName={c.campaignId ? getCampaignName(c.campaignId) : undefined}
                copyHeadline={getCopyHeadline(c.copyVersionId)}
                onEdit={() => startEdit(c)}
                onDelete={() => window.confirm(`確定刪除「${c.title}」？`) && deleteCreative(c.id)}
                onStatusChange={s => updateCreative({ ...c, status: s })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdCreativeFactory
