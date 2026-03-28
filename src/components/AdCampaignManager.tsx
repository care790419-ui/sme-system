import React, { useState } from 'react'
import {
  Plus, Edit2, Trash2, ExternalLink, ChevronDown, Target,
} from 'lucide-react'
import type { AdCampaign, AdObjective, AdStyleType, AdCampaignStatus, AdPerformance } from '../types'
import { useAdData } from '../hooks/useAdData'

// ── Constants ─────────────────────────────────────────────────────────────────

const OBJECTIVES: { value: AdObjective; label: string; desc: string }[] = [
  { value: 'CONVERSIONS',      label: '轉換',       desc: '優化購買、加入購物車' },
  { value: 'TRAFFIC',          label: '流量',        desc: '增加網站點擊數' },
  { value: 'AWARENESS',        label: '品牌認知',    desc: '最大化曝光觸及' },
  { value: 'ENGAGEMENT',       label: '互動',        desc: '增加貼文互動率' },
  { value: 'LEAD_GENERATION',  label: '開發潛在客戶', desc: '收集聯絡表單' },
]
const STYLE_TYPES: { value: AdStyleType; label: string }[] = [
  { value: 'product',       label: '商品展示' },
  { value: 'lifestyle',     label: '生活風格' },
  { value: 'testimonial',   label: '使用者見證' },
  { value: 'promotional',   label: '促銷活動' },
]
const STATUS_CFG: Record<AdCampaignStatus, { label: string; bg: string; text: string }> = {
  draft:  { label: '草稿',   bg: 'bg-gray-100',    text: 'text-gray-600' },
  active: { label: '進行中', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  paused: { label: '已暫停', bg: 'bg-amber-50',    text: 'text-amber-700' },
  ended:  { label: '已結束', bg: 'bg-gray-100',    text: 'text-gray-500' },
  error:  { label: '錯誤',   bg: 'bg-red-50',      text: 'text-red-700' },
}
const fmt = (v: number) => `NT$ ${v.toLocaleString('zh-TW')}`
const fmtShort = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}萬` : v.toLocaleString('zh-TW')

// ── Campaign Form ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', objective: 'CONVERSIONS' as AdObjective,
  budget: 10000, startDate: '', endDate: '',
  landingPageUrl: '', styleType: 'product' as AdStyleType,
  productId: '', audienceProfileId: '',
}

interface CampaignFormProps {
  initial?: Partial<typeof EMPTY_FORM>
  onSave: (data: typeof EMPTY_FORM) => void
  onCancel: () => void
}
function CampaignForm({ initial, onSave, onCancel }: CampaignFormProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim() && form.startDate && form.endDate && form.landingPageUrl.trim()

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-medium text-gray-500 block mb-1">活動名稱 *</span>
        <input value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="例：薑母鴨禮盒 春節轉換活動"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-500 block mb-1">廣告目標 *</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {OBJECTIVES.map(o => (
            <button key={o.value} type="button"
              onClick={() => set('objective', o.value)}
              className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                form.objective === o.value
                  ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <span className={`text-xs font-semibold ${form.objective === o.value ? 'text-blue-700' : 'text-gray-700'}`}>
                {o.label}
              </span>
              <span className="text-[10px] text-gray-400">{o.desc}</span>
            </button>
          ))}
        </div>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 block mb-1">預算（NT$）*</span>
          <input type="number" value={form.budget} onChange={e => set('budget', Number(e.target.value))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 block mb-1">創意風格</span>
          <select value={form.styleType} onChange={e => set('styleType', e.target.value as AdStyleType)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
            {STYLE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 block mb-1">開始日期 *</span>
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 block mb-1">結束日期 *</span>
          <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-500 block mb-1">落地頁網址 *</span>
        <input value={form.landingPageUrl} onChange={e => set('landingPageUrl', e.target.value)}
          placeholder="https://your-store.com/product"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </label>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          取消
        </button>
        <button onClick={() => valid && onSave(form)} disabled={!valid}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          儲存活動
        </button>
      </div>
    </div>
  )
}

// ── Performance Mini Badge ────────────────────────────────────────────────────

function PerfBadge({ perf }: { perf: AdPerformance | undefined }) {
  if (!perf || perf.spend === 0) return <span className="text-[10px] text-gray-300">尚無數據</span>
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-gray-400">花費 <span className="font-semibold text-gray-600">{fmtShort(perf.spend)}</span></span>
      <span className="text-gray-300">·</span>
      <span className="text-gray-400">ROAS <span className={`font-semibold ${perf.roas >= 3 ? 'text-emerald-600' : perf.roas >= 1 ? 'text-amber-600' : 'text-red-500'}`}>{perf.roas.toFixed(1)}x</span></span>
      <span className="text-gray-300">·</span>
      <span className="text-gray-400">成交 <span className="font-semibold text-gray-600">{perf.purchases}</span></span>
    </div>
  )
}

// ── Campaign Row ──────────────────────────────────────────────────────────────

function CampaignRow({
  campaign, perf, copyCount, creativeCount, onEdit, onDelete, onStatusChange,
}: {
  campaign: AdCampaign
  perf: AdPerformance | undefined
  copyCount: number
  creativeCount: number
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: AdCampaignStatus) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CFG[campaign.status]
  const obj = OBJECTIVES.find(o => o.value === campaign.objective)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-blue-100 transition-colors">
      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer select-none bg-white"
        onClick={() => setExpanded(v => !v)}
      >
        <button className="text-gray-300 flex-shrink-0">
          <ChevronDown size={14} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800 truncate">{campaign.name}</p>
            <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">{obj?.label}</span>
            <span className="text-[10px] text-gray-400">{campaign.startDate} → {campaign.endDate}</span>
            <span className="text-[10px] text-gray-400">{fmt(campaign.budget)}</span>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <PerfBadge perf={perf} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-5 py-4 space-y-3">
          {/* Performance on mobile */}
          <div className="sm:hidden">
            <PerfBadge perf={perf} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">文案版本</p>
              <p className="font-semibold text-gray-700">{copyCount} 個</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">廣告素材</p>
              <p className="font-semibold text-gray-700">{creativeCount} 個</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">創意風格</p>
              <p className="font-semibold text-gray-700">
                {STYLE_TYPES.find(s => s.value === campaign.styleType)?.label}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">預算使用</p>
              <p className="font-semibold text-gray-700">
                {perf && perf.spend > 0
                  ? `${((perf.spend / campaign.budget) * 100).toFixed(0)}%`
                  : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a href={campaign.landingPageUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
              <ExternalLink size={11} />落地頁
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">更新：{new Date(campaign.updatedAt).toLocaleDateString('zh-TW')}</span>
          </div>

          {/* Status change */}
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-gray-400">變更狀態：</span>
            {(['draft','active','paused','ended'] as AdCampaignStatus[]).map(s => (
              <button key={s} onClick={() => onStatusChange(s)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors font-medium ${
                  campaign.status === s
                    ? `${STATUS_CFG[s].bg} ${STATUS_CFG[s].text} border-transparent`
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {STATUS_CFG[s].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const AdCampaignManager: React.FC = () => {
  const {
    campaigns, createCampaign, updateCampaign, deleteCampaign,
    getPerf, getCampaignCopyVersions, getCampaignCreatives, isMock,
  } = useAdData()

  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<AdCampaign | null>(null)
  const [filterStatus, setFilterStatus] = useState<AdCampaignStatus | 'all'>('all')

  const filtered = campaigns.filter(c => filterStatus === 'all' || c.status === filterStatus)

  const handleCreate = async (form: typeof EMPTY_FORM) => {
    await createCampaign({ ...form, brandId: 'BRAND-001', status: 'draft' })
    setShowCreate(false)
  }

  const handleEdit = async (form: typeof EMPTY_FORM) => {
    if (!editTarget) return
    await updateCampaign({ ...editTarget, ...form })
    setEditTarget(null)
  }

  const handleStatusChange = async (campaign: AdCampaign, status: AdCampaignStatus) => {
    await updateCampaign({ ...campaign, status })
  }

  return (
    <div className="space-y-5">
      {/* Mock data banner */}
      {isMock && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700">
          <Target size={13} />
          目前顯示 Mock 示範資料 — 設定 <code className="bg-amber-100 px-1 rounded">USE_MOCK = false</code> 並確認後端路由即可切換為真實資料
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Target size={15} className="text-blue-600" />廣告活動管理
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">共 {campaigns.length} 個活動</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as AdCampaignStatus | 'all')}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="all">全部</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
              <Plus size={13} />新增活動
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {(['active','draft','paused','ended'] as AdCampaignStatus[]).map(s => {
            const count = campaigns.filter(c => c.status === s).length
            const cfg = STATUS_CFG[s]
            return (
              <div key={s} className={`rounded-lg px-3 py-2 ${cfg.bg}`}>
                <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
                <p className={`text-lg font-bold ${cfg.text}`}>{count}</p>
              </div>
            )
          })}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-4 p-4 border border-blue-100 bg-blue-50/40 rounded-xl">
            <p className="text-sm font-semibold text-gray-700 mb-3">建立新活動</p>
            <CampaignForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
          </div>
        )}

        {/* Campaign list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Target size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">尚無活動</p>
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id}>
                {editTarget?.id === c.id ? (
                  <div className="p-4 border border-blue-100 bg-blue-50/40 rounded-xl">
                    <p className="text-sm font-semibold text-gray-700 mb-3">編輯活動</p>
                    <CampaignForm
                      initial={{ name: c.name, objective: c.objective, budget: c.budget,
                        startDate: c.startDate, endDate: c.endDate,
                        landingPageUrl: c.landingPageUrl, styleType: c.styleType }}
                      onSave={handleEdit}
                      onCancel={() => setEditTarget(null)}
                    />
                  </div>
                ) : (
                  <CampaignRow
                    campaign={c}
                    perf={getPerf(c.id)}
                    copyCount={getCampaignCopyVersions(c.id).length}
                    creativeCount={getCampaignCreatives(c.id).length}
                    onEdit={() => setEditTarget(c)}
                    onDelete={() => window.confirm(`確定刪除「${c.name}」？`) && deleteCampaign(c.id)}
                    onStatusChange={s => handleStatusChange(c, s)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AdCampaignManager
