import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bike, CheckCircle2, Clock3, MapPin, Package, Truck, XCircle } from 'lucide-react'
import { useAuth } from '@/context/AppContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { OrderCard } from '@/components/cards/OrderCard'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'

const filters: Record<string, { title: string; description: string; statuses: string[]; icon: typeof Clock3 }> = {
  pending: { title: 'New orders', description: 'Accept an order to send it to delivery partners, or reject it.', statuses: ['pending'], icon: Clock3 },
  accepted: { title: 'Accepted orders', description: 'Track orders waiting for pickup or currently out for delivery.', statuses: ['accepted', 'pickup', 'out_for_delivery'], icon: Truck },
  completed: { title: 'Completed orders', description: 'Orders that have been delivered successfully.', statuses: ['completed', 'delivered'], icon: CheckCircle2 },
  cancelled: { title: 'Cancelled orders', description: 'Orders rejected or cancelled during fulfilment.', statuses: ['cancelled'], icon: XCircle },
}

export default function FarmerOrderStatus() {
  const { status = 'pending' } = useParams()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const filter = filters[status] || filters.pending
  const Icon = filter.icon

  const loadOrders = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await api.get('/orders', { params: { userId, role: 'farmer' } })
      setOrders(normalizeOrders(response.data.orders || []))
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [userId])

  const filteredOrders = useMemo(() => orders.filter((order) => filter.statuses.includes(order.status)), [orders, filter])

  const updateStatus = async (orderId: string, nextStatus: string) => {
    setUpdating(orderId)
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus })
      await loadOrders()
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/farmer/orders')} aria-label="Back to orders"><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{filter.title}</h1>
          <p className="mt-1 text-sm text-muted">{filter.description}</p>
        </div>
      </div>

      {loading ? <Card><p className="py-8 text-center text-muted">Loading orders...</p></Card> : filteredOrders.length === 0 ? (
        <Card><EmptyState icon={Icon} title={`No ${filter.title.toLowerCase()}`} description="Orders in this section will appear here automatically." /></Card>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
                <div>
                  <OrderCard order={order} />
                  <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3 text-sm">
                    <div><p className="text-muted">Customer</p><p className="font-medium">{order.consumerName}</p></div>
                    <div><p className="text-muted">Delivery address</p><p className="flex items-start gap-1 font-medium"><MapPin className="mt-0.5 h-4 w-4 text-primary" />{order.address || 'Address unavailable'}</p></div>
                    <div><p className="text-muted">Items</p><p className="flex items-center gap-1 font-medium"><Package className="h-4 w-4 text-primary" />{order.items.length} product(s)</p></div>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-4 rounded-2xl bg-surface-elevated p-4">
                  <div><p className="text-xs uppercase tracking-wide text-muted">Current status</p><Badge variant={order.status === 'cancelled' ? 'danger' : order.status === 'completed' || order.status === 'delivered' ? 'success' : 'pending'}>{order.status.replace(/_/g, ' ')}</Badge></div>
                  {order.deliveryAgentName && <p className="text-sm"><span className="text-muted">Delivery partner:</span> {order.deliveryAgentName}</p>}
                  {['accepted', 'pickup', 'out_for_delivery'].includes(order.status) && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Bike className="h-5 w-5 animate-bounce" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Pickup rider is on the way</p>
                            <p className="text-xs text-muted">
                              {order.status === 'accepted' && 'Waiting for the agent to reach your pickup point.'}
                              {order.status === 'pickup' && 'The agent has reached your farm and is picking up the order.'}
                              {order.status === 'out_for_delivery' && 'The order has left your farm and is on the route.'}
                            </p>
                          </div>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                        <div className="h-full w-2/3 rounded-full bg-primary/80 animate-pulse" />
                      </div>
                    </div>
                  )}
                  {order.status === 'pending' && <div className="flex gap-2"><Button className="flex-1" loading={updating === order.id} onClick={() => updateStatus(order.id, 'accepted')}>Accept</Button><Button variant="danger" className="flex-1" loading={updating === order.id} onClick={() => updateStatus(order.id, 'cancelled')}>Reject</Button></div>}
                  {order.status === 'accepted' && !['accepted', 'pickup', 'out_for_delivery'].includes(order.status) && <p className="text-sm text-blue">Waiting for a delivery partner to accept this order.</p>}
                  {order.status === 'pickup' && <p className="text-sm text-accent">Delivery partner has accepted the pickup.</p>}
                  {order.status === 'out_for_delivery' && <p className="text-sm text-primary">Order is out for delivery.</p>}
                  {(order.status === 'completed' || order.status === 'delivered') && <p className="text-sm text-primary">Order completed successfully.</p>}
                  {order.status === 'cancelled' && <p className="text-sm text-danger">This order was cancelled.</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
