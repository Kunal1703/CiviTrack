/**
 * Typed client for the CiviTrack AI gateway. Requests go to same-origin `/api/*`
 * and are proxied to the FastAPI gateway (see next.config.mjs), which forwards
 * classification to the ml_service (DistilBERT). No mock data.
 */

export interface ClassifyResult {
  category: string
  confidence: number
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Classify arbitrary complaint text → { category, confidence }.
 * Pass an AbortSignal to cancel in-flight requests (used for debounced typing).
 */
export async function classifyComplaint(
  description: string,
  signal?: AbortSignal,
): Promise<ClassifyResult> {
  const res = await fetch('/api/v1/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
    signal,
  })
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status)
  }
  return (await res.json()) as ClassifyResult
}
