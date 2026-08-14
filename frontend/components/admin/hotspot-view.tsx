'use client'

import { useEffect, useMemo, useState } from 'react'
import { Flame, Info, MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { HotspotMap } from '@/components/admin/hotspot-map'
import {
  getHotspotMeta, getHotspots, bandStyle,
  type HotspotCell, type HotspotMeta, type SignificanceFilter,
} from '@/lib/hotspots-api'

const SIG_OPTIONS: { value: SignificanceFilter; label: string }[] = [
  { value: 'significant', label: 'Significant only' },
  { value: 'hot', label: 'Hot spots' },
  { value: 'cold', label: 'Cold spots' },
  { value: 'all', label: 'All cells' },
]

const HOT_BANDS = ['hot_99', 'hot_95', 'hot_90']
const COLD_BANDS = ['cold_90', 'cold_95', 'cold_99']

function windowLabel(w: string): string {
  if (w === 'all') return 'Full year (2024)'
  const [y, m] = w.split('-')
  const name = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long' })
  return `${name} ${y}`
}

export function HotspotView() {
  const [meta, setMeta] = useState<HotspotMeta | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [cells, setCells] = useState<HotspotCell[]>([])
  const [loading, setLoading] = useState(true)

  const [category, setCategory] = useState('all') // 'all' → overall surface
  const [windowLbl, setWindowLbl] = useState('all')
  const [significance, setSignificance] = useState<SignificanceFilter>('significant')

  useEffect(() => {
    const ctrl = new AbortController()
    getHotspotMeta(ctrl.signal)
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setMetaLoading(false))
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    if (meta && !meta.available) { setLoading(false); return }
    const ctrl = new AbortController()
    setLoading(true)
    getHotspots(
      {
        category: category === 'all' ? undefined : category,
        window: windowLbl,
        significance,
        limit: 5000,
      },
      ctrl.signal,
    )
      .then(setCells)
      .catch(() => setCells([]))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [meta, category, windowLbl, significance])

  const tally = useMemo(() => {
    const t: Record<string, number> = {}
    for (const c of cells) t[c.significance] = (t[c.significance] ?? 0) + 1
    return t
  }, [cells])

  const topHot = useMemo(
    () =>
      [...cells]
        .filter((c) => c.significance.startsWith('hot'))
        .sort((a, b) => (b.gi_z ?? 0) - (a.gi_z ?? 0))
        .slice(0, 6),
    [cells],
  )

  if (metaLoading) {
    return <Skeleton className="h-[600px] w-full rounded-2xl" />
  }

  if (meta && !meta.available) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-premium">
        <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Hotspots not computed yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          The Getis-Ord Gi* batch job has not been run against the NYC 311 corpus.
          Run <code className="rounded bg-muted px-1 py-0.5">python -m ml.geo.run</code> to
          populate the hotspot layer.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Honest, unmissable data provenance label. */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-amber-900 dark:text-amber-200">
          <strong>NYC 311 spatial analysis.</strong> Statistically significant complaint
          clusters (Getis-Ord Gi*, {meta?.permutations ?? 999} permutations, Benjamini–Hochberg
          FDR at α={meta?.fdr_alpha ?? 0.05}) over a ~1 km grid of the real{' '}
          <strong>New York City 311</strong> corpus — <em>not</em> the Delhi demo data, which is
          too sparse for valid spatial statistics.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-56" aria-label="Filter complaint category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All complaints (overall)</SelectItem>
                {meta?.categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={windowLbl} onValueChange={setWindowLbl}>
              <SelectTrigger className="w-44" aria-label="Filter time window">
                <SelectValue placeholder="Window" />
              </SelectTrigger>
              <SelectContent>
                {meta?.windows.map((w) => (
                  <SelectItem key={w} value={w}>{windowLabel(w)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={significance} onValueChange={(v) => setSignificance(v as SignificanceFilter)}>
              <SelectTrigger className="w-40" aria-label="Filter significance">
                <SelectValue placeholder="Significance" />
              </SelectTrigger>
              <SelectContent>
                {SIG_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {loading ? '…' : `${cells.length.toLocaleString()} cells`}
            </span>
          </div>

          {loading ? (
            <Skeleton className="h-[560px] w-full rounded-2xl" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70 shadow-premium">
              <HotspotMap cells={cells} height="560px" />
            </div>
          )}

          {/* Confidence-band legend. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Confidence band:</span>
            {[...HOT_BANDS, ...COLD_BANDS].map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: bandStyle(b).color }} />
                {bandStyle(b).label}
              </span>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          {/* Significance tally for the current filter. */}
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-premium">
            <h2 className="mb-3 text-sm font-semibold">Significant cells</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Hot" value={HOT_BANDS.reduce((s, b) => s + (tally[b] ?? 0), 0)} color="#ef4444" />
              <Stat label="Cold" value={COLD_BANDS.reduce((s, b) => s + (tally[b] ?? 0), 0)} color="#3b82f6" />
            </div>
            <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
              {[...HOT_BANDS, ...COLD_BANDS].map((b) => (
                (tally[b] ?? 0) > 0 && (
                  <div key={b} className="flex items-center justify-between">
                    <dt className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: bandStyle(b).color }} />
                      {bandStyle(b).label}
                    </dt>
                    <dd className="font-medium text-foreground">{tally[b]}</dd>
                  </div>
                )
              ))}
            </dl>
          </div>

          {/* Strongest hot cells. */}
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-premium">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Flame className="h-4 w-4 text-orange-500" /> Strongest hotspots
            </h2>
            {topHot.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hot cells for this filter.</p>
            ) : (
              <ol className="space-y-2">
                {topHot.map((c) => (
                  <li key={c.cell_key} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: bandStyle(c.significance).color }} />
                      <span className="tabular-nums text-muted-foreground">{c.lat.toFixed(3)}, {c.lon.toFixed(3)}</span>
                    </span>
                    <span className="tabular-nums">
                      <span className="font-medium">{c.count.toLocaleString()}</span>
                      <span className="ml-2 text-xs text-muted-foreground">z={c.gi_z?.toFixed(1) ?? '—'}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
