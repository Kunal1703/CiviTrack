'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Reveal, SectionHeader, Eyebrow, StatCard, StatGrid, PageContainer } from '@/components/ui-kit'
import { CategoryBadge } from '@/components/category-badge'
import { CATEGORIES } from '@/lib/categories'
import { mockSummaryStats } from '@/lib/mock-data'
import { staggerContainer, fadeInUp } from '@/lib/motion'
import {
  Sparkles,
  Plus,
  BarChart3,
  ArrowRight,
  Brain,
  MapPin,
  Gauge,
  ShieldCheck,
  Layers,
  Server,
  Database,
  MonitorSmartphone,
} from 'lucide-react'

function HeroAurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -top-32 left-1/4 h-[36rem] w-[36rem] rounded-full bg-primary/20 blur-[120px]"
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -top-20 right-1/4 h-[30rem] w-[30rem] rounded-full bg-accent/20 blur-[120px]"
        animate={{ y: [0, -24, 0], x: [0, -18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,var(--background)_80%)]" />
    </div>
  )
}

const features = [
  { icon: Brain, title: 'AI classification', text: 'A fine-tuned DistilBERT model reads each complaint and assigns a category in real time — no manual triage.' },
  { icon: Gauge, title: 'Confidence scoring', text: 'Every prediction ships with a calibrated confidence score, so operators know when to trust automation.' },
  { icon: MapPin, title: 'Geospatial hotspots', text: 'PostGIS clusters reports by location to surface the streets and wards that need attention first.' },
  { icon: ShieldCheck, title: 'Explainable & auditable', text: 'Decisions are transparent and versioned — essential for public-sector accountability.' },
]

const pipeline = [
  { icon: MonitorSmartphone, label: 'Next.js', sub: 'Frontend' },
  { icon: Layers, label: 'FastAPI', sub: 'Gateway' },
  { icon: Server, label: 'ml_service', sub: 'DistilBERT' },
  { icon: Database, label: 'PostgreSQL', sub: 'PostGIS + pgvector' },
]

export default function HomePage() {
  const stats = mockSummaryStats

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <HeroAurora />
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center">
            <motion.div variants={fadeInUp}>
              <Eyebrow icon={Sparkles}>AI-Powered · DistilBERT live</Eyebrow>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="mt-6 text-4xl font-bold tracking-tight text-foreground text-balance sm:text-6xl"
            >
              Turn civic complaints into <span className="text-gradient">intelligent action</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
              CiviTrack AI classifies, prioritizes, and maps every citizen report the moment it arrives —
              giving municipal teams a real-time, explainable view of what their city needs.
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 shadow-glow">
                <Link href="/report">
                  <Plus className="h-5 w-5" />
                  Report an issue
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/dashboard">
                  <BarChart3 className="h-5 w-5" />
                  View analytics
                </Link>
              </Button>
            </motion.div>

            {/* Live taxonomy chips */}
            <motion.div variants={fadeInUp} className="mt-12 flex max-w-2xl flex-wrap justify-center gap-2">
              {CATEGORIES.slice(0, 8).map((c) => (
                <CategoryBadge key={c.name} name={c.name} size="sm" />
              ))}
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground">
                +{CATEGORIES.length - 8} more
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border/60">
        <PageContainer>
          <StatGrid>
            <StatCard label="Reports processed" value={stats.total_issues} sublabel="All time" icon={BarChart3} accent="primary" index={0} />
            <StatCard label="AI categories" value={CATEGORIES.length} sublabel="Auto-classified" icon={Brain} accent="accent" index={1} />
            <StatCard label="Avg. resolution" value={stats.avg_resolution_hours} suffix="h" sublabel="Across all issues" icon={Gauge} accent="success" index={2} />
            <StatCard label="Resolved" value={stats.resolved} sublabel={`${stats.resolved_today} today`} icon={ShieldCheck} accent="warning" index={3} />
          </StatGrid>
        </PageContainer>
      </section>

      {/* Features */}
      <section>
        <PageContainer className="py-16">
          <Reveal>
            <SectionHeader
              center
              eyebrow="How it works"
              eyebrowIcon={Sparkles}
              title="One pipeline, from report to resolution"
              description="Every complaint flows through the same intelligent path — understood, prioritized, and routed automatically."
            />
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="hover-lift group h-full rounded-2xl border border-border/70 bg-card p-6 shadow-premium">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Architecture preview */}
      <section className="border-y border-border/60 bg-muted/30">
        <PageContainer className="py-16">
          <Reveal>
            <SectionHeader
              center
              eyebrow="Architecture"
              eyebrowIcon={Layers}
              title="Production-grade by design"
              description="A modular, service-oriented platform — the same shape a real smart-city product would ship."
            />
          </Reveal>
          <div className="mx-auto mt-12 flex max-w-4xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            {pipeline.map((node, i) => (
              <div key={node.label} className="flex items-center gap-3 sm:flex-col sm:gap-0">
                <Reveal delay={i * 0.08} className="w-full">
                  <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-premium sm:w-40 sm:flex-col sm:items-center sm:text-center">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <node.icon className="h-5 w-5" />
                    </span>
                    <div className="sm:mt-2">
                      <p className="text-sm font-semibold leading-tight">{node.label}</p>
                      <p className="text-xs text-muted-foreground">{node.sub}</p>
                    </div>
                  </div>
                </Reveal>
                {i < pipeline.length - 1 && (
                  <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
                )}
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* CTA */}
      <section>
        <PageContainer className="py-16">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-accent/10 px-6 py-14 text-center shadow-premium">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative mx-auto max-w-2xl">
                <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-balance">Make your city smarter, one report at a time</h2>
                <p className="mt-3 text-muted-foreground text-pretty">
                  Try the live AI — describe any civic issue and watch it get classified in real time.
                </p>
                <Button asChild size="lg" className="mt-8 gap-2 shadow-glow">
                  <Link href="/report">
                    Report an issue now
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </PageContainer>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <PageContainer className="py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold tracking-tight">CiviTrack <span className="text-primary">AI</span></span>
            </div>
            <p className="text-sm text-muted-foreground">Intelligent Urban Complaint Management</p>
          </div>
        </PageContainer>
      </footer>
    </div>
  )
}
