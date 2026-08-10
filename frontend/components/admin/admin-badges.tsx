import { cn } from '@/lib/utils'
import { statusMeta, STATUS_PILL, ADMIN_STATUS_LABEL, type ComplaintStatus } from '@/lib/status'

/** Operational status badge (admin wording). */
export function AdminStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status)
  const label = ADMIN_STATUS_LABEL[status as ComplaintStatus] ?? status
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_PILL[meta.tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden />
      {label}
    </span>
  )
}

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-red-500/12 text-red-500 ring-red-500/25',
  medium: 'bg-amber-500/12 text-amber-500 ring-amber-500/25',
  low: 'bg-slate-500/12 text-slate-400 ring-slate-500/25',
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.low,
        className,
      )}
    >
      {priority}
    </span>
  )
}
