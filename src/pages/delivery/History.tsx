import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, History as HistoryIcon, Package, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { useAuth } from '@/context/AppContext'
import { formatCurrency, formatDate } from '@/utils/cn'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import type { Order } from '@/types'

function statusVariant(status: string) {
  return status === 'cancelled' ? 'danger' as const : 'success' as const
}

export default function DeliveryHistory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    api.get('/orders', { params: { userId, role: 'delivery' } })
      .then((response) => setOrders(normalizeOrders(response.data.orders || [])))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [userId])

  const completedOrders = useMemo(() => orders.filter((order) => ['completed', 'delivered'].includes(order.status)), [orders])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><p className="text-sm font-medium text-primary">{t('landing.delivery')}</p><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.history')}</h1><p className="mt-1 text-sm text-muted">{t('delivery.completedDeliveries')}</p></div>
      {loading ? <Card><p className="py-8 text-center text-muted">{t('common.loading')}</p></Card> : completedOrders.length === 0 ? <Card><EmptyState icon={HistoryIcon} title={t('common.noData')} description={t('delivery.completedDeliveries')} /></Card> : <div className="space-y-3">{completedOrders.map((order) => <button key={order.id} type="button" onClick={() => navigate(`/delivery/orders/${order.id}`)} className="block w-full text-left"><Card hover className="transition-colors hover:border-primary/60"><div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Truck className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{t('nav.orders')} #{order.id}</p><Badge variant={statusVariant(order.status)}>{t('common.delivered')}</Badge></div><p className="mt-1 truncate text-sm text-muted">{order.farmerName} → {order.consumerName}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{order.items.length} {t('common.quantity')}</span><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(order.updatedAt || order.createdAt)}</span><span>{formatCurrency(order.total)}</span></div></div><ChevronRight className="h-5 w-5 shrink-0 text-muted" /></div></Card></button>)}</div>}
    </div>
  )
}
