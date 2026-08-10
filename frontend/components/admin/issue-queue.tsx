'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, AlertCircle, Inbox, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminStatusBadge, PriorityBadge } from '@/components/admin/admin-badges'
import { getCategory, CATEGORIES } from '@/lib/categories'
import { ALL_STATUSES, ADMIN_STATUS_LABEL, PRIORITIES } from '@/lib/status'
import {
  listComplaints, getDepartments, type Complaint, type Department,
} from '@/lib/complaints-api'

const PAGE = 15

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })
}

export function IssueQueue() {
  const router = useRouter()
  const [items, setItems] = useState<Complaint[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])

  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [priority, setPriority] = useState('all')
  const [departmentId, setDepartmentId] = useState('all')
  const [source, setSource] = useState('all')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => { setPage(0) }, [status, category, priority, departmentId, source, sort, order])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    listComplaints(
      {
        q: dq || undefined,
        status: status === 'all' ? undefined : status,
        category: category === 'all' ? undefined : category,
        priority: priority === 'all' ? undefined : priority,
        department_id: departmentId === 'all' ? undefined : Number(departmentId),
        source: source === 'all' ? undefined : source,
        sort, order, limit: PAGE, offset: page * PAGE,
      },
      ctrl.signal,
    )
      .then((res) => { setItems(res.items); setTotal(res.total) })
      .catch((err) => { if (err?.name !== 'AbortError') setError(err.message ?? 'Could not load complaints') })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [dq, status, category, priority, departmentId, source, sort, order, page])

  const toggleSort = (col: string) => {
    if (sort === col) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else { setSort(col); setOrder('desc') }
  }

  const from = total === 0 ? 0 : page * PAGE + 1
  const to = Math.min(total, (page + 1) * PAGE)
  const filtersActive = useMemo(
    () => [dq, status, category, priority, departmentId, source].some((v) => v && v !== 'all'),
    [dq, status, category, priority, departmentId, source],
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, description, ref…"
            className="pl-9" aria-label="Search complaints" />
        </div>
        <FilterSelect value={status} onValueChange={setStatus} placeholder="Status" width="w-36"
          options={[['all', 'All statuses'], ...ALL_STATUSES.map((s) => [s, ADMIN_STATUS_LABEL[s]] as [string, string])]} />
        <FilterSelect value={category} onValueChange={setCategory} placeholder="Category" width="w-44"
          options={[['all', 'All categories'], ...CATEGORIES.map((c) => [c.name, c.name] as [string, string])]} />
        <FilterSelect value={priority} onValueChange={setPriority} placeholder="Priority" width="w-32"
          options={[['all', 'Any priority'], ...PRIORITIES.map((p) => [p, p[0].toUpperCase() + p.slice(1)] as [string, string])]} />
        <FilterSelect value={departmentId} onValueChange={setDepartmentId} placeholder="Department" width="w-44"
          options={[['all', 'All departments'], ...departments.map((d) => [String(d.id), d.name] as [string, string])]} />
        <FilterSelect value={source} onValueChange={setSource} placeholder="Source" width="w-40"
          options={[['all', 'All sources'], ['web', 'Citizen submitted'], ['seed_delhi_demo', 'Demo data']]} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Complaint</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <SortableTh label="Priority" col="priority" sort={sort} order={order} onSort={toggleSort} />
                <SortableTh label="Status" col="status" sort={sort} order={order} onSort={toggleSort} />
                <SortableTh label="Submitted" col="created_at" sort={sort} order={order} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td colSpan={6} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-destructive">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6" />{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2 h-7 w-7" />
                  {filtersActive ? 'No complaints match these filters.' : 'No complaints yet.'}</td></tr>
              ) : (
                items.map((c) => {
                  const cat = getCategory(c.category)
                  return (
                    <tr key={c.id} onClick={() => router.push(`/admin/issues/${c.id}`)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open complaint ${c.public_ref}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(`/admin/issues/${c.id}`)
                        }
                      }}
                      className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{c.public_ref}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <cat.Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{c.category ?? 'Uncategorized'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {c.reporter_name ?? (c.is_demo ? 'Demo' : '—')}
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-4 py-3"><AdminStatusBadge status={c.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {loading ? 'Loading…' : `${from}–${to} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={to >= total || loading}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              aria-label="Next page">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  value, onValueChange, placeholder, options, width,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder: string
  options: [string, string][]
  width: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={width} aria-label={placeholder}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function SortableTh({
  label, col, sort, order, onSort,
}: {
  label: string
  col: string
  sort: string
  order: 'asc' | 'desc'
  onSort: (c: string) => void
}) {
  const active = sort === col
  return (
    <th className="px-4 py-3 font-medium">
      <button onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'text-primary' : 'opacity-40'}`} />
        {active && <span className="sr-only">{order === 'asc' ? 'ascending' : 'descending'}</span>}
      </button>
    </th>
  )
}
