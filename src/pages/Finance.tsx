import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  CheckCircle, Clock, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Filter, Plus, Trash2, Upload, Save, Download,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import EditableCell from '../components/EditableCell'
import Import1shop from '../components/Import1shop'
import { useApp } from '../context/AppContext'
import { Transaction, Invoice } from '../types'
import LoadingScreen from '../components/LoadingScreen'
import { todayCST, thisMonthCST, addDaysCST, toMonth } from '../utils/date'

const formatNT = (v: number) => `NT$ ${v.toLocaleString('zh-TW')}`
const formatNTShort = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return `${v}`
}

const TX_CATS = [
  '產品銷售','服務收入','顧問收入','廣告收入','電商收入','培訓收入',
  '系統整合','原物料採購','人事費用','租金費用','行銷費用','設備維護',
  '辦公費用','水電費用','差旅費用','保險費用','軟體費用','其他',
]
const TX_STATUS_OPTS = [
  { value: 'completed', label: '已完成' },
  { value: 'pending', label: '處理中' },
  { value: 'cancelled', label: '已取消' },
]
const TX_TYPE_OPTS = [
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
]
const INV_STATUS_OPTS = [
  { value: 'paid', label: '已付款' },
  { value: 'unpaid', label: '未付款' },
  { value: 'overdue', label: '已逾期' },
]
const TAX_RATE_OPTS = [
  { value: '0',    label: '免稅 0%' },
  { value: '0.05', label: '5%' },
]

// Helpers
const invSubtotal = (amount: number, taxRate: number) => amount / (1 + taxRate)
const invTax      = (amount: number, taxRate: number) => amount - amount / (1 + taxRate)

function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-40 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <Save size={14} />已儲存
    </div>
  )
}

const Finance: React.FC = () => {
  const { state, saveTransaction, createTransaction, removeTransaction,
          saveInvoice, createInvoice, removeInvoice } = useApp()
  const { transactions, invoices, loading, error } = state
  const [tab, setTab] = useState<'overview' | 'transactions' | 'invoices' | 'cashflow'>('overview')
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [showImport, setShowImport] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set())
  const [selectedInvIds, setSelectedInvIds] = useState<Set<string>>(new Set())

  // ── P&L report period (default to current CST month) ──
  const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [reportMonth, setReportMonth]   = useState(() => thisMonthCST())
  const [reportYear, setReportYear]     = useState(() => parseInt(thisMonthCST().substring(0, 4), 10))
  const [reportQ, setReportQ]           = useState(() => {
    const m = parseInt(thisMonthCST().substring(5, 7), 10)
    return `Q${Math.ceil(m / 3)}`
  })

  // ── Invoice tax month filter ──
  const [invTaxMonth, setInvTaxMonth] = useState(() => thisMonthCST())

  // Auto-update defaults when data loads (pick latest month with data)
  useEffect(() => {
    if (transactions.length > 0) {
      const months = transactions
        .filter(t => t.status !== 'cancelled')
        .map(t => t.date.substring(0, 7))
        .sort()
      const latest = months[months.length - 1]
      if (latest && latest > thisMonthCST()) {
        setReportMonth(latest)
        setReportYear(parseInt(latest.substring(0, 4), 10))
        const m = parseInt(latest.substring(5, 7), 10)
        setReportQ(`Q${Math.ceil(m / 3)}`)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length])

  useEffect(() => {
    if (invoices.length > 0) {
      const months = invoices
        .map(i => i.taxMonth || toMonth(i.date))
        .sort()
      const latest = months[months.length - 1]
      if (latest) setInvTaxMonth(latest)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices.length])

  const flash = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }, [])

  const completedTx = transactions.filter(t => t.status !== 'cancelled')
  const totalIncome  = completedTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = completedTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

  // Invoice filtered by selected tax month
  const taxMonthInvoices = invoices.filter(i => (i.taxMonth || toMonth(i.date)) === invTaxMonth)
  const paidInv    = taxMonthInvoices.filter(i => i.status === 'paid')
  const unpaidInv  = taxMonthInvoices.filter(i => i.status === 'unpaid')
  const overdueInv = taxMonthInvoices.filter(i => i.status === 'overdue')
  const receivable = [...unpaidInv, ...overdueInv].reduce((s, i) => s + i.amount, 0)
  const filteredTx = txFilter === 'all' ? transactions : transactions.filter(t => t.type === txFilter)

  // Available tax months derived from invoices
  const availableTaxMonths = useMemo(() => {
    const months = new Set(invoices.map(i => i.taxMonth || toMonth(i.date)))
    return Array.from(months).sort().reverse()
  }, [invoices])

  // ── Real monthly data aggregated from transactions ──
  const realMonthlyData = useMemo(() => {
    const byMonth: Record<string, { income: number; expense: number }> = {}
    completedTx.forEach(tx => {
      const m = tx.date.substring(0, 7)
      if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 }
      if (tx.type === 'income') byMonth[m].income += tx.amount
      else byMonth[m].expense += tx.amount
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([m, d]) => ({
        month: m.replace(/^\d{4}-0?(\d+)$/, (_, n) => `${n}月`),
        income: Math.round(d.income),
        expense: Math.round(d.expense),
        cashflow: Math.round(d.income - d.expense),
      }))
  }, [completedTx])

  // ── Quarterly cashflow from real transactions ──
  const quarterlyData = useMemo(() => {
    const qs: Record<string, { income: number; expense: number }> = { Q1: {income:0,expense:0}, Q2: {income:0,expense:0}, Q3: {income:0,expense:0}, Q4: {income:0,expense:0} }
    completedTx.forEach(tx => {
      const mo = parseInt(tx.date.substring(5, 7), 10)
      const q = mo <= 3 ? 'Q1' : mo <= 6 ? 'Q2' : mo <= 9 ? 'Q3' : 'Q4'
      if (tx.type === 'income') qs[q].income += tx.amount
      else qs[q].expense += tx.amount
    })
    return qs
  }, [completedTx])

  // ── Invoice tax summary (by selected taxMonth) ──
  const invTaxSummary = useMemo(() => {
    const rate = (inv: { amount: number; taxRate?: number }) => inv.taxRate ?? 0.05
    return {
      totalTax:      taxMonthInvoices.reduce((s, i) => s + invTax(i.amount, rate(i)), 0),
      paidTax:       paidInv.reduce((s, i)          => s + invTax(i.amount, rate(i)), 0),
      pendingTax:    [...unpaidInv, ...overdueInv].reduce((s, i) => s + invTax(i.amount, rate(i)), 0),
      totalSubtotal: taxMonthInvoices.reduce((s, i) => s + invSubtotal(i.amount, rate(i)), 0),
    }
  }, [taxMonthInvoices, paidInv, unpaidInv, overdueInv])

  // ── P&L period-filtered data ──
  const reportTx = useMemo(() => {
    return completedTx.filter(tx => {
      const d = tx.date
      if (reportPeriod === 'month') return d.startsWith(reportMonth)
      if (reportPeriod === 'quarter') {
        const y = parseInt(d.slice(0, 4)); const m = parseInt(d.slice(5, 7))
        return y === reportYear && `Q${Math.ceil(m / 3)}` === reportQ
      }
      return d.startsWith(String(reportYear))
    })
  }, [completedTx, reportPeriod, reportMonth, reportYear, reportQ])

  const reportCosts = useMemo(() => {
    const { costItems } = state
    return costItems.filter(c => {
      if (reportPeriod === 'month') return c.month === reportMonth
      if (reportPeriod === 'quarter') {
        const [y, m] = c.month.split('-').map(Number)
        return y === reportYear && `Q${Math.ceil(m / 3)}` === reportQ
      }
      return c.month.startsWith(String(reportYear))
    })
  }, [state, reportPeriod, reportMonth, reportYear, reportQ])

  const revenue = useMemo(() =>
    reportTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  , [reportTx])

  const variableGroups = useMemo(() => {
    const groups: Record<string, number> = {}
    reportCosts.filter(c => (c.costType ?? 'fixed') === 'variable').forEach(c => {
      groups[c.category] = (groups[c.category] ?? 0) + c.actual
    })
    return groups
  }, [reportCosts])

  const fixedGroups = useMemo(() => {
    const groups: Record<string, number> = {}
    reportCosts.filter(c => (c.costType ?? 'fixed') === 'fixed').forEach(c => {
      groups[c.category] = (groups[c.category] ?? 0) + c.actual
    })
    return groups
  }, [reportCosts])

  const totalVariable = Object.values(variableGroups).reduce((a, b) => a + b, 0)
  const totalFixed    = Object.values(fixedGroups).reduce((a, b) => a + b, 0)
  const grossProfit   = revenue - totalVariable
  const netProfit     = grossProfit - totalFixed
  const grossMargin   = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const netMargin     = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const periodLabel = reportPeriod === 'month' ? reportMonth
    : reportPeriod === 'quarter' ? `${reportYear} ${reportQ}`
    : `${reportYear}年`

  const exportPnL = () => {
    const pct = (n: number) => revenue > 0 ? `${((n / revenue) * 100).toFixed(1)}%` : '-'
    const fmt = (n: number) => Math.round(n).toLocaleString('zh-TW')
    const rows: string[][] = [
      ['損益報表', periodLabel, ''],
      ['項目', '金額 (NT$)', '佔營收比'],
      ['總營收', fmt(revenue), '100%'],
      ['(-) 變動成本', fmt(totalVariable), pct(totalVariable)],
      ...Object.entries(variableGroups).map(([k, v]) => [`  ${k}`, fmt(v), pct(v)]),
      ['= 毛利', fmt(grossProfit), grossMargin.toFixed(1) + '%'],
      ['(-) 固定成本', fmt(totalFixed), pct(totalFixed)],
      ...Object.entries(fixedGroups).map(([k, v]) => [`  ${k}`, fmt(v), pct(v)]),
      ['= 淨利', fmt(netProfit), netMargin.toFixed(1) + '%'],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `損益報表_${periodLabel}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <LoadingScreen />
  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center bg-red-50 border border-red-200 rounded-xl p-8 max-w-sm">
        <p className="text-red-700 font-semibold mb-2">連線失敗</p>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    </div>
  )

  const updateTx = (tx: Transaction, field: keyof Transaction, raw: string) => {
    const u = { ...tx } as Record<string, unknown>
    u[field] = field === 'amount' ? (parseFloat(raw) || 0) : raw
    saveTransaction(u as unknown as Transaction)
    flash()
  }

  const addTx = () => {
    createTransaction({
      id: `TXN-${Date.now()}`,
      date: todayCST(),
      description: '新交易記錄',
      category: '其他',
      amount: 0,
      type: 'income',
      status: 'pending',
    })
    flash()
  }

  const delTx = (id: string) => {
    if (window.confirm('確定要刪除此交易記錄？')) {
      removeTransaction(id)
      flash()
    }
  }

  const updateInv = (inv: Invoice, field: keyof Invoice, raw: string) => {
    const u = { ...inv } as Record<string, unknown>
    u[field] = (field === 'amount' || field === 'taxRate') ? (parseFloat(raw) || 0) : raw
    saveInvoice(u as unknown as Invoice)
    flash()
  }

  const addInv = () => {
    const today = todayCST()
    createInvoice({
      id: `INV-${Date.now()}`,
      client: '新客戶',
      date: today,
      dueDate: addDaysCST(today, 30),
      amount: 0,
      taxRate: 0.05,
      taxMonth: toMonth(today),
      status: 'unpaid',
      items: [],
    })
    flash()
  }

  const delInv = (id: string) => {
    if (window.confirm('確定要刪除此發票？')) {
      removeInvoice(id)
      flash()
    }
  }

  // ── Select helpers ──
  const allTxSelected = filteredTx.length > 0 && filteredTx.every(t => selectedTxIds.has(t.id))
  const someTxSelected = filteredTx.some(t => selectedTxIds.has(t.id))
  const toggleTx = (id: string) => setSelectedTxIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAllTx = () => setSelectedTxIds(allTxSelected ? new Set() : new Set(filteredTx.map(t => t.id)))
  const delSelectedTx = () => {
    if (window.confirm(`確定要刪除選取的 ${selectedTxIds.size} 筆交易記錄？`)) {
      selectedTxIds.forEach(id => removeTransaction(id))
      setSelectedTxIds(new Set())
      flash()
    }
  }

  const allInvSelected = taxMonthInvoices.length > 0 && taxMonthInvoices.every(i => selectedInvIds.has(i.id))
  const someInvSelected = taxMonthInvoices.some(i => selectedInvIds.has(i.id))
  const toggleInv = (id: string) => setSelectedInvIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAllInv = () => setSelectedInvIds(allInvSelected ? new Set() : new Set(taxMonthInvoices.map(i => i.id)))
  const delSelectedInv = () => {
    if (window.confirm(`確定要刪除選取的 ${selectedInvIds.size} 張發票？`)) {
      selectedInvIds.forEach(id => removeInvoice(id))
      setSelectedInvIds(new Set())
      flash()
    }
  }

  const bulkSetInvStatus = (status: Invoice['status']) => {
    invoices
      .filter(i => selectedInvIds.has(i.id))
      .forEach(i => saveInvoice({ ...i, status }))
    setSelectedInvIds(new Set())
    flash()
  }

  const txStatusCfg = {
    completed: { label: '已完成', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    pending:   { label: '處理中', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    cancelled: { label: '已取消', bg: 'bg-gray-100',  text: 'text-gray-500'   },
  }
  const invStatusCfg = {
    paid:    { label: '已付款', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    unpaid:  { label: '未付款', bg: 'bg-yellow-50',  text: 'text-yellow-700'  },
    overdue: { label: '已逾期', bg: 'bg-red-50',     text: 'text-red-700'     },
  }

  const tabs = [
    { id: 'overview',      label: '財務概覽' },
    { id: 'transactions',  label: '交易記錄' },
    { id: 'invoices',      label: '發票管理' },
    { id: 'cashflow',      label: '現金流量' },
  ] as const

  return (
    <div className="space-y-6">
      <SaveToast visible={saved} />
      {showImport && <Import1shop onClose={() => { setShowImport(false); flash() }} />}

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="本月總收入" value={formatNT(totalIncome)} change="較上月 +8.3%" changeType="positive" icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="本月總支出" value={formatNT(totalExpense)} change="較上月 +3.1%" changeType="neutral" icon={TrendingDown} iconBg="bg-orange-50" iconColor="text-orange-500" />
        <StatCard title="淨現金流" value={formatNT(net)} change={`利潤率 ${totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : 0}%`} changeType={net > 0 ? 'positive' : 'negative'} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard title="應收帳款" value={formatNT(receivable)} change={`${overdueInv.length} 筆逾期`} changeType={overdueInv.length > 0 ? 'negative' : 'positive'} icon={FileText} iconBg="bg-red-50" iconColor="text-red-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`py-4 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── 財務概覽 / 損益報表 ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Period selector + export */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(['month','quarter','year'] as const).map(p => (
                      <button key={p} onClick={() => setReportPeriod(p)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${reportPeriod === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {p === 'month' ? '月報' : p === 'quarter' ? '季報' : '年報'}
                      </button>
                    ))}
                  </div>
                  {reportPeriod === 'month' && (
                    <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  )}
                  {reportPeriod === 'quarter' && (
                    <div className="flex gap-2">
                      <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
                        {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}年</option>)}
                      </select>
                      <select value={reportQ} onChange={e => setReportQ(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
                        {['Q1','Q2','Q3','Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>
                  )}
                  {reportPeriod === 'year' && (
                    <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
                      {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}年</option>)}
                    </select>
                  )}
                </div>
                <button onClick={exportPnL}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  <Download size={14} />匯出報表 CSV
                </button>
              </div>

              {/* 4 KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs text-blue-500 font-medium mb-1">總營收</p>
                  <p className="text-2xl font-bold text-blue-800">{formatNT(Math.round(revenue))}</p>
                  <p className="text-xs text-blue-400 mt-1">{periodLabel}</p>
                </div>
                <div className={`rounded-xl p-4 border ${grossProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-xs font-medium mb-1 ${grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>毛利</p>
                  <p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>{formatNT(Math.round(grossProfit))}</p>
                  <p className={`text-xs mt-1 ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>毛利率 {grossMargin.toFixed(1)}%</p>
                </div>
                <div className={`rounded-xl p-4 border ${netProfit >= 0 ? 'bg-purple-50 border-purple-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-xs font-medium mb-1 ${netProfit >= 0 ? 'text-purple-500' : 'text-red-500'}`}>淨利</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-purple-800' : 'text-red-700'}`}>{formatNT(Math.round(netProfit))}</p>
                  <p className={`text-xs mt-1 ${netProfit >= 0 ? 'text-purple-400' : 'text-red-400'}`}>淨利率 {netMargin.toFixed(1)}%</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-xs text-orange-500 font-medium mb-1">應收帳款</p>
                  <p className="text-2xl font-bold text-orange-800">{formatNT(Math.round(receivable))}</p>
                  <p className="text-xs text-orange-400 mt-1">{overdueInv.length > 0 ? `⚠ ${overdueInv.length} 筆逾期` : '無逾期'}</p>
                </div>
              </div>

              {/* P&L breakdown */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-4">損益明細 — {periodLabel}</h4>
                <div className="space-y-0.5">
                  {/* Revenue */}
                  <div className="flex justify-between items-center py-2.5 border-b-2 border-gray-200">
                    <span className="font-bold text-gray-800 text-sm">總營收</span>
                    <div className="text-right">
                      <span className="font-bold text-blue-700">{formatNT(Math.round(revenue))}</span>
                      <span className="text-xs text-gray-400 ml-3">100%</span>
                    </div>
                  </div>

                  {/* Variable costs */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm font-semibold text-gray-600">(-) 變動成本</span>
                      <div className="text-right">
                        <span className="font-semibold text-red-600 text-sm">{formatNT(Math.round(totalVariable))}</span>
                        <span className="text-xs text-gray-400 ml-3">{revenue > 0 ? ((totalVariable/revenue)*100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                    {Object.entries(variableGroups).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between items-center py-1 pl-5 text-xs text-gray-500">
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" />
                          {cat}
                        </span>
                        <div className="text-right">
                          <span>{formatNT(Math.round(amt))}</span>
                          <span className="text-gray-400 ml-3">{revenue > 0 ? ((amt/revenue)*100).toFixed(1) : 0}%</span>
                        </div>
                      </div>
                    ))}
                    {Object.keys(variableGroups).length === 0 && (
                      <p className="text-xs text-gray-400 pl-5 py-1">此期間無變動成本記錄</p>
                    )}
                  </div>

                  {/* Gross profit */}
                  <div className={`flex justify-between items-center py-3 px-4 rounded-lg mt-2 ${grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <span className="font-bold text-gray-800">毛利</span>
                    <div className="text-right">
                      <span className={`font-bold text-lg ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatNT(Math.round(grossProfit))}</span>
                      <span className={`text-xs ml-3 font-semibold ${grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{grossMargin.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Fixed costs */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm font-semibold text-gray-600">(-) 固定成本</span>
                      <div className="text-right">
                        <span className="font-semibold text-orange-600 text-sm">{formatNT(Math.round(totalFixed))}</span>
                        <span className="text-xs text-gray-400 ml-3">{revenue > 0 ? ((totalFixed/revenue)*100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                    {Object.entries(fixedGroups).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between items-center py-1 pl-5 text-xs text-gray-500">
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-300 flex-shrink-0" />
                          {cat}
                        </span>
                        <div className="text-right">
                          <span>{formatNT(Math.round(amt))}</span>
                          <span className="text-gray-400 ml-3">{revenue > 0 ? ((amt/revenue)*100).toFixed(1) : 0}%</span>
                        </div>
                      </div>
                    ))}
                    {Object.keys(fixedGroups).length === 0 && (
                      <p className="text-xs text-gray-400 pl-5 py-1">此期間無固定成本記錄</p>
                    )}
                  </div>

                  {/* Net profit */}
                  <div className={`flex justify-between items-center py-3 px-4 rounded-lg mt-2 ${netProfit >= 0 ? 'bg-purple-50' : 'bg-red-50'}`}>
                    <span className="font-bold text-gray-800">淨利</span>
                    <div className="text-right">
                      <span className={`font-bold text-xl ${netProfit >= 0 ? 'text-purple-700' : 'text-red-600'}`}>{formatNT(Math.round(netProfit))}</span>
                      <span className={`text-xs ml-3 font-semibold ${netProfit >= 0 ? 'text-purple-500' : 'text-red-500'}`}>{netMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {reportCosts.length === 0 && (
                  <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg">
                    ⚠ 此期間無成本資料，請至「成本管理」新增 {periodLabel} 的成本記錄，即可自動計算毛利與淨利
                  </div>
                )}
              </div>

              {/* Trend chart */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">近期收支走勢（依交易記錄）</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={realMonthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatNTShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatNT(v)} />
                    <Legend formatter={v => v === 'income' ? '收入' : '支出'} />
                    <Bar dataKey="income" name="income" fill="#3b82f6" radius={[3,3,0,0]} />
                    <Bar dataKey="expense" name="expense" fill="#f87171" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── 交易記錄 ── */}
          {tab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Filter size={15} className="text-gray-400" />
                <span className="text-sm text-gray-500">篩選：</span>
                {(['all','income','expense'] as const).map(f => (
                  <button key={f} onClick={() => setTxFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      txFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {f === 'all' ? '全部' : f === 'income' ? '收入' : '支出'}
                  </button>
                ))}
                <span className="text-xs text-gray-400">{filteredTx.length} 筆</span>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setShowImport(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
                    <Upload size={13} />1shop 匯入
                  </button>
                  <button onClick={addTx}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                    <Plus size={13} />新增交易
                  </button>
                </div>
              </div>
              {someTxSelected && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <span className="text-xs font-medium text-blue-700">已選取 {selectedTxIds.size} 筆</span>
                  <button onClick={delSelectedTx}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors ml-auto">
                    <Trash2 size={12} />刪除選取
                  </button>
                  <button onClick={() => setSelectedTxIds(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                </div>
              )}
              <p className="text-xs text-blue-500">💡 點擊任意欄位可直接編輯，按 Enter 或點擊外部儲存</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-3 px-3 rounded-l-lg">
                        <input type="checkbox" checked={allTxSelected} onChange={toggleAllTx}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">編號</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">日期</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">描述</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">類別</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500">金額</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500">類型</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500">狀態</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 rounded-r-lg">刪除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map(tx => {
                      const sc = txStatusCfg[tx.status]
                      const isSelected = selectedTxIds.has(tx.id)
                      const isSynced = tx.id.startsWith('CAM-SYNC-') || tx.id.startsWith('COST-SYNC-')
                      return (
                        <tr key={tx.id} className={`group border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/20'}`}>
                          <td className="py-2 px-3">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleTx(tx.id)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-400 font-mono">
                            {isSynced ? (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" title={tx.id.startsWith('CAM-') ? '廣告關聯' : '成本關聯'} />
                                {tx.id}
                              </span>
                            ) : tx.id}
                          </td>
                          <td className="py-2 px-3">
                            <EditableCell value={tx.date} type="date" onSave={v => updateTx(tx, 'date', v)} />
                          </td>
                          <td className="py-2 px-3 min-w-44">
                            <EditableCell value={tx.description} onSave={v => updateTx(tx, 'description', v)} className="font-medium text-gray-700" />
                          </td>
                          <td className="py-2 px-3">
                            <EditableCell
                              value={tx.category}
                              type="select"
                              options={TX_CATS.map(c => ({ value: c, label: c }))}
                              onSave={v => updateTx(tx, 'category', v)}
                              displayValue={<span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{tx.category}</span>}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <EditableCell
                              value={tx.amount}
                              type="number"
                              onSave={v => updateTx(tx, 'amount', v)}
                              displayValue={
                                <span className={`flex items-center justify-end gap-1 font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {tx.type === 'income' ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
                                  NT$ {tx.amount.toLocaleString('zh-TW')}
                                </span>
                              }
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <EditableCell
                              value={tx.type}
                              type="select"
                              options={TX_TYPE_OPTS}
                              onSave={v => updateTx(tx, 'type', v)}
                              displayValue={
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                  {tx.type === 'income' ? '收入' : '支出'}
                                </span>
                              }
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <EditableCell
                              value={tx.status}
                              type="select"
                              options={TX_STATUS_OPTS}
                              onSave={v => updateTx(tx, 'status', v)}
                              displayValue={<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>}
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button onClick={() => delTx(tx.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition-all">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 發票管理 ── */}
          {tab === 'invoices' && (
            <div className="space-y-4">
              {/* Tax month selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500">報稅月份</span>
                <select
                  value={invTaxMonth}
                  onChange={e => setInvTaxMonth(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {availableTaxMonths.length === 0 && (
                    <option value={invTaxMonth}>{invTaxMonth}</option>
                  )}
                  {availableTaxMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">
                  共 {taxMonthInvoices.length} 張發票
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-2">
                {[
                  { label: '已付款', list: paidInv,    icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: '待付款', list: unpaidInv,  icon: Clock,          color: 'text-yellow-600',  bg: 'bg-yellow-50'  },
                  { label: '已逾期', list: overdueInv, icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50'     },
                ].map((item, i) => {
                  const total = item.list.reduce((s, x) => s + x.amount, 0)
                  const tax   = item.list.reduce((s, x) => s + invTax(x.amount, x.taxRate ?? 0.05), 0)
                  return (
                    <div key={i} className={`${item.bg} rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon size={16} className={item.color} />
                        <span className={`text-sm font-semibold ${item.color}`}>{item.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-800">{item.list.length}</p>
                      <p className="text-xs text-gray-500 mt-1">含稅 {formatNT(Math.round(total))}</p>
                      <p className="text-xs text-orange-500 mt-0.5">稅金 {formatNT(Math.round(tax))}</p>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-blue-500">💡 點擊任意欄位可直接編輯</p>
                <button onClick={addInv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                  <Plus size={13} />新增發票
                </button>
              </div>
              {someInvSelected && (
                <div className="flex items-center gap-2 flex-wrap bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                  <span className="text-xs font-semibold text-blue-700 mr-1">
                    已選取 {selectedInvIds.size} 張
                  </span>
                  <button onClick={() => bulkSetInvStatus('paid')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors">
                    <CheckCircle size={12} />標記已付款
                  </button>
                  <button onClick={() => bulkSetInvStatus('unpaid')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-white rounded-lg text-xs font-medium hover:bg-yellow-500 transition-colors">
                    <Clock size={12} />標記未付款
                  </button>
                  <button onClick={() => bulkSetInvStatus('overdue')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-400 text-white rounded-lg text-xs font-medium hover:bg-red-500 transition-colors">
                    <AlertTriangle size={12} />標記已逾期
                  </button>
                  <div className="flex-1" />
                  <button onClick={delSelectedInv}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors">
                    <Trash2 size={12} />刪除
                  </button>
                  <button onClick={() => setSelectedInvIds(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600">取消</button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-3 px-3 rounded-l-lg">
                        <input type="checkbox" checked={allInvSelected} onChange={toggleAllInv}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">發票編號</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">客戶名稱</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">開立日期</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-orange-600">報稅月份</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500">到期日</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500">稅率</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500">稅前金額</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 text-orange-600">稅金</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500">含稅合計</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500">狀態</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 rounded-r-lg">刪除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxMonthInvoices.map(inv => {
                      const sc        = invStatusCfg[inv.status]
                      const isSelected = selectedInvIds.has(inv.id)
                      const rate      = inv.taxRate ?? 0.05
                      const subtotal  = invSubtotal(inv.amount, rate)
                      const taxAmount = invTax(inv.amount, rate)
                      return (
                            <tr key={inv.id} className={`group border-b border-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/20'}`}>
                              <td className="py-2 px-3">
                                <input type="checkbox" checked={isSelected} onChange={() => toggleInv(inv.id)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-400 font-mono">{inv.id}</td>
                              <td className="py-2 px-3 min-w-36">
                                <EditableCell value={inv.client} onSave={v => updateInv(inv, 'client', v)} className="font-medium text-gray-700" />
                              </td>
                              <td className="py-2 px-3">
                                <EditableCell value={inv.date} type="date" onSave={v => updateInv(inv, 'date', v)} />
                              </td>
                              <td className="py-2 px-3">
                                <EditableCell value={inv.taxMonth || toMonth(inv.date)} type="month"
                                  onSave={v => updateInv(inv, 'taxMonth', v)}
                                  displayValue={<span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">{inv.taxMonth || toMonth(inv.date)}</span>} />
                              </td>
                              <td className="py-2 px-3">
                                <EditableCell value={inv.dueDate} type="date" onSave={v => updateInv(inv, 'dueDate', v)}
                                  className={inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-500'} />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <EditableCell
                                  value={String(rate)}
                                  type="select"
                                  options={TAX_RATE_OPTS}
                                  onSave={v => updateInv(inv, 'taxRate', v)}
                                  displayValue={<span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">{(rate * 100).toFixed(0)}%</span>}
                                />
                              </td>
                              <td className="py-2 px-3 text-right text-xs text-gray-500">
                                NT$ {Math.round(subtotal).toLocaleString('zh-TW')}
                              </td>
                              <td className="py-2 px-3 text-right text-xs text-orange-600 font-medium">
                                NT$ {Math.round(taxAmount).toLocaleString('zh-TW')}
                              </td>
                              <td className="py-2 px-3">
                                <EditableCell value={inv.amount} type="number" onSave={v => updateInv(inv, 'amount', v)}
                                  className="font-semibold text-gray-700 text-right" displayValue={formatNT(inv.amount)} />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <EditableCell
                                  value={inv.status}
                                  type="select"
                                  options={INV_STATUS_OPTS}
                                  onSave={v => updateInv(inv, 'status', v)}
                                  displayValue={<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>}
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button onClick={() => delInv(inv.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition-all">
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 現金流量 ── */}
          {tab === 'cashflow' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: '營業現金流入（收入）',  amount: totalIncome,              pos: true  },
                  { label: '營業現金流出（支出）',  amount: -totalExpense,            pos: false },
                  { label: '淨現金流',              amount: net,                      pos: net >= 0 },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">{item.label}</p>
                    <p className={`text-xl font-bold ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {item.amount >= 0 ? '+' : ''}NT$ {Math.abs(Math.round(item.amount)).toLocaleString('zh-TW')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">基於實際交易記錄</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">月度現金流量走勢（實際）</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={realMonthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatNTShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatNT(v)} />
                    <Legend formatter={v => v === 'income' ? '收入' : v === 'expense' ? '支出' : '淨現金流'} />
                    <Line type="monotone" dataKey="income"   name="income"   stroke="#3b82f6" strokeWidth={2}   dot={false} />
                    <Line type="monotone" dataKey="expense"  name="expense"  stroke="#f87171" strokeWidth={2}   dot={false} />
                    <Line type="monotone" dataKey="cashflow" name="cashflow" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">季度現金流量彙整（依交易計算）</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 rounded-l-lg">項目</th>
                        {(['Q1','Q2','Q3','Q4'] as const).map(q => (
                          <th key={q} className="text-right py-3 px-4 text-xs font-semibold text-gray-500">{q}</th>
                        ))}
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 rounded-r-lg">全年合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: '收入',         getValue: (q: string) => quarterlyData[q]?.income ?? 0,                          header: false },
                        { label: '支出',         getValue: (q: string) => -(quarterlyData[q]?.expense ?? 0),                       header: false },
                        { label: '淨現金流',     getValue: (q: string) => (quarterlyData[q]?.income ?? 0) - (quarterlyData[q]?.expense ?? 0), header: true  },
                        { label: '發票稅金(應收)', getValue: (_q: string) => invTaxSummary.pendingTax / 4,                        header: false },
                        { label: '稅後淨利估算', getValue: (q: string) => (quarterlyData[q]?.income ?? 0) - (quarterlyData[q]?.expense ?? 0) - invTaxSummary.totalTax / 4, header: true },
                      ].map((row, i) => {
                        const vals = (['Q1','Q2','Q3','Q4'] as const).map(q => Math.round(row.getValue(q)))
                        const total = vals.reduce((a, b) => a + b, 0)
                        return (
                          <tr key={i} className={`border-b border-gray-50 ${row.header ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
                            <td className={`py-2.5 px-4 ${row.header ? 'text-blue-800' : 'text-gray-600'}`}>{row.label}</td>
                            {vals.map((v, vi) => (
                              <td key={vi} className={`py-2.5 px-4 text-right ${v < 0 ? 'text-red-500' : row.header ? 'text-blue-700' : 'text-gray-700'}`}>
                                {v === 0 ? '—' : `${v < 0 ? '-' : ''}NT$ ${Math.abs(v).toLocaleString('zh-TW')}`}
                              </td>
                            ))}
                            <td className={`py-2.5 px-4 text-right font-bold ${total < 0 ? 'text-red-600' : row.header ? 'text-blue-800' : 'text-gray-800'}`}>
                              {total === 0 ? '—' : `${total < 0 ? '-' : ''}NT$ ${Math.abs(total).toLocaleString('zh-TW')}`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">* 季度稅金為估算值（年度稅金 ÷ 4）；實際稅金依發票開立狀態計算</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Finance
