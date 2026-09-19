import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, DollarSign, CheckCircle, ToggleLeft, ToggleRight, Activity } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AppContext'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import { formatCurrency } from '@/utils/cn'
import { initSocket, getSocket } from '@/services/socket'

export default function DeliveryDashboard() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const [available, setAvailable] = useState(true)
  const [orders, setOrders] = useState<any[]>([])

  const fetchOrders = async () => {
    if (!userId) return
    try {
      const response = await api.get('/orders', { params: { userId, role: 'delivery' } })
      setOrders(normalizeOrders(response.data.orders || []))
    } catch (error) {
      console.error('Failed to load delivery orders:', error)
      setOrders([])
    } finally {
    }
  }

  useEffect(() => {
    fetchOrders()
    if (!userId) return
    const socket = initSocket(userId)
    const refreshOrders = () => fetchOrders()
    socket.on('delivery_order_available', refreshOrders)
    socket.on('order_updated', refreshOrders)
    return () => {
      getSocket()?.off('delivery_order_available', refreshOrders)
      getSocket()?.off('order_updated', refreshOrders)
    }
  }, [userId])

  const assignedOrders = orders.filter((order) => order.deliveryAgentId)
  const activeDeliveries = assignedOrders.filter((order) => !['completed', 'delivered', 'cancelled'].includes(order.status))
  const completedDeliveries = assignedOrders.filter((order) => ['completed', 'delivered'].includes(order.status))
  const earnings = completedDeliveries.reduce((sum, order) => sum + order.total * 0.1, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('delivery.dashboard')}</h1>
        <button onClick={() => setAvailable(!available)} className="flex items-center gap-2 text-sm font-medium text-foreground">
          {available ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted" />}
          {t('delivery.availabilityToggle')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('delivery.assignedOrders')} value={assignedOrders.length} icon={Package} color="primary" />
        <StatCard title={t('delivery.assignedOrders')} value={activeDeliveries.length} icon={Activity} color="blue" />
        <StatCard title={t('delivery.completedDeliveries')} value={completedDeliveries.length} icon={CheckCircle} color="primary" />
        <StatCard title={t('delivery.todayEarnings')} value={formatCurrency(earnings)} icon={DollarSign} color="accent" />
      </div>

      <Card><div className="flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /><div><h2 className="font-semibold">{t('delivery.dashboard')}</h2><p className="text-sm text-muted">{t('delivery.assignedOrders')}</p></div></div></Card>
    </div>
  )
}
