'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { getCategory } from '@/lib/categories'
import { statusMeta, ADMIN_STATUS_LABEL, type ComplaintStatus } from '@/lib/status'
import { getAdminStats, type AdminStats } from '@/lib/admin-api'

const TOOLTIP = {
  background: 'rgba(15,23,42,0.96)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 10,
  color: '#e2e8f0',
  fontSize: 12,
}
const AXIS = { fill: 'currentColor', fontSize: 11, opacity: 0.65 }
const PRIORITY_COLOR: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#94a3b8' }

function fmtDay(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/70 bg-card p-5 shadow-premium ${className ?? ''}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 text-muted-foreground">{children}</div>
    </div>
  )
}

export function AnalyticsView() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    getAdminStats(ctrl.signal).then(setStats).catch(() => setStats(null)).finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  if (loading || !stats) {
    return <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
  }

  const volume = stats.volume_30d.map((v) => ({ ...v, label: fmtDay(v.date) }))
  const cats = stats.by_category.map((b) => ({ name: b.key, count: b.count, color: getCategory(b.key).color }))
  const statuses = stats.by_status.map((b) => ({
    name: ADMIN_STATUS_LABEL[b.key as ComplaintStatus] ?? b.key,
    value: b.count,
    color: statusMeta(b.key).dot,
  }))
  const prios = stats.by_priority.map((b) => ({ name: b.key, count: b.count, color: PRIORITY_COLOR[b.key] ?? '#94a3b8' }))
  const depts = stats.by_department

  const kpis = [
    { label: 'Total complaints', value: stats.total },
    { label: 'Resolved', value: stats.resolved },
    { label: 'Avg. resolution', value: stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours} h` : 'n/a' },
    { label: 'Potential duplicates', value: stats.potential_duplicates },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Operational analytics from real complaint data.
        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">Demo Delhi data</span>
      </p>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border/70 bg-card p-4 shadow-premium">
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Volume over time */}
      <Card title="Complaint volume" subtitle="New complaints per day, last 30 days">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={volume} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} interval={4} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} width={34} />
            <Tooltip contentStyle={TOOLTIP} labelStyle={{ color: '#94a3b8' }} />
            <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#vol)" name="Complaints" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category distribution */}
        <Card title="By category">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} horizontal={false} />
              <XAxis type="number" tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS} width={120} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="count" radius={[0, 5, 5, 0]} name="Complaints">
                {cats.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status distribution */}
        <Card title="By status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statuses} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                {statuses.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Priority */}
        <Card title="By priority">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={prios} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
              <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} className="capitalize" />
              <YAxis tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} width={34} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} name="Complaints">
                {prios.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Department workload */}
        <Card title="Department workload">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={depts} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} horizontal={false} />
              <XAxis type="number" tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="key" tick={AXIS} width={130} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="count" radius={[0, 5, 5, 0]} fill="#8b5cf6" name="Complaints" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
