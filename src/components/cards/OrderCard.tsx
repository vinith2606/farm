import { useTranslation } from 'react-i18next'
import type { Order } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/utils/cn'

const statusColors: Record<string, 'pending' | 'success' | 'warning' | 'danger' | 'default' | 'verified'> = {
  pending: 'pending',
  accepted: 'verified',
  preparing: 'warning',
  ready: 'verified',
  pickup: 'warning',
  out_for_delivery: 'warning',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
}

export function OrderCard({ order, compact }: { order: Order; compact?: boolean }) {
  const { t } = useTranslation()
  const statusLabels: Record<string, string> = {
    pending: t('farmer.kanban.pending'), accepted: t('farmer.kanban.accepted'), preparing: t('farmer.kanban.preparing'),
    ready: t('farmer.kanban.ready'), pickup: t('consumer.timeline.pickup'), out_for_delivery: t('consumer.timeline.outForDelivery'),
    delivered: t('consumer.timeline.delivered'), completed: t('farmer.kanban.completed'), cancelled: t('farmer.kanban.cancelled'),
  }
  return (
    <Card hover className="!p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold">{order.id}</p>
          <p className="text-sm text-muted">{order.consumerName}</p>
        </div>
        <Badge variant={statusColors[order.status] || 'default'}>
          {statusLabels[order.status] || order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {!compact && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {order.items.map((item) => (
            <img key={item.productId} src={item.image} alt={item.productName} className="w-12 h-12 rounded-xl object-cover shrink-0 bg-surface-elevated" />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{formatDate(order.createdAt)}</span>
        <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
      </div>
    </Card>
  )
}

export function OrderTimeline({ status }: { status: string }) {
  const { t } = useTranslation()
  const steps = ['placed', 'accepted', 'preparing', 'pickup', 'outForDelivery', 'delivered']
  const statusIndex: Record<string, number> = {
    pending: 0, accepted: 1, preparing: 2, ready: 2, pickup: 3,
    out_for_delivery: 4, delivered: 5, completed: 5,
  }
  const current = statusIndex[status] ?? 0

  return (
    <div className="flex items-center justify-between relative px-2">
      <div className="absolute top-4 left-8 right-8 h-0.5 bg-border" />
      <div
        className="absolute top-4 left-8 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `${(current / (steps.length - 1)) * 100}%`, maxWidth: 'calc(100% - 4rem)' }}
      />
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center relative z-10">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
            i <= current ? 'bg-primary border-primary text-background' : 'bg-surface-elevated border-border text-subtle'
          }`}>
            {i + 1}
          </div>
          <span className="text-[10px] mt-1 text-center max-w-[60px] text-muted hidden sm:block">
            {t(`consumer.timeline.${step}`)}
          </span>
        </div>
      ))}
    </div>
  )
}
