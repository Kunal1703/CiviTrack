'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layers, Flame } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DelhiMap, aggregateHeat, heatColor } from '@/components/citizen/delhi-map'
import { CATEGORIES } from '@/lib/categories'
import { ALL_STATUSES, ADMIN_STATUS_LABEL } from '@/lib/status'
import { getCommunityMap, type MapPoint } from '@/lib/complaints-api'

export function AdminMapView() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'issues' | 'hotspots'>('issues')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    const ctrl = new AbortController()
    getCommunityMap(ctrl.signal).then(setPoints).catch(() => setPoints([])).finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const filtered = useMemo(
    () => points.filter((p) =>
      (category === 'all' || p.category === category) &&
      (status === 'all' || p.status === status)),
    [points, category, status],
  )
  const hotspots = useMemo(
    () => aggregateHeat(filtered).sort((a, b) => b.count - a.count).slice(0, 8),
    [filtered],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(['issues', 'hotspots'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`rounded-md px-3 py-1 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44" aria-label="Filter category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36" aria-label="Filter status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{ADMIN_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} shown</span>
        </div>
        {loading ? (
          <Skeleton className="h-[560px] w-full rounded-2xl" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 shadow-premium">
            <DelhiMap points={filtered} height="560px" showMarkers={mode === 'issues'} showHeat={mode === 'hotspots'} />
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-orange-500" /> Top clusters</h2>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : hotspots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No points match the current filters.</p>
        ) : (
          hotspots.map((h, i) => (
            <div key={i} className="rounded-xl border border-border/70 bg-card p-3 shadow-premium">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{h.top[0]?.[0] ?? 'Mixed'} area</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: heatColor(h.count) }}>{h.count}</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                {h.top.slice(0, 3).map(([c, n]) => `${c} (${n})`).join(' · ')}
              </p>
            </div>
          ))
        )}
      </aside>
    </div>
  )
}
