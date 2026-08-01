import { cn } from '@/lib/utils'
import type { IssueStatus, IssuePriority } from '@/lib/types'
import { Clock, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface StatusBadgeProps {
  status: IssueStatus
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-[var(--status-pending)]/15 text-[var(--status-pending)] border-[var(--status-pending)]/30',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-[var(--status-in-progress)]/15 text-[var(--status-in-progress)] border-[var(--status-in-progress)]/30',
    icon: Loader2,
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-[var(--status-resolved)]/15 text-[var(--status-resolved)] border-[var(--status-resolved)]/30',
    icon: CheckCircle2,
  },
}

export function StatusBadge({ status, size = 'sm', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {showIcon && <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: IssuePriority
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const priorityConfig = {
  high: {
    label: 'High',
    className: 'bg-[var(--priority-high)]/15 text-[var(--priority-high)] border-[var(--priority-high)]/30',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    className: 'bg-[var(--priority-medium)]/15 text-[var(--priority-medium)] border-[var(--priority-medium)]/30',
    icon: AlertCircle,
  },
  low: {
    label: 'Low',
    className: 'bg-[var(--priority-low)]/15 text-[var(--priority-low)] border-[var(--priority-low)]/30',
    icon: Info,
  },
}

export function PriorityBadge({ priority, size = 'sm', showIcon = true }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {showIcon && <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </span>
  )
}

interface CategoryBadgeProps {
  name: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ name, size = 'sm' }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted font-medium text-muted-foreground',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {name}
    </span>
  )
}
