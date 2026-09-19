import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'
import api from '@/services/api'
import { initSocket, getSocket } from '@/services/socket'
import { CheckCircle2, DollarSign, Eye, Package, ShoppingBag, Truck, Users, Sprout } from 'lucide-react'
import { normalizeOrders } from '@/utils/orderService'
import type { Order } from '@/types'

export function AdminOrders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await api.get('/orders')
      setOrders(normalizeOrders(response.data.orders || []))
    } catch (error) {
      console.error('Failed to load admin orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const socket = initSocket()
    socket.on('order_created', fetchOrders)
    socket.on('order_updated', fetchOrders)

    return () => {
      getSocket()?.off('order_created', fetchOrders)
      getSocket()?.off('order_updated', fetchOrders)
    }
  }, [])

  const deliveryStatus = (order: Order) => {
    if (order.status === 'cancelled') return 'Cancelled'
    if (order.status === 'completed' || order.status === 'delivered') return 'Delivered'
    if (order.status === 'out_for_delivery') return 'Out for delivery'
    if (order.deliveryAgentId) return 'Assigned'
    return 'Not assigned'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.manageOrders')}</h1>
        <Button variant="outline">{t('common.export')}</Button>
      </div>
      {loading ? (
        <Card><p className="text-center py-8 text-muted">{t('common.loading')}</p></Card>
      ) : orders.length === 0 ? (
        <Card><EmptyState icon={ShoppingBag} title={t('common.noData')} description={t('admin.manageOrders')} /></Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface-elevated"><th className="p-4 text-left">{t('nav.orders')}</th><th className="p-4 text-left">{t('nav.farmers')}</th><th className="p-4 text-left">{t('nav.consumers')}</th><th className="p-4 text-left hidden lg:table-cell">{t('consumer.productDetails')}</th><th className="p-4 text-left">{t('common.total')}</th><th className="p-4 text-left hidden md:table-cell">{t('admin.paymentStatus')}</th><th className="p-4 text-left">{t('common.status')}</th><th className="p-4 text-left hidden xl:table-cell">{t('admin.deliveryStatus')}</th><th className="p-4 text-right">{t('common.actions')}</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id} className="border-b border-border hover:bg-primary/5"><td className="p-4 font-medium">#{o.id}</td><td className="p-4">{o.farmerName || 'Not provided'}</td><td className="p-4">{o.consumerName || 'Not provided'}</td><td className="p-4 hidden lg:table-cell"><div className="max-w-48"><p className="truncate font-medium">{o.items[0]?.productName || 'No products'}</p><p className="text-xs text-muted">{o.items.length > 1 ? `+${o.items.length - 1} more` : `${o.items[0]?.quantity || 0} item`}</p></div></td><td className="p-4 font-semibold">{formatCurrency(o.total)}</td><td className="p-4 hidden md:table-cell"><Badge variant={o.paymentStatus === 'paid' ? 'success' : 'pending'}>{o.paymentStatus}</Badge></td><td className="p-4"><Badge variant={o.status === 'cancelled' ? 'danger' : o.status === 'completed' || o.status === 'delivered' ? 'success' : 'default'}>{o.status.replace(/_/g, ' ')}</Badge></td><td className="p-4 hidden xl:table-cell"><Badge variant={deliveryStatus(o) === 'Delivered' ? 'success' : deliveryStatus(o) === 'Cancelled' ? 'danger' : 'warning'}>{deliveryStatus(o)}</Badge></td><td className="p-4 text-right"><Button variant="ghost" size="icon" aria-label={`View order ${o.id}`} onClick={() => navigate(`/admin/orders/${o.id}`)}><Eye className="h-4 w-4" /></Button></td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

export function AdminReports() {
  const { t } = useTranslation()
  const emptyStats = { totalUsers: 0, totalProducts: 0, totalOrders: 0, totalDeliveries: 0, totalPayments: 0, verifiedFarmers: 0, completedOrders: 0 }
  const [stats, setStats] = useState(emptyStats)

  useEffect(() => {
    api.get('/admin/stats').then((response) => {
      const data = response.data || {}
      setStats(Object.fromEntries(Object.keys(emptyStats).map((key) => [key, Number.isFinite(Number(data[key])) ? Number(data[key]) : 0])) as typeof emptyStats)
    }).catch(() => setStats(emptyStats))
  }, [])

  const metrics = [
    { title: t('admin.totalUsers'), value: stats.totalUsers, icon: Users, color: 'blue' as const },
    { title: t('farmer.productsCount'), value: stats.totalProducts, icon: Package, color: 'earth' as const },
    { title: t('admin.totalOrders'), value: stats.totalOrders, icon: ShoppingBag, color: 'primary' as const },
    { title: t('admin.deliveryAgents'), value: stats.totalDeliveries, icon: Truck, color: 'accent' as const },
    { title: t('common.total'), value: formatCurrency(stats.totalPayments), icon: DollarSign, color: 'accent' as const },
    { title: t('admin.activeFarmers'), value: stats.verifiedFarmers, icon: Sprout, color: 'primary' as const },
    { title: t('common.delivered'), value: stats.completedOrders, icon: CheckCircle2, color: 'primary' as const },
  ]

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.reports')}</h1><p className="mt-1 text-sm text-muted">{t('admin.performance')}</p></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{metrics.map((metric) => <StatCard key={metric.title} title={metric.title} value={metric.value} icon={metric.icon} color={metric.color} />)}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-4 font-semibold">{t('admin.orderAnalytics')}</h2><ReportMetricRow label={t('admin.totalOrders')} value={stats.totalOrders} total={stats.totalOrders} color="bg-blue" /><ReportMetricRow label={t('common.delivered')} value={stats.completedOrders} total={stats.totalOrders} color="bg-primary" /><ReportMetricRow label={t('admin.deliveryStatus')} value={stats.totalDeliveries} total={stats.totalOrders} color="bg-accent" /></Card>
        <Card><h2 className="mb-4 font-semibold">{t('common.paymentMethod')}</h2><div className="flex items-center gap-4"><div className="rounded-2xl bg-accent/15 p-4 text-accent"><DollarSign className="h-7 w-7" /></div><div><p className="text-sm text-muted">{t('common.total')}</p><p className="text-3xl font-bold">{formatCurrency(stats.totalPayments)}</p><p className="mt-1 text-xs text-muted">{t('admin.paymentStatus')}</p></div></div></Card>
      </div>
    </div>
  )
}

function ReportMetricRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return <div className="mb-4 last:mb-0"><div className="mb-1 flex justify-between text-sm"><span className="text-muted">{label}</span><span className="font-semibold">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-elevated"><div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} /></div></div>
}

