/**
 * Citizen-facing status vocabulary. The database uses operational statuses
 * (new/triaged/in_progress/resolved/rejected); citizens see plain, reassuring
 * language and a clear progress order.
 */

export type ComplaintStatus = 'new' | 'triaged' | 'in_progress' | 'resolved' | 'rejected'

export interface StatusMeta {
  /** Friendly label shown to citizens. */
  label: string
  /** Position in the normal progression timeline (rejected is off-path → -1). */
  step: number
  /** Accent tone token used for pills/dots. */
  tone: 'submitted' | 'review' | 'progress' | 'resolved' | 'closed'
  dot: string // hex for timeline dot / marker accents
}

export const STATUS_META: Record<ComplaintStatus, StatusMeta> = {
  new: { label: 'Submitted', step: 0, tone: 'submitted', dot: '#38bdf8' },
  triaged: { label: 'Under Review', step: 1, tone: 'review', dot: '#a78bfa' },
  in_progress: { label: 'In Progress', step: 2, tone: 'progress', dot: '#f59e0b' },
  resolved: { label: 'Resolved', step: 3, tone: 'resolved', dot: '#22c55e' },
  rejected: { label: 'Closed', step: -1, tone: 'closed', dot: '#94a3b8' },
}

/** Ordered progression used by the status timeline. */
export const STATUS_FLOW: ComplaintStatus[] = ['new', 'triaged', 'in_progress', 'resolved']

/** Operational labels for the admin workspace (distinct from citizen-friendly). */
export const ADMIN_STATUS_LABEL: Record<ComplaintStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
}

export const ALL_STATUSES: ComplaintStatus[] = ['new', 'triaged', 'in_progress', 'resolved', 'rejected']
export const PRIORITIES = ['low', 'medium', 'high'] as const

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[(status as ComplaintStatus)] ?? STATUS_META.new
}

/** Tailwind classes for a status pill, keyed by tone. */
export const STATUS_PILL: Record<StatusMeta['tone'], string> = {
  submitted: 'bg-sky-500/12 text-sky-500 ring-sky-500/25',
  review: 'bg-violet-500/12 text-violet-500 ring-violet-500/25',
  progress: 'bg-amber-500/12 text-amber-500 ring-amber-500/25',
  resolved: 'bg-green-500/12 text-green-500 ring-green-500/25',
  closed: 'bg-slate-500/12 text-slate-400 ring-slate-500/25',
}
