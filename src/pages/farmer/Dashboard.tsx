import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ShoppingBag, DollarSign, Package, Star, Cloud, Sparkles,
  Award,
} from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CertificateBadge, AvailabilityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { OrderCard } from '@/components/cards/OrderCard'
import { formatCurrency } from '@/utils/cn'
import { useAuth } from '@/context/AppContext'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'

export default function FarmerDashboard() {
  const { t } = useTranslation()
  const { userId, certificateStatus } = useAuth()
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [orderCount, setOrderCount] = useState(0)
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const fetchDashboard = async () => {
      try {
        const [ordersResponse, productsResponse] = await Promise.all([
          api.get('/orders', { params: { userId, role: 'farmer' } }),
          api.get(`/products/farmer/${userId}`),
        ])
        const farmerProducts = productsResponse.data.products || []
        const farmerOrders = normalizeOrders(ordersResponse.data.orders || [])
        setOrderCount(farmerOrders.length)
        setRecentOrders(farmerOrders.slice(0, 4))
        setProductCount(farmerProducts.length)
      } catch {
        setOrderCount(0)
        setRecentOrders([])
        setProductCount(0)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [userId])

  const weatherTemp = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDate()
    return 28 + ((hour + day) % 8)
  }, [])

  const weatherLabel = useMemo(() => {
    const now = new Date().getHours()
    if (now >= 6 && now < 12) return 'Sunny'
    if (now >= 12 && now < 17) return 'Warm'
    if (now >= 17 && now < 21) return 'Pleasant'
    return 'Cool'
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('farmer.dashboard')}</h1>
          <p className="text-muted text-sm">{t('common.today')}</p>
        </div>
        <AvailabilityBadge available={true} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('farmer.todayOrders')} value={orderCount} icon={ShoppingBag} color="primary" />
        <StatCard title={t('farmer.revenue')} value={formatCurrency(0)} icon={DollarSign} color="accent" />
        <StatCard title={t('farmer.productsCount')} value={productCount} icon={Package} color="blue" />
        <StatCard title={t('farmer.rating')} value="—" icon={Star} color="earth" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('farmer.recentOrders')}</h2>
            <Link to="/farmer/orders"><Button variant="ghost" size="sm">{t('common.viewAll')}</Button></Link>
          </div>
          {loading ? (
            <Card><p className="text-center py-8 text-muted">{t('common.loading')}</p></Card>
          ) : recentOrders.length === 0 ? (
            <Card><EmptyState icon={ShoppingBag} title={t('common.noData')} description={t('farmer.noOrdersYet')} /></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentOrders.map((o) => <OrderCard key={o.id} order={o} compact />)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="gradient-primary !p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-background" />
              <h3 className="font-semibold text-background">{t('farmer.aiPrice')}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-background/80">{t('farmer.aiPriceDesc')}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm text-background">
              <div className="rounded-xl bg-background/10 p-3"><p className="text-xl font-bold">{productCount}</p><p className="text-xs opacity-75">{t('farmer.productsCount')}</p></div>
              <div className="rounded-xl bg-background/10 p-3"><p className="text-xl font-bold">{orderCount}</p><p className="text-xs opacity-75">{t('farmer.todayOrders')}</p></div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <Cloud className="w-10 h-10 text-blue" />
              <div>
                <h3 className="font-semibold">{t('farmer.weather')}</h3>
                <p className="text-2xl font-bold">{weatherTemp}°C</p>
                <p className="text-xs text-muted">{weatherLabel}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{t('farmer.certificateStatus')}</p>
                <CertificateBadge status={certificateStatus} />
              </div>
              <Award className="w-8 h-8 text-primary" />
            </div>
          </Card>
        </div>
      </div>

    </div>
  )
}
