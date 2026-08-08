'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryBarChart, StatusPieChart } from '@/components/category-chart'
import { TrendLineChart } from '@/components/trend-chart'
import { HotspotMap } from '@/components/hotspot-map'
import { PageContainer, PageHeader, StatCard, StatGrid, Reveal, SectionHeader } from '@/components/ui-kit'
import { AnimatedNumber } from '@/components/animated-number'
import {
  mockSummaryStats,
  mockCategoryStats,
  mockTrends,
  mockHotspots,
  mockIssueLocations,
} from '@/lib/mock-data'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  Timer,
  MapPinned,
  Brain,
  Gauge,
  Sparkles,
} from 'lucide-react'

const mockStatusStats = [
  { status: 'pending' as const, count: 4, high_priority: 2, medium_priority: 1, low_priority: 1 },
  { status: 'in_progress' as const, count: 3, high_priority: 1, medium_priority: 1, low_priority: 1 },
  { status: 'resolved' as const, count: 1, high_priority: 1, medium_priority: 0, low_priority: 0 },
]

const aiMetrics = [
  { label: 'Predictions served', value: 1284, icon: Brain, accent: 'primary' as const },
  { label: 'Avg. confidence', value: 87, suffix: '%', icon: Gauge, accent: 'success' as const },
  { label: 'Auto-classified', value: 94, suffix: '%', icon: Sparkles, accent: 'accent' as const },
]

export default function DashboardPage() {
  const stats = mockSummaryStats
  const [range, setRange] = useState('30')

  return (
    <PageContainer>
      <PageHeader
        icon={BarChart3}
        title="Analytics Dashboard"
        description="Real-time insight into complaints, categories, and AI performance."
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPIs */}
      <StatGrid className="mb-6">
        <StatCard label="Total issues" value={stats.total_issues} sublabel="All time reports" icon={TrendingUp} accent="primary" index={0} />
        <StatCard label="Pending" value={stats.pending} sublabel="Awaiting action" icon={Clock} accent="warning" index={1} />
        <StatCard label="In progress" value={stats.in_progress} sublabel="Being addressed" icon={Loader2} accent="accent" index={2} />
        <StatCard label="Resolved" value={stats.resolved} sublabel={`${stats.resolved_today} today`} icon={CheckCircle2} accent="success" index={3} />
      </StatGrid>

      {/* AI usage */}
      <Reveal className="mb-8">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.05] to-accent/[0.04] p-5 shadow-premium">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">AI performance</h2>
            <span className="ml-auto rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              DistilBERT · classifier-v1.0
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aiMetrics.map((m) => (
              <div key={m.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <m.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    <AnimatedNumber value={m.value} suffix={m.suffix ?? ''} />
                  </div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Secondary metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Avg. resolution time', value: stats.avg_resolution_hours, suffix: 'h', icon: Timer },
          { label: 'New today', value: stats.new_today, suffix: '', icon: Clock },
          { label: 'Hotspot areas', value: mockHotspots.length, suffix: '', icon: MapPinned },
        ].map((m, i) => (
          <Reveal key={m.label} delay={i * 0.06}>
            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  <AnimatedNumber value={m.value} suffix={m.suffix} />
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Reveal><CategoryBarChart data={mockCategoryStats} /></Reveal>
        <Reveal delay={0.06}><StatusPieChart data={mockStatusStats} /></Reveal>
      </div>

      <Reveal className="mb-8">
        <TrendLineChart data={mockTrends} />
      </Reveal>

      <Reveal className="mb-8">
        <HotspotMap locations={mockIssueLocations} hotspots={mockHotspots} />
      </Reveal>

      {/* Category breakdown */}
      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
            <CardDescription>Detailed statistics by issue category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pending</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">In Progress</th>
                    <th className="py-3 pl-4 text-right font-medium text-muted-foreground">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {mockCategoryStats.filter((c) => c.count > 0).map((c) => (
                    <tr key={c.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40">
                      <td className="py-3 pr-4 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{c.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--status-pending)]">{c.pending}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--status-in-progress)]">{c.in_progress}</td>
                      <td className="py-3 pl-4 text-right tabular-nums text-[var(--status-resolved)]">{c.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </PageContainer>
  )
}
