import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Lock, Unlock, MapPin, Mail, Phone, ShoppingBag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import api, { endpoints } from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import type { Order } from '@/types'

interface Consumer {
  id: number
  role: 'consumer'
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  avatar?: string
  accountStatus?: 'active' | 'suspended'
  createdAt: string
}

export default function AdminConsumerDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [consumer, setConsumer] = useState<Consumer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadConsumer()
  }, [id])

  const loadConsumer = async () => {
    try {
      setLoading(true)
      const response = await api.get(endpoints.admin.users)
      const match = (response.data.users || []).find((user: any) => String(user.id) === String(id) && user.role === 'consumer')
      if (match) {
        setConsumer(match as Consumer)
        loadOrders(Number(id))
      } else {
        setConsumer(null)
        setError('Consumer not found.')
      }
    } catch (err) {
      console.error('Load consumer error:', err)
      setError('Unable to load consumer details right now.')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async (consumerId: number) => {
    try {
      setLoadingOrders(true)
      const response = await api.get('/orders')
      const consumerOrders = normalizeOrders(response.data.orders || []).filter((order: Order) => order.consumerId === String(consumerId))
      setOrders(consumerOrders)
    } catch (err) {
      console.error('Load orders error:', err)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const updateAccountStatus = async (status: 'active' | 'suspended') => {
    if (!consumer) return
    setUpdating(true)
    try {
      const response = await api.put(`/api/admin/users/${consumer.id}/status`, { status })
      setConsumer((prev) => prev ? { ...prev, accountStatus: response.data.user.accountStatus } : null)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !consumer) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/consumers')}
          className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <Card>
          <div className="text-center py-8">
            <p className="text-muted">{error || 'Consumer not found'}</p>
          </div>
        </Card>
      </div>
    )
  }

  const statusBadgeVariant = consumer.accountStatus === 'active' ? 'success' : 'danger'
  const statusText = consumer.accountStatus === 'active' ? 'Active' : 'Suspended'

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/admin/consumers')}
        className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Consumer Management</h1>
            <p className="text-muted text-sm mt-1">{consumer.name}</p>
          </div>
          <Badge variant={statusBadgeVariant}>{statusText}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <Card className="space-y-6">
            <div>
              <h2 className="font-semibold mb-4">{t('common.profile')}</h2>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary shrink-0">
                  {consumer.avatar ? <img src={consumer.avatar} alt={consumer.name} className="w-full h-full rounded-full object-cover" /> : consumer.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">{consumer.name}</p>
                  <p className="text-sm text-muted">Joined {new Date(consumer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted shrink-0" />
                <div>
                  <p className="text-xs text-muted">Email</p>
                  <p className="font-medium text-sm">{consumer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted shrink-0" />
                <div>
                  <p className="text-xs text-muted">Phone</p>
                  <p className="font-medium text-sm">{consumer.phone || 'Not provided'}</p>
                </div>
              </div>
              {consumer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted">Address</p>
                    <p className="font-medium text-sm">{consumer.address}</p>
                  </div>
                </div>
              )}
              {consumer.city && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4" />
                  <div>
                    <p className="text-xs text-muted">City</p>
                    <p className="font-medium text-sm">{consumer.city}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Account Status Card */}
        <Card className="space-y-4">
          <h2 className="font-semibold">Account Status</h2>
          <div className="p-4 bg-surface-elevated rounded-lg text-center">
            <Badge variant={statusBadgeVariant} className="mb-3">
              {statusText}
            </Badge>
            <p className="text-xs text-muted">{consumer.accountStatus === 'active' ? 'Consumer can access platform' : 'Consumer account is restricted'}</p>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            {consumer.accountStatus === 'active' ? (
              <Button
                className="w-full"
                variant="danger"
                loading={updating}
                onClick={() => updateAccountStatus('suspended')}
              >
                <Lock className="w-4 h-4" />
                Suspend Account
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="primary"
                loading={updating}
                onClick={() => updateAccountStatus('active')}
              >
                <Unlock className="w-4 h-4" />
                Activate Account
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Order History */}
      <Card className="space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Order History
        </h2>

        {loadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted/30 mb-2" />
            <p className="text-muted text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated">
                  <th className="text-left p-3 font-semibold">Order ID</th>
                  <th className="text-left p-3 font-semibold hidden md:table-cell">Farmer</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Items</th>
                  <th className="text-right p-3 font-semibold">Total</th>
                  <th className="text-left p-3 font-semibold hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-primary/5">
                    <td className="p-3 font-medium">#{order.id}</td>
                    <td className="p-3 hidden md:table-cell text-sm">{order.farmerName || 'N/A'}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          order.status === 'completed' || order.status === 'delivered'
                            ? 'success'
                            : order.status === 'cancelled'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</td>
                    <td className="p-3 font-medium text-right">₹{order.total?.toFixed(2)}</td>
                    <td className="p-3 text-xs text-muted hidden sm:table-cell">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
