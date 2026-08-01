'use client'

import { useState } from 'react'
import type { Metadata } from 'next'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { StatsCard, StatsGrid } from '@/components/stats-card'
import { mockIssues, mockSummaryStats, mockCategories } from '@/lib/mock-data'
import type { IssueStatus, Issue } from '@/lib/types'
import {
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  Shield,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function AdminPage() {
  const [issues, setIssues] = useState<Issue[]>(mockIssues)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const stats = mockSummaryStats

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = search
      ? issue.title.toLowerCase().includes(search.toLowerCase()) ||
        issue.description.toLowerCase().includes(search.toLowerCase())
      : true

    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const updateStatus = (issueId: number, newStatus: IssueStatus) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: newStatus,
              resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
            }
          : issue
      )
    )
    toast.success(`Issue #${issueId} status updated to ${newStatus.replace('_', ' ')}`)
  }

  const deleteIssue = (issueId: number) => {
    setIssues((prev) => prev.filter((issue) => issue.id !== issueId))
    toast.success(`Issue #${issueId} deleted`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Manage and track all civic issue reports
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <StatsGrid>
          <StatsCard
            title="Total Issues"
            value={stats.total_issues}
            icon={TrendingUp}
            variant="primary"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            description="Requires attention"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="In Progress"
            value={stats.in_progress}
            description="Being worked on"
            icon={Loader2}
            variant="primary"
          />
          <StatsCard
            title="Resolved"
            value={stats.resolved}
            description={`${stats.resolved_today} today`}
            icon={CheckCircle2}
            variant="success"
          />
        </StatsGrid>
      </div>

      {/* Issue Management */}
      <Card>
        <CardHeader>
          <CardTitle>Issue Management</CardTitle>
          <CardDescription>
            View and update the status of reported issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as IssueStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        #{issue.id}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{issue.title}</p>
                          {issue.location_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {issue.location_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{issue.category_name || 'Other'}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={issue.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={issue.priority} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/issues/${issue.id}`} className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => updateStatus(issue.id, 'pending')}
                              disabled={issue.status === 'pending'}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Set Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus(issue.id, 'in_progress')}
                              disabled={issue.status === 'in_progress'}
                            >
                              <Loader2 className="mr-2 h-4 w-4" />
                              Set In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus(issue.id, 'resolved')}
                              disabled={issue.status === 'resolved'}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Set Resolved
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteIssue(issue.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No issues found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredIssues.length} of {issues.length} issues
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
