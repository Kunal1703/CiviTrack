import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    positive?: boolean
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-[var(--status-resolved)]/10 border-[var(--status-resolved)]/30',
  warning: 'bg-[var(--status-pending)]/10 border-[var(--status-pending)]/30',
  danger: 'bg-[var(--priority-high)]/10 border-[var(--priority-high)]/30',
}

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-[var(--status-resolved)]/20 text-[var(--status-resolved)]',
  warning: 'bg-[var(--status-pending)]/20 text-[var(--status-pending)]',
  danger: 'bg-[var(--priority-high)]/20 text-[var(--priority-high)]',
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
}: StatsCardProps) {
  return (
    <Card className={cn('transition-colors', variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn('rounded-md p-2', iconVariantStyles[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {trend && (
            <span
              className={cn(
                'text-sm font-medium',
                trend.positive ? 'text-[var(--status-resolved)]' : 'text-[var(--priority-high)]'
              )}
            >
              {trend.positive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface StatsGridProps {
  children: React.ReactNode
}

export function StatsGrid({ children }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  )
}
