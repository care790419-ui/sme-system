import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, X, CheckCircle, AlertTriangle, FileText,
  Download, Info, ChevronDown, ChevronRight, Package,
} from 'lucide-react'
import { Transaction, Invoice } from '../types'
import { useApp } from '../context/AppContext'
import { addDaysCST, toMonth, todayCST } from '../utils/date'

// ── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  name: string
  variant: string
  quantity: number
  unitPrice: number   // 含稅單價
  subtotal: number    // 含稅小計
}

interface ParsedOrder {
  orderId: string
  date: string
  customer: string
  phone: string
  total: number         // 訂單金額（含稅）
  paymentStatus: string
  orderStatus: string
  items: OrderItem[]
}

// ── CSV decoder (UTF-8 BOM → UTF-8 → Big5) ──────────────────────────────────
async function decodeFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  // Try UTF-8 first
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  // If no replacement char (U+FFFD) assume UTF-8 is fine
  if (!utf8.includes('\uFFFD')) return utf8.replace(/^\uFEFF/, '')
  // Fall back to Big5
  try {
    const big5 = new TextDecoder('big5', { fatal: true }).decode(buf)
    return big5.replace(/^\uFEFF/, '')
  } catch {
    return utf8.replace(/^\uFEFF/, '')
  }
}

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): ParsedOrder[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('檔案內容不足')

  const sep = lines[0].includes('\t') ? '\t' : ','

  // Parse a CSV row respecting quoted fields
  const splitRow = (line: string): string[] => {
    const result: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === sep && !inQuote) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = splitRow(lines[0])

  const findCol = (...names: string[]) => {
    for (const n of names) {
      const idx = headers.findIndex(h => h.includes(n))
      if (idx >= 0) return idx
    }
    return -1
  }

  const cols = {
    id:        findCol('訂單編號', '訂單號碼', '交易編號', '訂貨編號', '單號', 'Order ID', 'OrderId', 'Order Number', 'order_id'),
    date:      findCol('建立時間', '下單時間', '訂購日期', '訂單日期', '成立日期', '日期', 'Date'),
    customer:  findCol('買家姓名', '收件姓名', '訂購人姓名', '購買人姓名', '收件人姓名',
                       '收件人', '買家', '訂購人', '購買人', '下單人', '訂購者', '姓名', '會員', 'Customer', 'Buyer'),
    phone:     findCol('電話', '手機', '聯絡電話', 'Phone', 'Mobile'),
    orderAmt:  findCol('訂單金額', '訂單總額', '總金額', '訂單小計', '實付金額', '付款金額', 'Order Total'),
    payment:   findCol('付款狀態', '付款方式狀態', '付款', 'Payment Status'),
    status:    findCol('訂單狀態', '出貨狀態', '狀態', 'Status'),
    // item-level columns
    itemName:  findCol('商品名稱', '品名', '商品', '產品名稱', 'Product Name', 'Item'),
    variant:   findCol('規格', '款式', '選項', '商品規格', 'Variant', 'SKU', 'Option'),
    qty:       findCol('數量', '購買數量', 'Qty', 'Quantity'),
    unitPrice: findCol('商品售價', '單價', '售價', 'Unit Price', 'Price'),
    itemAmt:   findCol('商品小計', '小計', '金額', 'Subtotal', 'Line Total'),
  }

  const parseDate = (raw: string): string => {
    if (!raw) return todayCST()
    // YYYY-MM-DD or YYYY/MM/DD or YYYY-MM-DD HH:MM:SS
    const m1 = raw.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
    if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`
    // MM/DD/YYYY
    const m2 = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
    if (m2) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`
    return todayCST()
  }

  const parseNum = (raw: string): number =>
    parseFloat((raw ?? '').replace(/[^\d.]/g, '')) || 0

  // ── group rows by orderId ──
  const orderMap = new Map<string, ParsedOrder>()

  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return
    const c = splitRow(line)
    const orderId = (cols.id >= 0 ? c[cols.id] : '') || `ROW-${i + 1}`

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, {
        orderId,
        date:          parseDate(cols.date >= 0 ? c[cols.date] : ''),
        customer:      cols.customer >= 0 ? (c[cols.customer] || '未知客戶') : '未知客戶',
        phone:         cols.phone >= 0 ? (c[cols.phone] || '') : '',
        total:         cols.orderAmt >= 0 ? parseNum(c[cols.orderAmt]) : 0,
        paymentStatus: cols.payment >= 0 ? (c[cols.payment] || '') : '',
        orderStatus:   cols.status >= 0 ? (c[cols.status] || '') : '',
        items: [],
      })
    }

    const order = orderMap.get(orderId)!

    // Parse item if product name column exists and has a value
    const itemName = cols.itemName >= 0 ? (c[cols.itemName] || '').trim() : ''
    if (itemName) {
      const qty      = cols.qty >= 0       ? parseNum(c[cols.qty])       : 1
      const unitP    = cols.unitPrice >= 0 ? parseNum(c[cols.unitPrice]) : 0
      const sub      = cols.itemAmt >= 0   ? parseNum(c[cols.itemAmt])   : unitP * qty
      const variant  = cols.variant >= 0   ? (c[cols.variant] || '').trim() : ''
      order.items.push({ name: itemName, variant, quantity: qty || 1, unitPrice: unitP, subtotal: sub })
    }

    // If orderAmt column not found, derive from item subtotals
    if (cols.orderAmt < 0 && order.items.length > 0) {
      order.total = order.items.reduce((s, it) => s + it.subtotal, 0)
    }
  })

  // ── filter & finalise ──
  return Array.from(orderMap.values()).filter(o => {
    // Must have amount > 0
    if (o.total <= 0 && o.items.every(it => it.subtotal <= 0)) return false
    // If total still 0 but items have subtotals, sum them
    if (o.total <= 0) o.total = o.items.reduce((s, it) => s + it.subtotal, 0)
    return o.total > 0
  })
}

// ── Component ────────────────────────────────────────────────────────────────
const Import1shop: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { importTransactions, importInvoices } = useApp()
  const [orders, setOrders]       = useState<ParsedOrder[]>([])
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [dragging, setDragging]   = useState(false)
  const [createInv, setCreateInv] = useState(true)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    setError('')
    decodeFile(file).then(text => {
      try {
        const rows = parseCSV(text)
        if (rows.length === 0) throw new Error('無有效訂單（金額需大於 0）')
        setOrders(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : '解析失敗，請確認為1shop匯出的CSV格式')
        setOrders([])
      }
    }).catch(() => setError('讀取檔案失敗'))
  }, [])

  const handleImport = () => {
    const ts = Date.now()

    const isPaidStatus = (s: string) =>
      s.includes('已付') || s.includes('完成') || s.includes('成功') || s.includes('已收款')

    // ── Transactions (訂單收入) ──
    const txs: Transaction[] = orders.map(o => {
      const itemSummary = o.items.length > 0
        ? o.items.map(it => `${it.name}${it.variant ? `(${it.variant})` : ''}×${it.quantity}`).join('、')
        : null
      return {
        id:          `1SHOP-${o.orderId}-${ts}`,
        date:        o.date,
        description: itemSummary
          ? `[1shop] #${o.orderId} ${o.customer} — ${itemSummary}`
          : `[1shop] 訂單 #${o.orderId} — ${o.customer}`,
        category:    '電商收入',
        amount:      o.total,
        type:        'income' as const,
        status:      isPaidStatus(o.paymentStatus) ? 'completed' as const : 'pending' as const,
      }
    })
    importTransactions(txs)

    // ── Invoices ──
    if (createInv) {
      const invs: Invoice[] = orders.map(o => {
        const taxRate = 0.05
        // Build invoice items from parsed product items
        const invItems = o.items.length > 0
          ? o.items.map(it => ({
              description: it.variant ? `${it.name}（${it.variant}）` : it.name,
              quantity:    it.quantity,
              unitPrice:   Math.round(it.unitPrice / (1 + taxRate)),
              total:       Math.round(it.subtotal  / (1 + taxRate)),
            }))
          : [{
              description: `1shop 訂單 #${o.orderId}`,
              quantity:    1,
              unitPrice:   Math.round(o.total / (1 + taxRate)),
              total:       Math.round(o.total / (1 + taxRate)),
            }]
        return {
          id:            `INV-1SHOP-${o.orderId}-${ts}`,
          invoiceNumber: '',
          client:        o.customer,
          date:          o.date,
          dueDate:       addDaysCST(o.date, 30),
          amount:        o.total,
          taxRate,
          taxMonth:      toMonth(o.date),
          status:        isPaidStatus(o.paymentStatus) ? 'paid' as const : 'unpaid' as const,
          items:         invItems,
        }
      })
      importInvoices(invs)
    }

    setDone(true)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const totalAmount  = orders.reduce((s, o) => s + o.total, 0)
  const totalItems   = orders.reduce((s, o) => s + o.items.length, 0)
  const paidCount    = orders.filter(o =>
    o.paymentStatus.includes('已付') || o.paymentStatus.includes('完成') || o.paymentStatus.includes('成功')).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <Upload size={18} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">1shop 訂單匯入</h3>
              <p className="text-xs text-gray-400">解析訂單品項，自動建立收入記錄與發票</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {done ? (
            /* ── 成功畫面 ── */
            <div className="text-center py-10">
              <CheckCircle size={52} className="mx-auto text-emerald-500 mb-4" />
              <h4 className="text-lg font-bold text-gray-800 mb-2">匯入成功！</h4>
              <div className="space-y-1 text-sm text-gray-500">
                <p>已匯入 <strong>{orders.length}</strong> 筆訂單收入記錄</p>
                {totalItems > 0 && <p>共 <strong>{totalItems}</strong> 個商品品項</p>}
                {createInv && <p>已建立 <strong>{orders.length}</strong> 筆發票（含稅5%）</p>}
              </div>
              <p className="text-xl font-bold text-emerald-600 mt-3">
                NT$ {totalAmount.toLocaleString('zh-TW')}
              </p>
              <div className="flex justify-center gap-4 mt-2 text-xs text-gray-400">
                <span>已付款 {paidCount} 筆</span>
                <span>待確認 {orders.length - paidCount} 筆</span>
              </div>
              <button onClick={onClose}
                className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                完成
              </button>
            </div>
          ) : (
            <>
              {/* ── Drop zone ── */}
              {orders.length === 0 && (
                <>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                      dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                    }`}
                  >
                    <FileText size={40} className={`mx-auto mb-3 ${dragging ? 'text-blue-400' : 'text-gray-300'}`} />
                    <p className="text-sm font-medium text-gray-600">拖拉或點擊上傳 1shop 訂單 CSV</p>
                    <p className="text-xs text-gray-400 mt-1">支援 UTF-8 / Big5 編碼，自動偵測</p>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  </div>

                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-orange-600" />
                      <p className="text-xs font-semibold text-orange-700">1shop 匯出步驟</p>
                    </div>
                    <ol className="text-xs text-orange-600 space-y-0.5 list-decimal list-inside">
                      <li>登入1shop後台 → 訂單管理 → 訂單列表</li>
                      <li>選擇日期範圍 → 點擊「匯出訂單」按鈕</li>
                      <li>建議選擇「含商品明細」格式匯出</li>
                      <li>下載 CSV 後上傳至此（自動過濾零金額訂單）</li>
                    </ol>
                  </div>
                </>
              )}

              {/* ── Error ── */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* ── Preview ── */}
              {orders.length > 0 && (
                <div className="space-y-3">
                  {/* Summary bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-gray-700">
                        {orders.length} 筆訂單
                      </span>
                      {totalItems > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {totalItems} 個品項
                        </span>
                      )}
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        已付款 {paidCount} 筆
                      </span>
                      {orders.some(o => o.customer === '未知客戶') && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                          ⚠️ 部分訂購人未識別
                        </span>
                      )}
                      {orders.some(o => o.orderId.startsWith('ROW-')) && (
                        <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">
                          ⚠️ 部分訂單編號未識別
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-600">
                        NT$ {totalAmount.toLocaleString('zh-TW')}
                      </span>
                      <button onClick={() => setOrders([])}
                        className="ml-3 text-xs text-gray-400 hover:text-gray-600 underline">
                        重新上傳
                      </button>
                    </div>
                  </div>

                  {/* Orders table */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold w-6"></th>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold">訂單編號</th>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold">日期</th>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold">客戶</th>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold">品項</th>
                          <th className="py-2 px-3 text-right text-gray-500 font-semibold">金額</th>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold">狀態</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => {
                          const isExpanded = expanded.has(o.orderId)
                          const isPaid = o.paymentStatus.includes('已付') ||
                            o.paymentStatus.includes('完成') || o.paymentStatus.includes('成功')
                          return (
                            <React.Fragment key={o.orderId}>
                              <tr
                                className={`border-t border-gray-50 hover:bg-gray-50 ${o.items.length > 0 ? 'cursor-pointer' : ''}`}
                                onClick={() => o.items.length > 0 && toggleExpand(o.orderId)}
                              >
                                <td className="py-2 px-3 text-gray-400">
                                  {o.items.length > 0 && (
                                    isExpanded
                                      ? <ChevronDown size={13} />
                                      : <ChevronRight size={13} />
                                  )}
                                </td>
                                <td className="py-2 px-3 font-mono max-w-[120px] truncate" title={o.orderId}>
                                  {o.orderId.startsWith('ROW-')
                                    ? <span className="text-yellow-600">{o.orderId}</span>
                                    : <span className="text-gray-600">{o.orderId}</span>
                                  }
                                </td>
                                <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{o.date}</td>
                                <td className="py-2 px-3 max-w-[100px] truncate" title={o.customer}>
                                  {o.customer === '未知客戶'
                                    ? <span className="text-red-400 italic">{o.customer}</span>
                                    : <span className="text-gray-700 font-medium">{o.customer}</span>
                                  }
                                </td>
                                <td className="py-2 px-3">
                                  {o.items.length > 0 ? (
                                    <span className="flex items-center gap-1 text-blue-600">
                                      <Package size={11} />
                                      {o.items.length} 項
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-semibold text-emerald-600 text-right whitespace-nowrap">
                                  NT$ {o.total.toLocaleString('zh-TW')}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
                                  }`}>
                                    {o.paymentStatus || '未知'}
                                  </span>
                                </td>
                              </tr>
                              {/* Expanded items */}
                              {isExpanded && o.items.map((it, idx) => (
                                <tr key={idx} className="bg-orange-50/40 border-t border-orange-100/50">
                                  <td></td>
                                  <td colSpan={2} className="py-1 px-3 pl-6 text-gray-400">└</td>
                                  <td colSpan={2} className="py-1 px-3 text-gray-600">
                                    <span className="font-medium">{it.name}</span>
                                    {it.variant && <span className="text-gray-400 ml-1">({it.variant})</span>}
                                    <span className="text-gray-400 ml-2">× {it.quantity}</span>
                                    {it.unitPrice > 0 && (
                                      <span className="text-gray-400 ml-2">@ NT${it.unitPrice.toLocaleString('zh-TW')}</span>
                                    )}
                                  </td>
                                  <td className="py-1 px-3 text-right text-orange-600 font-medium whitespace-nowrap">
                                    {it.subtotal > 0 ? `NT$ ${it.subtotal.toLocaleString('zh-TW')}` : '—'}
                                  </td>
                                  <td></td>
                                </tr>
                              ))}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Invoice sync toggle */}
                  <label className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer select-none">
                    <input type="checkbox" checked={createInv} onChange={e => setCreateInv(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">同步建立發票記錄</p>
                      <p className="text-xs text-blue-500 mt-0.5">
                        每筆訂單建立對應發票（含稅5%），品項明細自動帶入，並依訂單月份分類報稅月份
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              取消
            </button>
            {orders.length > 0 && (
              <button onClick={handleImport}
                className="px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
                <Download size={14} />
                匯入 {orders.length} 筆訂單
                <span className="text-orange-200">NT$ {totalAmount.toLocaleString('zh-TW')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Import1shop
