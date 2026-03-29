import React, { useState, useEffect } from 'react'
import { Building2, AlertTriangle, Trash2, CheckCircle2, Lock, Link2, Unlink, ChevronDown } from 'lucide-react'
import { metaApi } from '../lib/metaApi'
import type { MetaAdAccount, MetaStatus } from '../types'

const Settings: React.FC = () => {
  const [companyName, setCompanyName]   = useState('')
  const [saved, setSaved]               = useState(false)
  const [busy, setBusy]                 = useState(false)
  const [confirm, setConfirm]           = useState<'clear' | null>(null)
  const [newPwd, setNewPwd]             = useState('')
  const [confirmPwd, setConfirmPwd]     = useState('')
  const [pwdSaved, setPwdSaved]         = useState(false)
  const [pwdError, setPwdError]         = useState('')

  // ── Meta API state ──
  const [metaStatus, setMetaStatus]         = useState<MetaStatus>({ connected: false })
  const [metaToken, setMetaToken]           = useState('')
  const [metaConnecting, setMetaConnecting] = useState(false)
  const [metaError, setMetaError]           = useState('')
  const [adAccounts, setAdAccounts]         = useState<MetaAdAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const loadMetaStatus = async () => {
    const s = await metaApi.status()
    setMetaStatus(s)
    if (s.connected) loadAdAccounts()
  }

  const loadAdAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const list = await metaApi.adAccounts()
      setAdAccounts(list)
    } catch { /* ignore */ }
    setLoadingAccounts(false)
  }

  const connectMeta = async () => {
    if (!metaToken.trim()) return
    setMetaConnecting(true)
    setMetaError('')
    try {
      const r = await metaApi.connect(metaToken.trim())
      if (r.ok) { setMetaToken(''); await loadMetaStatus() }
    } catch (e: unknown) {
      setMetaError(e instanceof Error ? e.message : '連線失敗')
    }
    setMetaConnecting(false)
  }

  const disconnectMeta = async () => {
    await metaApi.disconnect()
    setMetaStatus({ connected: false })
    setAdAccounts([])
  }

  const selectAdAccount = async (acc: MetaAdAccount) => {
    await metaApi.setAdAccount(acc.id, acc.name)
    setMetaStatus(s => ({ ...s, adAccountId: acc.id, adAccountName: acc.name }))
  }

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setCompanyName(s.company_name ?? '我的公司')
    })
    loadMetaStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    await fetch('/api/settings/company_name', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: companyName }) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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

      {/* Save button */}
      <div className="flex items-center justify-between">
        <button onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          {saved ? <CheckCircle2 size={15} /> : null}
          {saved ? '已儲存' : '儲存設定'}
        </button>
        {saved && <p className="text-xs text-emerald-600 font-medium">設定已套用</p>}
      </div>

      {/* Meta API */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={16} className="text-blue-500" />
          <h3 className="text-sm font-bold text-gray-800">Meta 廣告帳號串接</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">串接後可從廣告文案頁直接發布草稿廣告到 Meta Ads Manager</p>

        {metaStatus.connected ? (
          <div className="space-y-4">
            {/* Connected status */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />已連結：{metaStatus.userName}
                </p>
                {metaStatus.connectedAt && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {new Date(metaStatus.connectedAt).toLocaleString('zh-TW')} 連線
                  </p>
                )}
              </div>
              <button onClick={disconnectMeta}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 transition-colors">
                <Unlink size={12} />斷開連結
              </button>
            </div>

            {/* Ad account selector */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">廣告帳號</p>
              {loadingAccounts ? (
                <p className="text-xs text-gray-400">載入中…</p>
              ) : adAccounts.length === 0 ? (
                <p className="text-xs text-amber-600">找不到廣告帳號，請確認此 Token 有廣告管理員權限</p>
              ) : (
                <div className="relative">
                  <select
                    value={metaStatus.adAccountId ?? ''}
                    onChange={e => {
                      const acc = adAccounts.find(a => a.id === e.target.value)
                      if (acc) selectAdAccount(acc)
                    }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none"
                  >
                    <option value="">— 請選擇廣告帳號 —</option>
                    {adAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}（{a.id}）</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              )}
              {metaStatus.adAccountId && (
                <p className="text-xs text-blue-600 mt-1.5">已選：{metaStatus.adAccountName}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">如何取得 Access Token？</p>
              <p>前往 <span className="font-mono bg-blue-100 px-1 rounded">developers.facebook.com/tools/explorer</span></p>
              <p>選擇您的 App → 勾選 <span className="font-mono bg-blue-100 px-1 rounded">ads_management</span>、<span className="font-mono bg-blue-100 px-1 rounded">pages_read_engagement</span> → 產生 Token</p>
            </div>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Access Token</span>
              <input
                value={metaToken}
                onChange={e => setMetaToken(e.target.value)}
                type="password"
                placeholder="貼上 Meta User Access Token…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
              />
            </label>
            {metaError && <p className="text-xs text-red-600">{metaError}</p>}
            <button
              onClick={connectMeta}
              disabled={!metaToken.trim() || metaConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Link2 size={14} />
              {metaConnecting ? '驗證中…' : '連結 Meta 帳號'}
            </button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-red-700 mb-4">危險操作</h3>
        <div className="space-y-3">
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
                <h3 className="font-bold text-gray-800">確認清除所有資料</h3>
                <p className="text-xs text-gray-400 mt-0.5">此操作無法復原</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              這將永久刪除所有交易、發票、成本和廣告資料。確定要繼續嗎？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                取消
              </button>
              <button onClick={clearAll} disabled={busy}
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
