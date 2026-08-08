'use client'

import { getCategory } from '@/lib/categories'
import { cn } from '@/lib/utils'

interface Props {
  name?: string | null
  className?: string
  size?: 'sm' | 'md'
  showIcon?: boolean
}

/**
 * Category chip — icon + label tinted with the category's color. Cohesive across
 * the form, dashboard, and admin. Colors are semi-transparent so they read well
 * in both light and dark themes.
 */
export function CategoryBadge({ name, className, size = 'md', showIcon = true }: Props) {
  const { Icon, color, name: label } = getCategory(name)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{
        borderColor: `${color}44`,
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {label}
    </span>
  )
}
