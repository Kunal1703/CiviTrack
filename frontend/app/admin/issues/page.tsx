import type { Metadata } from 'next'
import { IssueQueue } from '@/components/admin/issue-queue'

export const metadata: Metadata = {
  title: 'Admin · Issues',
  description: 'The municipal issue queue.',
}

export default function AdminIssuesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Issue queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every reported issue. Search, filter, sort, and open one to manage it.
        </p>
      </div>
      <IssueQueue />
    </div>
  )
}
