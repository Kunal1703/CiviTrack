'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Plus, ArrowRight, MapPin, Inbox, Sparkles, Layers, ShieldCheck, Lightbulb,
  ClipboardList, Bell, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CivicCanvas } from '@/components/citizen/civic-canvas'
import { DelhiMap } from '@/components/citizen/delhi-map'
import { StatusPill } from '@/components/citizen/status-pill'
import { useAuth } from '@/components/auth-provider'
import { getCategory } from '@/lib/categories'
import { listMyComplaints, getCommunityMap, type Complaint, type MapPoint } from '@/lib/complaints-api'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const STATUS_TILES = [
  { key: 'new', label: 'Submitted', tone: 'text-sky-500', ring: 'ring-sky-500/20 bg-sky-500/5' },
  { key: 'triaged', label: 'Under Review', tone: 'text-violet-500', ring: 'ring-violet-500/20 bg-violet-500/5' },
  { key: 'in_progress', label: 'In Progress', tone: 'text-amber-500', ring: 'ring-amber-500/20 bg-amber-500/5' },
  { key: 'resolved', label: 'Resolved', tone: 'text-green-500', ring: 'ring-green-500/20 bg-green-500/5' },
] as const

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

export function CitizenDashboard() {
  const { user } = useAuth()
  const [mine, setMine] = useState<Complaint[]>([])
  const [community, setCommunity] = useState<MapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [mapMode, setMapMode] = useState<'issues' | 'hotspots'>('issues')

  useEffect(() => {
    const ctrl = new AbortController()
    Promise.all([
      listMyComplaints({ limit: 100 }, ctrl.signal).catch(() => ({ items: [], total: 0, limit: 0, offset: 0 })),
      getCommunityMap(ctrl.signal).catch(() => [] as MapPoint[]),
    ])
      .then(([list, map]) => {
        setMine(list.items)
        setCommunity(map)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const it of mine) c[it.status] = (c[it.status] ?? 0) + 1
    return c
  }, [mine])

  const active = useMemo(
    () => mine.filter((c) => ['new', 'triaged', 'in_progress'].includes(c.status)).slice(0, 4),
    [mine],
  )
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 opacity-70">
          <CivicCanvas />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,transparent_40%,var(--background)_85%)]" />
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Delhi
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              {greeting()}, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
              Something not right in your neighbourhood? Report it in seconds and follow it all the way to resolution.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 shadow-glow">
                <Link href="/citizen/report"><Plus className="h-5 w-5" /> Report an issue</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/citizen/reports"><ClipboardList className="h-5 w-5" /> My reports</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-14 sm:px-6 lg:px-8">
        {/* ── Status summary ── */}
        <Section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Your reports at a glance</h2>
            <Link href="/citizen/reports" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_TILES.map((t, i) => (
              <motion.div key={t.key} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className={`rounded-2xl p-4 ring-1 ring-inset ${t.ring}`}>
                {loading ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <p className={`text-3xl font-bold ${t.tone}`}>{counts[t.key] ?? 0}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">{t.label}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── Active reports ── */}
        <Section>
          <div className="mb-4 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Active reports</h2>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
          ) : active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
              <ShieldCheck className="h-8 w-8 text-green-500" />
              <p className="font-medium">Everything looks clear</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                You have no active reports. If something needs attention, let the city know.
              </p>
              <Button asChild size="sm" className="mt-1 gap-2">
                <Link href="/citizen/report"><Plus className="h-4 w-4" /> Report an issue</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((c) => {
                const cat = getCategory(c.category)
                return (
                  <Link key={c.id} href={`/citizen/reports/${c.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-premium transition-all hover:-translate-y-0.5 hover:border-primary/40">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                      style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
                      <cat.Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">{c.public_ref}</p>
                    </div>
                    <StatusPill status={c.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Community map ── */}
        <Section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">What’s happening around Delhi</h2>
            </div>
            <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
              {(['issues', 'hotspots'] as const).map((m) => (
                <button key={m} onClick={() => setMapMode(m)}
                  className={`rounded-md px-3 py-1 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mapMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-pressed={mapMode === m}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/70 shadow-premium">
            <DelhiMap points={community} height="380px"
              showMarkers={mapMode === 'issues'} showHeat={mapMode === 'hotspots'} />
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {mapMode === 'hotspots'
              ? 'Warmer colours mean more reports in an area (yellow → orange → red).'
              : 'Each pin is a reported civic issue, coloured by category.'}
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5">Demo Delhi data</span>
          </p>
        </Section>

        {/* ── Civic guidance ── */}
        <Section>
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">How CiviTrack helps</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Sparkles, title: 'Smart categorisation', text: 'Describe the problem in your own words — we suggest the right category automatically.' },
              { icon: Bell, title: 'Stay updated', text: 'Follow each report through review, assignment, and resolution — no chasing required.' },
              { icon: ShieldCheck, title: 'Avoid duplicates', text: 'We gently flag if a similar issue nearby was already reported, so nothing gets lost.' },
            ].map((g, i) => (
              <motion.div key={g.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-premium">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <g.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-medium">{g.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{g.text}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── CTA ── */}
        <Section>
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-accent/10 px-6 py-12 text-center shadow-premium">
            <h2 className="text-2xl font-bold tracking-tight text-balance">See something? Report it.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              It takes less than a minute, and it helps make Delhi work better for everyone.
            </p>
            <Button asChild size="lg" className="mt-6 gap-2 shadow-glow">
              <Link href="/citizen/report">Report an issue <ArrowRight className="h-5 w-5" /></Link>
            </Button>
          </div>
        </Section>
      </div>
    </div>
  )
}
