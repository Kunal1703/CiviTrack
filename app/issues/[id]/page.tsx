'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/status-badge'
import { IssueMap } from '@/components/issue-map'
import { mockIssues } from '@/lib/mock-data'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Mail,
  Sparkles,
  Clock,
  History,
} from 'lucide-react'

interface IssueDetailPageProps {
  params: Promise<{ id: string }>
}

export default function IssueDetailPage({ params }: IssueDetailPageProps) {
  const resolvedParams = use(params)
  const issue = mockIssues.find((i) => i.id === parseInt(resolvedParams.id))

  if (!issue) {
    notFound()
  }

  const location = issue.latitude && issue.longitude
    ? { id: issue.id, title: issue.title, status: issue.status, priority: issue.priority, latitude: issue.latitude, longitude: issue.longitude, location_name: issue.location_name || '', category_name: issue.category_name || '', category_icon: issue.category_icon || '' }
    : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Button asChild variant="ghost" className="mb-6 -ml-2 gap-2">
        <Link href="/issues">
          <ArrowLeft className="h-4 w-4" />
          Back to Issues
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <StatusBadge status={issue.status} size="md" />
          <PriorityBadge priority={issue.priority} size="md" />
          {issue.category_name && <CategoryBadge name={issue.category_name} size="md" />}
          {issue.auto_categorized && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Auto-categorized
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {issue.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>Reported {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
          </div>
          {issue.location_name && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{issue.location_name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {issue.description}
              </p>
            </CardContent>
          </Card>

          {/* Location Map */}
          {location && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
                {issue.location_name && (
                  <CardDescription>{issue.location_name}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <IssueMap
                  locations={[location]}
                  center={[issue.latitude!, issue.longitude!]}
                  zoom={15}
                  height="300px"
                  interactive={true}
                />
                <div className="mt-3 text-sm text-muted-foreground">
                  Coordinates: {issue.latitude?.toFixed(6)}, {issue.longitude?.toFixed(6)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Created */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 w-px bg-border mt-2" />
                  </div>
                  <div className="pb-4">
                    <p className="font-medium text-foreground">Issue Reported</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(issue.created_at), 'PPpp')}
                    </p>
                    {issue.reporter_name && (
                      <p className="text-sm text-muted-foreground">
                        by {issue.reporter_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Updated */}
                {issue.updated_at !== issue.created_at && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {issue.resolved_at && <div className="flex-1 w-px bg-border mt-2" />}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-foreground">Last Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(issue.updated_at), 'PPpp')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resolved */}
                {issue.resolved_at && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--status-resolved)]/10">
                        <Sparkles className="h-4 w-4 text-[var(--status-resolved)]" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Issue Resolved</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(issue.resolved_at), 'PPpp')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reporter Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Reporter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {issue.reporter_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{issue.reporter_name}</span>
                </div>
              )}
              {issue.reporter_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{issue.reporter_email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issue Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue ID</span>
                <span className="font-mono text-foreground">#{issue.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="text-foreground">{issue.category_name || 'Uncategorized'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={issue.status} showIcon={false} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={issue.priority} showIcon={false} />
              </div>
              {issue.auto_categorized && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI Categorized</span>
                  <span className="text-primary">Yes</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
