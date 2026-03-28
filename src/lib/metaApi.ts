import type { MetaAdAccount, MetaCampaign, MetaAdSet, MetaPage, MetaStatus } from '../types'

const base = '/api/meta'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json as T
}

export const metaApi = {
  status:        ()                                          => req<MetaStatus>('GET', '/status'),
  connect:       (access_token: string)                     => req<{ ok: boolean; userName: string }>('POST', '/connect', { access_token }),
  disconnect:    ()                                         => req<{ ok: true }>('DELETE', '/disconnect'),
  setAdAccount:  (adAccountId: string, adAccountName: string) => req<{ ok: true }>('PUT', '/ad-account', { adAccountId, adAccountName }),
  adAccounts:    ()                                         => req<MetaAdAccount[]>('GET', '/ad-accounts'),
  campaigns:     (adAccountId?: string)                     => req<MetaCampaign[]>('GET', `/campaigns${adAccountId ? `?adAccountId=${adAccountId}` : ''}`),
  adsets:        (campaignId: string)                       => req<MetaAdSet[]>('GET', `/adsets?campaignId=${campaignId}`),
  pages:         ()                                         => req<MetaPage[]>('GET', '/pages'),
  publish:       (payload: {
    adCopyId: string
    adSetId: string
    pageId: string
    pageAccessToken: string
    destinationUrl: string
  })                                                        => req<{ ok: boolean; adId: string; creativeId: string }>('POST', '/publish', payload),
}
