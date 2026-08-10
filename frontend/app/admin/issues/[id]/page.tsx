import type { Metadata } from 'next'
import { IssueWorkspace } from '@/components/admin/issue-workspace'

export const metadata: Metadata = {
  title: 'Admin · Issue',
}

export default async function AdminIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <IssueWorkspace id={id} />
    </div>
  )
}
