import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Bell, Search, RefreshCw, LogOut } from 'lucide-react'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/':          { title: '總覽首頁',     subtitle: '企業整體營運概況' },
  '/report':    { title: '業務損益報表', subtitle: '營收 · 毛利 · 淨利 · 通路分析' },
  '/finance':   { title: '財務管理',     subtitle: '收支記錄、發票管理與財務報表' },
  '/cost':      { title: '成本管理',     subtitle: '成本分析、預算追蹤與費用控管' },
  '/marketing': { title: '廣告行銷',     subtitle: '活動管理、廣告投放與 ROI 分析' },
  '/settings':  { title: '系統設定',     subtitle: '公司資訊、資料模式與系統管理' },
  '/import':    { title: '匯入中心',     subtitle: '訂單、成本、廣告花費批量匯入' },
}

const Layout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const pageInfo = pageTitles[location.pathname] ?? { title: location.pathname.replace('/', ''), subtitle: '' }

  const now = new Date()
  const today = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const currentYear = now.getFullYear()

  const handleLogout = () => {
    localStorage.removeItem('sme_auth')
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{pageInfo.title}</h2>
            <p className="text-sm text-gray-500">{pageInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden md:block">{today}</span>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <Search size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <RefreshCw size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={handleLogout}
              title="登出"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <LogOut size={16} />
            </button>
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">管</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-3 text-center">
          <p className="text-xs text-gray-400">
            © {currentYear} SME 企業管理系統 | 版本 1.1.0 | 資料更新時間：{now.toLocaleTimeString('zh-TW')}
          </p>
        </footer>
      </div>
    </div>
  )
}

export default Layout
