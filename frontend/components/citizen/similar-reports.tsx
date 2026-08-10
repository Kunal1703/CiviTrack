'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Info, MapPin, ArrowUpRight } from 'lucide-react'
import { getCategory } from '@/lib/categories'
import { statusMeta } from '@/lib/status'
import { cn } from '@/lib/utils'

export interface SimilarItem {
  complaint_id: string
  category?: string | null
  similarity: number
  text: string
  location?: string | null
  status?: string | null
  created_at?: string | null
  distance_m?: number | null
  relation?: string
}

function fmtDate(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Human-language presentation of M3 semantic matches. Used non-blockingly in the
 * report form ("someone may have already reported this") and on the detail page
 * ("related reports nearby"). Never prevents an action.
 */
export function SimilarReports({
  items,
  variant = 'warning',
  linkBase,
}: {
  items: SimilarItem[]
  variant?: 'warning' | 'related'
  /** If set, each item links to `${linkBase}/${complaint_id}`. */
  linkBase?: string
}) {
  if (!items.length) return null
  const warning = variant === 'warning'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'rounded-xl border p-4',
        warning ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/70 bg-card/60',
      )}
    >
      <div className="flex items-start gap-2">
        {warning && <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />}
        <div>
          <p className="text-sm font-medium">
            {warning ? 'Someone may have already reported this' : 'Related reports nearby'}
          </p>
          {warning && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              These look similar to what you’re describing. You can still submit your own report.
            </p>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((m, i) => {
          const cat = getCategory(m.category)
          const st = m.status ? statusMeta(m.status) : null
          const pct = Math.round(Math.max(0, Math.min(1, m.similarity)) * 100)
          const inner = (
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
              >
                <cat.Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.text}</p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{m.category ?? 'Other'}</span>
                  {m.location && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {m.location}
                    </span>
                  )}
                  {m.distance_m != null && <span>· ~{Math.round(m.distance_m)} m away</span>}
                  {fmtDate(m.created_at) && <span>· {fmtDate(m.created_at)}</span>}
                  {st && <span style={{ color: st.dot }}>· {st.label}</span>}
                </p>
                {/* Similarity strength */}
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: warning ? '#f59e0b' : cat.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
                  />
                </div>
              </div>
              {linkBase && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          )
          return (
            <li key={m.complaint_id + i}>
              {linkBase ? <Link href={`${linkBase}/${m.complaint_id}`}>{inner}</Link> : inner}
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}
