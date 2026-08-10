'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Inbox, Loader2, CheckCircle2, Flame, Copy, ArrowUpRight,
  Clock, ChevronRight, Layers,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DelhiMap } from '@/components/citizen/delhi-map'
import { AdminStatusBadge, PriorityBadge } from '@/components/admin/admin-badges'
import { getCategory } from '@/lib/categories'
import { getAdminStats, type AdminStats } from '@/lib/admin-api'
import { listComplaints, getCommunityMap, type Complaint, type MapPoint } from '@/lib/complaints-api'

const TILES = [
  { key: 'open', label: 'Open issues', icon: Inbox, tone: 'text-sky-500', ring: 'ring-sky-500/20 bg-sky-500/5' },
  { key: 'new_today', label: 'New today', icon: Clock, tone: 'text-cyan-500', ring: 'ring-cyan-500/20 bg-cyan-500/5' },
  { key: 'in_progress', label: 'In progress', icon: Loader2, tone: 'text-amber-500', ring: 'ring-amber-500/20 bg-amber-500/5' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, tone: 'text-green-500', ring: 'ring-green-500/20 bg-green-500/5' },
  { key: 'high_priority_open', label: 'High priority', icon: AlertTriangle, tone: 'text-red-500', ring: 'ring-red-500/20 bg-red-500/5' },
  { key: 'potential_duplicates', label: 'Potential duplicates', icon: Copy, tone: 'text-violet-500', ring: 'ring-violet-500/20 bg-violet-500/5' },
] as const

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recent, setRecent] = useState<Complaint[]>([])
  const [points, setPoints] = useState<MapPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    Promise.all([
      getAdminStats(ctrl.signal).catch(() => null),
      listComplaints({ limit: 7, sort: 'created_at', order: 'desc' }, ctrl.signal).catch(() => null),
      getCommunityMap(ctrl.signal).catch(() => [] as MapPoint[]),
    ])
      .then(([s, r, p]) => {
        setStats(s)
        setRecent(r?.items ?? [])
        setPoints(p)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const maxCat = stats ? Math.max(...stats.by_category.map((b) => b.count), 1) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What needs attention across Delhi right now.
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">Demo Delhi data</span>
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Avg. resolution time</p>
          <p className="text-lg font-semibold">
            {loading ? '—' : stats?.avg_resolution_hours != null ? `${stats.avg_resolution_hours} h` : 'n/a'}
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {TILES.map((t, i) => (
          <motion.div key={t.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl p-4 ring-1 ring-inset ${t.ring}`}>
            <div className="flex items-center justify-between">
              <t.icon className={`h-4 w-4 ${t.tone}`} />
            </div>
            {loading || !stats ? (
              <Skeleton className="mt-2 h-7 w-10" />
            ) : (
              <p className={`mt-2 text-2xl font-bold ${t.tone}`}>{(stats as any)[t.key] ?? 0}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">{t.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent incoming */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Inbox className="h-4 w-4 text-primary" /> Recent incoming
            </h2>
            <Link href="/admin/issues" className="text-sm text-primary hover:underline">Open queue</Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-premium">
            {loading ? (
              <div className="space-y-px">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : recent.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No complaints yet.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map((c) => {
                  const cat = getCategory(c.category)
                  return (
                    <li key={c.id}>
                      <Link href={`/admin/issues/${c.id}`}
                        className="group flex items-center gap-3 p-3 transition-colors hover:bg-muted/40">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                          style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
                          <cat.Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.title}</p>
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{c.public_ref}</span>
                            <span>· {c.category ?? 'Uncategorized'}</span>
                            <span>· {fmtDate(c.created_at)}</span>
                          </p>
                        </div>
                        <PriorityBadge priority={c.priority} />
                        <AdminStatusBadge status={c.status} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Category snapshot */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" /> Top categories
          </h2>
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-premium">
            {loading || !stats ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : (
              <ul className="space-y-3">
                {stats.by_category.slice(0, 6).map((b, i) => {
                  const cat = getCategory(b.key)
                  return (
                    <li key={b.key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <cat.Icon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                          {b.key}
                        </span>
                        <span className="text-muted-foreground">{b.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: cat.color }}
                          initial={{ width: 0 }} animate={{ width: `${(b.count / maxCat) * 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-orange-500" /> Where issues cluster
          </h2>
          <Link href="/admin/map" className="text-sm text-primary hover:underline">Full map</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/70 shadow-premium">
          <DelhiMap points={points} height="340px" showMarkers showHeat={false} />
        </div>
      </div>
    </div>
  )
}
