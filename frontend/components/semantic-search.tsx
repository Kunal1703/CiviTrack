'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Loader2, Sparkles } from 'lucide-react'
import { semanticSearch, type Neighbor } from '@/lib/semantic-api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SimilarityCard } from '@/components/similarity'

/** Natural-language complaint search (vector retrieval). Reused on Issues + Admin. */
export function SemanticSearch({
  placeholder = 'Search complaints in natural language…',
}: {
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Neighbor[] | null>(null)

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (q.trim().length < 3) return
    setLoading(true)
    try {
      const r = await semanticSearch(q.trim(), 8)
      setItems(r.results)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="pl-10"
            aria-label="Semantic search"
          />
        </div>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Search
        </Button>
      </form>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </motion.div>
        ) : items ? (
          <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching complaints found.</p>
            ) : (
              items.map((n, i) => <SimilarityCard key={`${n.complaint_id}-${i}`} n={n} index={i} />)
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
