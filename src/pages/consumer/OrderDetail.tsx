import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bike, CheckCircle2, Download, FileText, MapPin, Package, Phone, Truck } from 'lucide-react'
import { useAuth } from '@/context/AppContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import { OrderTimeline } from '@/components/cards/OrderCard'
import ReviewForm from '@/components/common/ReviewForm'
import { formatCurrency, formatDate } from '@/utils/cn'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import type { Order } from '@/types'

function statusVariant(status: string) {
  if (status === 'cancelled') return 'danger' as const
  if (status === 'completed' || status === 'delivered') return 'success' as const
  if (status === 'accepted' || status === 'pickup') return 'verified' as const
  return 'pending' as const
}

function ActiveStatusCard({ status }: { status: string }) {
  const titleMap: Record<string, string> = {
    accepted: 'Order accepted',
    pickup: 'Pickup in progress',
    out_for_delivery: 'Out for delivery',
  }

  const messageMap: Record<string, string> = {
    accepted: 'A delivery rider is heading to the pickup point.',
    pickup: 'The rider is collecting your order from the farmer.',
    out_for_delivery: 'Your order is on the way and being delivered to you.',
  }

  const progressMap: Record<string, string> = {
    accepted: 'w-1/3',
    pickup: 'w-2/3',
    out_for_delivery: 'w-full',
  }

  return (
    <Card className="border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="status-delivery-orb relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{titleMap[status] || 'Order in progress'}</p>
            <p className="text-xs text-muted">{messageMap[status] || 'Your order is moving forward.'}</p>
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
        <div className={`status-progress-bar h-full rounded-full bg-primary ${progressMap[status] || 'w-1/3'}`} />
      </div>
    </Card>
  )
}

export default function ConsumerOrderDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { userId, userName, role } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [submittedProductReviews, setSubmittedProductReviews] = useState<Record<string, any>>({})
  const [farmerReview, setFarmerReview] = useState<any | null>(null)
  const [deliveryReview, setDeliveryReview] = useState<any | null>(null)

  const loadOrder = async () => {
    if (!userId || !role || !id) return

    try {
      const response = await api.get('/orders', { params: { userId, role } })
      const currentOrder = normalizeOrders(response.data.orders || []).find((item) => item.id === id) || null
      setOrder(currentOrder)

      if (!currentOrder) {
        setSubmittedProductReviews({})
        return
      }

      const reviewMap: Record<string, any> = {}
      await Promise.all(currentOrder.items.map(async (item) => {
        try {
          const reviewResponse = await api.get('/reviews', { params: { productId: item.productId } })
          const userReview = (reviewResponse.data.reviews || []).find((review: any) => String(review.user_id) === String(userId))
          reviewMap[item.productId] = userReview || null
        } catch {
          reviewMap[item.productId] = null
        }
      }))
      setSubmittedProductReviews(reviewMap)

      if (currentOrder.farmerId) {
        try {
          const farmerReviewResponse = await api.get('/reviews', { params: { targetType: 'farmer', targetId: currentOrder.farmerId } })
          const currentFarmerReview = (farmerReviewResponse.data.reviews || []).find((review: any) => String(review.user_id) === String(userId) && String(review.order_id) === String(currentOrder.id))
          setFarmerReview(currentFarmerReview || null)
        } catch {
          setFarmerReview(null)
        }
      } else {
        setFarmerReview(null)
      }

      if (currentOrder.deliveryAgentId) {
        try {
          const deliveryReviewResponse = await api.get('/reviews', { params: { targetType: 'delivery', targetId: currentOrder.deliveryAgentId } })
          const currentDeliveryReview = (deliveryReviewResponse.data.reviews || []).find((review: any) => String(review.user_id) === String(userId) && String(review.order_id) === String(currentOrder.id))
          setDeliveryReview(currentDeliveryReview || null)
        } catch {
          setDeliveryReview(null)
        }
      } else {
        setDeliveryReview(null)
      }
    } catch {
      setOrder(null)
      setFarmerReview(null)
      setDeliveryReview(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [id, role, userId])

  if (loading) return <Card><p className="py-10 text-center text-muted">{t('common.loading')}</p></Card>
  if (!order) return <Card><EmptyState icon={Package} title={t('nav.orders')} description={t('common.noData')} /></Card>

  const isCancelled = order.status === 'cancelled'
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = Math.max(0, order.total - subtotal)
  const printInvoice = () => window.print()

  const handleCancelOrder = async () => {
    if (!userId || !order || cancelling) return

    try {
      setCancelling(true)
      await api.put(`/orders/${order.id}/status`, { status: 'cancelled' })
      setOrder({ ...order, status: 'cancelled' })
    } catch (error: any) {
      console.error('Cancel order failed:', error)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/consumer/orders" className="flex items-center gap-2 text-sm text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> {t('common.back')}</Link>
        <Button variant="outline" size="sm" onClick={printInvoice}><Download className="h-4 w-4" /> {t('common.export')}</Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted">{t('nav.orders')} · {formatDate(order.createdAt)}</p><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.orders')} #{order.id}</h1></div><Badge variant={statusVariant(order.status)}>{order.status.replace(/_/g, ' ')}</Badge></div>

      {!isCancelled && !['delivered', 'completed'].includes(order.status) && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Order actions</h2>
              <p className="text-sm text-muted">You can cancel this order before it is delivered.</p>
            </div>
            <Button variant="danger" size="sm" loading={cancelling} onClick={handleCancelOrder}>Cancel order</Button>
          </div>
        </Card>
      )}

      {!isCancelled && <Card><div className="mb-5 flex items-center gap-2 font-semibold"><Truck className="h-5 w-5 text-primary" /> {t('common.track')}</div><OrderTimeline status={order.status} /><div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-muted">{t('common.status')}</p><p className="font-semibold">{order.status.replace(/_/g, ' ')}</p></div><div><p className="text-muted">{t('nav.farmers')}</p><p className="font-semibold">{order.farmerName}</p></div><div><p className="text-muted">{t('nav.agents')}</p><p className="font-semibold">{order.deliveryAgentName || t('common.noData')}</p></div></div></Card>}

      {['accepted', 'pickup', 'out_for_delivery'].includes(order.status) && <ActiveStatusCard status={order.status} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card><div className="mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><h2 className="font-semibold">{t('nav.orders')}</h2></div><div className="space-y-4">{order.items.map((item) => <div key={item.productId} className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><img src={item.image} alt={item.productName} className="h-20 w-20 rounded-xl object-cover bg-surface-elevated" /><div className="min-w-0 flex-1"><Link to={`/consumer/product/${item.productId}`} className="font-medium hover:text-primary">{item.productName}</Link><p className="text-sm text-muted">{t('common.quantity')}: {item.quantity}</p><p className="text-sm text-muted">{t('common.price')}: {formatCurrency(item.price)} each</p></div><p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p></div>)}</div></Card>

        <div className="space-y-6"><Card><div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="font-semibold">{t('common.total')}</h2></div><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted">{t('common.total')}</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between"><span className="text-muted">{t('common.delivery')}</span><span>{formatCurrency(deliveryFee)}</span></div><div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>{t('common.total')}</span><span className="text-primary">{formatCurrency(order.total)}</span></div><p className="text-xs text-muted">{t('common.paymentMethod')}: {order.paymentMethod || 'Not specified'}</p></div></Card><Card><h2 className="mb-3 font-semibold">{t('common.address')}</h2><p className="flex items-start gap-2 text-sm text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{order.address || t('common.noData')}</p>{order.deliveryAgentName && <p className="mt-4 flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" /><Link to={`/consumer/delivery/${order.deliveryAgentId}`} className="text-primary hover:underline">{order.deliveryAgentName}</Link></p>}</Card></div>
      </div>

      {order.status === 'completed' || order.status === 'delivered' ? (
        <Card className="border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-semibold">Delivered successfully</h2>
              <p className="text-sm text-muted">Thank you for shopping directly from local farmers.</p>
            </div>
          </div>
        </Card>
      ) : null}

      {(order.status === 'completed' || order.status === 'delivered') && (
        <Card>
          <div className="mb-5">
            <h2 className="font-semibold">Rate and review your purchase</h2>
            <p className="text-sm text-muted">Your review will be visible on each product page for other shoppers.</p>
          </div>

          <div className="space-y-5">
            {order.items.map((item) => {
              const userReview = submittedProductReviews[item.productId]

              return (
                <div key={item.productId} className="rounded-2xl border border-border p-4">
                  <p className="font-medium">{item.productName}</p>

                  {userReview ? (
                    <div className="mt-3 space-y-2 rounded-2xl bg-surface-elevated p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-primary">Review submitted</span>
                        <span className="text-xs text-muted">{new Date(userReview.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted">Rating:</span>
                        <span className="font-semibold text-foreground">{userReview.rating}/5</span>
                      </div>
                      <p className="text-sm text-muted">{userReview.comment}</p>
                      {userReview.review_image && <img src={userReview.review_image} alt={item.productName} className="mt-2 max-h-56 w-full rounded-2xl object-cover" />}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="mb-2 text-sm text-muted">Share your experience with this product</p>
                      <ReviewForm
                        targetType="product"
                        targetId={item.productId}
                        reviewerId={userId || ''}
                        reviewerName={userName}
                        reviewerRole="consumer"
                        title={`Review ${item.productName}`}
                        onSubmitted={loadOrder}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {(order.status === 'completed' || order.status === 'delivered') && (
        <Card>
          <div className="mb-5">
            <h2 className="font-semibold">Rate the farmer and delivery partner</h2>
            <p className="text-sm text-muted">This rating appears on their profile based on the average of all reviews.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <p className="font-medium">Farmer: {order.farmerName}</p>
              {farmerReview ? (
                <div className="mt-3 rounded-2xl bg-surface-elevated p-3 text-sm text-muted">
                  <p className="font-medium text-primary">Farmer review submitted</p>
                  <p className="mt-2">Rating: {farmerReview.rating}/5</p>
                  <p className="mt-1">{farmerReview.comment}</p>
                </div>
              ) : (
                <div className="mt-3">
                  <ReviewForm
                    targetType="farmer"
                    targetId={order.farmerId}
                    orderId={order.id}
                    reviewerId={userId || ''}
                    reviewerName={userName}
                    reviewerRole="consumer"
                    title={`Rate ${order.farmerName}`}
                    onSubmitted={loadOrder}
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="font-medium">{order.deliveryAgentName ? `Delivery partner: ${order.deliveryAgentName}` : 'Delivery partner not assigned'}</p>
              {order.deliveryAgentId ? (
                deliveryReview ? (
                  <div className="mt-3 rounded-2xl bg-surface-elevated p-3 text-sm text-muted">
                    <p className="font-medium text-primary">Delivery review submitted</p>
                    <p className="mt-2">Rating: {deliveryReview.rating}/5</p>
                    <p className="mt-1">{deliveryReview.comment}</p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <ReviewForm
                      targetType="delivery"
                      targetId={order.deliveryAgentId}
                      orderId={order.id}
                      reviewerId={userId || ''}
                      reviewerName={userName}
                      reviewerRole="consumer"
                      title={`Rate ${order.deliveryAgentName || 'delivery partner'}`}
                      onSubmitted={loadOrder}
                    />
                  </div>
                )
              ) : (
                <p className="mt-3 text-sm text-muted">No delivery partner was assigned to this order.</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
