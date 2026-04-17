import { cn } from '@/lib/utils'
import { ProjectStatus } from '@/types/projects'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/projectConstants'

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
