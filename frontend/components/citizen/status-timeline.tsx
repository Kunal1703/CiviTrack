'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { STATUS_FLOW, statusMeta, type ComplaintStatus } from '@/lib/status'
import { cn } from '@/lib/utils'

/**
 * Vertical progress rail: Submitted → Under Review → In Progress → Resolved.
 * The current step glows; completed steps are checked; future steps are muted.
 * 'rejected' is shown as a distinct terminal state rather than forced onto the
 * happy path.
 */
export function StatusTimeline({ status }: { status: string }) {
  const current = statusMeta(status)
  const rejected = status === 'rejected'
  const currentIndex = rejected ? STATUS_FLOW.length : current.step

  return (
    <ol className="relative space-y-6" aria-label="Complaint progress">
      {STATUS_FLOW.map((s, i) => {
        const meta = statusMeta(s)
        const done = i < currentIndex
        const active = i === currentIndex && !rejected
        const isLast = i === STATUS_FLOW.length - 1
        return (
          <li key={s} className="relative flex gap-4">
            {/* Connector */}
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-0.5 rounded-full bg-border"
                aria-hidden
              >
                <motion.span
                  className="block w-full rounded-full"
                  style={{ backgroundColor: meta.dot }}
                  initial={{ height: 0 }}
                  animate={{ height: done ? '100%' : '0%' }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.08 }}
                />
              </span>
            )}

            {/* Node */}
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
              className={cn(
                'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors',
                done || active ? 'border-transparent text-white' : 'border-border bg-card text-muted-foreground',
              )}
              style={done || active ? { backgroundColor: meta.dot } : undefined}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : active ? (
                <motion.span
                  className="h-2.5 w-2.5 rounded-full bg-white"
                  animate={{ scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              ) : (
                <span className="text-xs font-semibold">{i + 1}</span>
              )}
            </motion.span>

            <div className="pt-1">
              <p className={cn('text-sm font-medium', active && 'text-foreground', !done && !active && 'text-muted-foreground')}>
                {meta.label}
              </p>
              {active && <p className="text-xs text-muted-foreground">Current stage</p>}
              {done && <p className="text-xs text-muted-foreground">Completed</p>}
            </div>
          </li>
        )
      })}

      {rejected && (
        <li className="relative flex gap-4">
          <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-500 text-white">
            <X className="h-4 w-4" />
          </span>
          <div className="pt-1">
            <p className="text-sm font-medium text-foreground">Closed</p>
            <p className="text-xs text-muted-foreground">This report was closed</p>
          </div>
        </li>
      )}
    </ol>
  )
}
