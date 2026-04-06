import type { Metadata } from 'next'
import { IssueForm } from '@/components/issue-form'

export const metadata: Metadata = {
  title: 'Report an Issue',
  description: 'Report a civic issue in your area. Our AI will help categorize it for faster resolution.',
}

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Report an Issue
        </h1>
        <p className="mt-2 text-muted-foreground">
          Help improve your city by reporting civic issues. Our AI will automatically suggest
          a category based on your description.
        </p>
      </div>

      <IssueForm />
    </div>
  )
}
