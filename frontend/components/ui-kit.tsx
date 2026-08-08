'use client'

/**
 * CiviTrack AI — shared design-system primitives.
 *
 * Every page composes from these so the whole app reads as one product:
 * identical spacing, radius, motion, and typographic rhythm. Do not hand-roll
 * page headers / stat cards / section headers — use these.
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedNumber } from '@/components/animated-number'

// ── Page container (consistent max-width + padding on every screen) ──
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8', className)}>{children}</div>
}

// ── Scroll-reveal (staggered entrances, once) ──
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

// ── Eyebrow pill (the little labelled chip above headings) ──
export function Eyebrow({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

// ── Section header (eyebrow + title + description) ──
export function SectionHeader({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  center,
  className,
}: {
  eyebrow?: string
  eyebrowIcon?: LucideIcon
  title: string
  description?: string
  center?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-3', center && 'flex flex-col items-center text-center', className)}>
      {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">{title}</h2>
      {description && <p className="max-w-2xl text-muted-foreground text-pretty">{description}</p>}
    </div>
  )
}

// ── Page header (title row for dashboard/admin/report) ──
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <Reveal className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </Reveal>
  )
}

// ── Unified KPI stat card ──
type Accent = 'primary' | 'accent' | 'success' | 'warning' | 'danger'

const accentVar: Record<Accent, string> = {
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  success: 'var(--status-resolved)',
  warning: 'var(--status-pending)',
  danger: 'var(--destructive)',
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = 'primary',
  decimals = 0,
  suffix = '',
  index = 0,
}: {
  label: string
  value: number
  sublabel?: string
  icon: LucideIcon
  accent?: Accent
  decimals?: number
  suffix?: string
  index?: number
}) {
  const color = accentVar[accent]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-premium"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.10] blur-2xl transition-opacity group-hover:opacity-20"
        style={{ background: color }}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span
          className="grid h-9 w-9 place-items-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-foreground tabular-nums">
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </div>
      {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
    </motion.div>
  )
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>{children}</div>
}
