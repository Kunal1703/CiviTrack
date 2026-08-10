/**
 * Complaints client for the CiviTrack AI gateway (same-origin /api proxy).
 * Identity is derived server-side from the session cookie — the client never
 * sends a user id. Citizens only ever receive their own complaints from the
 * list/detail endpoints (the community map endpoint is explicitly non-PII).
 */

export interface Complaint {
  id: number
  public_ref: string
  reporter_id: number | null
  title: string
  description: string
  category: string | null
  category_confidence: number | null
  category_overridden: boolean
  status: string
  priority: string
  department_id: number | null
  assignee_id: number | null
  latitude: number | null
  longitude: number | null
  address_text: string | null
  source: string
  is_demo: boolean
  created_at: string
  updated_at: string
  closed_at: string | null
  reporter_name?: string | null
  department_name?: string | null
}

export interface ComplaintList {
  items: Complaint[]
  total: number
  limit: number
  offset: number
}

export interface ComplaintUpdate {
  id: number
  complaint_id: number
  author_id: number | null
  type: string
  old_status: string | null
  new_status: string | null
  note: string | null
  visibility: string
  created_at: string
}

export interface MapPoint {
  id: number
  public_ref: string
  category: string | null
  status: string
  priority: string
  title: string
  latitude: number
  longitude: number
  created_at: string
}

export interface CreateComplaintInput {
  title: string
  description: string
  category?: string | null
  category_confidence?: number | null
  latitude?: number | null
  longitude?: number | null
  address_text?: string | null
  priority?: 'low' | 'medium' | 'high'
}

export interface ListParams {
  status?: string
  category?: string
  priority?: string
  department_id?: number
  source?: string
  q?: string
  sort?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface AdminPatchInput {
  status?: string
  priority?: string
  category?: string
  department_id?: number | null
  assignee_id?: number | null
  note?: string
}

async function detail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg
  } catch {
    /* non-JSON */
  }
  return fallback
}

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { credentials: 'include', signal })
  if (!res.ok) throw new Error(await detail(res, `Request failed (${res.status})`))
  return (await res.json()) as T
}

export async function createComplaint(input: CreateComplaintInput): Promise<Complaint> {
  const res = await fetch('/api/v1/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await detail(res, 'Could not submit your report'))
  return (await res.json()) as Complaint
}

export function listMyComplaints(params: ListParams = {}, signal?: AbortSignal): Promise<ComplaintList> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const query = qs.toString()
  return get<ComplaintList>(`/api/v1/complaints${query ? `?${query}` : ''}`, signal)
}

export function getComplaint(id: number | string, signal?: AbortSignal): Promise<Complaint> {
  return get<Complaint>(`/api/v1/complaints/${id}`, signal)
}

export function getComplaintUpdates(id: number | string, signal?: AbortSignal): Promise<ComplaintUpdate[]> {
  return get<ComplaintUpdate[]>(`/api/v1/complaints/${id}/updates`, signal)
}

export function getCommunityMap(signal?: AbortSignal): Promise<MapPoint[]> {
  return get<MapPoint[]>('/api/v1/complaints/map', signal)
}

/** Admin list. Same endpoint as listMyComplaints, but the server returns ALL
 *  complaints for an admin session (not just the caller's). */
export const listComplaints = listMyComplaints

export interface Department {
  id: number
  name: string
  slug: string
}

export function getDepartments(signal?: AbortSignal): Promise<Department[]> {
  return get<Department[]>('/api/v1/departments', signal)
}

/** Admin-only: update a complaint (status/priority/category/assignment + note). */
export async function patchComplaint(id: number | string, input: AdminPatchInput): Promise<Complaint> {
  const res = await fetch(`/api/v1/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await detail(res, 'Could not update the complaint'))
  return (await res.json()) as Complaint
}

/** Admin-only: append a note (public or internal) to a complaint. */
export async function addComplaintNote(
  id: number | string,
  note: string,
  visibility: 'public' | 'internal' = 'internal',
): Promise<ComplaintUpdate> {
  const res = await fetch(`/api/v1/complaints/${id}/updates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ note, visibility }),
  })
  if (!res.ok) throw new Error(await detail(res, 'Could not add note'))
  return (await res.json()) as ComplaintUpdate
}
