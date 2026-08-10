'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Timer, Sparkles, Info, Loader2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  getResolutionMeta, predictResolution, fmtHours,
  type ResolutionMeta, type ResolutionPrediction,
} from '@/lib/resolution-api'

export function ResolutionInsights() {
  const [meta, setMeta] = useState<ResolutionMeta | null>(null)
  const [metaErr, setMetaErr] = useState<string | null>(null)
  const [agency, setAgency] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [borough, setBorough] = useState<string>('')
  const [result, setResult] = useState<ResolutionPrediction | null>(null)
  const [predicting, setPredicting] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    getResolutionMeta(ctrl.signal)
      .then((m) => {
        setMeta(m)
        setAgency(m.options.agency[0] ?? '')
        setCategory(m.options.complaint_type[0] ?? '')
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setMetaErr(e.message ?? 'unavailable')
      })
    return () => ctrl.abort()
  }, [])

  const maxWeight = useMemo(() => (meta ? Math.max(...meta.drivers.map((d) => d.weight), 0.01) : 1), [meta])

  async function estimate() {
    setPredicting(true)
    try {
      setResult(await predictResolution({
        agency: agency || undefined,
        complaint_type: category || undefined,
        borough: borough || undefined,
      }))
    } catch {
      setResult(null)
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-premium">
      <div className="flex items-center gap-2">
        <Timer className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Resolution insights</h3>
        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
          Model trained on NYC 311 data
        </span>
      </div>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        An expected resolution time with an 80% range and its main drivers. It’s an estimate
        (not an SLA), and it reflects NYC operations — not a forecast for other cities.
      </p>

      {metaErr && !meta ? (
        <p className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Resolution model is not available right now.
        </p>
      ) : !meta ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* Try it */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Try it
            </p>
            <div className="space-y-2">
              <Select value={agency} onValueChange={setAgency}>
                <SelectTrigger aria-label="Agency"><SelectValue placeholder="Agency" /></SelectTrigger>
                <SelectContent>{meta.options.agency.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Complaint type"><SelectValue placeholder="Complaint type" /></SelectTrigger>
                <SelectContent>{meta.options.complaint_type.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={borough || 'any'} onValueChange={(v) => setBorough(v === 'any' ? '' : v)}>
                <SelectTrigger aria-label="Borough"><SelectValue placeholder="Any borough" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any borough</SelectItem>
                  {meta.options.borough.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={estimate} disabled={predicting} className="w-full gap-2">
                {predicting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Estimate resolution time
              </Button>
            </div>

            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">Expected resolution</p>
                <p className="text-2xl font-bold text-primary">{fmtHours(result.point_hours)}</p>
                <p className="text-xs text-muted-foreground">
                  typically between {fmtHours(result.low_hours)} and {fmtHours(result.high_hours)}
                </p>
                {result.factors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Why</p>
                    {result.factors.map((f, i) => (
                      <p key={i} className="flex items-center gap-1.5 text-xs">
                        {f.effect === 'increases'
                          ? <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                          : <TrendingDown className="h-3.5 w-3.5 text-green-500" />}
                        <span className="capitalize">{f.feature}</span>
                        <span className="text-muted-foreground">{f.effect} the estimate</span>
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Global drivers */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">What drives resolution time (overall)</p>
            <ul className="space-y-2.5">
              {meta.drivers.map((d, i) => (
                <li key={d.feature}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="capitalize">{d.feature}</span>
                    <span className="text-muted-foreground">{d.weight.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }}
                      animate={{ width: `${(d.weight / maxWeight) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
