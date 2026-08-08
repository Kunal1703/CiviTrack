'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { semanticSearch, type Neighbor } from '@/lib/semantic-api'
import { SimilarityCard } from '@/components/similarity'
import { Skeleton } from '@/components/ui/skeleton'

/** Semantically related complaints for a piece of text (e.g. an issue's body). */
export function RelatedComplaints({ text, title = 'Related complaints' }: { text: string; title?: string }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Neighbor[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    semanticSearch(text, 5)
      .then((r) => !cancelled && setItems(r.results))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [text])

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">semantic · MiniLM</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">Semantic service is unavailable right now.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No related complaints found.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n, i) => (
            <SimilarityCard key={`${n.complaint_id}-${i}`} n={n} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}
