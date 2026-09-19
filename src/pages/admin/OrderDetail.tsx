import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CreditCard, MapPin, Package, Truck, User } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/utils/cn'
import { normalizeOrders } from '@/utils/orderService'
import api from '@/services/api'
import type { Order } from '@/types'

function statusVariant(status: string) {
  if (status === 'cancelled') return 'danger' as const
  if (status === 'completed' || status === 'delivered' || status === 'paid') return 'success' as const
  if (status === 'accepted' || status === 'pickup') return 'verified' as const
  return 'warning' as const
}

function deliveryStatus(order: Order) {
  if (order.status === 'cancelled') return 'Cancelled'
  if (order.status === 'completed' || order.status === 'delivered') return 'Delivered'
  if (order.status === 'out_for_delivery') return 'Out for delivery'
  if (order.deliveryAgentId) return 'Assigned'
  return 'Not assigned'
}

export default function AdminOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/orders').then((response) => {
      const match = normalizeOrders(response.data.orders || []).find((item) => item.id === String(id))
      setOrder(match || null)
      if (!match) setError('This order is unavailable.')
    }).catch(() => setError('Unable to load order details right now.')).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>
  if (!order) return <div className="space-y-6"><button onClick={() => navigate('/admin/orders')} className="flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Back to orders</button><Card><EmptyState icon={Package} title="Order not found" description={error} /></Card></div>

  const delivery = deliveryStatus(order)
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Back to orders</button>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Order Management</p><h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">Order #{order.id}</h1><p className="mt-1 flex items-center gap-2 text-sm text-muted"><CalendarDays className="h-4 w-4" />{formatDate(order.createdAt)}</p></div><div className="flex flex-wrap gap-2"><Badge variant={statusVariant(order.status)}>Order: {order.status.replace(/_/g, ' ')}</Badge><Badge variant={statusVariant(order.paymentStatus)}>Payment: {order.paymentStatus}</Badge><Badge variant={delivery === 'Delivered' ? 'success' : delivery === 'Cancelled' ? 'danger' : 'warning'}>Delivery: {delivery}</Badge></div></div>
      <div className="grid gap-6 md:grid-cols-3"><Card><div className="mb-3 flex items-center gap-2"><User className="h-5 w-5 text-primary" /><h2 className="font-semibold">Farmer Name</h2></div><p className="font-medium">{order.farmerName || 'Not provided'}</p></Card><Card><div className="mb-3 flex items-center gap-2"><User className="h-5 w-5 text-primary" /><h2 className="font-semibold">Consumer Name</h2></div><p className="font-medium">{order.consumerName || 'Not provided'}</p></Card><Card><div className="mb-3 flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h2 className="font-semibold">Delivery Partner</h2></div><p className="font-medium">{order.deliveryAgentName || 'Not assigned'}</p></Card></div>
      <Card><div className="mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><h2 className="font-semibold">Product Details</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-elevated"><th className="p-3 text-left">Product</th><th className="p-3 text-left">Quantity</th><th className="p-3 text-right">Unit Price</th><th className="p-3 text-right">Subtotal</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.productId} className="border-b border-border"><td className="p-3 font-medium">{item.productName}</td><td className="p-3">{item.quantity}</td><td className="p-3 text-right">{formatCurrency(item.price)}</td><td className="p-3 text-right font-medium">{formatCurrency(item.price * item.quantity)}</td></tr>)}</tbody><tfoot><tr><td colSpan={3} className="p-3 text-right font-semibold">Order Amount</td><td className="p-3 text-right text-lg font-bold text-primary">{formatCurrency(order.total)}</td></tr></tfoot></table></div></Card>
      <div className="grid gap-6 md:grid-cols-2"><Card><div className="mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /><h2 className="font-semibold">Payment Status</h2></div><Badge variant={statusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge><p className="mt-3 text-sm text-muted">Payment method: {order.paymentMethod || 'Not specified'}</p></Card><Card><div className="mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><h2 className="font-semibold">Delivery Details</h2></div><Badge variant={delivery === 'Delivered' ? 'success' : delivery === 'Cancelled' ? 'danger' : 'warning'}>{delivery}</Badge><p className="mt-3 text-sm text-muted">{order.address || 'Delivery address not provided'}</p></Card></div>
    </div>
  )
}
