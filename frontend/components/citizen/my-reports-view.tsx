'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Inbox, AlertCircle, Plus, MapPin, ArrowUpRight, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/citizen/status-pill'
import { getCategory } from '@/lib/categories'
import { listMyComplaints, type Complaint } from '@/lib/complaints-api'
import { STATUS_FLOW, statusMeta } from '@/lib/status'

const PAGE = 20

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function ReportCard({ c, index }: { c: Complaint; index: number }) {
  const cat = getCategory(c.category)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        href={`/citizen/reports/${c.id}`}
        className="group block rounded-2xl border border-border/70 bg-card p-4 shadow-premium transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
            <cat.Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium">{c.title}</p>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">{c.public_ref}</span>
              <span>{c.category ?? 'Other'}</span>
              {c.address_text && (
                <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{c.address_text}</span>
              )}
              <span>{fmtDate(c.created_at)}</span>
            </div>
          </div>
          <StatusPill status={c.status} className="shrink-0" />
        </div>
      </Link>
    </motion.div>
  )
}

export function MyReportsView() {
  const [items, setItems] = useState<Complaint[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState<string>('all')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')

  // Debounce the search input.
  const [debouncedQ, setDebouncedQ] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    listMyComplaints(
      {
        q: debouncedQ || undefined,
        status: statusF === 'all' ? undefined : statusF,
        order,
        limit: PAGE,
        offset: 0,
      },
      ctrl.signal,
    )
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(err.message ?? 'Could not load your reports')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [debouncedQ, statusF, order])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const res = await listMyComplaints({
        q: debouncedQ || undefined,
        status: statusF === 'all' ? undefined : statusF,
        order,
        limit: PAGE,
        offset: items.length,
      })
      setItems((prev) => [...prev, ...res.items])
      setTotal(res.total)
    } catch {
      /* ignore; user can retry */
    } finally {
      setLoadingMore(false)
    }
  }

  const filtersActive = useMemo(() => debouncedQ !== '' || statusF !== 'all', [debouncedQ, statusF])

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your reports…"
            className="pl-9" aria-label="Search your reports" />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_FLOW.map((s) => (
              <SelectItem key={s} value={s}>{statusMeta(s).label}</SelectItem>
            ))}
            <SelectItem value="rejected">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={order} onValueChange={(v) => setOrder(v as 'desc' | 'asc')}>
          <SelectTrigger className="sm:w-40" aria-label="Sort order"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* States */}
      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading reports">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 p-4">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setStatusF((s) => s)}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Inbox className="h-7 w-7" />
          </span>
          {filtersActive ? (
            <>
              <p className="font-medium">No matching reports</p>
              <p className="max-w-sm text-sm text-muted-foreground">Try a different search or status filter.</p>
            </>
          ) : (
            <>
              <p className="font-medium">You haven’t reported anything yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                When you report a civic issue, it’ll show up here so you can follow its progress.
              </p>
              <Button asChild className="mt-1 gap-2">
                <Link href="/citizen/report"><Plus className="h-4 w-4" /> Report an issue</Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((c, i) => <ReportCard key={c.id} c={c} index={i} />)}
          </div>
          {items.length < total && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more ({total - items.length} more)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
