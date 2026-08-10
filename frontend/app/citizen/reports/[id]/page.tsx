import type { Metadata } from 'next'
import { ReportDetailView } from '@/components/citizen/report-detail-view'

export const metadata: Metadata = {
  title: 'Report details',
}

export default async function CitizenReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <ReportDetailView id={id} />
    </div>
  )
}
