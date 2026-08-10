'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, Building2, AlertCircle, FileText, CheckCircle2,
  CircleDot, MessageSquare, Flag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/citizen/status-pill'
import { StatusTimeline } from '@/components/citizen/status-timeline'
import { SimilarReports, type SimilarItem } from '@/components/citizen/similar-reports'
import { DelhiMap } from '@/components/citizen/delhi-map'
import { getCategory } from '@/lib/categories'
import {
  getComplaint, getComplaintUpdates, type Complaint, type ComplaintUpdate,
} from '@/lib/complaints-api'
import { relatedComplaints } from '@/lib/semantic-api'

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const UPDATE_ICON: Record<string, typeof FileText> = {
  created: FileText,
  status_change: CircleDot,
  assignment: Flag,
  note: MessageSquare,
  category_override: CircleDot,
  resolved: CheckCircle2,
}

export function ReportDetailView({ id }: { id: string }) {
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([])
  const [related, setRelated] = useState<SimilarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setNotFound(false)
    Promise.all([getComplaint(id, ctrl.signal), getComplaintUpdates(id, ctrl.signal)])
      .then(([c, u]) => {
        setComplaint(c)
        setUpdates(u)
        // Related is best-effort — never blocks the page.
        relatedComplaints(String(c.id), 4, 'delhi')
          .then((r) => setRelated(r.results.filter((x) => String(x.complaint_id) !== String(c.id))))
          .catch(() => setRelated([]))
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        if (/404|not found/i.test(err?.message ?? '')) setNotFound(true)
        else setError(err?.message ?? 'Could not load this report')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Report not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This report doesn’t exist, or it isn’t one of yours.
        </p>
        <Button asChild variant="outline" className="mt-1 gap-2">
          <Link href="/citizen/reports"><ArrowLeft className="h-4 w-4" /> Back to my reports</Link>
        </Button>
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error ?? 'Something went wrong'}</p>
      </div>
    )
  }

  const cat = getCategory(complaint.category)

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
        <Link href="/citizen/reports"><ArrowLeft className="h-4 w-4" /> My reports</Link>
      </Button>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-premium">
        <div className="relative border-b border-border/60 p-6"
          style={{ background: `linear-gradient(135deg, ${cat.color}14, transparent 60%)` }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: `${cat.color}1f`, color: cat.color }}>
                <cat.Icon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-balance">{complaint.title}</h1>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{complaint.public_ref}</p>
              </div>
            </div>
            <StatusPill status={complaint.status} />
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm leading-6">{complaint.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Meta icon={cat.Icon} label="Category" value={complaint.category ?? 'Other'} color={cat.color} />
              <Meta icon={Flag} label="Priority" value={complaint.priority} />
              <Meta icon={Calendar} label="Submitted" value={fmtDateTime(complaint.created_at)} />
              {complaint.department_name && (
                <Meta icon={Building2} label="Department" value={complaint.department_name} />
              )}
              {complaint.address_text && (
                <Meta icon={MapPin} label="Location" value={complaint.address_text} />
              )}
            </div>
          </div>

          {/* Mini location map */}
          {complaint.latitude != null && complaint.longitude != null && (
            <div className="md:col-span-1">
              <DelhiMap
                height="180px"
                interactive={false}
                showMarkers={false}
                center={[complaint.latitude, complaint.longitude]}
                zoom={15}
                selected={{ lat: complaint.latitude, lng: complaint.longitude }}
              />
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-premium">
          <h2 className="mb-5 text-sm font-semibold">Progress</h2>
          <StatusTimeline status={complaint.status} />
        </div>

        {/* Activity feed (public updates only — server enforces) */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-premium lg:col-span-2">
          <h2 className="mb-5 text-sm font-semibold">Updates</h2>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet. We’ll post here as your report progresses.</p>
          ) : (
            <ol className="space-y-4">
              {updates.map((u, i) => {
                const Icon = UPDATE_ICON[u.type] ?? CircleDot
                return (
                  <motion.li key={u.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }} className="flex gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm">{u.note ?? u.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(u.created_at)}</p>
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Related nearby reports (M3 Delhi) */}
      {related.length > 0 && (
        <SimilarReports items={related} variant="related" linkBase="/citizen/reports" />
      )}
    </div>
  )
}

function Meta({ icon: Icon, label, value, color }: { icon: typeof MapPin; label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" style={color ? { color } : undefined} />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm capitalize">{value}</p>
      </div>
    </div>
  )
}
