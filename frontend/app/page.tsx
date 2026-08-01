import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IssueCard } from '@/components/issue-card'
import { StatsCard, StatsGrid } from '@/components/stats-card'
import { mockIssues, mockSummaryStats } from '@/lib/mock-data'
import {
  MapPin,
  Plus,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react'

export default function HomePage() {
  const recentIssues = mockIssues.slice(0, 3)
  const stats = mockSummaryStats

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              AI-Powered Issue Detection
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Report Civic Issues,{' '}
              <span className="text-primary">Build Better Cities</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground text-pretty">
              CiviTrack makes it easy for citizens to report issues like potholes, garbage,
              and broken streetlights. Our smart system automatically categorizes reports
              and identifies problem hotspots for faster resolution.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/report">
                  <Plus className="h-5 w-5" />
                  Report an Issue
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/issues">
                  <MapPin className="h-5 w-5" />
                  View All Issues
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StatsGrid>
            <StatsCard
              title="Total Issues"
              value={stats.total_issues}
              description="All reported issues"
              icon={BarChart3}
              variant="primary"
            />
            <StatsCard
              title="Pending"
              value={stats.pending}
              description="Awaiting review"
              icon={Clock}
              variant="warning"
            />
            <StatsCard
              title="In Progress"
              value={stats.in_progress}
              description="Being addressed"
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
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              How CiviTrack Works
            </h2>
            <p className="mt-4 text-muted-foreground">
              Our three-layer architecture ensures efficient issue resolution
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>1. Report Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Citizens can easily report civic issues with location data and descriptions.
                  Upload photos and pinpoint the exact location on the map.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>2. Smart Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our AI automatically categorizes issues and detects priority levels based on
                  keywords. Hotspot areas with multiple issues are identified for attention.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>3. Fast Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Administrators can efficiently manage and track issues. Analytics dashboard
                  helps prioritize resources and measure performance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Issues Section */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Recent Reports
              </h2>
              <p className="mt-1 text-muted-foreground">
                Latest issues reported by citizens
              </p>
            </div>
            <Button asChild variant="ghost" className="gap-2">
              <Link href="/issues">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Issue Categories
            </h2>
            <p className="mt-4 text-muted-foreground">
              We handle a wide range of civic issues
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Garbage', description: 'Waste management and cleanliness', icon: '🗑️' },
              { name: 'Pothole', description: 'Road damage and potholes', icon: '🕳️' },
              { name: 'Water Leakage', description: 'Water supply problems', icon: '💧' },
              { name: 'Streetlight', description: 'Street lighting issues', icon: '💡' },
              { name: 'Drainage', description: 'Drainage and sewage problems', icon: '🌊' },
              { name: 'Other', description: 'Other civic issues', icon: '❓' },
            ].map((category) => (
              <Card key={category.name} className="group hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="text-3xl">{category.icon}</div>
                  <div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-primary/5 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Shield className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
              Ready to Make a Difference?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Your report helps improve our city. Together, we can create better infrastructure
              and cleaner neighborhoods.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="gap-2">
                <Link href="/report">
                  <AlertTriangle className="h-5 w-5" />
                  Report an Issue Now
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">CiviTrack</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Smart Urban Issue Detection System
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
