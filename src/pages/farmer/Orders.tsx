import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, ShoppingBag, Truck, XCircle, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AppContext'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Modal'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'

const sections = [
  { key: 'pending', titleKey: 'farmer.kanban.pending', descriptionKey: 'farmer.recentOrders', icon: Clock3, color: 'accent', statuses: ['pending'] },
  { key: 'accepted', titleKey: 'farmer.kanban.accepted', descriptionKey: 'consumer.timeline.outForDelivery', icon: Truck, color: 'blue', statuses: ['accepted', 'pickup', 'out_for_delivery'] },
  { key: 'completed', titleKey: 'farmer.kanban.completed', descriptionKey: 'common.delivered', icon: CheckCircle2, color: 'primary', statuses: ['completed', 'delivered'] },
  { key: 'cancelled', titleKey: 'farmer.kanban.cancelled', descriptionKey: 'common.rejectOrder', icon: XCircle, color: 'danger', statuses: ['cancelled'] },
] as const

const colorClasses = {
  accent: 'bg-accent/15 text-accent',
  blue: 'bg-blue/15 text-blue',
  primary: 'bg-primary/15 text-primary',
  danger: 'bg-danger/15 text-danger',
}

export default function FarmerOrders() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    api.get('/orders', { params: { userId, role: 'farmer' } })
      .then((response) => setOrders(normalizeOrders(response.data.orders || [])))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Card><p className="py-8 text-center text-muted">{t('common.loading')}</p></Card>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.orders')}</h1>
        <p className="mt-1 text-sm text-muted">{t('farmer.recentOrders')}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {sections.map((section) => {
          const count = orders.filter((order) => section.statuses.includes(order.status as never)).length
          const Icon = section.icon
          return (
            <Link key={section.key} to={`/farmer/orders/${section.key}`} className="group">
              <Card hover className="h-full transition-colors group-hover:border-primary/60">
                <div className="flex items-start justify-between gap-4">
                  <div className={`rounded-2xl p-3 ${colorClasses[section.color]}`}><Icon className="h-7 w-7" /></div>
                  <span className="text-4xl font-bold text-foreground">{count}</span>
                </div>
                <h2 className="mt-5 text-xl font-semibold">{t(section.titleKey)}</h2>
                <p className="mt-1 min-h-10 text-sm text-muted">{t(section.descriptionKey)}</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">{t('common.view')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </Card>
            </Link>
          )
        })}
      </div>
      {orders.length === 0 && <EmptyState icon={ShoppingBag} title={t('common.noData')} description={t('farmer.recentOrders')} />}
    </div>
  )
}
