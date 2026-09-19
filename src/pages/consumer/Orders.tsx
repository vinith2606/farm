import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Package, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AppContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/utils/cn'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import type { Order } from '@/types'

type OrderTab = 'all' | 'active' | 'delivered' | 'cancelled'
function statusVariant(status: string) {
  if (status === 'cancelled') return 'danger' as const
  if (status === 'completed' || status === 'delivered') return 'success' as const
  if (status === 'accepted' || status === 'pickup') return 'verified' as const
  return 'pending' as const
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { pending: 'Order placed', accepted: 'Accepted by farmer', pickup: 'Pickup scheduled', out_for_delivery: 'Out for delivery', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled' }
  return labels[status] || status.replace(/_/g, ' ')
}

export default function ConsumerOrders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, role } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<OrderTab>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !role) return
    api.get('/orders', { params: { userId, role } })
      .then((response) => setOrders(normalizeOrders(response.data.orders || [])))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [userId, role])

  const filteredOrders = useMemo(() => orders.filter((order) => {
    if (activeTab === 'delivered') return ['delivered', 'completed'].includes(order.status)
    if (activeTab === 'cancelled') return order.status === 'cancelled'
    if (activeTab === 'active') return !['cancelled', 'delivered', 'completed'].includes(order.status)
    return true
  }), [activeTab, orders])

  const counts = {
    all: orders.length,
    active: orders.filter((order) => !['cancelled', 'delivered', 'completed'].includes(order.status)).length,
    delivered: orders.filter((order) => ['delivered', 'completed'].includes(order.status)).length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-primary">{t('app.name')} {t('common.profile')}</p><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.orders')}</h1><p className="mt-1 text-sm text-muted">{t('consumer.orderHistoryHint')}</p></div>
        <Link to="/consumer/search"><Button variant="outline" size="sm"><ShoppingBag className="h-4 w-4" /> {t('consumer.continueShopping')}</Button></Link>
      </div>
      <Card padding="none" className="overflow-hidden"><div className="flex overflow-x-auto border-b border-border">{(['all', 'active', 'delivered', 'cancelled'] as OrderTab[]).map((key) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-medium ${activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>{t(`consumer.orderTabs.${key}`)} <span className="ml-1 text-xs opacity-70">{counts[key]}</span></button>)}</div></Card>
      {loading ? <Card><p className="py-10 text-center text-muted">{t('consumer.loadingOrders')}</p></Card> : filteredOrders.length === 0 ? <Card><EmptyState icon={Package} title={activeTab === 'all' ? t('common.noData') : t(`consumer.orderTabs.${activeTab}`)} description={t('consumer.orderHistoryEmpty')} action={{ label: t('consumer.browseProducts'), onClick: () => navigate('/consumer/search') }} /></Card> : <div className="space-y-3">{filteredOrders.map((order) => <button key={order.id} type="button" onClick={() => navigate(`/consumer/orders/${order.id}`)} className="block w-full text-left"><Card hover className="transition-colors hover:border-primary/60"><div className="flex items-center gap-4"><div className="flex shrink-0 -space-x-3">{order.items.slice(0, 3).map((item) => <img key={item.productId} src={item.image} alt={item.productName} className="h-16 w-16 rounded-xl border-2 border-surface object-cover bg-surface-elevated" />)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">Order #{order.id}</p><Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge></div><p className="mt-1 truncate text-sm text-muted">{order.items.map((item) => item.productName).join(', ')}</p><p className="mt-1 text-xs text-muted">{formatDate(order.createdAt)} · {order.farmerName}</p></div><div className="hidden text-right sm:block"><p className="font-bold text-primary">{formatCurrency(order.total)}</p><p className="text-xs text-muted">{order.items.length} item(s)</p></div><ChevronRight className="h-5 w-5 shrink-0 text-muted" /></div></Card></button>)}</div>}
    </div>
  )
}
