'use client'

import { motion } from 'framer-motion'
import { MapPin, Clock } from 'lucide-react'
import type { Neighbor, DuplicateMatch } from '@/lib/semantic-api'

export function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    value >= 0.75 ? 'var(--status-resolved)' : value >= 0.5 ? 'var(--status-pending)' : 'var(--muted-foreground)'
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

export function SimilarityCard({ n, index = 0 }: { n: Neighbor | DuplicateMatch; index?: number }) {
  const m = n as DuplicateMatch
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="hover-lift rounded-xl border border-border/70 bg-card p-3 shadow-premium"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug">{n.text}</p>
        <SimilarityBar value={n.similarity} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {n.category && (
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {n.category}
          </span>
        )}
        {n.borough && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {n.borough}
          </span>
        )}
        {n.created_at && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(n.created_at).toLocaleDateString()}
          </span>
        )}
        {m.relation && (
          <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5">
            {m.relation}
            {m.distance_m != null ? ` · ${Math.round(m.distance_m)} m` : ''}
          </span>
        )}
      </div>
    </motion.div>
  )
}
