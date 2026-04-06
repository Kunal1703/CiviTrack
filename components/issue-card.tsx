'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/status-badge'
import type { Issue } from '@/lib/types'
import { MapPin, Calendar, User, Sparkles } from 'lucide-react'

interface IssueCardProps {
  issue: Issue
  showFullDescription?: boolean
}

export function IssueCard({ issue, showFullDescription = false }: IssueCardProps) {
  return (
    <Link href={`/issues/${issue.id}`}>
      <Card className="group transition-all hover:border-primary/50 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {issue.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={issue.status} />
                <PriorityBadge priority={issue.priority} />
                {issue.category_name && <CategoryBadge name={issue.category_name} />}
              </div>
            </div>
            {issue.auto_categorized && (
              <div className="shrink-0" title="Auto-categorized by AI">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className={`text-sm text-muted-foreground ${showFullDescription ? '' : 'line-clamp-2'}`}>
            {issue.description}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {issue.location_name && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{issue.location_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
            </div>
            {issue.reporter_name && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{issue.reporter_name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface IssueCardSkeletonProps {
  count?: number
}

export function IssueCardSkeleton({ count = 1 }: IssueCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 rounded-full bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
