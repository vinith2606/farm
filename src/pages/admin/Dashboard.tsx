import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, ShoppingBag, DollarSign, Sprout, Award, Truck, Package, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AppContext'
import { initSocket, getSocket } from '@/services/socket'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Modal'
import { adminRecentActivity } from '@/data'
import { formatCurrency } from '@/utils/cn'
import api, { endpoints } from '@/services/api'

interface AdminStats {
  totalUsers: number
  totalOrders: number
  totalFarmers: number
  totalConsumers: number
  totalDeliveryAgents: number
  totalAdmins: number
  totalProducts: number
  completedOrders: number
  pendingCertificates: number
  revenue: number
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalFarmers: 0,
    totalConsumers: 0,
    totalDeliveryAgents: 0,
    totalAdmins: 0,
    totalProducts: 0,
    completedOrders: 0,
    pendingCertificates: 0,
    revenue: 0,
  })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get(endpoints.admin.stats)
        setStats(response.data)
      } catch {
        setStats({
          totalUsers: 0,
          totalOrders: 0,
          totalFarmers: 0,
          totalConsumers: 0,
          totalDeliveryAgents: 0,
          totalAdmins: 0,
          totalProducts: 0,
          completedOrders: 0,
          pendingCertificates: 0,
          revenue: 0,
        })
      }
    }

    loadStats()

    const socket = initSocket(userId)
    socket.on('order_created', loadStats)
    socket.on('order_updated', loadStats)

    return () => {
      getSocket()?.off('order_created', loadStats)
      getSocket()?.off('order_updated', loadStats)
    }
  }, [userId])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('admin.dashboard')}</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title={t('admin.totalUsers')} value={stats.totalFarmers} icon={Sprout} color="primary" />
        <StatCard title={t('nav.consumers')} value={stats.totalConsumers} icon={Users} color="blue" />
        <StatCard title={t('admin.deliveryAgents')} value={stats.totalDeliveryAgents} icon={Truck} color="accent" />
        <StatCard title={t('farmer.productsCount')} value={stats.totalProducts} icon={Package} color="earth" />
        <StatCard title={t('admin.totalOrders')} value={stats.totalOrders} icon={ShoppingBag} color="blue" />
        <StatCard title={t('admin.pendingCerts')} value={stats.pendingCertificates} icon={Award} color="accent" />
        <StatCard title={t('common.delivered')} value={stats.completedOrders} icon={CheckCircle2} color="primary" />
        <StatCard title={t('admin.revenue')} value={formatCurrency(stats.revenue)} icon={DollarSign} color="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold mb-4">{t('admin.orderAnalytics')}</h2>
          <div className="space-y-4"><MetricRow label={t('admin.totalOrders')} value={stats.totalOrders} total={stats.totalOrders} color="bg-blue" /><MetricRow label={t('common.delivered')} value={stats.completedOrders} total={stats.totalOrders} color="bg-primary" /><MetricRow label={t('farmer.kanban.pending')} value={Math.max(0, stats.totalOrders - stats.completedOrders)} total={stats.totalOrders} color="bg-accent" /></div>
        </Card>
        <Card>
          <h2 className="font-semibold mb-4">{t('admin.statistics')}</h2>
          <div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-primary/10 p-4"><p className="text-2xl font-bold text-primary">{stats.totalFarmers}</p><p className="text-xs text-muted">{t('nav.farmers')}</p></div><div className="rounded-2xl bg-blue/10 p-4"><p className="text-2xl font-bold text-blue">{stats.totalConsumers}</p><p className="text-xs text-muted">{t('nav.consumers')}</p></div><div className="rounded-2xl bg-accent/10 p-4"><p className="text-2xl font-bold text-accent">{stats.totalDeliveryAgents}</p><p className="text-xs text-muted">{t('admin.deliveryAgents')}</p></div></div>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold mb-4">{t('admin.recentActivity')}</h2>
        {adminRecentActivity.length === 0 ? (
          <EmptyState icon={Users} title={t('common.noData')} description={t('admin.recentActivity')} />
        ) : (
          <div className="space-y-3">
            {adminRecentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted">{a.user}</p>
                </div>
                <span className="text-xs text-subtle">{a.time}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function MetricRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total ? Math.round((value / total) * 100) : 0
  return <div><div className="mb-1 flex justify-between text-sm"><span className="text-muted">{label}</span><span className="font-semibold">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-elevated"><div className={`h-full ${color}`} style={{ width: `${percentage}%` }} /></div></div>
}
