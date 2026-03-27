import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, DollarSign, BarChart3, Megaphone,
  TrendingUp, Settings, Building2, Upload, ChevronRight,
} from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  badge?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '主頁',
    items: [
      { path: '/', label: '總覽首頁', icon: LayoutDashboard },
    ],
  },
  {
    label: '銷售與財務',
    items: [
      { path: '/report',  label: '業務損益報表', icon: TrendingUp },
      { path: '/finance', label: '財務管理',     icon: DollarSign },
    ],
  },
  {
    label: '成本與毛利',
    items: [
      { path: '/cost', label: '成本管理', icon: BarChart3 },
    ],
  },
  {
    label: '廣告與行銷',
    items: [
      { path: '/marketing', label: '廣告行銷', icon: Megaphone },
    ],
  },
  {
    label: '工具與設定',
    items: [
      { path: '/import',   label: '匯入中心', icon: Upload },
      { path: '/settings', label: '系統設定', icon: Settings },
    ],
  },
]

const Sidebar: React.FC = () => {
  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ backgroundColor: '#1e3a8a' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-sm leading-tight truncate">SME 管理系統</h1>
            <p className="text-blue-300 text-xs">企業營運平台</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={16} className={isActive ? 'text-white' : 'text-blue-400 group-hover:text-white'} />
                        <span className="flex-1 text-[13px]">{item.label}</span>
                        {isActive && <ChevronRight size={12} className="text-blue-300" />}
                        {item.badge && (
                          <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-blue-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">管</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">系統管理員</p>
            <p className="text-blue-400 text-[10px] truncate">admin@sme.com.tw</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
