'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CopyCheck, X } from 'lucide-react'
import { useDuplicateCheck } from '@/hooks/use-duplicate-check'
import { SimilarityCard } from '@/components/similarity'
import { Button } from '@/components/ui/button'

/** Non-blocking "similar complaint detected" warning for the report flow. */
export function DuplicateWarning({ description }: { description: string }) {
  const { status, result } = useDuplicateCheck(description)
  const [dismissed, setDismissed] = useState(false)

  const show =
    !dismissed && status === 'done' && result != null && result.matches.length > 0 && result.is_potential_duplicate

  return (
    <AnimatePresence initial={false}>
      {show && result && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="rounded-xl border border-[var(--status-pending)]/40 bg-[var(--status-pending)]/[0.06] p-4">
            <div className="mb-3 flex items-center gap-2">
              <CopyCheck className="h-4 w-4 text-[var(--status-pending)]" />
              <span className="text-sm font-semibold">Similar complaint detected</span>
              <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                className="ml-auto grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              We found existing reports that look related. If this is a new issue, continue — otherwise it may
              already be tracked.
            </p>
            <div className="space-y-2">
              {result.matches.slice(0, 3).map((m, i) => (
                <SimilarityCard key={`${m.complaint_id}-${i}`} n={m} index={i} />
              ))}
            </div>
            <div className="mt-3">
              <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => setDismissed(true)}>
                This is a new issue — continue
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
