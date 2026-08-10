'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MonitorSmartphone, Layers, Server, Database, ArrowRight, Brain, Search, MapPin,
  GitBranch, ShieldCheck, FlaskConical, Boxes, ArrowLeft,
} from 'lucide-react'

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const PIPELINE = [
  { icon: MonitorSmartphone, label: 'Next.js', sub: 'Frontend (React 19)' },
  { icon: Layers, label: 'FastAPI', sub: 'Gateway · auth · APIs' },
  { icon: Server, label: 'ml_service', sub: 'DistilBERT · MiniLM' },
  { icon: Database, label: 'PostgreSQL', sub: 'PostGIS + pgvector' },
]

const MODELS = [
  {
    icon: Brain, title: 'Complaint classification (M1)',
    body: 'A fine-tuned DistilBERT model classifies each complaint into a 19-category taxonomy, benchmarked against a TF-IDF + logistic-regression baseline. Primary metric: macro-F1. Runs locally on CPU — no paid API.',
  },
  {
    icon: Search, title: 'Semantic understanding (M3)',
    body: 'all-MiniLM-L6-v2 sentence embeddings (384-d) in pgvector with an HNSW cosine index power semantic search and related-complaint retrieval — understanding meaning, not just keywords.',
  },
  {
    icon: MapPin, title: 'Duplicate detection (M3)',
    body: 'A duplicate is high semantic similarity AND spatial proximity (PostGIS ST_DWithin) AND temporal closeness. The spatial-temporal gate is what separates a genuine duplicate from two similar-but-distinct incidents.',
  },
  {
    icon: Boxes, title: 'Clustering (M3)',
    body: 'HDBSCAN over embeddings groups recurring complaint themes (with a K-Means baseline for comparison). Density-based, noise-aware, and evaluated with intrinsic metrics — not asserted.',
  },
]

const STACK = [
  ['Frontend', 'Next.js 16 · React 19 · Tailwind 4 · Framer Motion · Leaflet'],
  ['Gateway', 'FastAPI · Pydantic · argon2 · JWT (httpOnly) · httpx'],
  ['ML service', 'FastAPI · PyTorch · Transformers · sentence-transformers'],
  ['Data', 'PostgreSQL 16 · PostGIS 3.4 · pgvector 0.8 · numbered SQL migrations'],
  ['Ops', 'Docker Compose · MLflow (experiment tracking)'],
]

const ROADMAP = [
  { m: 'M0', t: 'Data & infrastructure', done: true },
  { m: 'M1', t: 'Classification', done: true },
  { m: 'M2', t: 'Product integration', done: true },
  { m: 'M3', t: 'Semantic intelligence', done: true },
  { m: 'M4', t: 'Resolution-time prediction', done: false },
  { m: 'M5', t: 'Geospatial hotspots', done: false },
  { m: 'M6', t: 'Forecasting', done: false },
  { m: 'M7', t: 'LLM / RAG layer', done: false },
]

export function ArchitectureView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      {/* Header */}
      <Reveal className="mt-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5 text-primary" /> Engineering & ML
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-balance sm:text-4xl">How CiviTrack AI is built</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground text-pretty">
          A modular, service-oriented platform — the same shape a real smart-city product would ship. This page is the
          technical deep-dive; the product experiences deliberately keep this language out of the citizen and admin views.
        </p>
      </Reveal>

      {/* Pipeline */}
      <Reveal className="mt-12" delay={0.05}>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          {PIPELINE.map((n, i) => (
            <div key={n.label} className="flex items-center gap-3 sm:flex-col sm:gap-0">
              <div className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-premium sm:w-44 sm:flex-col sm:items-center sm:text-center">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><n.icon className="h-5 w-5" /></span>
                <div className="sm:mt-2">
                  <p className="text-sm font-semibold leading-tight">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.sub}</p>
                </div>
              </div>
              {i < PIPELINE.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />}
            </div>
          ))}
        </div>
      </Reveal>

      {/* Models */}
      <div className="mt-16">
        <Reveal><h2 className="text-xl font-semibold tracking-tight">The machine learning</h2></Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {MODELS.map((m, i) => (
            <Reveal key={m.title} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-border/70 bg-card p-6 shadow-premium">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><m.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Honesty / data provenance */}
      <Reveal className="mt-16">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <h2 className="font-semibold">On the data (kept honest)</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The machine-learning models are trained and evaluated on <strong>real NYC 311 open data</strong> — a large,
                credible public dataset. The product experience is Delhi-based, so the complaints shown in the app are a
                <strong> clearly-labeled seeded demo dataset</strong> (marked “Demo Delhi data” throughout), never NYC records
                relabeled as Delhi. The two are kept separate by a dataset boundary, and the demo can be swapped for a real
                Delhi open dataset later without changing the code. Resolution-time <em>prediction</em> is a planned milestone
                (M4) and is not claimed anywhere in the product today.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Stack + roadmap */}
      <div className="mt-16 grid gap-8 lg:grid-cols-2">
        <Reveal>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><Boxes className="h-5 w-5 text-primary" /> Stack</h2>
          <dl className="mt-4 space-y-3">
            {STACK.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border/60 bg-card/60 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-primary">{k}</dt>
                <dd className="mt-0.5 text-sm text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><ShieldCheck className="h-5 w-5 text-primary" /> Roadmap</h2>
          <ol className="mt-4 space-y-2">
            {ROADMAP.map((r) => (
              <li key={r.m} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${r.done ? 'bg-green-500/15 text-green-500' : 'bg-muted text-muted-foreground'}`}>{r.m}</span>
                <span className="flex-1 text-sm">{r.t}</span>
                <span className={`text-xs font-medium ${r.done ? 'text-green-500' : 'text-muted-foreground'}`}>{r.done ? 'Shipped' : 'Planned'}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>

      <Reveal className="mt-16">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-accent/10 px-6 py-12 text-center shadow-premium">
          <h2 className="text-2xl font-bold tracking-tight">See the product in action</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">The engineering serves a real, two-sided civic experience.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
            Back to CiviTrack <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </div>
  )
}
