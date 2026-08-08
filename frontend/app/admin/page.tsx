'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { PageContainer, PageHeader, StatCard, StatGrid } from '@/components/ui-kit'
import { mockIssues, mockSummaryStats } from '@/lib/mock-data'
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
  TrendingUp,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const PAGE_SIZE = 6
const MotionRow = motion.create(TableRow)

export default function AdminPage() {
  const [issues, setIssues] = useState<Issue[]>(mockIssues)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const stats = mockSummaryStats

  // Simulate an initial data load (skeleton state).
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 550)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(
    () =>
      issues.filter((issue) => {
        const matchesSearch = search
          ? issue.title.toLowerCase().includes(search.toLowerCase()) ||
            issue.description.toLowerCase().includes(search.toLowerCase())
          : true
        const matchesStatus = statusFilter === 'all' || issue.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [issues, search, statusFilter],
  )

  useEffect(() => setPage(1), [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const updateStatus = (id: number, newStatus: IssueStatus) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null }
          : i,
      ),
    )
    toast.success(`Issue #${id} → ${newStatus.replace('_', ' ')}`)
  }

  const deleteIssue = (id: number) => {
    setIssues((prev) => prev.filter((i) => i.id !== id))
    toast.success(`Issue #${id} deleted`)
  }

  return (
    <PageContainer>
      <PageHeader icon={Shield} title="Operations Console" description="Manage, triage, and resolve civic issue reports." />

      <StatGrid className="mb-8">
        <StatCard label="Total issues" value={stats.total_issues} icon={TrendingUp} accent="primary" index={0} />
        <StatCard label="Pending" value={stats.pending} sublabel="Requires attention" icon={Clock} accent="warning" index={1} />
        <StatCard label="In progress" value={stats.in_progress} sublabel="Being worked on" icon={Loader2} accent="accent" index={2} />
        <StatCard label="Resolved" value={stats.resolved} sublabel={`${stats.resolved_today} today`} icon={CheckCircle2} accent="success" index={3} />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Issue management</CardTitle>
          <CardDescription>Search, filter, and update the status of reported issues.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search issues…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search issues"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IssueStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Reported</TableHead>
                  <TableHead className="w-[56px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`s-${i}`}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paged.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {paged.map((issue, i) => (
                      <MotionRow
                        key={issue.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.25, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="hover:bg-muted/40"
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">#{issue.id}</TableCell>
                        <TableCell>
                          <p className="max-w-[220px] truncate font-medium">{issue.title}</p>
                          {issue.location_name && (
                            <p className="max-w-[220px] truncate text-xs text-muted-foreground">{issue.location_name}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                            {issue.category_name || 'Other'}
                          </span>
                        </TableCell>
                        <TableCell><StatusBadge status={issue.status} /></TableCell>
                        <TableCell className="hidden sm:table-cell"><PriorityBadge priority={issue.priority} /></TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for issue ${issue.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/issues/${issue.id}`} className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" /> View details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateStatus(issue.id, 'pending')} disabled={issue.status === 'pending'}>
                                <Clock className="mr-2 h-4 w-4" /> Set pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(issue.id, 'in_progress')} disabled={issue.status === 'in_progress'}>
                                <Loader2 className="mr-2 h-4 w-4" /> Set in progress
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(issue.id, 'resolved')} disabled={issue.status === 'resolved'}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Set resolved
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => deleteIssue(issue.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </MotionRow>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40">
                      <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                          <Inbox className="h-6 w-6" />
                        </div>
                        <p className="font-medium text-foreground">No issues found</p>
                        <p className="text-sm">Try adjusting your search or filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
