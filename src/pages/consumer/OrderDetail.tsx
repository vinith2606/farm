import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Download, FileText, MapPin, Package, Phone, Star, Truck } from 'lucide-react'
import { useAuth } from '@/context/AppContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import { OrderTimeline } from '@/components/cards/OrderCard'
import { formatCurrency, formatDate } from '@/utils/cn'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import type { Order } from '@/types'
import ReviewForm from '@/components/common/ReviewForm'

function statusVariant(status: string) {
  if (status === 'cancelled') return 'danger' as const
  if (status === 'completed' || status === 'delivered') return 'success' as const
  if (status === 'accepted' || status === 'pickup') return 'verified' as const
  return 'pending' as const
}

export default function ConsumerOrderDetail() {
  const { id } = useParams()
  const { userId, userName, role } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({})
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewMessage, setReviewMessage] = useState('')

  useEffect(() => {
    if (!userId || !role || !id) return
    api.get('/orders', { params: { userId, role } })
      .then((response) => setOrder(normalizeOrders(response.data.orders || []).find((item) => item.id === id) || null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [id, role, userId])

  if (loading) return <Card><p className="py-10 text-center text-muted">Loading order details...</p></Card>
  if (!order) return <Card><EmptyState icon={Package} title="Order not found" description="This order is no longer available." /></Card>

  const isCancelled = order.status === 'cancelled'
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = Math.max(0, order.total - subtotal)
  const printInvoice = () => window.print()

  const submitReview = async (productId: string) => {
    if (!userId || !ratings[productId] || !comments[productId]?.trim()) {
      setReviewMessage('Choose a rating and write a short review.')
      return
    }
    setReviewing(productId)
    setReviewMessage('')
    try {
      await api.post('/reviews', { product_id: Number(productId), user_id: Number(userId), user_name: userName, rating: ratings[productId], comment: comments[productId].trim() })
      setReviewed((current) => ({ ...current, [productId]: true }))
      setReviewMessage('Review submitted successfully.')
    } catch (error: any) {
      setReviewMessage(error?.response?.data?.message || 'Unable to submit review right now.')
    } finally {
      setReviewing(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/consumer/orders" className="flex items-center gap-2 text-sm text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to orders</Link>
        <Button variant="outline" size="sm" onClick={printInvoice}><Download className="h-4 w-4" /> Download invoice</Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted">Order placed {formatDate(order.createdAt)}</p><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Order #{order.id}</h1></div><Badge variant={statusVariant(order.status)}>{order.status.replace(/_/g, ' ')}</Badge></div>

      {!isCancelled && <Card><div className="mb-5 flex items-center gap-2 font-semibold"><Truck className="h-5 w-5 text-primary" /> Order tracking</div><OrderTimeline status={order.status} /><div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-muted">Current status</p><p className="font-semibold">{order.status.replace(/_/g, ' ')}</p></div><div><p className="text-muted">Farmer</p><p className="font-semibold">{order.farmerName}</p></div><div><p className="text-muted">Delivery partner</p><p className="font-semibold">{order.deliveryAgentName || 'Being assigned'}</p></div></div></Card>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card><div className="mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><h2 className="font-semibold">Items in this order</h2></div><div className="space-y-4">{order.items.map((item) => <div key={item.productId} className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><img src={item.image} alt={item.productName} className="h-20 w-20 rounded-xl object-cover bg-surface-elevated" /><div className="min-w-0 flex-1"><Link to={`/consumer/product/${item.productId}`} className="font-medium hover:text-primary">{item.productName}</Link><p className="text-sm text-muted">Quantity: {item.quantity}</p><p className="text-sm text-muted">Price: {formatCurrency(item.price)} each</p></div><p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p></div>)}</div></Card>

        <div className="space-y-6"><Card><div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="font-semibold">Invoice summary</h2></div><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted">Items subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between"><span className="text-muted">Delivery fee</span><span>{formatCurrency(deliveryFee)}</span></div><div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>Total paid</span><span className="text-primary">{formatCurrency(order.total)}</span></div><p className="text-xs text-muted">Payment method: {order.paymentMethod || 'Not specified'}</p></div></Card><Card><h2 className="mb-3 font-semibold">Delivery address</h2><p className="flex items-start gap-2 text-sm text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{order.address || 'Address unavailable'}</p>{order.deliveryAgentName && <p className="mt-4 flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" /><Link to={`/consumer/delivery/${order.deliveryAgentId}`} className="text-primary hover:underline">{order.deliveryAgentName}</Link></p>}</Card></div>
      </div>

      {(order.status === 'completed' || order.status === 'delivered') && <Card><div className="mb-5"><h2 className="font-semibold">Rate your order experience</h2><p className="text-sm text-muted">Share feedback about the farmer and delivery partner.</p></div><div className="grid gap-6 md:grid-cols-2"><ReviewForm targetType="farmer" targetId={order.farmerId} orderId={order.id} reviewerId={userId || ''} reviewerName={userName} reviewerRole="consumer" title={`Rate ${order.farmerName}`} />{order.deliveryAgentId ? <ReviewForm targetType="delivery" targetId={order.deliveryAgentId} orderId={order.id} reviewerId={userId || ''} reviewerName={userName} reviewerRole="consumer" title={`Rate ${order.deliveryAgentName || 'your delivery partner'}`} /> : <p className="text-sm text-muted">No delivery partner was assigned to this order.</p>}</div></Card>}

      {order.status === 'completed' || order.status === 'delivered' ? <Card className="border-primary/30 bg-primary/5"><div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-primary" /><div><h2 className="font-semibold">Delivered successfully</h2><p className="text-sm text-muted">Thank you for shopping directly from local farmers.</p></div></div></Card> : null}

      {(order.status === 'completed' || order.status === 'delivered') && <Card><div className="mb-4"><h2 className="font-semibold">Rate and review your purchase</h2><p className="text-sm text-muted">Your review will be visible to other customers on the product page.</p></div><div className="space-y-5">{order.items.map((item) => <div key={item.productId} className="border-b border-border pb-5 last:border-0 last:pb-0"><p className="font-medium">{item.productName}</p>{reviewed[item.productId] ? <p className="mt-2 text-sm text-primary">Review submitted. Thank you.</p> : <><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`${rating} stars`} onClick={() => setRatings((current) => ({ ...current, [item.productId]: rating }))}><Star className={`h-6 w-6 ${rating <= (ratings[item.productId] || 0) ? 'fill-accent text-accent' : 'text-border-light'}`} /></button>)}</div><textarea value={comments[item.productId] || ''} onChange={(event) => setComments((current) => ({ ...current, [item.productId]: event.target.value }))} rows={3} placeholder="Share your experience with this product" className="mt-3 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" /><Button size="sm" className="mt-3" loading={reviewing === item.productId} onClick={() => submitReview(item.productId)}>Submit review</Button></>}</div>)}</div>{reviewMessage && <p className="mt-4 text-sm text-primary">{reviewMessage}</p>}</Card>}
    </div>
  )
}
