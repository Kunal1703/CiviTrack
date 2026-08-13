/**
 * Geospatial hotspots client (admin-only) for the CiviTrack AI gateway.
 *
 * These are Getis-Ord Gi* results computed offline on the REAL NYC 311 corpus —
 * NYC 311 spatial analysis, never Delhi. The gateway enforces admin-only access
 * server-side; this client just shapes the requests.
 */

export interface HotspotCell {
  cell_key: string
  category: string | null
  window_label: string
  count: number
  gi_z: number | null
  p_value: number | null
  significance: string // hot_99|hot_95|hot_90|cold_99|cold_95|cold_90|ns
  lat: number
  lon: number
  south: number
  west: number
  north: number
  east: number
}

export interface SignificanceBucket {
  band: string
  count: number
}

export interface HotspotMeta {
  available: boolean
  method: string
  spatial_unit: string
  cell_size_deg: number
  permutations: number
  fdr_alpha: number
  categories: string[]
  windows: string[]
  total_cells: number
  significant: SignificanceBucket[]
  computed_at: string | null
}

export type SignificanceFilter = 'all' | 'significant' | 'hot' | 'cold'

export interface HotspotParams {
  category?: string // omit for the overall (all-complaints) surface
  window?: string // 'all' | 'YYYY-MM'
  significance?: SignificanceFilter
  limit?: number
}

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { credentials: 'include', signal })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (await res.json()) as T
}

export function getHotspotMeta(signal?: AbortSignal): Promise<HotspotMeta> {
  return get<HotspotMeta>('/api/v1/hotspots/meta', signal)
}

export function getHotspots(params: HotspotParams = {}, signal?: AbortSignal): Promise<HotspotCell[]> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.window) qs.set('window', params.window)
  if (params.significance) qs.set('significance', params.significance)
  if (params.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return get<HotspotCell[]>(`/api/v1/hotspots${query ? `?${query}` : ''}`, signal)
}

// ── Confidence-band presentation ────────────────────────────────────────────

export interface BandStyle {
  color: string
  label: string
}

/** Diverging hot(red)→cold(blue) palette keyed by Gi* confidence band. */
export const BAND_STYLE: Record<string, BandStyle> = {
  hot_99: { color: '#b91c1c', label: 'Hot · 99%' },
  hot_95: { color: '#ef4444', label: 'Hot · 95%' },
  hot_90: { color: '#f97316', label: 'Hot · 90%' },
  cold_90: { color: '#60a5fa', label: 'Cold · 90%' },
  cold_95: { color: '#3b82f6', label: 'Cold · 95%' },
  cold_99: { color: '#1e3a8a', label: 'Cold · 99%' },
  ns: { color: '#9ca3af', label: 'Not significant' },
}

export function bandStyle(band: string): BandStyle {
  return BAND_STYLE[band] ?? BAND_STYLE.ns
}
