import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingDown, AlertTriangle, Download,
  Plus, Trash2, Search, RefreshCw, ChevronUp, ChevronDown, RotateCcw,
} from 'lucide-react'
import { CostRecord, CostCategory, Vendor, ProductCost, SalesChannel } from '../types'
import { useApp } from '../context/AppContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNT  = (v: number) => `NT$ ${Math.round(v).toLocaleString('zh-TW')}`
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtShort = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : `${v}`


const STATUS_CFG = {
  paid:     { label: '已付款', cls: 'bg-emerald-50 text-emerald-700' },
  partial:  { label: '部分付款', cls: 'bg-yellow-50 text-yellow-700' },
  unpaid:   { label: '未付款', cls: 'bg-red-50 text-red-600' },
  refunded: { label: '已退款', cls: 'bg-gray-100 text-gray-500' },
}

// ─── Available months (derived from records or fallback) ──────────────────────
const PRESET_MONTHS = ['2024-10','2024-11','2024-12','2025-01','2025-02','2025-03']

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// ─── Small KPI Card ──────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, positive }: { title: string; value: string; sub?: string; positive?: boolean }) {
  const c = positive === undefined ? { text: 'text-gray-800', bg: 'bg-white', border: 'border-gray-100' }
           : positive ? { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' }
           : { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' }
  return (
    <div className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const BusinessReport: React.FC = () => {
  const { state } = useApp()
  const { invoices } = state

  const [month, setMonth]   = useState('2024-12')
  const [profitTab, setProfitTab] = useState<'product' | 'channel'>('product')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'variable' | 'fixed'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all')
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'status'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [loading, setLoading] = useState(true)

  // Extended data
  const [cats,    setCats]    = useState<CostCategory[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [records, setRecords] = useState<CostRecord[]>([])
  const [products,setProducts]= useState<ProductCost[]>([])
  const [channels,setChannels]= useState<SalesChannel[]>([])

  // Report summary from server
  const [report, setReport] = useState<{
    revenue: number; varCost: number; fixCost: number
    grossProfit: number; netProfit: number; grossMargin: number; netMargin: number
    totalCost: number; catBreakdown: (CostCategory & { amount: number })[]
    unpaidRecs: CostRecord[]; unpaidInvs: typeof invoices
  } | null>(null)

  // ── Edit modal state ──
  const [editRec,    setEditRec]    = useState<CostRecord | null>(null)
  const [editProd,   setEditProd]   = useState<ProductCost | null>(null)
  const [editChan,   setEditChan]   = useState<SalesChannel | null>(null)
  const [showNewRec, setShowNewRec] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, v, r, p, ch, rep] = await Promise.all([
        apiFetch<CostCategory[]>('/api/cost-categories'),
        apiFetch<Vendor[]>('/api/vendors'),
        apiFetch<CostRecord[]>('/api/cost-records'),
        apiFetch<ProductCost[]>('/api/product-costs'),
        apiFetch<SalesChannel[]>('/api/sales-channels'),
        apiFetch<typeof report>(`/api/report/${month}`),
      ])
      setCats(c); setVendors(v); setRecords(r); setProducts(p); setChannels(ch); setReport(rep)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [month])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Filtered + sorted cost records ──
  const monthRecs = records.filter(r => r.month === month)
  const displayed = useMemo(() => {
    let rows = monthRecs
    if (typeFilter !== 'all')   rows = rows.filter(r => r.costType === typeFilter)
    if (statusFilter !== 'all') rows = rows.filter(r => r.status   === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r => r.description.toLowerCase().includes(q) ||
        (r.category?.name ?? '').toLowerCase().includes(q) ||
        (r.vendor?.name   ?? '').toLowerCase().includes(q))
    }
    rows = [...rows].sort((a, b) => {
      const dir = sortAsc ? 1 : -1
      if (sortKey === 'date')   return a.date.localeCompare(b.date) * dir
      if (sortKey === 'amount') return (a.amount - b.amount) * dir
      return a.status.localeCompare(b.status) * dir
    })
    return rows
  }, [monthRecs, typeFilter, statusFilter, search, sortKey, sortAsc])

  // ── Profit by product (month-filtered) ──
  const monthProds = useMemo(() => products.filter(p => p.month === month).map(p => ({
    ...p,
    totalCost:   p.cogs + p.adSpend + p.otherCosts,
    grossProfit: p.revenue - p.cogs - p.adSpend - p.otherCosts,
    margin:      p.revenue > 0 ? ((p.revenue - p.cogs - p.adSpend - p.otherCosts) / p.revenue * 100) : 0,
  })).sort((a, b) => b.grossProfit - a.grossProfit), [products, month])

  // ── Profit by channel ──
  const monthChans = useMemo(() => channels.filter(c => c.month === month).map(c => ({
    ...c,
    commissionAmt: c.revenue * c.commission,
    grossProfit:   c.revenue - c.cogs - c.adSpend - c.revenue * c.commission,
    margin:        c.revenue > 0 ? ((c.revenue - c.cogs - c.adSpend - c.revenue * c.commission) / c.revenue * 100) : 0,
  })).sort((a, b) => b.grossProfit - a.grossProfit), [channels, month])

  // ── AR/AP reminders from invoices ──
  const unpaidInvs  = invoices.filter(i => i.status !== 'paid')
  const overdueInvs = invoices.filter(i => i.status === 'overdue')
  const unpaidCosts = monthRecs.filter(r => r.status === 'unpaid' || r.status === 'partial')
  const unpaidTotal = unpaidInvs.reduce((s, i) => s + i.amount, 0)
  const unpaidCostTotal = unpaidCosts.reduce((s, r) => s + (r.amount - r.paidAmount), 0)

  // ── Export CSV ──
  const exportCSV = () => {
    if (!report) return
    const rows = [
      ['損益報表', month],
      ['總營收', report.revenue, ''],
      ['變動成本', report.varCost, ''],
      ['毛利', report.grossProfit, `${report.grossMargin.toFixed(1)}%`],
      ['固定成本', report.fixCost, ''],
      ['淨利', report.netProfit, `${report.netMargin.toFixed(1)}%`],
      [''],
      ['成本明細'],
      ['日期','描述','類別','性質','金額','已付','狀態'],
      ...displayed.map(r => [r.date, r.description, r.category?.name ?? '', r.costType === 'variable' ? '變動' : '固定', r.amount, r.paidAmount, STATUS_CFG[r.status].label]),
      [''],
      ['商品毛利'],
      ['商品','通路','營收','成本','廣告','毛利','毛利率'],
      ...monthProds.map(p => [p.productName, p.channel, p.revenue, p.cogs, p.adSpend, p.grossProfit, `${p.margin.toFixed(1)}%`]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `業務報表_${month}.csv` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  // ── CRUD helpers ──
  const saveRecord = async (r: CostRecord) => {
    const method = records.find(x => x.id === r.id) ? 'PUT' : 'POST'
    const url = method === 'PUT' ? `/api/cost-records/${r.id}` : '/api/cost-records'
    await apiFetch(url, { method, body: JSON.stringify(r) })
    await loadAll()
  }

  const deleteRecord = async (id: string) => {
    if (!window.confirm('確定刪除此成本記錄？')) return
    await apiFetch(`/api/cost-records/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  const saveProd = async (p: ProductCost) => {
    const method = products.find(x => x.id === p.id) ? 'PUT' : 'POST'
    const url = method === 'PUT' ? `/api/product-costs/${p.id}` : '/api/product-costs'
    await apiFetch(url, { method, body: JSON.stringify(p) })
    await loadAll()
  }

  const saveChan = async (c: SalesChannel) => {
    const method = channels.find(x => x.id === c.id) ? 'PUT' : 'POST'
    const url = method === 'PUT' ? `/api/sales-channels/${c.id}` : '/api/sales-channels'
    await apiFetch(url, { method, body: JSON.stringify(c) })
    await loadAll()
  }

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) => sortKey === k
    ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : null

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">載入報表中...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">業務損益報表</h2>
          <p className="text-xs text-gray-400 mt-0.5">老闆視角 · 一眼看懂盈虧</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
            {PRESET_MONTHS.map(m => <option key={m} value={m}>{m.replace('-', '年').replace(/^(\d+年)0?(\d+)$/, '$1$2月')}</option>)}
          </select>
          <button onClick={loadAll} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <RefreshCw size={15} />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Download size={14} />匯出 Excel
          </button>
        </div>
      </div>

      {/* ── 頂部 KPI 卡片 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard title="本月營收" value={fmtNT(report?.revenue ?? 0)} sub={`${month.replace('-','年')}月`} />
        <KpiCard title="本月總成本" value={fmtNT(report?.totalCost ?? 0)} sub={`變動+固定`} positive={false} />
        <KpiCard title="毛利" value={fmtNT(report?.grossProfit ?? 0)} sub={`毛利率 ${fmtPct(report?.grossMargin ?? 0)}`} positive={(report?.grossProfit ?? 0) >= 0} />
        <KpiCard title="毛利率" value={fmtPct(report?.grossMargin ?? 0)} sub={`目標 ≥ 40%`} positive={(report?.grossMargin ?? 0) >= 40} />
        <KpiCard title="固定支出" value={fmtNT(report?.fixCost ?? 0)} sub={`變動 ${fmtNT(report?.varCost ?? 0)}`} />
        <KpiCard title="淨利" value={fmtNT(report?.netProfit ?? 0)} sub={`淨利率 ${fmtPct(report?.netMargin ?? 0)}`} positive={(report?.netProfit ?? 0) >= 0} />
      </div>

      {/* ── 成本分析 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Pie 成本占比 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">成本分類占比</h3>
          {(report?.catBreakdown?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={report!.catBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {report!.catBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtNT(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {report!.catBreakdown.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-gray-600">{c.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.type === 'variable' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {c.type === 'variable' ? '變動' : '固定'}
                      </span>
                    </span>
                    <span className="font-semibold text-gray-700 ml-2">{fmtNT(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-xs text-gray-400 py-8 text-center">此月份無成本記錄</p>}
        </div>

        {/* Bar 固定 vs 變動 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">固定成本 vs 變動成本</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[{ name: month.replace('-','年')+'月', 固定成本: report?.fixCost ?? 0, 變動成本: report?.varCost ?? 0, 毛利: Math.max(0, report?.grossProfit ?? 0) }]}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmtNT(v)} />
              <Legend />
              <Bar dataKey="固定成本" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="變動成本" fill="#f97316" radius={[4,4,0,0]} />
              <Bar dataKey="毛利"    fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-500 font-medium">固定成本</p>
              <p className="text-base font-bold text-indigo-700">{fmtNT(report?.fixCost ?? 0)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-orange-500 font-medium">變動成本</p>
              <p className="text-base font-bold text-orange-700">{fmtNT(report?.varCost ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 毛利分析 (商品 / 通路) ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">毛利分析</h3>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['product','channel'] as const).map(t => (
              <button key={t} onClick={() => setProfitTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${profitTab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'product' ? '商品毛利' : '通路毛利'}
              </button>
            ))}
          </div>
        </div>

        {profitTab === 'product' && (
          <div className="space-y-3">
            {monthProds.length === 0
              ? <p className="text-xs text-gray-400 py-6 text-center">此月份無商品資料，<button onClick={() => setEditProd({ id:`PROD-${Date.now()}`, productName:'', channel:'直接銷售', revenue:0, cogs:0, adSpend:0, otherCosts:0, orders:0, month })} className="text-blue-500 underline">新增商品</button></p>
              : monthProds.map(p => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800 truncate">{p.productName}</span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex-shrink-0">{p.channel}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{p.orders} 筆</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.max(p.margin, 0), 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">營收 {fmtNT(p.revenue)}</p>
                    <p className={`text-sm font-bold ${p.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtNT(p.grossProfit)}</p>
                    <p className={`text-xs font-medium ${p.margin >= 30 ? 'text-emerald-500' : p.margin >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>{fmtPct(p.margin)}</p>
                  </div>
                  <button onClick={() => setEditProd(p)} className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    ✎
                  </button>
                </div>
              ))
            }
            <button onClick={() => setEditProd({ id:`PROD-${Date.now()}`, productName:'', channel:'直接銷售', revenue:0, cogs:0, adSpend:0, otherCosts:0, orders:0, month })}
              className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 flex items-center justify-center gap-1.5">
              <Plus size={13} />新增商品
            </button>
          </div>
        )}

        {profitTab === 'channel' && (
          <div className="space-y-3">
            {monthChans.length === 0
              ? <p className="text-xs text-gray-400 py-6 text-center">此月份無通路資料</p>
              : monthChans.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{c.platform}</span>
                      <span className="text-xs text-gray-400">{c.orders} 筆 · 抽成 {fmtPct(c.commission * 100)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${Math.min(Math.max(c.margin, 0), 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">營收 {fmtNT(c.revenue)}</p>
                    <p className={`text-sm font-bold ${c.grossProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{fmtNT(c.grossProfit)}</p>
                    <p className={`text-xs font-medium ${c.margin >= 30 ? 'text-emerald-500' : c.margin >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>{fmtPct(c.margin)}</p>
                  </div>
                  <button onClick={() => setEditChan(c)} className="opacity-0 group-hover:opacity-100 p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded">
                    ✎
                  </button>
                </div>
              ))
            }
            <button onClick={() => setEditChan({ id:`CHAN-${Date.now()}`, name:'', platform:'', commission:0, revenue:0, cogs:0, adSpend:0, orders:0, month })}
              className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-purple-300 hover:text-purple-500 flex items-center justify-center gap-1.5">
              <Plus size={13} />新增通路
            </button>
          </div>
        )}
      </div>

      {/* ── 成本明細 ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-bold text-gray-700">成本明細</h3>
          <button onClick={() => setShowNewRec(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            <Plus size={13} />新增成本
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-40">
            <Search size={13} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋描述、類別、廠商…"
              className="text-xs bg-transparent outline-none text-gray-700 w-full" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600">
            <option value="all">全部類型</option>
            <option value="variable">變動成本</option>
            <option value="fixed">固定成本</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600">
            <option value="all">全部狀態</option>
            <option value="paid">已付款</option>
            <option value="partial">部分付款</option>
            <option value="unpaid">未付款</option>
          </select>
          {(search || typeFilter !== 'all' || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all') }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">
              <RotateCcw size={12} />清除
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{displayed.length} 筆</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 rounded-l-lg cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('date')}>
                  <span className="flex items-center gap-1">日期 <SortIcon k="date" /></span>
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">描述</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">類別</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">廠商</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">性質</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('amount')}>
                  <span className="flex items-center justify-end gap-1">金額 <SortIcon k="amount" /></span>
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">已付</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('status')}>
                  <span className="flex items-center justify-center gap-1">狀態 <SortIcon k="status" /></span>
                </th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 rounded-r-lg">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                  <td className="py-2.5 px-3 text-xs text-gray-500">{r.date}</td>
                  <td className="py-2.5 px-3 min-w-40">
                    <span className="text-xs font-medium text-gray-700">{r.description}</span>
                    {r.isRecurring === 1 && <span className="ml-1.5 text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">定期</span>}
                    {r.notes && <p className="text-[10px] text-gray-400 mt-0.5">{r.notes}</p>}
                  </td>
                  <td className="py-2.5 px-3">
                    {r.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: r.category.color }}>
                        {r.category.name}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-gray-500">{r.vendor?.name ?? '—'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.costType === 'variable' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {r.costType === 'variable' ? '變動' : '固定'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-700">{fmtNT(r.amount)}</td>
                  <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                    {r.paidAmount > 0 ? fmtNT(r.paidAmount) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CFG[r.status].cls}`}>
                      {STATUS_CFG[r.status].label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => setEditRec(r)} className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded text-xs">✎</button>
                      <button onClick={() => deleteRecord(r.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-xs text-gray-400">無資料，請調整篩選條件或新增成本記錄</td></tr>
              )}
            </tbody>
            {displayed.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50">
                  <td colSpan={5} className="py-2.5 px-3 text-xs font-bold text-blue-800 rounded-l-lg">合計</td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-blue-800">
                    {fmtNT(displayed.reduce((s, r) => s + r.amount, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-bold text-blue-800">
                    {fmtNT(displayed.reduce((s, r) => s + r.paidAmount, 0))}
                  </td>
                  <td colSpan={2} className="rounded-r-lg" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── 未收款 / 未付款提醒 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 未收款 */}
        <div className="bg-white rounded-xl border border-red-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="text-sm font-bold text-red-700">未收款提醒</h3>
            <span className="ml-auto text-sm font-bold text-red-600">{fmtNT(unpaidTotal)}</span>
          </div>
          <div className="space-y-2">
            {unpaidInvs.length === 0
              ? <p className="text-xs text-gray-400 py-3 text-center">無未收款項 ✓</p>
              : unpaidInvs.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{inv.client}</p>
                    <p className="text-[10px] text-gray-400">到期：{inv.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-800">{fmtNT(inv.amount)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${inv.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {inv.status === 'overdue' ? '已逾期' : '待付款'}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
          {overdueInvs.length > 0 && (
            <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700"><strong>{overdueInvs.length} 筆</strong>發票已逾期，請盡速催款</p>
            </div>
          )}
        </div>

        {/* 未付款 */}
        <div className="bg-white rounded-xl border border-orange-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-orange-500" />
            <h3 className="text-sm font-bold text-orange-700">未付款提醒</h3>
            <span className="ml-auto text-sm font-bold text-orange-600">{fmtNT(unpaidCostTotal)}</span>
          </div>
          <div className="space-y-2">
            {unpaidCosts.length === 0
              ? <p className="text-xs text-gray-400 py-3 text-center">無未付成本 ✓</p>
              : unpaidCosts.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{r.description}</p>
                    <p className="text-[10px] text-gray-400">{r.vendor?.name ?? '—'} · {r.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-800">{fmtNT(r.amount - r.paidAmount)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_CFG[r.status].cls}`}>
                      {STATUS_CFG[r.status].label}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {(editRec || showNewRec) && (
        <CostRecordModal
          rec={editRec ?? { id:`REC-${Date.now()}`, date: new Date().toISOString().split('T')[0], categoryId: cats[0]?.id ?? null, vendorId: null, description: '', amount: 0, paidAmount: 0, status: 'unpaid', costType: 'variable', isRecurring: 0, recurringPeriod: '', month, notes: '' }}
          cats={cats} vendors={vendors}
          onSave={async r => { await saveRecord(r); setEditRec(null); setShowNewRec(false) }}
          onClose={() => { setEditRec(null); setShowNewRec(false) }}
        />
      )}
      {editProd && (
        <ProdModal prod={editProd}
          onSave={async p => { await saveProd(p); setEditProd(null) }}
          onClose={() => setEditProd(null)} />
      )}
      {editChan && (
        <ChanModal chan={editChan}
          onSave={async c => { await saveChan(c); setEditChan(null) }}
          onClose={() => setEditChan(null)} />
      )}
    </div>
  )
}

// ─── Cost Record Modal ────────────────────────────────────────────────────────
function CostRecordModal({ rec, cats, vendors, onSave, onClose }:
  { rec: CostRecord; cats: CostCategory[]; vendors: Vendor[]; onSave: (r: CostRecord) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<CostRecord>(rec)
  const set = (k: keyof CostRecord, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={rec.id.startsWith('REC-') && !rec.description ? '新增成本記錄' : '編輯成本記錄'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className="text-xs text-gray-500 mb-1 block">描述 *</span>
          <input value={form.description} onChange={e => set('description', e.target.value)} className={INPUT} placeholder="成本描述…" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">日期</span>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">月份</span>
          <input type="month" value={form.month} onChange={e => set('month', e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">成本類別</span>
          <select value={form.categoryId ?? ''} onChange={e => set('categoryId', e.target.value || null)} className={INPUT}>
            <option value="">-- 選擇類別 --</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type === 'variable' ? '變動' : '固定'})</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">廠商</span>
          <select value={form.vendorId ?? ''} onChange={e => set('vendorId', e.target.value || null)} className={INPUT}>
            <option value="">-- 選擇廠商 --</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">金額 (NT$)</span>
          <input type="number" value={form.amount} onChange={e => set('amount', parseFloat(e.target.value) || 0)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">已付金額 (NT$)</span>
          <input type="number" value={form.paidAmount} onChange={e => set('paidAmount', parseFloat(e.target.value) || 0)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">付款狀態</span>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={INPUT}>
            {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">成本性質</span>
          <select value={form.costType} onChange={e => set('costType', e.target.value)} className={INPUT}>
            <option value="variable">變動成本</option>
            <option value="fixed">固定成本</option>
          </select>
        </label>
        <label className="col-span-2 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isRecurring === 1} onChange={e => set('isRecurring', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-blue-600" />
          <span className="text-xs text-gray-600">定期費用（Recurring）</span>
          {form.isRecurring === 1 && (
            <select value={form.recurringPeriod} onChange={e => set('recurringPeriod', e.target.value)} className="ml-2 text-xs border border-gray-200 rounded px-2 py-1">
              <option value="monthly">每月</option>
              <option value="quarterly">每季</option>
              <option value="yearly">每年</option>
            </select>
          )}
        </label>
        <label className="col-span-2 block">
          <span className="text-xs text-gray-500 mb-1 block">備註</span>
          <input value={form.notes} onChange={e => set('notes', e.target.value)} className={INPUT} placeholder="備註說明…" />
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">儲存</button>
      </div>
    </Modal>
  )
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProdModal({ prod, onSave, onClose }:
  { prod: ProductCost; onSave: (p: ProductCost) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<ProductCost>(prod)
  const set = (k: keyof ProductCost, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const nf = (k: keyof ProductCost) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, parseFloat(e.target.value) || 0)

  return (
    <Modal title="商品毛利" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block"><span className="text-xs text-gray-500 mb-1 block">商品名稱 *</span>
          <input value={form.productName} onChange={e => set('productName', e.target.value)} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">通路</span>
          <input value={form.channel} onChange={e => set('channel', e.target.value)} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">訂單數</span>
          <input type="number" value={form.orders} onChange={e => set('orders', parseInt(e.target.value) || 0)} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">營收 (NT$)</span>
          <input type="number" value={form.revenue} onChange={nf('revenue')} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">商品成本 (NT$)</span>
          <input type="number" value={form.cogs} onChange={nf('cogs')} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">廣告費用 (NT$)</span>
          <input type="number" value={form.adSpend} onChange={nf('adSpend')} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">其他成本 (NT$)</span>
          <input type="number" value={form.otherCosts} onChange={nf('otherCosts')} className={INPUT} /></label>
      </div>
      <div className="mt-3 bg-emerald-50 rounded-lg px-3 py-2 text-xs text-emerald-700">
        毛利：{fmtNT(form.revenue - form.cogs - form.adSpend - form.otherCosts)} ·
        毛利率：{form.revenue > 0 ? fmtPct((form.revenue - form.cogs - form.adSpend - form.otherCosts) / form.revenue * 100) : '—'}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">儲存</button>
      </div>
    </Modal>
  )
}

// ─── Channel Modal ────────────────────────────────────────────────────────────
function ChanModal({ chan, onSave, onClose }:
  { chan: SalesChannel; onSave: (c: SalesChannel) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<SalesChannel>(chan)
  const set = (k: keyof SalesChannel, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const nf = (k: keyof SalesChannel) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, parseFloat(e.target.value) || 0)

  return (
    <Modal title="通路毛利" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">通路名稱 *</span>
          <input value={form.name} onChange={e => set('name', e.target.value)} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">平台</span>
          <input value={form.platform} onChange={e => set('platform', e.target.value)} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">營收 (NT$)</span>
          <input type="number" value={form.revenue} onChange={nf('revenue')} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">商品成本 (NT$)</span>
          <input type="number" value={form.cogs} onChange={nf('cogs')} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">廣告費用 (NT$)</span>
          <input type="number" value={form.adSpend} onChange={nf('adSpend')} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">平台抽成比例 (%)</span>
          <input type="number" value={form.commission * 100} onChange={e => set('commission', (parseFloat(e.target.value) || 0) / 100)} className={INPUT} /></label>
        <label className="block"><span className="text-xs text-gray-500 mb-1 block">訂單數</span>
          <input type="number" value={form.orders} onChange={e => set('orders', parseInt(e.target.value) || 0)} className={INPUT} /></label>
      </div>
      <div className="mt-3 bg-purple-50 rounded-lg px-3 py-2 text-xs text-purple-700">
        毛利：{fmtNT(form.revenue - form.cogs - form.adSpend - form.revenue * form.commission)} ·
        毛利率：{form.revenue > 0 ? fmtPct((form.revenue - form.cogs - form.adSpend - form.revenue * form.commission) / form.revenue * 100) : '—'}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">儲存</button>
      </div>
    </Modal>
  )
}

// ─── Shared Modal wrapper ─────────────────────────────────────────────────────
const INPUT = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export default BusinessReport
