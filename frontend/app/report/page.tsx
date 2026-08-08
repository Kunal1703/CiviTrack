import type { Metadata } from 'next'
import { ReportView } from '@/components/report-view'

export const metadata: Metadata = {
  title: 'Report an Issue',
  description: 'Report a civic issue in your area. Our AI will help categorize it for faster resolution.',
}

export default function ReportPage() {
  return <ReportView />
}
