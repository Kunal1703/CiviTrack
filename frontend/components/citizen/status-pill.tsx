import { cn } from '@/lib/utils'
import { statusMeta, STATUS_PILL } from '@/lib/status'

/** Small friendly status pill for citizen surfaces. */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_PILL[meta.tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden />
      {meta.label}
    </span>
  )
}
