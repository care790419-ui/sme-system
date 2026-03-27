import React, { useState, useEffect } from 'react'
import { Building2, AlertTriangle, RefreshCw, Trash2, CheckCircle2, Lock } from 'lucide-react'

const Settings: React.FC = () => {
  const [companyName, setCompanyName]   = useState('')
  const [demoMode, setDemoMode]         = useState(false)
  const [saved, setSaved]               = useState(false)
  const [busy, setBusy]                 = useState(false)
  const [confirm, setConfirm]           = useState<'reset' | 'clear' | null>(null)
  const [newPwd, setNewPwd]             = useState('')
  const [confirmPwd, setConfirmPwd]     = useState('')
  const [pwdSaved, setPwdSaved]         = useState(false)
  const [pwdError, setPwdError]         = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setCompanyName(s.company_name ?? '我的公司')
      setDemoMode(s.demo_mode === 'true')
    })
  }, [])

  const save = async () => {
    await Promise.all([
      fetch('/api/settings/company_name', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: companyName }) }),
      fetch('/api/settings/demo_mode',    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: String(demoMode) }) }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const resetDemo = async () => {
    setBusy(true)
    await fetch('/api/settings/reset-demo', { method: 'POST' })
    setDemoMode(true)
    setBusy(false)
    setConfirm(null)
    window.location.reload()
  }

  const savePwd = async () => {
    if (!newPwd) { setPwdError('請輸入新密碼'); return }
    if (newPwd !== confirmPwd) { setPwdError('兩次密碼不一致'); return }
    setPwdError('')
    await fetch('/api/settings/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: newPwd }) })
    setNewPwd('')
    setConfirmPwd('')
    setPwdSaved(true)
    setTimeout(() => setPwdSaved(false), 2500)
  }

  const clearAll = async () => {
    setBusy(true)
    await fetch('/api/settings/clear-all', { method: 'POST' })
    setDemoMode(false)
    setBusy(false)
    setConfirm(null)
    window.location.reload()
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Company info */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-blue-500" />
          <h3 className="text-sm font-bold text-gray-800">公司基本資訊</h3>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">公司名稱</span>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="請輸入公司名稱" />
          </label>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-blue-500" />
          <h3 className="text-sm font-bold text-gray-800">變更系統密碼</h3>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">新密碼</span>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="輸入新密碼" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">確認新密碼</span>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="再次輸入新密碼" />
          </label>
          {pwdError && <p className="text-xs text-red-600">{pwdError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={savePwd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              {pwdSaved ? <CheckCircle2 size={15} /> : <Lock size={15} />}
              {pwdSaved ? '密碼已更新' : '更新密碼'}
            </button>
          </div>
        </div>
      </div>

      {/* Demo mode */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="text-sm font-bold text-gray-800">資料模式</h3>
        </div>

        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input type="checkbox" checked={demoMode} onChange={e => setDemoMode(e.target.checked)}
            className="w-4 h-4 accent-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-700">示範模式（Demo Mode）</p>
            <p className="text-xs text-gray-400 mt-0.5">
              開啟時系統會顯示示範資料，並在頁面顯示警示橫幅。
              關閉後系統進入正式模式，僅顯示您自行輸入的真實資料。
            </p>
          </div>
        </label>

        {demoMode && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700 mb-4">
            ⚠ 目前為示範模式，所有數字均為模擬資料，不代表真實業務狀況。
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between">
        <button onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          {saved ? <CheckCircle2 size={15} /> : null}
          {saved ? '已儲存' : '儲存設定'}
        </button>
        {saved && <p className="text-xs text-emerald-600 font-medium">設定已套用</p>}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-red-700 mb-4">危險操作</h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">重新載入示範資料</p>
              <p className="text-xs text-gray-400 mt-0.5">清除現有資料並重新填入示範資料（不可復原）</p>
            </div>
            <button onClick={() => setConfirm('reset')}
              className="flex items-center gap-2 px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-50 transition-colors self-start sm:self-auto">
              <RefreshCw size={13} />重置示範資料
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">清除所有資料</p>
              <p className="text-xs text-gray-400 mt-0.5">刪除全部交易、發票、成本、廣告資料（不可復原）</p>
            </div>
            <button onClick={() => setConfirm('clear')}
              className="flex items-center gap-2 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors self-start sm:self-auto">
              <Trash2 size={13} />清除所有資料
            </button>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">系統資訊</p>
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex justify-between"><span>版本</span><span className="font-mono">1.1.0</span></div>
          <div className="flex justify-between"><span>後端</span><span className="font-mono">Node.js + SQLite</span></div>
          <div className="flex justify-between"><span>前端</span><span className="font-mono">React + Vite + Tailwind</span></div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">確認{confirm === 'reset' ? '重置示範資料' : '清除所有資料'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">此操作無法復原</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {confirm === 'reset'
                ? '這將刪除所有現有資料，並重新載入預設示範資料。確定要繼續嗎？'
                : '這將永久刪除所有交易、發票、成本和廣告資料。確定要繼續嗎？'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                取消
              </button>
              <button onClick={confirm === 'reset' ? resetDemo : clearAll} disabled={busy}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {busy ? '處理中…' : '確認執行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
