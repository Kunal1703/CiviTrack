'use client'

import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatsCard, StatsGrid } from '@/components/stats-card'
import { CategoryBarChart, StatusPieChart } from '@/components/category-chart'
import { TrendLineChart } from '@/components/trend-chart'
import { HotspotMap } from '@/components/hotspot-map'
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
  AlertTriangle,
  Sparkles,
} from 'lucide-react'

// Mock status stats
const mockStatusStats = [
  { status: 'pending' as const, count: 4, high_priority: 2, medium_priority: 1, low_priority: 1 },
  { status: 'in_progress' as const, count: 3, high_priority: 1, medium_priority: 1, low_priority: 1 },
  { status: 'resolved' as const, count: 1, high_priority: 1, medium_priority: 0, low_priority: 0 },
]

export default function DashboardPage() {
  const stats = mockSummaryStats
  const categoryStats = mockCategoryStats
  const statusStats = mockStatusStats
  const trends = mockTrends
  const hotspots = mockHotspots
  const locations = mockIssueLocations

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Analytics Dashboard
          </h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Insights and statistics about civic issues in your area
        </p>
      </div>

      {/* Overview Stats */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Overview</h2>
        <StatsGrid>
          <StatsCard
            title="Total Issues"
            value={stats.total_issues}
            description="All time reports"
            icon={TrendingUp}
            variant="primary"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            description="Awaiting action"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="In Progress"
            value={stats.in_progress}
            description="Currently being addressed"
            icon={Loader2}
            variant="primary"
          />
          <StatsCard
            title="Resolved"
            value={stats.resolved}
            description={`${stats.resolved_today} resolved today`}
            icon={CheckCircle2}
            variant="success"
          />
        </StatsGrid>
      </section>

      {/* Secondary Stats */}
      <section className="mb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Resolution Time
              </CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.avg_resolution_hours}h
              </div>
              <p className="text-xs text-muted-foreground">
                Average time to resolve issues
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                New Today
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.new_today}
              </div>
              <p className="text-xs text-muted-foreground">
                Issues reported today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hotspot Areas
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {hotspots.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Areas with concentrated issues
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Charts Row 1 */}
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <CategoryBarChart data={categoryStats} />
        <StatusPieChart data={statusStats} />
      </section>

      {/* Trends */}
      <section className="mb-8">
        <TrendLineChart data={trends} />
      </section>

      {/* Map */}
      <section className="mb-8">
        <HotspotMap locations={locations} hotspots={hotspots} />
      </section>

      {/* Category Breakdown Table */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>
              Detailed statistics by issue category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Category</th>
                    <th className="py-3 px-4 text-right font-medium text-muted-foreground">Total</th>
                    <th className="py-3 px-4 text-right font-medium text-muted-foreground">Pending</th>
                    <th className="py-3 px-4 text-right font-medium text-muted-foreground">In Progress</th>
                    <th className="py-3 pl-4 text-right font-medium text-muted-foreground">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.filter(c => c.count > 0).map((category) => (
                    <tr key={category.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {category.name}
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">
                        {category.count}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--status-pending)]">
                        {category.pending}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--status-in-progress)]">
                        {category.in_progress}
                      </td>
                      <td className="py-3 pl-4 text-right text-[var(--status-resolved)]">
                        {category.resolved}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50">
                    <td className="py-3 pr-4 font-semibold text-foreground">Total</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {categoryStats.reduce((acc, c) => acc + c.count, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--status-pending)]">
                      {categoryStats.reduce((acc, c) => acc + c.pending, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--status-in-progress)]">
                      {categoryStats.reduce((acc, c) => acc + c.in_progress, 0)}
                    </td>
                    <td className="py-3 pl-4 text-right font-semibold text-[var(--status-resolved)]">
                      {categoryStats.reduce((acc, c) => acc + c.resolved, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
