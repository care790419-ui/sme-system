/**
 * useAdData — Ad Management State Hook
 * ─────────────────────────────────────
 * Phase 1: USE_MOCK = true  → all data from adMockData.ts, mutations update local state only
 * Phase 2: USE_MOCK = false → all reads/writes go through /api/ad-* endpoints
 *
 * Switching to real API:
 *   1. Set USE_MOCK = false
 *   2. Ensure server routes exist: /api/ad-campaigns, /api/ad-copy-versions,
 *      /api/ad-creatives, /api/ad-performance, /api/meta-integration-settings
 *   3. Call loadAll() on mount to fetch initial data
 */
import { useState, useCallback } from 'react'
import type {
  AdCampaign, AdCopyVersion, AdCreative, AdPerformance, MetaIntegrationSettings,
} from '../types'
import {
  mockCampaigns, mockCopyVersions, mockCreatives, mockPerformance, mockMetaSettings,
} from '../data/adMockData'

// ── Toggle this to switch between mock and real API ──────────────────────────
const USE_MOCK = true

// ── API helpers (used when USE_MOCK = false) ──────────────────────────────────
async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(path)
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? `GET ${path} ${r.status}`) }
  return r.json()
}
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? `POST ${path} ${r.status}`) }
  return r.json()
}
async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? `PUT ${path} ${r.status}`) }
  return r.json()
}
async function apiDel(path: string): Promise<void> {
  await fetch(path, { method: 'DELETE' })
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAdData() {
  const [metaSettings]   = useState<MetaIntegrationSettings>(mockMetaSettings)
  const [campaigns, setCampaigns]             = useState<AdCampaign[]>(
    USE_MOCK ? mockCampaigns : []
  )
  const [copyVersions, setCopyVersions]       = useState<AdCopyVersion[]>(
    USE_MOCK ? mockCopyVersions : []
  )
  const [creatives, setCreatives]             = useState<AdCreative[]>(
    USE_MOCK ? mockCreatives : []
  )
  const [performance]                         = useState<AdPerformance[]>(
    USE_MOCK ? mockPerformance : []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // ── Load from API (used when USE_MOCK = false) ────────────────────────────
  const loadAll = useCallback(async () => {
    if (USE_MOCK) return
    setLoading(true)
    try {
      const [cams, cvs] = await Promise.all([
        apiGet<AdCampaign[]>('/api/ad-campaigns'),
        apiGet<AdCopyVersion[]>('/api/ad-copy-versions'),
      ])
      setCampaigns(cams)
      setCopyVersions(cvs)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '載入失敗')
    }
    setLoading(false)
  }, [])

  // ── Campaign CRUD ─────────────────────────────────────────────────────────
  const createCampaign = useCallback(async (
    data: Omit<AdCampaign, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AdCampaign> => {
    const now = new Date().toISOString()
    const c: AdCampaign = { ...data, id: `CAM-${Date.now()}`, createdAt: now, updatedAt: now }
    if (!USE_MOCK) await apiPost('/api/ad-campaigns', c)
    setCampaigns(prev => [c, ...prev])
    return c
  }, [])

  const updateCampaign = useCallback(async (c: AdCampaign) => {
    const updated = { ...c, updatedAt: new Date().toISOString() }
    if (!USE_MOCK) await apiPut(`/api/ad-campaigns/${c.id}`, updated)
    setCampaigns(prev => prev.map(x => x.id === c.id ? updated : x))
  }, [])

  const deleteCampaign = useCallback(async (id: string) => {
    if (!USE_MOCK) await apiDel(`/api/ad-campaigns/${id}`)
    setCampaigns(prev => prev.filter(x => x.id !== id))
  }, [])

  // ── Copy Version CRUD ─────────────────────────────────────────────────────
  const createCopyVersion = useCallback(async (
    data: Omit<AdCopyVersion, 'id' | 'createdAt'>
  ): Promise<AdCopyVersion> => {
    const v: AdCopyVersion = { ...data, id: `CV-${Date.now()}`, createdAt: new Date().toISOString() }
    if (!USE_MOCK) await apiPost('/api/ad-copy-versions', v)
    setCopyVersions(prev => [v, ...prev])
    return v
  }, [])

  const updateCopyVersion = useCallback(async (v: AdCopyVersion) => {
    if (!USE_MOCK) await apiPut(`/api/ad-copy-versions/${v.id}`, v)
    setCopyVersions(prev => prev.map(x => x.id === v.id ? v : x))
  }, [])

  // ── Creative CRUD ─────────────────────────────────────────────────────────
  const createCreative = useCallback(async (
    data: Omit<AdCreative, 'id' | 'createdAt'>
  ): Promise<AdCreative> => {
    const c: AdCreative = { ...data, id: `CR-${Date.now()}`, createdAt: new Date().toISOString() }
    if (!USE_MOCK) await apiPost('/api/ad-creatives', c)
    setCreatives(prev => [c, ...prev])
    return c
  }, [])

  const updateCreative = useCallback(async (c: AdCreative) => {
    if (!USE_MOCK) await apiPut(`/api/ad-creatives/${c.id}`, c)
    setCreatives(prev => prev.map(x => x.id === c.id ? c : x))
  }, [])

  const deleteCreative = useCallback(async (id: string) => {
    if (!USE_MOCK) await apiDel(`/api/ad-creatives/${id}`)
    setCreatives(prev => prev.filter(x => x.id !== id))
  }, [])

  // ── Selectors ─────────────────────────────────────────────────────────────
  const getPerf        = useCallback((campaignId: string) =>
    performance.find(p => p.campaignId === campaignId), [performance])

  const getCampaignCopyVersions = useCallback((campaignId: string) =>
    copyVersions.filter(v => v.campaignId === campaignId), [copyVersions])

  const getCampaignCreatives = useCallback((campaignId: string) =>
    creatives.filter(c => c.campaignId === campaignId), [creatives])

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const totals = {
    spend:       performance.reduce((s, p) => s + p.spend, 0),
    impressions: performance.reduce((s, p) => s + p.impressions, 0),
    clicks:      performance.reduce((s, p) => s + p.clicks, 0),
    purchases:   performance.reduce((s, p) => s + p.purchases, 0),
    avgRoas:     (() => {
      const active = performance.filter(p => p.spend > 0)
      return active.length ? active.reduce((s, p) => s + p.roas, 0) / active.length : 0
    })(),
  }

  return {
    // Data
    metaSettings, campaigns, copyVersions, creatives, performance, totals,
    loading, error,
    // Campaign
    loadAll, createCampaign, updateCampaign, deleteCampaign,
    // CopyVersion
    createCopyVersion, updateCopyVersion,
    // Creative
    createCreative, updateCreative, deleteCreative,
    // Selectors
    getPerf, getCampaignCopyVersions, getCampaignCreatives,
    // Meta info
    isMock: USE_MOCK,
  }
}
