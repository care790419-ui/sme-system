import React, { useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts'
import {
  Megaphone, TrendingUp, MousePointer, Eye, ShoppingCart,
  DollarSign, Pause, Play, CheckCircle, Plus, Trash2, Save, Edit2,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import EditableCell from '../components/EditableCell'
import { useApp } from '../context/AppContext'
import { Campaign } from '../types'
import { platformColors } from '../data/mockData'

const formatNT = (v: number) => `NT$ ${v.toLocaleString('zh-TW')}`
const formatNTShort = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return `${v}`
}
const fmtNum = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return `${v}`
}

const PLATFORMS = ['Facebook','Google','Instagram','LINE','YouTube','TikTok','其他']
const STATUS_OPTS = [
  { value: 'active',  label: '進行中' },
  { value: 'paused',  label: '已暫停' },
  { value: 'ended',   label: '已結束' },
]

function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-40 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <Save size={14} />已儲存
    </div>
  )
}

const Marketing: React.FC = () => {
  const { state, saveCampaign, createCampaign, removeCampaign } = useApp()
  const { campaigns } = state
  const [tab, setTab] = useState<'overview' | 'campaigns' | 'roi' | 'platforms'>('overview')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [selectedCamIds, setSelectedCamIds] = useState<Set<string>>(new Set())

  const flash = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }, [])

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const overallROI = totalSpent > 0 ? (((totalRevenue - totalSpent) / totalSpent) * 100).toFixed(1) : '0'
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'
  const avgCPC = totalClicks > 0 ? (totalSpent / totalClicks).toFixed(0) : '0'
  const avgCPA = totalConversions > 0 ? (totalSpent / totalConversions).toFixed(0) : '0'

  const filtered = statusFilter === 'all' ? campaigns : campaigns.filter(c => c.status === statusFilter)

  const platformData = Object.entries(
    campaigns.reduce((acc, c) => {
      if (!acc[c.platform]) acc[c.platform] = { spent: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
      acc[c.platform].spent += c.spent
      acc[c.platform].revenue += c.revenue
      acc[c.platform].impressions += c.impressions
      acc[c.platform].clicks += c.clicks
      acc[c.platform].conversions += c.conversions
      return acc
    }, {} as Record<string, { spent: number; revenue: number; impressions: number; clicks: number; conversions: number }>)
  ).map(([platform, data]) => ({
    platform,
    ...data,
    roi: parseFloat((((data.revenue - data.spent) / data.spent) * 100).toFixed(1)),
    ctr: parseFloat(((data.clicks / data.impressions) * 100).toFixed(2)),
    color: platformColors[platform] || '#6b7280',
  }))

  const scatterData = campaigns.map(c => ({
    name: c.name,
    spent: c.spent,
    roi: parseFloat((((c.revenue - c.spent) / c.spent) * 100).toFixed(1)),
    conversions: c.conversions,
    platform: c.platform,
  }))

  const monthlyAdData = [
    { month: '7月', facebook: 42000, google: 55000, instagram: 28000, line: 12000 },
    { month: '8月', facebook: 48000, google: 58000, instagram: 31000, line: 14000 },
    { month: '9月', facebook: 45000, google: 63000, instagram: 29000, line: 16000 },
    { month: '10月', facebook: 52000, google: 68000, instagram: 35000, line: 18000 },
    { month: '11月', facebook: 61000, google: 72000, instagram: 40000, line: 20000 },
    { month: '12月', facebook: 84300, google: 87200, instagram: 55000, line: 16600 },
  ]

  const platformPieData = platformData.map(p => ({ name: p.platform, value: p.spent, color: p.color }))

  const updateCam = (cam: Campaign, field: keyof Campaign, raw: string) => {
    const u = { ...cam } as Record<string, unknown>
    const numFields: (keyof Campaign)[] = ['budget','spent','impressions','clicks','conversions','revenue']
    u[field] = numFields.includes(field) ? (parseFloat(raw) || 0) : raw
    saveCampaign(u as unknown as Campaign)
    flash()
  }

  const addCam = () => {
    createCampaign({
      id: `CAM-${Date.now()}`,
      name: '新廣告活動',
      platform: 'Facebook',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      budget: 0,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      status: 'active',
    })
    flash()
  }

  const delCam = (id: string) => {
    if (window.confirm('確定要刪除此廣告活動？（對應財務記錄也會一併刪除）')) {
      removeCampaign(id)
      flash()
    }
  }

  const allCamSelected = filtered.length > 0 && filtered.every(c => selectedCamIds.has(c.id))
  const someCamSelected = filtered.some(c => selectedCamIds.has(c.id))
  const toggleCam = (id: string) => setSelectedCamIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAllCam = () => setSelectedCamIds(allCamSelected ? new Set() : new Set(filtered.map(c => c.id)))
  const delSelectedCam = () => {
    if (window.confirm(`確定要刪除選取的 ${selectedCamIds.size} 個廣告活動？（對應財務記錄也會一併刪除）`)) {
      selectedCamIds.forEach(id => removeCampaign(id))
      setSelectedCamIds(new Set())
      flash()
    }
  }

  const statusCfg = {
    active: { label: '進行中', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Play },
    paused: { label: '已暫停', bg: 'bg-yellow-100',  text: 'text-yellow-700',  icon: Pause },
    ended:  { label: '已結束', bg: 'bg-gray-100',    text: 'text-gray-600',    icon: CheckCircle },
  }

  const tabs = [
    { id: 'overview',   label: '行銷概覽' },
    { id: 'campaigns',  label: '活動管理' },
    { id: 'roi',        label: 'ROI 分析' },
    { id: 'platforms',  label: '平台比較' },
  ] as const

  return (
    <div className="space-y-6">
      <SaveToast visible={saved} />

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="廣告總花費" value={formatNT(totalSpent)} change={`${campaigns.length} 個活動`} changeType="neutral" icon={Megaphone} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="廣告帶來營收" value={formatNT(totalRevenue)} change={`整體ROI +${overallROI}%`} changeType="positive" icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard title="總曝光次數" value={fmtNum(totalImpressions)} change={`點擊率 ${avgCTR}%`} changeType="positive" icon={Eye} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="總轉換數" value={totalConversions.toLocaleString('zh-TW')} change={`每次轉換成本 NT$ ${avgCPA}`} changeType="neutral" icon={ShoppingCart} iconBg="bg-orange-50" iconColor="text-orange-500" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '總點擊數',     value: fmtNum(totalClicks),               icon: MousePointer, color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: '平均點擊成本', value: `NT$ ${avgCPC}`,                   icon: DollarSign,   color: 'text-green-600',   bg: 'bg-green-50'   },
          { label: '整體投資報酬', value: `+${overallROI}%`,                 icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '進行中活動',   value: `${campaigns.filter(c => c.status === 'active').length} 個`, icon: Play, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                <item.icon size={16} className={item.color} />
              </div>
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`py-4 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── 行銷概覽 ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">各平台廣告花費趨勢（近6個月）</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyAdData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={formatNTShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => formatNT(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="facebook"  name="Facebook"  stroke="#1877F2" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="google"    name="Google"    stroke="#4285F4" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#E1306C" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="line"      name="LINE"      stroke="#00B900" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">廣告花費平台分佈</h4>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={220}>
                      <PieChart>
                        <Pie data={platformPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {platformPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatNT(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3">
                      {platformData.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-sm text-gray-700">{p.platform}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-700">NT$ {(p.spent/1000).toFixed(0)}K</p>
                            <p className="text-xs text-gray-400">{totalSpent > 0 ? ((p.spent/totalSpent)*100).toFixed(1) : 0}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">各平台轉換數對比</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={platformData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="platform" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="conversions" name="轉換數" radius={[4,4,0,0]}>
                      {platformData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── 活動管理 ── */}
          {tab === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {(['all','active','paused','ended'] as const).map(f => {
                  const labels = { all: '全部', active: '進行中', paused: '已暫停', ended: '已結束' }
                  return (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {labels[f]}
                    </button>
                  )
                })}
                <span className="text-xs text-gray-400">{filtered.length} 個活動</span>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={toggleAllCam}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                    <input type="checkbox" checked={allCamSelected} readOnly className="w-3 h-3 pointer-events-none" />
                    全選
                  </button>
                  <button onClick={addCam}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                    <Plus size={13} />新增活動
                  </button>
                </div>
              </div>
              {someCamSelected && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <span className="text-xs font-medium text-blue-700">已選取 {selectedCamIds.size} 個活動</span>
                  <button onClick={delSelectedCam}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors ml-auto">
                    <Trash2 size={12} />刪除選取
                  </button>
                  <button onClick={() => setSelectedCamIds(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                </div>
              )}
              <p className="text-xs text-blue-500">💡 點擊「編輯」展開行內欄位，廣告花費修改後會自動同步至財務模組</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(cam => {
                  const roi = cam.spent > 0 ? (((cam.revenue - cam.spent) / cam.spent) * 100).toFixed(1) : '0'
                  const budgetUsed = cam.budget > 0 ? ((cam.spent / cam.budget) * 100).toFixed(0) : '0'
                  const ctr = cam.impressions > 0 ? ((cam.clicks / cam.impressions) * 100).toFixed(2) : '0'
                  const sc = statusCfg[cam.status]
                  const pColor = platformColors[cam.platform] || '#6b7280'
                  const isEditing = editingId === cam.id
                  const isSelected = selectedCamIds.has(cam.id)

                  return (
                    <div key={cam.id} className={`border rounded-xl p-5 transition-all ${isSelected ? 'border-blue-400 bg-blue-50/30' : isEditing ? 'border-blue-300 shadow-md bg-blue-50/20' : 'border-gray-100 hover:shadow-sm'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 mr-2 flex-shrink-0">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleCam(cam.id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <EditableCell value={cam.name} onSave={v => updateCam(cam, 'name', v)} className="font-bold text-gray-800 text-sm" />
                          ) : (
                            <h5 className="text-sm font-bold text-gray-800 truncate">{cam.name}</h5>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {isEditing ? (
                              <EditableCell value={cam.platform} type="select"
                                options={PLATFORMS.map(p => ({ value: p, label: p }))}
                                onSave={v => updateCam(cam, 'platform', v)}
                                displayValue={<span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: pColor }}>{cam.platform}</span>}
                              />
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: pColor }}>{cam.platform}</span>
                            )}
                            <span className="text-xs text-gray-400">{cam.startDate} ~ {cam.endDate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {isEditing ? (
                            <EditableCell value={cam.status} type="select" options={STATUS_OPTS}
                              onSave={v => updateCam(cam, 'status', v)}
                              displayValue={<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>}
                            />
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                          )}
                          <button onClick={() => setEditingId(isEditing ? null : cam.id)}
                            className={`p-1 rounded transition-colors ${isEditing ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => delCam(cam.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Budget bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>預算使用</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1 text-xs">
                              <EditableCell value={cam.spent} type="number" onSave={v => updateCam(cam, 'spent', v)} displayValue={`NT$ ${cam.spent.toLocaleString('zh-TW')}`} />
                              <span>/</span>
                              <EditableCell value={cam.budget} type="number" onSave={v => updateCam(cam, 'budget', v)} displayValue={`NT$ ${cam.budget.toLocaleString('zh-TW')}`} />
                            </div>
                          ) : (
                            <span>NT$ {cam.spent.toLocaleString('zh-TW')} / NT$ {cam.budget.toLocaleString('zh-TW')} ({budgetUsed}%)</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(parseFloat(budgetUsed), 100)}%`, backgroundColor: parseFloat(budgetUsed) > 90 ? '#f59e0b' : pColor }} />
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {[
                          { label: '曝光', key: 'impressions' as keyof Campaign, display: fmtNum(cam.impressions) },
                          { label: '點擊', key: 'clicks' as keyof Campaign, display: fmtNum(cam.clicks) },
                          { label: '轉換', key: 'conversions' as keyof Campaign, display: String(cam.conversions) },
                          { label: 'CTR', key: null, display: `${ctr}%` },
                        ].map((m, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg py-2">
                            {isEditing && m.key ? (
                              <EditableCell value={cam[m.key] as number} type="number" onSave={v => updateCam(cam, m.key!, v)} className="text-xs font-bold text-gray-700" />
                            ) : (
                              <p className="text-xs font-bold text-gray-700">{m.display}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-50">
                        {isEditing ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>營收：</span>
                            <EditableCell value={cam.revenue} type="number" onSave={v => updateCam(cam, 'revenue', v)} displayValue={formatNT(cam.revenue)} className="font-medium text-emerald-600" />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">帶來營收：{formatNT(cam.revenue)}</span>
                        )}
                        <span className={`text-sm font-bold ${parseFloat(roi) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          ROI {parseFloat(roi) > 0 ? '+' : ''}{roi}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── ROI 分析 ── */}
          {tab === 'roi' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {platformData.map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-bold mb-1" style={{ color: p.color }}>{p.platform}</div>
                    <p className="text-xl font-bold text-gray-800">+{p.roi}%</p>
                    <p className="text-xs text-gray-500 mt-1">ROI</p>
                    <div className="mt-2 text-xs text-gray-500">
                      <div>花費：NT$ {(p.spent/1000).toFixed(0)}K</div>
                      <div>營收：NT$ {(p.revenue/1000).toFixed(0)}K</div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">各活動 ROI 比較</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={campaigns.map(c => ({
                      name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
                      roi: parseFloat((c.spent > 0 ? ((c.revenue - c.spent) / c.spent) * 100 : 0).toFixed(1)),
                      platform: c.platform,
                    }))}
                    margin={{ top: 5, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="roi" name="ROI" radius={[4,4,0,0]}>
                      {campaigns.map((entry, i) => <Cell key={i} fill={platformColors[entry.platform] || '#6b7280'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">廣告花費 vs 帶來營收散點圖</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="spent" name="花費" tickFormatter={formatNTShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} label={{ value: '廣告花費', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis dataKey="roi" name="ROI" tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} label={{ value: 'ROI %', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }} />
                    <ZAxis dataKey="conversions" range={[60, 200]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as typeof scatterData[0]
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                            <p className="font-bold text-gray-700 mb-1 max-w-48 truncate">{d.name}</p>
                            <p className="text-gray-500">花費: {formatNT(d.spent)}</p>
                            <p className="text-emerald-600">ROI: +{d.roi}%</p>
                            <p className="text-blue-600">轉換: {d.conversions}</p>
                          </div>
                        )
                      }
                      return null
                    }} />
                    {Object.entries(platformColors).map(([platform, color]) => (
                      <Scatter key={platform} name={platform} data={scatterData.filter(d => d.platform === platform)} fill={color} fillOpacity={0.7} />
                    ))}
                    <Legend />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">活動 ROI 詳細報表</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {['活動名稱','平台','預算','花費','帶來營收','毛利','ROI','每次轉換成本'].map((h, i) => (
                          <th key={i} className={`py-3 px-4 text-xs font-semibold text-gray-500 ${i === 0 ? 'text-left rounded-l-lg' : i === 7 ? 'text-right rounded-r-lg' : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(cam => {
                        const roi = cam.spent > 0 ? parseFloat((((cam.revenue - cam.spent) / cam.spent) * 100).toFixed(1)) : 0
                        const gp = cam.revenue - cam.spent
                        const cpa = cam.conversions > 0 ? (cam.spent / cam.conversions).toFixed(0) : '0'
                        return (
                          <tr key={cam.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-gray-700 max-w-40 truncate">{cam.name}</td>
                            <td className="py-2.5 px-4 text-right font-semibold" style={{ color: platformColors[cam.platform] }}>{cam.platform}</td>
                            <td className="py-2.5 px-4 text-right text-gray-500">NT$ {(cam.budget/1000).toFixed(0)}K</td>
                            <td className="py-2.5 px-4 text-right text-gray-600">NT$ {(cam.spent/1000).toFixed(0)}K</td>
                            <td className="py-2.5 px-4 text-right text-emerald-600 font-medium">NT$ {(cam.revenue/1000).toFixed(0)}K</td>
                            <td className={`py-2.5 px-4 text-right font-medium ${gp > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{gp > 0 ? '+' : ''}NT$ {(gp/1000).toFixed(0)}K</td>
                            <td className={`py-2.5 px-4 text-right font-bold ${roi > 200 ? 'text-emerald-600' : roi > 100 ? 'text-blue-600' : 'text-yellow-600'}`}>+{roi}%</td>
                            <td className="py-2.5 px-4 text-right text-gray-600">NT$ {cpa}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── 平台比較 ── */}
          {tab === 'platforms' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {platformData.map((p, i) => (
                  <div key={i} className="border-2 rounded-xl p-5" style={{ borderColor: p.color + '40' }}>
                    <div className="text-base font-bold mb-3 pb-2 border-b" style={{ color: p.color, borderColor: p.color + '30' }}>{p.platform}</div>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: '總花費',   value: formatNT(p.spent) },
                        { label: '帶來營收', value: formatNT(p.revenue) },
                        { label: '曝光次數', value: fmtNum(p.impressions) },
                        { label: '點擊次數', value: fmtNum(p.clicks) },
                        { label: '轉換數',   value: String(p.conversions) },
                        { label: 'CTR',      value: `${p.ctr}%` },
                        { label: 'ROI',      value: `+${p.roi}%` },
                      ].map((item, j) => (
                        <div key={j} className="flex justify-between">
                          <span className="text-gray-500 text-xs">{item.label}</span>
                          <span className={`text-xs font-semibold ${item.label === 'ROI' ? 'text-emerald-600' : 'text-gray-700'}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">平台效益指標比較</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={platformData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="platform" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatNTShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatNT(v)} />
                    <Legend formatter={v => v === 'spent' ? '花費' : '帶來營收'} />
                    <Bar dataKey="spent"   name="spent"   fill="#93c5fd" radius={[3,3,0,0]} />
                    <Bar dataKey="revenue" name="revenue" fill="#34d399" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Marketing
