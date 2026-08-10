// CiviTrack AI — semantic API client (M3). Same-origin /api proxy → gateway.

export type Dataset = 'nyc' | 'delhi'

export interface Neighbor {
  complaint_id: string
  category?: string | null
  similarity: number
  text: string
  borough?: string | null
  location?: string | null
  status?: string | null
  created_at?: string | null
}

export interface SearchResponse {
  query: string
  model: string
  results: Neighbor[]
}

export interface DuplicateMatch extends Neighbor {
  relation: string
  distance_m?: number | null
}

export interface DuplicateResponse {
  is_potential_duplicate: boolean
  threshold: number
  matches: DuplicateMatch[]
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/v1/semantic${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`semantic ${path} failed (${res.status})`)
  return res.json() as Promise<T>
}

export function semanticSearch(
  query: string,
  topK = 8,
  category?: string,
  dataset: Dataset = 'nyc',
  signal?: AbortSignal,
) {
  return post<SearchResponse>('/search', { query, top_k: topK, category, dataset }, signal)
}

export function checkDuplicate(
  description: string,
  latitude?: number,
  longitude?: number,
  dataset: Dataset = 'nyc',
  signal?: AbortSignal,
) {
  return post<DuplicateResponse>('/duplicate-check', { description, latitude, longitude, dataset }, signal)
}

export function relatedComplaints(
  complaintId: string,
  topK = 5,
  dataset: Dataset = 'nyc',
  signal?: AbortSignal,
) {
  return post<SearchResponse>('/related', { complaint_id: complaintId, top_k: topK, dataset }, signal)
}
