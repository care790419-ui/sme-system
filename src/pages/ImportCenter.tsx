import React, { useState } from 'react'
import { Upload, FileText, ShoppingCart, BarChart3, Megaphone, ArrowRight } from 'lucide-react'
import Import1shop from '../components/Import1shop'

const MODULES = [
  { id: '1shop',   icon: ShoppingCart, title: '匯入訂單（1shop）', desc: '從1shop後台匯出 CSV，自動建立財務交易與發票記錄', color: 'bg-orange-50 border-orange-100 text-orange-600' },
  { id: 'costs',   icon: BarChart3,    title: '匯入成本記錄',       desc: '批量匯入費用明細（人事、租金、原物料等）',           color: 'bg-blue-50 border-blue-100 text-blue-600',   disabled: true },
  { id: 'ads',     icon: Megaphone,    title: '匯入廣告花費',       desc: '從 Google/Facebook Ads 後台匯入廣告花費報表',      color: 'bg-purple-50 border-purple-100 text-purple-600', disabled: true },
  { id: 'invoices',icon: FileText,     title: '匯入發票記錄',       desc: '批量匯入客戶發票（支援自訂欄位對應）',              color: 'bg-emerald-50 border-emerald-100 text-emerald-600', disabled: true },
]

const ImportCenter: React.FC = () => {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800">匯入中心</h2>
        <p className="text-xs text-gray-400 mt-0.5">選擇資料來源，按照引導完成匯入</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map(m => (
          <button key={m.id} disabled={m.disabled}
            onClick={() => !m.disabled && setActive(m.id)}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all group ${m.color} ${m.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}>
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <m.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{m.title}</p>
                {m.disabled && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">即將推出</span>}
              </div>
              <p className="text-xs opacity-70 mt-0.5">{m.desc}</p>
            </div>
            {!m.disabled && <ArrowRight size={14} className="mt-0.5 opacity-50 group-hover:opacity-100" />}
          </button>
        ))}
      </div>

      {/* History placeholder */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Upload size={14} className="text-gray-400" />
          <p className="text-sm font-bold text-gray-700">匯入記錄</p>
        </div>
        <p className="text-xs text-gray-400 py-6 text-center">尚無匯入記錄</p>
      </div>

      {active === '1shop' && <Import1shop onClose={() => setActive(null)} />}
    </div>
  )
}

export default ImportCenter
