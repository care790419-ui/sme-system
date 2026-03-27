import React, { useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingDown, AlertTriangle, CheckCircle, BarChart3,
  Layers, Plus, Trash2, Save,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import EditableCell from '../components/EditableCell'
import { useApp } from '../context/AppContext'
import { CostItem } from '../types'
import { categoryBudgetData, expenseBreakdown } from '../data/mockData'

const formatNT = (v: number) => `NT$ ${v.toLocaleString('zh-TW')}`
const formatNTShort = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return `${v}`
}

const VARIABLE_CATS = ['商品成本','包材費用','運費費用','平台抽成','廣告分攤','其他變動成本']
const FIXED_CATS    = ['人事費用','租金費用','設備維護','辦公費用','水電費用','軟體費用','保險費用','差旅費用','其他固定費用']
const CATEGORIES = [...VARIABLE_CATS, ...FIXED_CATS]
const MONTHS = ['2024-10','2024-11','2024-12']
const MONTH_LABELS: Record<string, string> = {
  '2024-10': '2024年10月',
  '2024-11': '2024年11月',
  '2024-12': '2024年12月',
}

function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-40 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <Save size={14} />已儲存
    </div>
  )
}

const Cost: React.FC = () => {
  const { state, saveCost, createCost, removeCost } = useApp()
  const { costItems } = state
  const [tab, setTab] = useState<'overview' | 'details' | 'analysis'>('overview')
  const [month, setMonth] = useState('2024-12')
  const [saved, setSaved] = useState(false)
  const [selectedCostIds, setSelectedCostIds] = useState<Set<string>>(new Set())

  const flash = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }, [])

  const items = costItems.filter(c => c.month === month)
  const totalBudget = items.reduce((s, c) => s + c.budget, 0)
  const totalActual = items.reduce((s, c) => s + c.actual, 0)
  const variance = totalBudget - totalActual
  const overItems = items.filter(c => c.actual > c.budget)

  const categories = [...new Set(items.map(c => c.category))]
  const catSummary = categories.map(cat => {
    const rows = items.filter(c => c.category === cat)
    return {
      category: cat,
      budget: rows.reduce((s, r) => s + r.budget, 0),
      actual: rows.reduce((s, r) => s + r.actual, 0),
    }
  })
  const radarData = catSummary.map(c => ({
    category: c.category,
    執行率: Math.round((c.actual / c.budget) * 100),
  }))

  const updateCost = (item: CostItem, field: keyof CostItem, raw: string) => {
    const u = { ...item } as Record<string, unknown>
    u[field] = (field === 'budget' || field === 'actual') ? (parseFloat(raw) || 0) : raw
    saveCost(u as unknown as CostItem)
    flash()
  }

  const addCost = () => {
    createCost({
      id: `COST-${Date.now()}`,
      category: '其他固定費用',
      subcategory: '新項目',
      description: '新成本項目',
      budget: 0,
      actual: 0,
      month,
      costType: 'fixed',
    })
    flash()
  }

  const delCost = (id: string) => {
    if (window.confirm('確定要刪除此成本項目？')) {
      removeCost(id)
      flash()
    }
  }

  const allCostSelected = items.length > 0 && items.every(i => selectedCostIds.has(i.id))
  const someCostSelected = items.some(i => selectedCostIds.has(i.id))
  const toggleCost = (id: string) => setSelectedCostIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAllCost = () => setSelectedCostIds(allCostSelected ? new Set() : new Set(items.map(i => i.id)))
  const delSelectedCost = () => {
    if (window.confirm(`確定要刪除選取的 ${selectedCostIds.size} 個成本項目？`)) {
      selectedCostIds.forEach(id => removeCost(id))
      setSelectedCostIds(new Set())
      flash()
    }
  }

  const tabs = [
    { id: 'overview', label: '成本概覽' },
    { id: 'details',  label: '明細清單' },
    { id: 'analysis', label: '預算分析' },
  ] as const

  const catColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4']

  return (
    <div className="space-y-6">
      <SaveToast visible={saved} />

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="本月預算總額" value={formatNT(totalBudget)} change={`${MONTH_LABELS[month]}預算`} changeType="neutral" icon={Layers} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="本月實際支出" value={formatNT(totalActual)} change={`預算使用率 ${totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%`} changeType={totalActual > totalBudget ? 'negative' : 'positive'} icon={TrendingDown} iconBg="bg-orange-50" iconColor="text-orange-500" />
        <StatCard title="預算結餘" value={`${variance >= 0 ? '+' : ''}${formatNT(variance)}`} change={variance >= 0 ? '節省預算' : '超出預算'} changeType={variance >= 0 ? 'positive' : 'negative'} icon={CheckCircle} iconBg={variance >= 0 ? 'bg-emerald-50' : 'bg-red-50'} iconColor={variance >= 0 ? 'text-emerald-600' : 'text-red-500'} />
        <StatCard title="超預算項目" value={`${overItems.length} 項`} change={overItems.length > 0 ? '需注意控管' : '全部符合預算'} changeType={overItems.length > 0 ? 'negative' : 'positive'} icon={AlertTriangle} iconBg={overItems.length > 0 ? 'bg-yellow-50' : 'bg-emerald-50'} iconColor={overItems.length > 0 ? 'text-yellow-600' : 'text-emerald-600'} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-6">
          <div className="flex overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`py-4 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">月份：</span>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MONTHS.map(m => <option key={m} value={m}>{MONTH_LABELS[m]}</option>)}
            </select>
          </div>
        </div>

        <div className="p-6">
          {/* ── 成本概覽 ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">各類別預算 vs 實際支出</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryBudgetData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatNTShort} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip formatter={(v: number) => formatNT(v)} />
                      <Legend formatter={v => v === 'budget' ? '預算' : '實際'} />
                      <Bar dataKey="budget" name="budget" fill="#93c5fd" radius={[0,3,3,0]} barSize={10} />
                      <Bar dataKey="actual" name="actual" fill="#3b82f6" radius={[0,3,3,0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">成本結構分佈</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
                        {expenseBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatNT(v)} />
                      <Legend formatter={value => {
                        const item = expenseBreakdown.find(e => e.name === value)
                        return item ? `${value} (${((item.value / totalActual) * 100).toFixed(1)}%)` : value
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">各類別執行摘要</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {catSummary.map((cat, i) => {
                    const rate = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0
                    const over = cat.actual > cat.budget
                    return (
                      <div key={i} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">{cat.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${over ? 'bg-red-50 text-red-600' : rate > 90 ? 'bg-yellow-50 text-yellow-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-500">
                          <div className="flex justify-between">
                            <span>預算</span>
                            <span className="font-medium text-gray-700">NT$ {(cat.budget / 1000).toFixed(0)}K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>實際</span>
                            <span className={`font-medium ${over ? 'text-red-600' : 'text-gray-700'}`}>
                              NT$ {(cat.actual / 1000).toFixed(0)}K
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: over ? '#ef4444' : catColors[i % catColors.length] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── 明細清單 ── */}
          {tab === 'details' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-blue-500">💡 點擊任意欄位可直接編輯，修改後自動儲存；實際支出會同步至財務模組</p>
                <button onClick={addCost}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                  <Plus size={13} />新增項目
                </button>
              </div>
              {someCostSelected && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <span className="text-xs font-medium text-blue-700">已選取 {selectedCostIds.size} 項</span>
                  <button onClick={delSelectedCost}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors ml-auto">
                    <Trash2 size={12} />刪除選取
                  </button>
                  <button onClick={() => setSelectedCostIds(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-3 px-4 rounded-l-lg">
                        <input type="checkbox" checked={allCostSelected} onChange={toggleAllCost}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">成本性質</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">類別</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">子類別</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">描述</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">預算</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">實際</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">差異</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">執行率</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 rounded-r-lg">刪除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const diff = item.budget - item.actual
                      const rate = item.budget > 0 ? (item.actual / item.budget) * 100 : 0
                      const over = item.actual > item.budget
                      const isSelected = selectedCostIds.has(item.id)
                      return (
                        <tr key={item.id} className={`group border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/20'}`}>
                          <td className="py-3 px-4">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleCost(item.id)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                          </td>
                          <td className="py-3 px-4">
                            <EditableCell
                              value={item.costType ?? 'fixed'}
                              type="select"
                              options={[{ value: 'variable', label: '變動' }, { value: 'fixed', label: '固定' }]}
                              onSave={v => updateCost(item, 'costType', v)}
                              displayValue={
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(item.costType ?? 'fixed') === 'variable' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {(item.costType ?? 'fixed') === 'variable' ? '變動' : '固定'}
                                </span>
                              }
                            />
                          </td>
                          <td className="py-3 px-4">
                            <EditableCell value={item.category} type="select"
                              options={CATEGORIES.map(c => ({ value: c, label: c }))}
                              onSave={v => updateCost(item, 'category', v)}
                              displayValue={<span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{item.category}</span>}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <EditableCell value={item.subcategory} onSave={v => updateCost(item, 'subcategory', v)} className="text-gray-600" />
                          </td>
                          <td className="py-3 px-4">
                            <EditableCell value={item.description} onSave={v => updateCost(item, 'description', v)} className="text-gray-700" />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <EditableCell value={item.budget} type="number" onSave={v => updateCost(item, 'budget', v)}
                              className="text-gray-600" displayValue={`NT$ ${item.budget.toLocaleString('zh-TW')}`} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <EditableCell value={item.actual} type="number" onSave={v => updateCost(item, 'actual', v)}
                              className={`font-medium ${over ? 'text-red-600' : 'text-gray-700'}`}
                              displayValue={`NT$ ${item.actual.toLocaleString('zh-TW')}`} />
                          </td>
                          <td className={`py-3 px-4 text-right font-medium ${diff < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {diff >= 0 ? '+' : ''}NT$ {diff.toLocaleString('zh-TW')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full"
                                  style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: over ? '#ef4444' : rate > 90 ? '#f59e0b' : '#10b981' }} />
                              </div>
                              <span className={`text-xs font-medium w-12 text-right ${over ? 'text-red-600' : rate > 90 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                                {rate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => delCost(item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition-all">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50">
                      <td colSpan={4} className="py-3 px-4 text-sm font-bold text-blue-800 rounded-l-lg">合計</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-800">NT$ {totalBudget.toLocaleString('zh-TW')}</td>
                      <td className={`py-3 px-4 text-right font-bold ${totalActual > totalBudget ? 'text-red-700' : 'text-blue-800'}`}>
                        NT$ {totalActual.toLocaleString('zh-TW')}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${variance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {variance >= 0 ? '+' : ''}NT$ {variance.toLocaleString('zh-TW')}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-800">
                        {totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="py-3 px-4 rounded-r-lg" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── 預算分析 ── */}
          {tab === 'analysis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">各類別預算執行率雷達圖</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 120]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${v}%`} />
                      <Radar name="預算執行率" dataKey="執行率" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">成本控制分析</h4>
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">成本控制良好的項目</p>
                          <ul className="mt-2 space-y-1 text-xs text-emerald-700">
                            {items.filter(i => i.actual <= i.budget * 0.95).map(i => (
                              <li key={i.id}>· {i.subcategory}：節省 NT$ {(i.budget - i.actual).toLocaleString('zh-TW')}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    {overItems.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-red-800">超出預算的項目</p>
                            <ul className="mt-2 space-y-1 text-xs text-red-700">
                              {overItems.map(i => (
                                <li key={i.id}>· {i.subcategory}：超支 NT$ {(i.actual - i.budget).toLocaleString('zh-TW')} ({(((i.actual - i.budget) / i.budget) * 100).toFixed(1)}%)</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="border border-gray-100 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">預算使用進度</p>
                      <div className="space-y-3">
                        {catSummary.map((cat, i) => {
                          const rate = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">{cat.category}</span>
                                <span className={`font-medium ${rate > 100 ? 'text-red-600' : rate > 90 ? 'text-yellow-600' : 'text-gray-700'}`}>{rate.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: rate > 100 ? '#ef4444' : rate > 90 ? '#f59e0b' : catColors[i % catColors.length] }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">季度成本趨勢比較</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 rounded-l-lg">成本類別</th>
                        {['Q1','Q2','Q3','Q4'].map(q => <th key={q} className="text-right py-3 px-4 text-xs font-semibold text-gray-500">{q}</th>)}
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">全年合計</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 rounded-r-lg">YoY變化</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { cat: '人事費用', q1: 780000, q2: 820000, q3: 840000, q4: 895000, yoy: 8.2 },
                        { cat: '租金費用', q1: 270000, q2: 270000, q3: 270000, q4: 270000, yoy: 0 },
                        { cat: '行銷費用', q1: 480000, q2: 520000, q3: 560000, q4: 590000, yoy: 18.5 },
                        { cat: '設備維護', q1: 95000,  q2: 108000, q3: 112000, q4: 119000, yoy: 5.3 },
                        { cat: '辦公費用', q1: 98000,  q2: 102000, q3: 105000, q4: 108000, yoy: 3.1 },
                        { cat: '原物料',   q1: 580000, q2: 640000, q3: 620000, q4: 650000, yoy: 12.7 },
                      ].map((row, i) => {
                        const total = row.q1 + row.q2 + row.q3 + row.q4
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-gray-700">{row.cat}</td>
                            {[row.q1, row.q2, row.q3, row.q4].map((v, vi) => (
                              <td key={vi} className="py-2.5 px-4 text-right text-gray-600">NT$ {(v/1000).toFixed(0)}K</td>
                            ))}
                            <td className="py-2.5 px-4 text-right font-semibold text-gray-700">NT$ {(total/1000).toFixed(0)}K</td>
                            <td className={`py-2.5 px-4 text-right font-medium ${row.yoy > 10 ? 'text-red-500' : row.yoy > 0 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                              {row.yoy > 0 ? '+' : ''}{row.yoy}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-700">最高成本項目</h4>
          </div>
          <div className="space-y-2">
            {[...items].sort((a, b) => b.actual - a.actual).slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate mr-2">{item.subcategory}</span>
                <span className="font-medium text-gray-700 flex-shrink-0">NT$ {(item.actual/1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-emerald-600" />
            <h4 className="text-sm font-semibold text-gray-700">節省最多項目</h4>
          </div>
          <div className="space-y-2">
            {[...items].filter(i => i.budget > i.actual).sort((a, b) => (b.budget - b.actual) - (a.budget - a.actual)).slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate mr-2">{item.subcategory}</span>
                <span className="font-medium text-emerald-600 flex-shrink-0">+NT$ {(item.budget - item.actual).toLocaleString('zh-TW')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h4 className="text-sm font-semibold text-gray-700">超預算項目</h4>
          </div>
          {overItems.length === 0 ? (
            <p className="text-xs text-emerald-600 font-medium">本月所有項目均在預算範圍內</p>
          ) : (
            <div className="space-y-2">
              {overItems.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate mr-2">{item.subcategory}</span>
                  <span className="font-medium text-red-500 flex-shrink-0">-NT$ {(item.actual - item.budget).toLocaleString('zh-TW')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Cost
