import React, { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, AlertTriangle,
  Upload, Plus, BarChart3, ArrowRight, CheckCircle2, Circle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

const fmtNT = (v: number) => `NT$ ${Math.round(v).toLocaleString('zh-TW')}`
const fmtShort = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`

function pctChange(cur: number, prev: number) {
  if (prev === 0) return null
  const p = ((cur - prev) / prev) * 100
  return { val: p, label: `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`, positive: p >= 0 }
}

// ── Empty state setup card ──
function SetupCard({ icon: Icon, title, desc, to, onClick, done }: {
  icon: React.ElementType; title: string; desc: string
  to?: string; onClick?: () => void; done?: boolean
}) {
  const inner = (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
      done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
        {done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Icon size={18} className="text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${done ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      {!done && <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-400 mt-0.5 flex-shrink-0" />}
    </div>
  )
  if (to) return <Link to={to}>{inner}</Link>
  if (onClick) return <button onClick={onClick} className="w-full text-left">{inner}</button>
  return inner
}

const Dashboard: React.FC = () => {
  const { state } = useApp()
  const { transactions, invoices, campaigns, costItems } = state

  const [demoMode, setDemoMode]       = useState(false)
  const [companyName, setCompanyName] = useState('我的公司')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setDemoMode(s.demo_mode === 'true')
      setCompanyName(s.company_name || '我的公司')
    }).catch(() => {})
  }, [])

  // ── Compute real metrics ──
  // pending income = 尚未收到款項，不計入月收入；pending expense = 已發生成本，仍計入
  const completedTx = useMemo(() =>
    transactions.filter(t =>
      t.status !== 'cancelled' &&
      !(t.type === 'income' && t.status === 'pending')
    )
  , [transactions])

  const latestMonth = useMemo(() => {
    if (completedTx.length === 0) return null
    return completedTx.reduce((max, t) => t.date > max ? t.date.slice(0, 7) : max, '2000-01')
  }, [completedTx])

  const prevMonth = useMemo(() => {
    if (!latestMonth) return null
    const [y, m] = latestMonth.split('-').map(Number)
    const d = new Date(y, m - 2)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [latestMonth])

  const curTx  = useMemo(() => completedTx.filter(t => t.date.startsWith(latestMonth ?? '__')), [completedTx, latestMonth])
  const prevTx = useMemo(() => completedTx.filter(t => t.date.startsWith(prevMonth ?? '__')), [completedTx, prevMonth])

  const curRevenue  = curTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevRevenue = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const curExpense  = curTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const curProfit   = curRevenue - curExpense

  const unpaidInvs  = invoices.filter(i => i.status !== 'paid')
  const overdueInvs = invoices.filter(i => i.status === 'overdue')
  const unpaidTotal = unpaidInvs.reduce((s, i) => s + i.amount, 0)

  const revChg = pctChange(curRevenue, prevRevenue)

  // ── Monthly trend (last 6 months with data) ──
  const trend = useMemo(() => {
    const byMonth: Record<string, { income: number; expense: number }> = {}
    completedTx.forEach(t => {
      const m = t.date.slice(0, 7)
      if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 }
      byMonth[m][t.type === 'income' ? 'income' : 'expense'] += t.amount
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([m, d]) => ({
        month: m.replace(/^\d{4}-0?(\d+)$/, (_, n) => `${n}月`),
        收入: Math.round(d.income), 支出: Math.round(d.expense),
        利潤: Math.round(d.income - d.expense),
      }))
  }, [completedTx])

  const isEmpty = transactions.length === 0

  // ─── Setup checklist ───────────────────────────────────────────────────────
  const hasTransactions = transactions.filter(t => !t.id.startsWith('COST-SYNC') && !t.id.startsWith('CAM-SYNC')).length > 0
  const hasInvoices     = invoices.length > 0
  const hasCosts        = costItems.length > 0
  const hasCampaigns    = campaigns.length > 0

  // ─── Empty / Onboarding state ──────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[520px] py-10">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
          <TrendingUp size={30} className="text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">歡迎，{companyName}</h2>
        <p className="text-sm text-gray-500 mb-8 max-w-sm text-center">
          系統已就緒，請先建立資料開始使用，或載入示範資料快速體驗完整功能。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-3xl mb-8">
          <SetupCard icon={Upload} title="匯入訂單" desc="從1shop匯入訂單明細" to="/finance" />
          <SetupCard icon={Plus}   title="新增交易" desc="手動建立收入或支出" to="/finance" />
          <SetupCard icon={BarChart3} title="新增成本" desc="建立成本與費用記錄" to="/cost" />
          <SetupCard
            icon={TrendingUp} title="載入示範資料" desc="一鍵載入完整示範資料"
            onClick={async () => {
              await fetch('/api/settings/reset-demo', { method: 'POST' })
              window.location.reload()
            }}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 w-full max-w-sm">
          <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">快速設定清單</p>
          <div className="space-y-2.5">
            {[
              { label: '建立交易記錄',  done: hasTransactions },
              { label: '建立發票',      done: hasInvoices     },
              { label: '建立成本記錄',  done: hasCosts        },
              { label: '建立廣告活動',  done: hasCampaigns    },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {step.done
                  ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  : <Circle size={16} className="text-gray-200 flex-shrink-0" />}
                <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{step.label}</span>
              </div>
            ))}
          </div>
          <Link to="/settings" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium">
            前往系統設定 <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    )
  }

  // ─── Real data Dashboard ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Demo banner */}
      {demoMode && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <p className="text-xs text-amber-700 font-medium">
            ⚠ 目前顯示的是<strong>示範資料</strong>，非真實業務數據。前往設定可切換為正式模式。
          </p>
          <Link to="/settings" className="text-xs text-amber-700 underline font-medium flex-shrink-0 ml-4">前往設定</Link>
        </div>
      )}

      {/* Period label */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">最新資料期間</p>
          <p className="text-sm font-bold text-gray-700">{latestMonth?.replace('-', '年')}月</p>
        </div>
        <Link to="/report" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
          查看完整損益報表 <ArrowRight size={13} />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">本月營收</p>
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={14} className="text-blue-500" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmtNT(curRevenue)}</p>
          {revChg && (
            <p className={`text-xs mt-1 font-medium ${revChg.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              {revChg.label} 較上月
            </p>
          )}
        </div>

        {/* Expense */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">本月支出</p>
            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown size={14} className="text-red-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmtNT(curExpense)}</p>
          <p className="text-xs mt-1 text-gray-400">含成本與廣告</p>
        </div>

        {/* Profit */}
        <div className={`rounded-xl border p-4 shadow-sm ${curProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-start justify-between mb-2">
            <p className={`text-xs font-medium ${curProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>本月淨利</p>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${curProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <DollarSign size={14} className={curProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} />
            </div>
          </div>
          <p className={`text-xl font-bold ${curProfit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>{fmtNT(curProfit)}</p>
          <p className={`text-xs mt-1 font-medium ${curProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {curRevenue > 0 ? `${((curProfit / curRevenue) * 100).toFixed(1)}% 利潤率` : '—'}
          </p>
        </div>

        {/* AR */}
        <div className={`rounded-xl border p-4 shadow-sm ${overdueInvs.length > 0 ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
          <div className="flex items-start justify-between mb-2">
            <p className={`text-xs font-medium ${overdueInvs.length > 0 ? 'text-red-600' : 'text-orange-600'}`}>應收帳款</p>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${overdueInvs.length > 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
              <Receipt size={14} className={overdueInvs.length > 0 ? 'text-red-500' : 'text-orange-500'} />
            </div>
          </div>
          <p className={`text-xl font-bold ${overdueInvs.length > 0 ? 'text-red-800' : 'text-orange-800'}`}>{fmtNT(unpaidTotal)}</p>
          <p className={`text-xs mt-1 ${overdueInvs.length > 0 ? 'text-red-500' : 'text-orange-400'}`}>
            {unpaidInvs.length} 筆未收{overdueInvs.length > 0 ? ` · ${overdueInvs.length} 筆逾期` : ''}
          </p>
        </div>
      </div>

      {/* Charts + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Trend */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">收支趨勢</h3>
              <p className="text-xs text-gray-400 mt-0.5">近 6 個月（實際交易記錄）</p>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              {[{c:'#3b82f6',l:'收入'},{c:'#f87171',l:'支出'},{c:'#10b981',l:'利潤'}].map(x => (
                <span key={x.l} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: x.c }} />{x.l}
                </span>
              ))}
            </div>
          </div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  {[{id:'inc',c:'#3b82f6'},{id:'exp',c:'#f87171'},{id:'pro',c:'#10b981'}].map(g => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={g.c} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={g.c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmtNT(v)} />
                <Area type="monotone" dataKey="收入" stroke="#3b82f6" strokeWidth={2} fill="url(#inc)" />
                <Area type="monotone" dataKey="支出" stroke="#f87171" strokeWidth={2} fill="url(#exp)" />
                <Area type="monotone" dataKey="利潤" stroke="#10b981" strokeWidth={2} fill="url(#pro)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-xs text-gray-400">尚無足夠資料</div>
          )}
        </div>

        {/* Alerts + Quick Links */}
        <div className="space-y-4">
          {/* Overdue alert */}
          {overdueInvs.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-500" />
                <p className="text-xs font-bold text-red-700">逾期未收款</p>
              </div>
              {overdueInvs.slice(0, 3).map(inv => (
                <div key={inv.id} className="flex justify-between items-center py-1.5 border-b border-red-100 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-red-800">{inv.client}</p>
                    <p className="text-[10px] text-red-400">到期 {inv.dueDate}</p>
                  </div>
                  <p className="text-xs font-bold text-red-700">{fmtNT(inv.amount)}</p>
                </div>
              ))}
              {overdueInvs.length > 3 && <p className="text-[10px] text-red-400 mt-1 text-center">還有 {overdueInvs.length - 3} 筆…</p>}
            </div>
          )}

          {/* Recent invoices */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-700">近期發票</p>
              <Link to="/finance" className="text-[10px] text-blue-500 hover:underline">查看全部</Link>
            </div>
            <div className="space-y-2">
              {invoices.slice(0, 5).map(inv => {
                const sc = {
                  paid:    { cls: 'bg-emerald-50 text-emerald-700', label: '已付' },
                  unpaid:  { cls: 'bg-yellow-50 text-yellow-700',   label: '待付' },
                  overdue: { cls: 'bg-red-50 text-red-700',         label: '逾期' },
                }[inv.status]
                return (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{inv.client}</p>
                      <p className="text-[10px] text-gray-400">{inv.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs font-semibold text-gray-700">{fmtNT(inv.amount)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-700 mb-3">快速操作</p>
            <div className="space-y-1">
              {[
                { label: '查看損益報表', to: '/report', color: 'text-blue-600' },
                { label: '財務管理',     to: '/finance', color: 'text-emerald-600' },
                { label: '成本管理',     to: '/cost',    color: 'text-orange-600' },
                { label: '廣告行銷',     to: '/marketing', color: 'text-purple-600' },
              ].map(l => (
                <Link key={l.to} to={l.to} className={`flex items-center justify-between py-1.5 text-xs font-medium ${l.color} hover:opacity-70`}>
                  {l.label} <ArrowRight size={12} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
