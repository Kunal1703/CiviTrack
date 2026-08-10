/**
 * Admin analytics client. All endpoints are admin-only server-side (a citizen
 * session receives 403), so this is safe to call from admin surfaces only.
 */

export interface Bucket {
  key: string
  count: number
}

export interface VolumePoint {
  date: string
  count: number
}

export interface AdminStats {
  total: number
  open: number
  new: number
  triaged: number
  in_progress: number
  resolved: number
  rejected: number
  high_priority_open: number
  new_today: number
  resolved_today: number
  avg_resolution_hours: number | null
  potential_duplicates: number
  by_category: Bucket[]
  by_status: Bucket[]
  by_priority: Bucket[]
  by_department: Bucket[]
  volume_30d: VolumePoint[]
}

export interface Assignee {
  id: number
  full_name: string
  email: string
}

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { credentials: 'include', signal })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (await res.json()) as T
}

export function getAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  return get<AdminStats>('/api/v1/admin/stats', signal)
}

export function getAssignees(signal?: AbortSignal): Promise<Assignee[]> {
  return get<Assignee[]>('/api/v1/admin/assignees', signal)
}
