'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft, MapPin, Calendar, User, AlertCircle, Sparkles, Lock, MessageSquare,
  CircleDot, FileText, Flag, Loader2, Send, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DelhiMap } from '@/components/citizen/delhi-map'
import { SimilarReports, type SimilarItem } from '@/components/citizen/similar-reports'
import { AdminStatusBadge } from '@/components/admin/admin-badges'
import { getCategory, CATEGORIES } from '@/lib/categories'
import { ALL_STATUSES, ADMIN_STATUS_LABEL, PRIORITIES } from '@/lib/status'
import {
  getComplaint, getComplaintUpdates, patchComplaint, addComplaintNote,
  getDepartments, type Complaint, type ComplaintUpdate, type Department,
} from '@/lib/complaints-api'
import { relatedComplaints } from '@/lib/semantic-api'
import { getAssignees, type Assignee } from '@/lib/admin-api'

const UPDATE_ICON: Record<string, typeof FileText> = {
  created: FileText, status_change: CircleDot, assignment: Flag,
  note: MessageSquare, category_override: Sparkles,
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function IssueWorkspace({ id }: { id: string }) {
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([])
  const [related, setRelated] = useState<SimilarItem[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const reloadUpdates = useCallback(() => {
    getComplaintUpdates(id).then(setUpdates).catch(() => {})
  }, [id])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true); setNotFound(false)
    getComplaint(id, ctrl.signal)
      .then((c) => {
        setComplaint(c)
        getComplaintUpdates(id).then(setUpdates).catch(() => {})
        relatedComplaints(String(c.id), 5, 'delhi')
          .then((r) => setRelated(r.results.filter((x) => String(x.complaint_id) !== String(c.id))))
          .catch(() => {})
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        if (/404|not found/i.test(err?.message ?? '')) setNotFound(true)
      })
      .finally(() => setLoading(false))
    getDepartments().then(setDepartments).catch(() => {})
    getAssignees().then(setAssignees).catch(() => {})
    return () => ctrl.abort()
  }, [id])

  async function apply(field: string, patch: Parameters<typeof patchComplaint>[1], label: string) {
    setSaving(field)
    try {
      const updated = await patchComplaint(id, patch)
      setComplaint(updated)
      reloadUpdates()
      toast.success(label)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(null)
    }
  }

  async function submitNote() {
    if (!note.trim()) return
    setSaving('note')
    try {
      await addComplaintNote(id, note.trim(), 'internal')
      setNote('')
      reloadUpdates()
      toast.success('Internal note added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add note')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full rounded-2xl" /></div>
  }
  if (notFound || !complaint) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Complaint not found</p>
        <Button asChild variant="outline" className="mt-1 gap-2"><Link href="/admin/issues"><ArrowLeft className="h-4 w-4" /> Back to queue</Link></Button>
      </div>
    )
  }

  const cat = getCategory(complaint.category)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Link href="/admin/issues"><ArrowLeft className="h-4 w-4" /> Queue</Link>
        </Button>
        <AdminStatusBadge status={complaint.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-premium">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: `${cat.color}1f`, color: cat.color }}>
                <cat.Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">{complaint.title}</h1>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{complaint.public_ref}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6">{complaint.description}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Meta icon={User} label="Reporter" value={complaint.reporter_name ?? (complaint.is_demo ? 'Demo data' : '—')} />
              <Meta icon={Calendar} label="Submitted" value={fmtDateTime(complaint.created_at)} />
              {complaint.address_text && <Meta icon={MapPin} label="Location" value={complaint.address_text} />}
              <Meta icon={Sparkles} label="AI category"
                value={complaint.category
                  ? `${complaint.category}${complaint.category_confidence != null ? ` · ${Math.round(complaint.category_confidence * 100)}%` : ''}${complaint.category_overridden ? ' (overridden)' : ''}`
                  : 'Not classified'} />
            </div>

            {complaint.latitude != null && complaint.longitude != null && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
                <DelhiMap height="200px" interactive={false} showMarkers={false}
                  center={[complaint.latitude, complaint.longitude]} zoom={15}
                  selected={{ lat: complaint.latitude, lng: complaint.longitude }} />
              </div>
            )}
          </div>

          {/* Timeline (incl. internal) */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-premium">
            <h2 className="mb-4 text-sm font-semibold">Activity & history</h2>
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="space-y-4">
                {updates.map((u) => {
                  const Icon = UPDATE_ICON[u.type] ?? CircleDot
                  const internal = u.visibility === 'internal'
                  return (
                    <li key={u.id} className="flex gap-3">
                      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${internal ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm">
                          {u.note ?? u.type.replace('_', ' ')}
                          {internal && (
                            <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 align-middle text-[10px] font-medium text-amber-500">
                              <Lock className="h-2.5 w-2.5" /> Internal
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDateTime(u.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {related.length > 0 && <SimilarReports items={related} variant="related" linkBase="/admin/issues" />}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
            <h2 className="mb-4 text-sm font-semibold">Manage</h2>
            <div className="space-y-4">
              <Field label="Status" saving={saving === 'status'}>
                <Select value={complaint.status} onValueChange={(v) => apply('status', { status: v }, `Status → ${ADMIN_STATUS_LABEL[v as keyof typeof ADMIN_STATUS_LABEL]}`)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{ADMIN_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Priority" saving={saving === 'priority'}>
                <Select value={complaint.priority} onValueChange={(v) => apply('priority', { priority: v }, `Priority → ${v}`)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Category (override)" saving={saving === 'category'}>
                <Select value={complaint.category ?? undefined}
                  onValueChange={(v) => apply('category', { category: v }, `Category → ${v}`)}>
                  <SelectTrigger><SelectValue placeholder="Set category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        <span className="flex items-center gap-2"><c.Icon className="h-3.5 w-3.5" style={{ color: c.color }} />{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Department" saving={saving === 'department'}>
                <Select value={complaint.department_id ? String(complaint.department_id) : undefined}
                  onValueChange={(v) => apply('department', { department_id: Number(v) }, 'Department assigned')}>
                  <SelectTrigger><SelectValue placeholder="Assign department" /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Field label="Assignee" saving={saving === 'assignee'}>
                <Select value={complaint.assignee_id ? String(complaint.assignee_id) : undefined}
                  onValueChange={(v) => apply('assignee', { assignee_id: Number(v) }, 'Assigned')}>
                  <SelectTrigger><SelectValue placeholder="Assign to official" /></SelectTrigger>
                  <SelectContent>{assignees.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* Internal note */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
            <Label htmlFor="note" className="flex items-center gap-1.5 text-sm font-semibold">
              <Lock className="h-3.5 w-3.5 text-amber-500" /> Internal note
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">Only visible to officials — never shown to the citizen.</p>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Add an internal note…" className="mt-2" />
            <Button size="sm" className="mt-2 w-full gap-2" onClick={submitNote} disabled={!note.trim() || saving === 'note'}>
              {saving === 'note' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Add note
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, saving, children }: { label: string; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </div>
      {children}
    </div>
  )
}

function Meta({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  )
}
