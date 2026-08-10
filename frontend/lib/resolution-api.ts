/**
 * Resolution-time client (M4). Admin-only endpoints (gateway enforces the role).
 * The model is trained on NYC 311 data — the UI labels it accordingly and never
 * presents it as a per-Delhi-complaint forecast.
 */

export interface ResolutionFactor {
  feature: string
  value: string | number | null
  effect: 'increases' | 'decreases'
}

export interface ResolutionPrediction {
  point_hours: number
  low_hours: number
  high_hours: number
  model_version: string
  factors: ResolutionFactor[]
}

export interface ResolutionDriver {
  feature: string
  weight: number
}

export interface ResolutionMeta {
  model_version: string
  options: { agency: string[]; borough: string[]; complaint_type: string[] }
  drivers: ResolutionDriver[]
}

export interface ResolutionInput {
  agency?: string
  complaint_type?: string
  borough?: string
  incident_zip?: string
  created_at?: string
}

export async function getResolutionMeta(signal?: AbortSignal): Promise<ResolutionMeta> {
  const res = await fetch('/api/v1/resolution-time/meta', { credentials: 'include', signal })
  if (!res.ok) throw new Error(`Failed to load resolution model (${res.status})`)
  return (await res.json()) as ResolutionMeta
}

export async function predictResolution(input: ResolutionInput): Promise<ResolutionPrediction> {
  const res = await fetch('/api/v1/resolution-time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Prediction failed (${res.status})`)
  return (await res.json()) as ResolutionPrediction
}

/** Human-friendly duration formatting. */
export function fmtHours(h: number): string {
  if (h < 1) return 'under an hour'
  if (h < 48) return `~${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`
  const days = h / 24
  if (days < 14) return `~${Math.round(days)} days`
  if (days < 60) return `~${Math.round(days / 7)} weeks`
  return `~${Math.round(days / 30)} months`
}
