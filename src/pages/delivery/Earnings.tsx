import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, DollarSign, Package, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { useAuth } from '@/context/AppContext'
import { formatCurrency, formatDate } from '@/utils/cn'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import type { Order } from '@/types'

const DELIVERY_RATE = 0.1

export default function DeliveryEarnings() {
  const { t } = useTranslation()
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
  const totalEarnings = completedOrders.reduce((sum, order) => sum + order.total * DELIVERY_RATE, 0)
  const totalOrderValue = completedOrders.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><p className="text-sm font-medium text-primary">{t('landing.delivery')}</p><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.earnings')}</h1><p className="mt-1 text-sm text-muted">{t('delivery.completedDeliveries')}</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><StatCard title={t('common.total')} value={formatCurrency(totalEarnings)} icon={DollarSign} color="accent" /><StatCard title={t('delivery.completedDeliveries')} value={completedOrders.length} icon={Package} color="primary" /><StatCard title={t('common.total')} value={formatCurrency(totalOrderValue)} icon={Receipt} color="blue" /></div>
      {loading ? <Card><p className="py-8 text-center text-muted">{t('common.loading')}</p></Card> : completedOrders.length === 0 ? <Card><EmptyState icon={DollarSign} title={t('common.noData')} description={t('delivery.completedDeliveries')} /></Card> : <Card padding="none" className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-elevated"><th className="p-4 text-left">{t('nav.orders')}</th><th className="p-4 text-left">{t('common.name')}</th><th className="p-4 text-left hidden sm:table-cell">{t('common.date')}</th><th className="p-4 text-left hidden md:table-cell">{t('common.quantity')}</th><th className="p-4 text-left">{t('common.total')}</th><th className="p-4 text-right">{t('nav.earnings')}</th></tr></thead><tbody>{completedOrders.map((order) => <tr key={order.id} className="border-b border-border last:border-0 hover:bg-primary/5"><td className="p-4"><p className="font-semibold">#{order.id}</p><Badge variant="success">{t('common.delivered')}</Badge></td><td className="p-4">{order.consumerName || t('common.name')}<p className="text-xs text-muted">{order.farmerName}</p></td><td className="p-4 hidden sm:table-cell"><span className="flex items-center gap-1 text-muted"><CalendarDays className="h-3.5 w-3.5" />{formatDate(order.updatedAt || order.createdAt)}</span></td><td className="p-4 hidden md:table-cell">{order.items.length} {t('common.quantity')}</td><td className="p-4">{formatCurrency(order.total)}</td><td className="p-4 text-right font-bold text-primary">{formatCurrency(order.total * DELIVERY_RATE)}</td></tr>)}</tbody></table></Card>}
    </div>
  )
}
