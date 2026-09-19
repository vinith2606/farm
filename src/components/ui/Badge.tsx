import { cn } from '@/utils/cn'

type BadgeVariant = 'verified' | 'available' | 'unavailable' | 'pending' | 'success' | 'warning' | 'danger' | 'default'

const variants: Record<BadgeVariant, string> = {
  verified: 'bg-primary/15 text-primary border-primary/30',
  available: 'bg-primary/10 text-primary-light border-primary/20',
  unavailable: 'bg-danger/10 text-danger border-danger/30',
  pending: 'bg-accent/15 text-accent border-accent/30',
  success: 'bg-primary/15 text-primary border-primary/30',
  warning: 'bg-accent/15 text-accent border-accent/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  default: 'bg-surface-elevated text-muted border-border',
}

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: BadgeVariant; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border', variants[variant], className)}>
      {children}
    </span>
  )
}

export function CertificateBadge({ status }: { status: 'verified' | 'pending' | 'rejected' | 'expired' }) {
  const map = {
    verified: { variant: 'verified' as const, label: '✓ Verified' },
    pending: { variant: 'pending' as const, label: '⏳ Pending' },
    rejected: { variant: 'danger' as const, label: '✗ Rejected' },
    expired: { variant: 'warning' as const, label: '⚠ Expired' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <Badge variant={available ? 'available' : 'unavailable'}>
      <span className={cn('w-2 h-2 rounded-full', available ? 'bg-primary' : 'bg-danger')} />
      {available ? 'Available' : 'Unavailable'}
    </Badge>
  )
}
