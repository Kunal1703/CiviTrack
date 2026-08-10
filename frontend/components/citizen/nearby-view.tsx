'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Flame, Layers } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DelhiMap, aggregateHeat, heatColor } from '@/components/citizen/delhi-map'
import { getCommunityMap, type MapPoint } from '@/lib/complaints-api'

export function NearbyView() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'issues' | 'hotspots'>('issues')

  useEffect(() => {
    const ctrl = new AbortController()
    getCommunityMap(ctrl.signal)
      .then(setPoints)
      .catch(() => setPoints([]))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const hotspots = useMemo(
    () => aggregateHeat(points).sort((a, b) => b.count - a.count).slice(0, 6),
    [points],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(['issues', 'hotspots'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`rounded-md px-3 py-1 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Demo Delhi data</span>
        </div>
        {loading ? (
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 shadow-premium">
            <DelhiMap points={points} height="520px"
              showMarkers={mode === 'issues'} showHeat={mode === 'hotspots'} />
          </div>
        )}
        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {mode === 'hotspots' ? (
            <>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: heatColor(1) }} /> 1–2 reports</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: heatColor(3) }} /> 3–4 reports</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: heatColor(5) }} /> 5+ reports</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Pins are coloured by category</span>
          )}
        </div>
      </div>

      {/* Hotspot summary */}
      <aside className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h2 className="text-sm font-semibold">Areas needing attention</h2>
        </div>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : hotspots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No community reports to show yet.</p>
        ) : (
          hotspots.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/70 bg-card p-3 shadow-premium">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5" style={{ color: heatColor(h.count) }} />
                  {h.top[0]?.[0] ?? 'Mixed'} area
                </span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: heatColor(h.count) }}>
                  {h.count}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {h.top.slice(0, 3).map(([c, n]) => `${c} (${n})`).join(' · ')}
              </p>
            </motion.div>
          ))
        )}
      </aside>
    </div>
  )
}
