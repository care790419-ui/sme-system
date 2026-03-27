import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react'
import { Transaction, Invoice, CostItem, Campaign, MonthlyData } from '../types'

export interface AppState {
  transactions: Transaction[]
  invoices: Invoice[]
  costItems: CostItem[]
  campaigns: Campaign[]
  monthlyData: MonthlyData[]
  loading: boolean
  error: string | null
}

export type AppAction =
  | { type: 'LOAD_DATA'; payload: Omit<AppState, 'loading' | 'error'> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'UPDATE_INVOICE'; payload: Invoice }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'DELETE_INVOICE'; payload: string }
  | { type: 'UPDATE_COST'; payload: CostItem }
  | { type: 'ADD_COST'; payload: CostItem }
  | { type: 'DELETE_COST'; payload: string }
  | { type: 'UPDATE_CAMPAIGN'; payload: Campaign }
  | { type: 'ADD_CAMPAIGN'; payload: Campaign }
  | { type: 'DELETE_CAMPAIGN'; payload: string }
  | { type: 'IMPORT_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'IMPORT_INVOICES'; payload: Invoice[] }

const initialState: AppState = {
  transactions: [],
  invoices: [],
  costItems: [],
  campaigns: [],
  monthlyData: [],
  loading: true,
  error: null,
}

// ─── Sync helpers ────────────────────────────────────────────────────────────
function makeCamSyncTx(cam: Campaign): Transaction {
  return {
    id: `CAM-SYNC-${cam.id}`,
    date: cam.startDate,
    description: `[廣告關聯] ${cam.name}`,
    category: '行銷費用',
    amount: cam.spent,
    type: 'expense',
    status: 'completed',
  }
}

function makeCostSyncTx(cost: CostItem): Transaction {
  return {
    id: `COST-SYNC-${cost.id}`,
    date: `${cost.month}-01`,
    description: `[成本關聯] ${cost.category} - ${cost.subcategory}`,
    category: cost.category,
    amount: cost.actual,
    type: 'expense',
    status: 'completed',
  }
}

// Merge sync transactions into a transaction list (upsert by id)
function upsertTx(txs: Transaction[], syncTx: Transaction): Transaction[] {
  return txs.some(t => t.id === syncTx.id)
    ? txs.map(t => t.id === syncTx.id ? syncTx : t)
    : [...txs, syncTx]
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_DATA': {
      // Synthesize COST-SYNC and CAM-SYNC transactions from loaded data
      const baseTxs = action.payload.transactions.filter(
        t => !t.id.startsWith('COST-SYNC-') && !t.id.startsWith('CAM-SYNC-')
      )
      const costSyncTxs = action.payload.costItems
        .filter(c => c.actual > 0)
        .map(makeCostSyncTx)
      const camSyncTxs = action.payload.campaigns.map(makeCamSyncTx)
      return {
        ...state,
        ...action.payload,
        transactions: [...baseTxs, ...costSyncTxs, ...camSyncTxs],
        loading: false,
        error: null,
      }
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] }
    case 'UPDATE_TRANSACTION':
      return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) }

    case 'ADD_INVOICE':
      return { ...state, invoices: [action.payload, ...state.invoices] }
    case 'UPDATE_INVOICE':
      return { ...state, invoices: state.invoices.map(i => i.id === action.payload.id ? action.payload : i) }
    case 'DELETE_INVOICE':
      return { ...state, invoices: state.invoices.filter(i => i.id !== action.payload) }

    case 'ADD_COST': {
      const syncTx = makeCostSyncTx(action.payload)
      return {
        ...state,
        costItems: [action.payload, ...state.costItems],
        transactions: action.payload.actual > 0 ? [...state.transactions, syncTx] : state.transactions,
      }
    }
    case 'UPDATE_COST': {
      const syncTx = makeCostSyncTx(action.payload)
      return {
        ...state,
        costItems: state.costItems.map(c => c.id === action.payload.id ? action.payload : c),
        transactions: action.payload.actual > 0
          ? upsertTx(state.transactions, syncTx)
          : state.transactions.filter(t => t.id !== `COST-SYNC-${action.payload.id}`),
      }
    }
    case 'DELETE_COST':
      return {
        ...state,
        costItems: state.costItems.filter(c => c.id !== action.payload),
        transactions: state.transactions.filter(t => t.id !== `COST-SYNC-${action.payload}`),
      }

    case 'ADD_CAMPAIGN': {
      const syncTx = makeCamSyncTx(action.payload)
      return {
        ...state,
        campaigns: [action.payload, ...state.campaigns],
        transactions: [...state.transactions, syncTx],
      }
    }
    case 'UPDATE_CAMPAIGN': {
      const syncTx = makeCamSyncTx(action.payload)
      return {
        ...state,
        campaigns: state.campaigns.map(c => c.id === action.payload.id ? action.payload : c),
        transactions: upsertTx(state.transactions, syncTx),
      }
    }
    case 'DELETE_CAMPAIGN':
      return {
        ...state,
        campaigns: state.campaigns.filter(c => c.id !== action.payload),
        transactions: state.transactions.filter(t => t.id !== `CAM-SYNC-${action.payload}`),
      }

    case 'IMPORT_TRANSACTIONS':
      return { ...state, transactions: [...action.payload, ...state.transactions] }
    case 'IMPORT_INVOICES':
      return { ...state, invoices: [...action.payload, ...state.invoices] }

    default:
      return state
  }
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`)
  return res.json()
}

const get  = <T,>(p: string)            => api<T>('GET',    p)
const post = <T,>(p: string, b: unknown) => api<T>('POST',   p, b)
const put  = <T,>(p: string, b: unknown) => api<T>('PUT',    p, b)
const del  = <T,>(p: string)            => api<T>('DELETE', p)

// ─── Context ─────────────────────────────────────────────────────────────────
interface CtxType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  saveTransaction:    (tx: Transaction)   => Promise<void>
  createTransaction:  (tx: Transaction)   => Promise<void>
  removeTransaction:  (id: string)        => Promise<void>
  importTransactions: (txs: Transaction[]) => Promise<void>
  importInvoices:     (invs: Invoice[])    => Promise<void>

  saveInvoice:   (inv: Invoice) => Promise<void>
  createInvoice: (inv: Invoice) => Promise<void>
  removeInvoice: (id: string)   => Promise<void>

  saveCost:   (c: CostItem) => Promise<void>
  createCost: (c: CostItem) => Promise<void>
  removeCost: (id: string)  => Promise<void>

  saveCampaign:   (c: Campaign) => Promise<void>
  createCampaign: (c: Campaign) => Promise<void>
  removeCampaign: (id: string)  => Promise<void>
}

const AppContext = createContext<CtxType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true })
    get<Omit<AppState, 'loading' | 'error'>>('/api/data')
      .then(data => dispatch({ type: 'LOAD_DATA', payload: data }))
      .catch(err => {
        console.error('Failed to load data from API:', err)
        dispatch({ type: 'SET_ERROR', payload: '無法連接伺服器，請確認後端已啟動' })
      })
  }, [])

  // ── Transactions ──
  const saveTransaction = useCallback(async (tx: Transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: tx })
    await put(`/api/transactions/${tx.id}`, tx)
  }, [])

  const createTransaction = useCallback(async (tx: Transaction) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: tx })
    await post('/api/transactions', tx)
  }, [])

  const removeTransaction = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id })
    await del(`/api/transactions/${id}`)
  }, [])

  const importTransactions = useCallback(async (txs: Transaction[]) => {
    dispatch({ type: 'IMPORT_TRANSACTIONS', payload: txs })
    await post('/api/transactions/bulk', txs)
  }, [])

  const importInvoices = useCallback(async (invs: Invoice[]) => {
    dispatch({ type: 'IMPORT_INVOICES', payload: invs })
    await post('/api/invoices/bulk', invs)
  }, [])

  // ── Invoices ──
  const saveInvoice = useCallback(async (inv: Invoice) => {
    dispatch({ type: 'UPDATE_INVOICE', payload: inv })
    await put(`/api/invoices/${inv.id}`, inv)
  }, [])

  const createInvoice = useCallback(async (inv: Invoice) => {
    dispatch({ type: 'ADD_INVOICE', payload: inv })
    await post('/api/invoices', inv)
  }, [])

  const removeInvoice = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_INVOICE', payload: id })
    await del(`/api/invoices/${id}`)
  }, [])

  // ── Costs ──
  const saveCost = useCallback(async (c: CostItem) => {
    dispatch({ type: 'UPDATE_COST', payload: c })
    await put(`/api/costs/${c.id}`, c)
    const syncTx = makeCostSyncTx(c)
    if (c.actual > 0) {
      await put(`/api/transactions/${syncTx.id}`, syncTx).catch(() => post('/api/transactions', syncTx))
    } else {
      await del(`/api/transactions/${syncTx.id}`).catch(() => {/* ignore */})
    }
  }, [])

  const createCost = useCallback(async (c: CostItem) => {
    dispatch({ type: 'ADD_COST', payload: c })
    await post('/api/costs', c)
    if (c.actual > 0) await post('/api/transactions', makeCostSyncTx(c))
  }, [])

  const removeCost = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_COST', payload: id })
    await del(`/api/costs/${id}`)
    await del(`/api/transactions/COST-SYNC-${id}`).catch(() => {/* ignore */})
  }, [])

  // ── Campaigns ──
  const saveCampaign = useCallback(async (c: Campaign) => {
    dispatch({ type: 'UPDATE_CAMPAIGN', payload: c })
    await put(`/api/campaigns/${c.id}`, c)
    const syncTx = makeCamSyncTx(c)
    await put(`/api/transactions/${syncTx.id}`, syncTx).catch(() => post('/api/transactions', syncTx))
  }, [])

  const createCampaign = useCallback(async (c: Campaign) => {
    dispatch({ type: 'ADD_CAMPAIGN', payload: c })
    await post('/api/campaigns', c)
    await post('/api/transactions', makeCamSyncTx(c))
  }, [])

  const removeCampaign = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_CAMPAIGN', payload: id })
    await del(`/api/campaigns/${id}`)
    await del(`/api/transactions/CAM-SYNC-${id}`).catch(() => {/* ignore */})
  }, [])

  return (
    <AppContext.Provider value={{
      state, dispatch,
      saveTransaction, createTransaction, removeTransaction, importTransactions, importInvoices,
      saveInvoice, createInvoice, removeInvoice,
      saveCost, createCost, removeCost,
      saveCampaign, createCampaign, removeCampaign,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be within AppProvider')
  return ctx
}
