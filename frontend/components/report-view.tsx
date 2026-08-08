'use client'

import { Plus } from 'lucide-react'
import { IssueForm } from '@/components/issue-form'
import { PageHeader } from '@/components/ui-kit'

/** Client wrapper so the Report page keeps server-side `metadata` while still
 *  using the shared (client) PageHeader with an icon. */
export function ReportView() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={Plus}
        title="Report an issue"
        description="Describe the issue — our AI suggests a category as you type, in real time."
      />
      <IssueForm />
    </div>
  )
}
