'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Check, TriangleAlert, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from './category-badge'
import { ConfidenceBar } from './confidence-bar'
import { getCategory } from '@/lib/categories'
import type { ClassifyStatus } from '@/hooks/use-classify'
import type { ClassifyResult } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface Props {
  status: ClassifyStatus
  result: ClassifyResult | null
  applied: boolean
  onApply: () => void
}

const dotColor: Record<ClassifyStatus, string> = {
  idle: 'var(--muted-foreground)',
  analyzing: 'var(--status-pending)',
  done: 'var(--status-resolved)',
  error: 'var(--destructive)',
}

function StatusDot({ status }: { status: ClassifyStatus }) {
  return (
    <span className="relative flex h-2 w-2">
      {status === 'analyzing' && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ background: dotColor[status] }}
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: dotColor[status] }} />
    </span>
  )
}

function ShimmerLine({ w }: { w: string }) {
  return (
    <div className={cn('relative h-3 overflow-hidden rounded-full bg-muted', w)}>
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, color-mix(in oklch, var(--foreground) 12%, transparent), transparent)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export function AiAnalysis({ status, result, applied, onApply }: Props) {
  const accent = result ? getCategory(result.category).color : 'var(--primary)'

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.05] p-4 shadow-sm">
      {/* animated accent glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
        style={{ background: accent }}
        animate={{ opacity: status === 'analyzing' ? [0.12, 0.22, 0.12] : 0.1 }}
        transition={{ duration: 1.6, repeat: status === 'analyzing' ? Infinity : 0 }}
      />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <motion.div
            animate={status === 'analyzing' ? { rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1.4, repeat: status === 'analyzing' ? Infinity : 0 }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <span className="text-sm font-semibold tracking-tight">AI Analysis</span>
          <StatusDot status={status} />
          <span className="ml-auto text-[11px] text-muted-foreground">DistilBERT · live</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {status === 'idle' && (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground"
            >
              Keep describing the issue — the AI will suggest a category automatically.
            </motion.p>
          )}

          {status === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              <p className="text-sm text-muted-foreground">Analyzing your report…</p>
              <ShimmerLine w="w-2/3" />
              <ShimmerLine w="w-1/2" />
            </motion.div>
          )}

          {status === 'done' && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Suggested category</span>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                >
                  <CategoryBadge name={result.category} />
                </motion.div>
              </div>
              <ConfidenceBar value={result.confidence} />
              <div className="flex items-center justify-between pt-0.5">
                <AnimatePresence mode="wait" initial={false}>
                  {applied ? (
                    <motion.span
                      key="applied"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-resolved)]"
                    >
                      <Check className="h-3.5 w-3.5" /> Applied to category
                    </motion.span>
                  ) : (
                    <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5" onClick={onApply}>
                        Apply suggestion
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="text-[11px] text-muted-foreground">You can override below</span>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <TriangleAlert className="h-4 w-4 text-[var(--status-pending)]" />
              AI is unavailable right now — no problem, just pick a category below.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
