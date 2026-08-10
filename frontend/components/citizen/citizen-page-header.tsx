'use client'

import { Plus, ClipboardList, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui-kit'

// Client wrapper so server pages can request a header by icon NAME (a serializable
// string) rather than passing a component function across the RSC boundary.
const ICONS = { report: Plus, reports: ClipboardList, nearby: MapPin } as const

export function CitizenPageHeader({
  icon,
  title,
  description,
}: {
  icon: keyof typeof ICONS
  title: string
  description?: string
}) {
  return <PageHeader icon={ICONS[icon]} title={title} description={description} />
}
