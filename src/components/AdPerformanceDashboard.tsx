import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, DollarSign, MousePointer, ShoppingCart, Eye, RefreshCw } from 'lucide-react'
import { useAdData } from '../hooks/useAdData'
import type { AdPerformance } from '../types'

const fmtNT   = (v: number) => `NT$ ${v.toLocaleString('zh-TW')}`
const fmtNum  = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}萬` : v.toLocaleString('zh-TW')

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, iconBg, iconColor, highlight = false,
}: {
  title: string; value: string; sub?: string
  icon: React.ElementType; iconBg: string; iconColor: string; highlight?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${highlight ? 'border-emerald-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{title}</p>
          <p className={`text-xl font-bold ${highlight ? 'text-emerald-600' : 'text-gray-800'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
    </div>
  )
}

// ── Performance Row ───────────────────────────────────────────────────────────

const PERF_STATUS: Record<string, { label: string; dot: string }> = {
  live:   { label: '投放中', dot: 'bg-emerald-500' },
  paused: { label: '已暫停', dot: 'bg-amber-400' },
  ended:  { label: '已結束', dot: 'bg-gray-300' },
}

function PerfRow({ perf, campaignName }: { perf: AdPerformance; campaignName: string }) {
  const st = PERF_STATUS[perf.status] ?? PERF_STATUS.paused
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
          <span className="font-medium text-gray-700 truncate max-w-[140px]">{campaignName}</span>
        </div>
        <span className="text-[10px] text-gray-400 ml-3">{st.label}</span>
      </td>
      <td className="py-3 px-3 text-xs text-right font-semibold text-gray-700">{fmtNT(perf.spend)}</td>
      <td className="py-3 px-3 text-xs text-right text-gray-500">{fmtNum(perf.impressions)}</td>
      <td className="py-3 px-3 text-xs text-right text-gray-500">{fmtNum(perf.clicks)}</td>
      <td className="py-3 px-3 text-xs text-right text-gray-500">{perf.ctr.toFixed(1)}%</td>
      <td className="py-3 px-3 text-xs text-right text-gray-500">{perf.purchases}</td>
      <td className="py-3 px-3 text-xs text-right">
        <span className={`font-bold ${perf.roas >= 3 ? 'text-emerald-600' : perf.roas >= 1 ? 'text-amber-600' : perf.roas === 0 ? 'text-gray-300' : 'text-red-500'}`}>
          {perf.roas > 0 ? `${perf.roas.toFixed(1)}x` : '—'}
        </span>
      </td>
      <td className="py-3 px-3 text-[10px] text-right text-gray-400">
        {new Date(perf.updatedAt).toLocaleDateString('zh-TW')}
      </td>
    </tr>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const AdPerformanceDashboard: React.FC = () => {
  const { campaigns, performance, totals, isMock } = useAdData()
  const [chartMetric, setChartMetric] = useState<'spend' | 'roas' | 'purchases'>('spend')

  // Build chart data: campaign name (shortened) + metrics
  const chartData = campaigns.map(c => {
    const p = performance.find(x => x.campaignId === c.id)
    return {
      name: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
      spend:     p?.spend ?? 0,
      revenue:   p ? p.spend * p.roas : 0,
      roas:      p?.roas ?? 0,
      purchases: p?.purchases ?? 0,
      ctr:       p?.ctr ?? 0,
    }
  }).filter(d => d.spend > 0 || chartMetric !== 'spend')

  const metricCfg = {
    spend:     { label: '廣告花費 vs 帶來營收', color1: '#93c5fd', color2: '#34d399' },
    roas:      { label: 'ROAS 比較', color1: '#818cf8', color2: '' },
    purchases: { label: '購買數比較', color1: '#fb923c', color2: '' },
  }

  return (
    <div className="space-y-5">
      {/* Mock banner */}
      {isMock && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700">
          <RefreshCw size={13} />
          顯示 Mock 示範成效數據 — 切換 <code className="bg-amber-100 px-1 rounded">USE_MOCK = false</code> 後將自動串接 Meta Insights API
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard title="總廣告花費"  value={fmtNT(totals.spend)}       sub={`${campaigns.length} 個活動`}
          icon={DollarSign}    iconBg="bg-blue-50"    iconColor="text-blue-600" />
        <KpiCard title="總曝光次數"  value={fmtNum(totals.impressions)} sub="impressions"
          icon={Eye}           iconBg="bg-purple-50"  iconColor="text-purple-600" />
        <KpiCard title="總點擊次數"  value={fmtNum(totals.clicks)}      sub={totals.impressions > 0 ? `CTR ${((totals.clicks/totals.impressions)*100).toFixed(1)}%` : ''}
          icon={MousePointer}  iconBg="bg-amber-50"   iconColor="text-amber-600" />
        <KpiCard title="總購買數"    value={totals.purchases.toLocaleString('zh-TW')} sub="conversions"
          icon={ShoppingCart}  iconBg="bg-orange-50"  iconColor="text-orange-600" />
        <KpiCard title="平均 ROAS"  value={`${totals.avgRoas.toFixed(1)}x`}           sub="花費回報率" highlight
          icon={TrendingUp}    iconBg="bg-emerald-50" iconColor="text-emerald-600" />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-sm font-bold text-gray-700">活動成效比較</h4>
          <div className="flex gap-1">
            {(['spend', 'roas', 'purchases'] as const).map(m => (
              <button key={m} onClick={() => setChartMetric(m)}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  chartMetric === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {m === 'spend' ? '花費 vs 營收' : m === 'roas' ? 'ROAS' : '購買數'}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-gray-400">尚無成效數據</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => chartMetric === 'spend' ? `${(v/1000).toFixed(0)}K` : String(v)} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  name === 'spend' || name === 'revenue' ? fmtNT(v) : String(v),
                  name === 'spend' ? '花費' : name === 'revenue' ? '帶來營收' : name === 'roas' ? 'ROAS' : '購買數',
                ]}
              />
              {chartMetric === 'spend' ? (
                <>
                  <Legend formatter={v => v === 'spend' ? '花費' : '帶來營收'} />
                  <Bar dataKey="spend"   name="spend"   fill={metricCfg.spend.color1}  radius={[3,3,0,0]} />
                  <Bar dataKey="revenue" name="revenue" fill={metricCfg.spend.color2}  radius={[3,3,0,0]} />
                </>
              ) : chartMetric === 'roas' ? (
                <Bar dataKey="roas"      fill={metricCfg.roas.color1}      radius={[3,3,0,0]} />
              ) : (
                <Bar dataKey="purchases" fill={metricCfg.purchases.color1} radius={[3,3,0,0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Performance table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h4 className="text-sm font-bold text-gray-700">活動成效明細</h4>
          <p className="text-xs text-gray-400 mt-0.5">updatedAt 顯示最後數據同步時間</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                {['活動名稱','花費','曝光','點擊','CTR','購買','ROAS','更新時間'].map(h => (
                  <th key={h} className="py-2 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right first:text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {performance.map(p => {
                const cam = campaigns.find(c => c.id === p.campaignId)
                return <PerfRow key={p.id} perf={p} campaignName={cam?.name ?? p.campaignId} />
              })}
            </tbody>
            <tfoot className="bg-gray-50/50 border-t border-gray-100">
              <tr>
                <td className="py-2.5 px-3 text-xs font-semibold text-gray-600">合計</td>
                <td className="py-2.5 px-3 text-xs font-bold text-gray-700 text-right">{fmtNT(totals.spend)}</td>
                <td className="py-2.5 px-3 text-xs font-semibold text-gray-600 text-right">{fmtNum(totals.impressions)}</td>
                <td className="py-2.5 px-3 text-xs font-semibold text-gray-600 text-right">{fmtNum(totals.clicks)}</td>
                <td className="py-2.5 px-3 text-xs font-semibold text-gray-600 text-right">
                  {totals.impressions > 0 ? `${((totals.clicks/totals.impressions)*100).toFixed(1)}%` : '—'}
                </td>
                <td className="py-2.5 px-3 text-xs font-semibold text-gray-600 text-right">{totals.purchases}</td>
                <td className="py-2.5 px-3 text-xs font-bold text-emerald-600 text-right">{totals.avgRoas.toFixed(1)}x</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdPerformanceDashboard
