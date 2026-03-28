import React, { useState, useCallback } from 'react'
import {
  Wand2, Save, Trash2, Copy, ChevronDown, ChevronRight,
  CheckCircle, Clock, Play, Archive, Plus, Edit2, X,
} from 'lucide-react'
import { AdCopy, AdCopyTone, AdCopyStatus } from '../types'
import { useApp } from '../context/AppContext'

// ── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['Facebook', 'Instagram', 'Google', 'LINE', 'YouTube', 'TikTok', '其他']
const FORMATS: Record<string, string[]> = {
  Facebook: ['動態', '限時動態', '貼文廣告', '輪播'],
  Instagram: ['動態', '限時動態', 'Reels', '探索'],
  Google: ['搜尋', '多媒體', 'YouTube'],
  LINE: ['訊息', '貼文廣告'],
  YouTube: ['串場廣告', 'Bumper'],
  TikTok: ['動態影片', 'TopView'],
  其他: ['通用'],
}

const TONES: { value: AdCopyTone; label: string; emoji: string; desc: string }[] = [
  { value: 'professional', label: '專業信賴', emoji: '💼', desc: '強調品質、專業、可靠' },
  { value: 'casual',       label: '輕鬆親切', emoji: '😊', desc: '口語、親近、像朋友推薦' },
  { value: 'urgent',       label: '限時緊迫', emoji: '⏰', desc: '強調稀缺感、促進立即行動' },
  { value: 'emotional',    label: '情感共鳴', emoji: '❤️', desc: '觸動情感、建立連結' },
]

const CTA_OPTIONS = ['立即了解', '馬上購買', '立即搶購', '探索更多', '免費試用', '立即預約', '查看優惠', '加入我們']

const STATUS_CFG: Record<AdCopyStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  draft:    { label: '草稿',   bg: 'bg-gray-100',    text: 'text-gray-600',    icon: Clock },
  approved: { label: '已審核', bg: 'bg-blue-50',     text: 'text-blue-700',    icon: CheckCircle },
  running:  { label: '投放中', bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: Play },
  archived: { label: '已封存', bg: 'bg-amber-50',    text: 'text-amber-700',   icon: Archive },
}

// ── Template Generator ────────────────────────────────────────────────────────

function buildCopies(
  productName: string,
  targetAudience: string,
  platform: string,
  format: string,
  selectedTones: AdCopyTone[],
  groupId: string
): AdCopy[] {
  const p = productName.trim() || '商品'
  const t = targetAudience.trim() || '您'
  const now = new Date().toISOString()

  const templates: Record<AdCopyTone, { headlines: string[]; primaryTexts: string[]; descriptions: string[]; cta: string }> = {
    professional: {
      headlines: [
        `${p} — 專業品質，值得信賴`,
        `${t}的首選 — ${p}`,
        `領業界之先｜${p}`,
      ],
      primaryTexts: [
        `專為${t}設計的${p}，結合頂級工藝與卓越服務。每一個細節都經過嚴格把關，讓您的每次選擇都毫無遺憾。`,
        `${p}以業界最嚴格的標準製造，為${t}提供最可靠的解決方案。品質有保障，服務零距離。`,
        `我們相信${t}值得最好的。${p}以專業品質與貼心服務，成為您生活與事業中最值得信賴的選擇。`,
      ],
      descriptions: ['高品質｜專業服務｜快速交付', '值得信賴｜口碑保證', '專業品質｜售後無憂'],
      cta: '立即了解',
    },
    casual: {
      headlines: [
        `你一定要認識${p}！😊`,
        `${t}都在用的${p}`,
        `說真的，${p}真的很讚`,
      ],
      primaryTexts: [
        `嗨～發現了超棒的東西！${p}讓${t}愛不釋手，用過都說好。快來看看，你也一定會喜歡的！`,
        `說到${p}，${t}都豎起大拇指👍 簡單好用又實在，不試試看怎麼行？今天就來體驗看看吧～`,
        `老實說啦，${p}真的改變了我的日常生活！${t}應該早點認識它的，現在試還來得及 😄`,
      ],
      descriptions: ['超多人推薦｜值得一試', '好用｜實在｜你會喜歡', '用過都說讚'],
      cta: '馬上看看',
    },
    urgent: {
      headlines: [
        `⏰ 限時優惠！${p}最後機會`,
        `🔥 今天限定！${t}專屬折扣`,
        `⚡ 搶先一步！${p}即將售完`,
      ],
      primaryTexts: [
        `⚡ 倒數計時！${p}限時特惠，${t}專屬超低折扣，名額有限，搶完就沒了！猶豫是最大的代價！`,
        `🚨 最後機會！${p}今日最低價，過了今天恢復原價。${t}把握現在，明天後悔就來不及了！`,
        `🔥 限量供應！${p}只剩最後幾件，${t}別讓遺憾發生。現在下單，立享獨家優惠！`,
      ],
      descriptions: ['限時特惠｜數量有限', '今日最低價｜立即把握', '限量供應｜售完為止'],
      cta: '立即搶購',
    },
    emotional: {
      headlines: [
        `送給你最在乎的人 — ${p}`,
        `${p}，讓${t}感受最真實的心意`,
        `有些感動，從${p}開始`,
      ],
      primaryTexts: [
        `每一位${t}都值得擁有最好的。${p}，以真心設計，傳遞你最深刻的情感。因為你，我們才更用心。`,
        `生命中最珍貴的是身邊的人。用${p}表達你對${t}的愛與感謝，讓每一個平凡的瞬間都變得不凡。`,
        `${p}不只是一個選擇，更是一份心意。獻給每一位${t}，因為你值得被這樣對待。`,
      ],
      descriptions: ['用心製作｜傳遞情感', '珍惜每一刻｜心意滿滿', '真誠以待｜溫暖你心'],
      cta: '探索更多',
    },
  }

  const results: AdCopy[] = []
  let version = 1

  for (const tone of selectedTones) {
    const tmpl = templates[tone]
    const variantCount = Math.min(2, tmpl.headlines.length)
    for (let v = 0; v < variantCount; v++) {
      results.push({
        id: `COPY-${groupId}-${tone}-${v + 1}`,
        groupId,
        version: version++,
        status: 'draft',
        platform,
        format,
        productName: p,
        targetAudience: t,
        tone,
        headline:     tmpl.headlines[v],
        primaryText:  tmpl.primaryTexts[v],
        description:  tmpl.descriptions[v % tmpl.descriptions.length],
        callToAction: tmpl.cta,
        notes: '',
        createdAt: now,
      })
    }
  }

  return results
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToneBadge({ tone }: { tone: AdCopyTone }) {
  const t = TONES.find(x => x.value === tone)!
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
      {t.emoji} {t.label}
    </span>
  )
}

function StatusBadge({ status, onChange }: { status: AdCopyStatus; onChange?: (s: AdCopyStatus) => void }) {
  const cfg = STATUS_CFG[status]
  const Icon = cfg.icon
  if (!onChange) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
        <Icon size={10} />{cfg.label}
      </span>
    )
  }
  return (
    <select
      value={status}
      onChange={e => onChange(e.target.value as AdCopyStatus)}
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-300 ${cfg.bg} ${cfg.text}`}
    >
      {Object.entries(STATUS_CFG).map(([v, c]) => (
        <option key={v} value={v}>{c.label}</option>
      ))}
    </select>
  )
}

interface CopyCardProps {
  copy: AdCopy
  mode: 'preview' | 'saved'
  onSave?: (c: AdCopy) => void
  onUpdate?: (c: AdCopy) => void
  onDelete?: (id: string) => void
  onDuplicate?: (c: AdCopy) => void
}

function CopyCard({ copy, mode, onSave, onUpdate, onDelete, onDuplicate }: CopyCardProps) {
  const [expanded, setExpanded] = useState(mode === 'preview')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(copy)

  const handleSaveEdit = () => {
    onUpdate?.(form)
    setEditing(false)
  }

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      mode === 'preview' ? 'border-purple-100 shadow-sm' : 'border-gray-100 hover:border-blue-100 hover:shadow-sm'
    }`}>
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer select-none"
        onClick={() => !editing && setExpanded(v => !v)}
      >
        <button className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {form.headline || '（未填標題）'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <ToneBadge tone={form.tone} />
            <span className="text-[10px] text-gray-400">{form.platform}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-400">{form.format}</span>
            {mode === 'saved' && (
              <StatusBadge
                status={form.status}
                onChange={s => { const u = { ...form, status: s }; setForm(u); onUpdate?.(u) }}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {mode === 'preview' && (
            <button
              onClick={e => { e.stopPropagation(); onSave?.(copy) }}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-medium hover:bg-blue-700 transition-colors"
            >
              <Save size={11} />儲存
            </button>
          )}
          {mode === 'saved' && (
            <>
              <button onClick={e => { e.stopPropagation(); setEditing(v => !v) }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDuplicate?.(copy) }}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                <Copy size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete?.(copy.id) }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          {editing ? (
            /* ── Edit mode ── */
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-xs text-gray-500 font-medium block mb-1">主標題</span>
                <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 font-medium block mb-1">主文案</span>
                <textarea value={form.primaryText} onChange={e => setForm(f => ({ ...f, primaryText: e.target.value }))}
                  rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs text-gray-500 font-medium block mb-1">描述</span>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 font-medium block mb-1">CTA 按鈕</span>
                  <select value={form.callToAction} onChange={e => setForm(f => ({ ...f, callToAction: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {CTA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-gray-500 font-medium block mb-1">備註</span>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="內部備註…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </label>
              <div className="flex gap-2">
                <button onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                  儲存變更
                </button>
                <button onClick={() => { setForm(copy); setEditing(false) }}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">
                  取消
                </button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">主標題</p>
                <p className="text-sm font-bold text-gray-800">{form.headline}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">主文案</p>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{form.primaryText}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">描述</p>
                  <p className="text-xs text-gray-600">{form.description}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">CTA</p>
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-medium">{form.callToAction}</span>
                </div>
              </div>
              {form.notes && (
                <div className="bg-amber-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-amber-600 font-medium mb-0.5">備註</p>
                  <p className="text-xs text-amber-700">{form.notes}</p>
                </div>
              )}
              <div className="flex gap-3 text-[10px] text-gray-400 pt-1 border-t border-gray-50">
                <span>商品：{form.productName}</span>
                <span>·</span>
                <span>受眾：{form.targetAudience}</span>
                {form.createdAt && <><span>·</span><span>{new Date(form.createdAt).toLocaleDateString('zh-TW')}</span></>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const AdCopyManager: React.FC = () => {
  const { state, saveAdCopies, updateAdCopy, removeAdCopy } = useApp()
  const { adCopies } = state

  // Generator form state
  const [productName, setProductName]       = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [platform, setPlatform]             = useState('Facebook')
  const [format, setFormat]                 = useState('動態')
  const [selectedTones, setSelectedTones]   = useState<AdCopyTone[]>(['professional', 'casual'])
  const [generated, setGenerated]           = useState<AdCopy[]>([])
  const [generating, setGenerating]         = useState(false)

  // Filter
  const [filterStatus, setFilterStatus] = useState<AdCopyStatus | 'all'>('all')
  const [filterPlatform, setFilterPlatform] = useState('all')

  const toggleTone = (tone: AdCopyTone) => {
    setSelectedTones(prev =>
      prev.includes(tone) ? prev.filter(t => t !== tone) : [...prev, tone]
    )
  }

  const handleGenerate = useCallback(() => {
    if (!productName.trim() || selectedTones.length === 0) return
    setGenerating(true)
    const groupId = `GRP-${Date.now()}`
    const copies = buildCopies(productName, targetAudience, platform, format, selectedTones, groupId)
    setTimeout(() => {
      setGenerated(copies)
      setGenerating(false)
    }, 600) // 短暫延遲模擬生成感
  }, [productName, targetAudience, platform, format, selectedTones])

  const handleSaveOne = useCallback(async (copy: AdCopy) => {
    await saveAdCopies([copy])
    setGenerated(prev => prev.filter(c => c.id !== copy.id))
  }, [saveAdCopies])

  const handleSaveAll = useCallback(async () => {
    if (generated.length === 0) return
    await saveAdCopies(generated)
    setGenerated([])
  }, [generated, saveAdCopies])

  const handleDuplicate = useCallback(async (copy: AdCopy) => {
    const now = new Date().toISOString()
    const dup: AdCopy = {
      ...copy,
      id: `COPY-DUP-${Date.now()}`,
      version: copy.version + 1,
      status: 'draft',
      notes: `複製自版本 ${copy.version}`,
      createdAt: now,
    }
    await saveAdCopies([dup])
  }, [saveAdCopies])

  const filteredCopies = adCopies.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false
    return true
  })

  const usedPlatforms = [...new Set(adCopies.map(c => c.platform))]

  return (
    <div className="space-y-6">

      {/* ── 文案產生器 ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Wand2 size={16} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">廣告文案產生器</h3>
            <p className="text-xs text-gray-400">輸入商品資訊，自動產出多組文案版本</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">商品名稱 *</span>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="例：薑母鴨禮盒、有機蔬菜箱"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">目標受眾</span>
            <input
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="例：30-45歲主婦、上班族媽媽"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">投放平台</span>
            <select
              value={platform}
              onChange={e => { setPlatform(e.target.value); setFormat((FORMATS[e.target.value] ?? ['通用'])[0]) }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">廣告版位</span>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {(FORMATS[platform] ?? ['通用']).map(f => <option key={f}>{f}</option>)}
            </select>
          </label>
        </div>

        {/* Tone selector */}
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-500 block mb-2">文案語氣（可多選）</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TONES.map(tone => (
              <button
                key={tone.value}
                onClick={() => toggleTone(tone.value)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                  selectedTones.includes(tone.value)
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-base mb-0.5">{tone.emoji}</span>
                <span className={`text-xs font-semibold ${selectedTones.includes(tone.value) ? 'text-purple-700' : 'text-gray-700'}`}>
                  {tone.label}
                </span>
                <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{tone.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!productName.trim() || selectedTones.length === 0 || generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Wand2 size={15} className={generating ? 'animate-spin' : ''} />
          {generating ? '產生中…' : `產生文案 (${selectedTones.length} 種語氣)`}
        </button>
      </div>

      {/* ── 產生結果預覽 ── */}
      {generated.length > 0 && (
        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-purple-800">已產生 {generated.length} 組文案</p>
              <p className="text-xs text-purple-500">點擊「儲存」保留此版本，或一次儲存全部</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGenerated([])}
                className="px-3 py-1.5 text-xs text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
              >
                全部捨棄
              </button>
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
              >
                <Save size={12} />全部儲存
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {generated.map(copy => (
              <CopyCard
                key={copy.id}
                copy={copy}
                mode="preview"
                onSave={handleSaveOne}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 已儲存文案 ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">已儲存文案</h3>
            <p className="text-xs text-gray-400 mt-0.5">共 {adCopies.length} 組版本</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as AdCopyStatus | 'all')}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="all">全部狀態</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
            <select
              value={filterPlatform}
              onChange={e => setFilterPlatform(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="all">全部平台</option>
              {usedPlatforms.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Summary badges */}
        {adCopies.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {Object.entries(STATUS_CFG).map(([status, cfg]) => {
              const count = adCopies.filter(c => c.status === status).length
              if (!count) return null
              const Icon = cfg.icon
              return (
                <span key={status} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${cfg.bg} ${cfg.text}`}>
                  <Icon size={11} />{cfg.label} {count}
                </span>
              )
            })}
          </div>
        )}

        {filteredCopies.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Wand2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">尚無儲存的文案</p>
            <p className="text-xs mt-1">使用上方產生器建立第一組文案</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCopies.map(copy => (
              <CopyCard
                key={copy.id}
                copy={copy}
                mode="saved"
                onUpdate={updateAdCopy}
                onDelete={id => window.confirm('確定刪除此文案？') && removeAdCopy(id)}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdCopyManager
