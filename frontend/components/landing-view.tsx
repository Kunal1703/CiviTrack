'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Plus, LogIn, Sparkles, MapPin, Search, Building2, CheckCircle2,
  Megaphone, Route, LineChart, Cpu, ShieldCheck, Brain, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Magnetic } from '@/components/magnetic'
import { CivicCanvas } from '@/components/citizen/civic-canvas'
import { CategoryBadge } from '@/components/category-badge'
import { useAuth } from '@/components/auth-provider'
import { getCategory, CATEGORIES } from '@/lib/categories'

// ── Animated pipeline demo ──────────────────────────────────────────────────
const SAMPLES = [
  { text: 'Street light near Chandni Chowk has been out for two weeks', category: 'Street Light', area: 'Chandni Chowk', dept: 'Street Lighting', similar: 3 },
  { text: 'Garbage overflowing near the Connaught Place market', category: 'Sanitation', area: 'Connaught Place', dept: 'Sanitation', similar: 5 },
  { text: 'Large pothole on the road near Karol Bagh', category: 'Street Condition', area: 'Karol Bagh', dept: 'Public Works', similar: 2 },
]

const STAGES = [
  { icon: Megaphone, label: 'Citizen reports' },
  { icon: Brain, label: 'AI classifies' },
  { icon: Search, label: 'Finds similar reports' },
  { icon: Route, label: 'Locates & routes' },
  { icon: CheckCircle2, label: 'Officials act' },
]

function PipelineDemo() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [s, setS] = useState(0)
  const sample = SAMPLES[s]
  const cat = getCategory(sample.category)

  useEffect(() => {
    if (reduce) { setActive(STAGES.length - 1); return }
    const id = setInterval(() => {
      setActive((a) => {
        if (a >= STAGES.length - 1) { setS((v) => (v + 1) % SAMPLES.length); return 0 }
        return a + 1
      })
    }, 1600)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <div className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-premium backdrop-blur sm:p-8">
      {/* Sample being processed */}
      <div className="mx-auto mb-8 max-w-xl">
        <motion.div key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">A citizen writes:</p>
          <p className="mt-1 font-medium">“{sample.text}”</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <motion.span initial={false} animate={{ opacity: active >= 1 ? 1 : 0.25, scale: active >= 1 ? 1 : 0.9 }}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
              style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
              <cat.Icon className="h-3.5 w-3.5" /> {sample.category}
            </motion.span>
            <motion.span animate={{ opacity: active >= 2 ? 1 : 0.25 }} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              <Search className="h-3 w-3" /> {sample.similar} similar nearby
            </motion.span>
            <motion.span animate={{ opacity: active >= 3 ? 1 : 0.25 }} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {sample.area}
            </motion.span>
            <motion.span animate={{ opacity: active >= 4 ? 1 : 0.25 }} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              <Building2 className="h-3 w-3" /> {sample.dept}
            </motion.span>
          </div>
        </motion.div>
      </div>

      {/* Stage rail */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto sm:gap-2">
        {STAGES.map((st, i) => {
          const on = i <= active
          return (
            <div key={st.label} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-[92px] flex-col items-center gap-2 text-center">
                <motion.span animate={{
                  backgroundColor: on ? 'var(--primary)' : 'var(--muted)',
                  color: on ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  scale: i === active ? 1.12 : 1,
                }} transition={{ duration: 0.35 }}
                  className="grid h-11 w-11 place-items-center rounded-xl">
                  <st.icon className="h-5 w-5" />
                </motion.span>
                <span className={`text-[11px] font-medium leading-tight ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{st.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                  <motion.div className="h-full rounded-full bg-primary" initial={false}
                    animate={{ width: i < active ? '100%' : '0%' }} transition={{ duration: 0.5 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Narrative section ───────────────────────────────────────────────────────
function Narrative({
  eyebrow, title, body, icon: Icon, children, flip, index,
}: {
  eyebrow: string; title: string; body: string; icon: React.ComponentType<{ className?: string }>
  children?: React.ReactNode; flip?: boolean; index: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="grid items-center gap-8 py-14 sm:py-20 md:grid-cols-2"
    >
      <div className={flip ? 'md:order-2' : ''}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-primary">
          <Icon className="h-3.5 w-3.5" /> {eyebrow}
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h2>
        <p className="mt-3 text-muted-foreground text-pretty">{body}</p>
      </div>
      <div className={flip ? 'md:order-1' : ''}>{children}</div>
    </motion.section>
  )
}

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-border/70 bg-card/60 p-6 shadow-premium ${className ?? ''}`}>{children}</div>
}

export function LandingView() {
  const { user } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  const primaryCta =
    user?.role === 'admin'
      ? { href: '/admin', label: 'Open operations', icon: ShieldCheck }
      : user?.role === 'citizen'
        ? { href: '/citizen/report', label: 'Report an issue', icon: Plus }
        : { href: '/login', label: 'Get started', icon: LogIn }

  return (
    <div ref={ref} className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 opacity-70"><CivicCanvas /></div>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,transparent_40%,var(--background)_85%)]" />
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered civic intelligence · Delhi
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              Turn civic complaints into <span className="text-gradient">intelligent action</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
              CiviTrack AI understands every citizen report the moment it arrives — classifying it, spotting duplicates,
              mapping it, and routing it — so cities can act on problems, not paperwork.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
              <Magnetic className="inline-block">
                <Button asChild size="lg" className="gap-2 shadow-glow">
                  <Link href={primaryCta.href}><primaryCta.icon className="h-5 w-5" /> {primaryCta.label}</Link>
                </Button>
              </Magnetic>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/architecture"><Cpu className="h-5 w-5" /> How it’s built</Link>
              </Button>
            </div>

            {/* Animated category chips */}
            <motion.div initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } } }}
              className="mt-12 flex max-w-2xl flex-wrap justify-center gap-2">
              {CATEGORIES.slice(0, 9).map((c) => (
                <motion.div key={c.name} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                  <CategoryBadge name={c.name} size="sm" />
                </motion.div>
              ))}
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground">+{CATEGORIES.length - 9} more</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pipeline demo */}
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">One intelligent pipeline</h2>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground">From a citizen’s words to municipal action — watch a report flow through.</p>
            </div>
            <PipelineDemo />
          </motion.div>
        </div>
      </section>

      {/* Scroll narrative */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <Narrative index={0} eyebrow="The problem" icon={MapPin}
          title="What’s happening in your city?"
          body="Every day, thousands of civic issues — broken lights, overflowing bins, potholes — are reported across fragmented channels and quietly lost. Cities react to today’s queue with no clear view of the whole.">
          <GlassPanel><div className="h-48 overflow-hidden rounded-2xl"><CivicCanvas /></div></GlassPanel>
        </Narrative>

        <Narrative index={1} flip eyebrow="Report" icon={Plus}
          title="Report an issue in seconds"
          body="A citizen describes the problem in plain words and drops a pin on the map. No forms to decode, no categories to guess — just tell the city what’s wrong.">
          <GlassPanel>
            <p className="text-sm text-muted-foreground">Describe the issue</p>
            <p className="mt-1 font-medium">“No street light near the park for a week.”</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary" /> Pinned on the Delhi map</div>
          </GlassPanel>
        </Narrative>

        <Narrative index={2} eyebrow="Understand" icon={Brain}
          title="AI understands it"
          body="A fine-tuned language model reads the report and assigns the right category with a confidence score. Semantic search then finds genuinely similar reports nearby — meaning, not just keywords.">
          <GlassPanel className="space-y-3">
            <CategoryBadge name="Street Light" />
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full w-[86%] rounded-full bg-primary" /></div>
            <p className="text-xs text-muted-foreground">High confidence · 3 similar reports found nearby</p>
          </GlassPanel>
        </Narrative>

        <Narrative index={3} flip eyebrow="Route" icon={Route}
          title="Your issue is routed"
          body="Location intelligence places the report on the map and helps route it to the right municipal department — with duplicates collapsed so one problem isn’t counted fifteen times.">
          <GlassPanel>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
              <div><p className="text-sm font-medium">Street Lighting Dept.</p><p className="text-xs text-muted-foreground">Routed · duplicates merged</p></div>
            </div>
          </GlassPanel>
        </Narrative>

        <Narrative index={4} eyebrow="See patterns" icon={LineChart}
          title="Cities see patterns"
          body="For officials, individual reports become operational intelligence — where issues cluster, which categories dominate, and how quickly they’re resolved. Problems become visible before they escalate.">
          <GlassPanel>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Yellow', '#eab308'], ['Orange', '#f97316'], ['Red', '#ef4444']].map(([l, c]) => (
                <div key={l} className="rounded-xl border border-border/60 p-3">
                  <span className="mx-auto block h-4 w-4 rounded-full" style={{ background: c }} />
                  <p className="mt-1 text-[11px] text-muted-foreground">{l} zone</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </Narrative>

        <Narrative index={5} flip eyebrow="Act" icon={CheckCircle2}
          title="Problems become actionable"
          body="Citizens follow their report from submitted to resolved. Officials work a prioritized queue. The loop closes — and the city gets a little better, one report at a time.">
          <GlassPanel>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">Resolved</span>
              <span className="text-muted-foreground">· citizen notified</span>
            </div>
          </GlassPanel>
        </Narrative>
      </div>

      {/* Feature showcase */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, t: 'Smart classification', b: 'Every report categorized automatically, with confidence.' },
              { icon: Search, t: 'Duplicate detection', b: 'Similar reports found by meaning and location.' },
              { icon: MapPin, t: 'Location intelligence', b: 'Issues mapped; hotspots surfaced for the city.' },
              { icon: ShieldCheck, t: 'Explainable & role-based', b: 'Citizens and officials each get their own experience.' },
            ].map((f, i) => (
              <motion.div key={f.t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/70 bg-card p-6 shadow-premium">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-accent/10 px-6 py-14 text-center shadow-premium">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-balance">Make your city smarter, one report at a time</h2>
              <p className="mt-3 text-muted-foreground text-pretty">Report an issue, follow it to resolution, and help officials see what needs attention.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2 shadow-glow">
                  <Link href={primaryCta.href}>{primaryCta.label} <ArrowRight className="h-5 w-5" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link href="/architecture"><Layers className="h-5 w-5" /> The architecture</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent"><MapPin className="h-5 w-5 text-primary-foreground" /></div>
            <span className="font-semibold tracking-tight">CiviTrack <span className="text-primary">AI</span></span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/architecture" className="hover:text-foreground">How it’s built</Link>
            <span>Intelligent Urban Complaint Management</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
