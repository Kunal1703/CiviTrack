'use client'

import { motion } from 'framer-motion'
import { AnimatedNumber } from './animated-number'

/** value: 0..1 */
export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const level = value >= 0.75 ? 'high' : value >= 0.45 ? 'medium' : 'low'
  const color =
    level === 'high'
      ? 'var(--status-resolved)'
      : level === 'medium'
        ? 'var(--status-pending)'
        : 'var(--muted-foreground)'
  const label = level === 'high' ? 'High' : level === 'medium' ? 'Moderate' : 'Low'

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-medium tabular-nums" style={{ color }}>
          <AnimatedNumber value={pct} duration={0.9} />% · {label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}
