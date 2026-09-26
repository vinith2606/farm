import { useEffect, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Bike, Camera, CheckCircle2, MapPin, MessageCircle, Navigation, Package, Phone, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import { useAuth } from '@/context/AppContext'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import { buildDirectionsUrl, DEFAULT_LOCATION, getCurrentLocation } from '@/utils/locationService'
import type { Order } from '@/types'

type DetailTab = 'pickup' | 'delivery'

function statusVariant(status: string) {
  if (status === 'cancelled') return 'danger' as const
  if (status === 'completed' || status === 'delivered') return 'success' as const
  if (status === 'accepted' || status === 'pickup') return 'verified' as const
  return 'pending' as const
}

function ActiveStatusCard({ status }: { status: string }) {
  const titleMap: Record<string, string> = {
    accepted: 'Pickup request accepted',
    pickup: 'Rider en route for pickup',
    out_for_delivery: 'Order is out for delivery',
  }

  const messageMap: Record<string, string> = {
    accepted: 'You have accepted the delivery and are heading to collect the order.',
    pickup: 'The parcel is being picked up from the farmer and loaded for delivery.',
    out_for_delivery: 'The order is moving toward the customer and is now in transit.',
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

export default function DeliveryOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId, userName } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [tab, setTab] = useState<DetailTab>('pickup')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [parcelPhoto, setParcelPhoto] = useState('')
  const [origin, setOrigin] = useState(DEFAULT_LOCATION)

  useEffect(() => {
    getCurrentLocation().then(setOrigin)
  }, [])

  const loadOrder = async () => {
    if (!userId || !id) return
    try {
      const response = await api.get('/orders', { params: { userId, role: 'delivery' } })
      setOrder(normalizeOrders(response.data.orders || []).find((item) => item.id === id) || null)
    } catch {
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrder() }, [id, userId])

  const handleParcelPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = () => setParcelPhoto(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const updateStatus = async (status: string) => {
    if (!order || !userId) return
    setUpdating(true)
    try {
      await api.put(`/orders/${order.id}/status`, {
        status,
        delivery_agent_id: Number(userId),
        delivery_agent_name: userName,
        ...(status === 'pickup' || status === 'out_for_delivery' ? { pickup_parcel_photo: parcelPhoto || undefined } : {}),
        ...(status === 'completed' ? { delivery_parcel_photo: parcelPhoto || undefined } : {}),
      })
      setParcelPhoto('')
      await loadOrder()
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <Card><p className="py-10 text-center text-muted">Loading order details...</p></Card>
  if (!order) return <Card><EmptyState icon={Package} title="Order not found" description="This delivery order is no longer available." /></Card>

  const pickupLocation = order.farmerLat != null && order.farmerLng != null ? { lat: order.farmerLat, lng: order.farmerLng } : null
  const deliveryLocation = order.consumerLat != null && order.consumerLng != null ? { lat: order.consumerLat, lng: order.consumerLng } : null
  const isPickup = tab === 'pickup'
  const navigationLocation = tab === 'pickup' ? pickupLocation : deliveryLocation
  const navigationUrl = navigationLocation ? buildDirectionsUrl(origin, navigationLocation) : null
  const locationAddress = isPickup ? order.pickupAddress : order.deliveryAddress
  const mapPath = `/delivery/map?orderId=${order.id}${navigationLocation ? `&lat=${navigationLocation.lat}&lng=${navigationLocation.lng}` : ''}&address=${encodeURIComponent(locationAddress || '')}`

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3"><Button variant="ghost" size="icon" onClick={() => navigate('/delivery/orders')} aria-label="Back to delivery orders"><ArrowLeft className="h-5 w-5" /></Button><div className="mr-auto"><p className="text-sm text-muted">Delivery order</p><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Order #{order.id}</h1></div><Badge variant={statusVariant(order.status)}>{order.status.replace(/_/g, ' ')}</Badge></div>
      <Card padding="none" className="overflow-hidden"><div className="grid grid-cols-2 border-b border-border"><button type="button" onClick={() => setTab('pickup')} className={`flex items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold ${isPickup ? 'border-primary text-primary' : 'border-transparent text-muted'}`}><MapPin className="h-4 w-4" /> Pickup</button><button type="button" onClick={() => setTab('delivery')} className={`flex items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold ${!isPickup ? 'border-primary text-primary' : 'border-transparent text-muted'}`}><Truck className="h-4 w-4" /> Delivery</button></div><div className="p-5"><LocationPanel title={isPickup ? 'Pickup details' : 'Delivery details'} name={isPickup ? order.farmerName : order.consumerName} phone={isPickup ? order.farmerPhone : order.consumerPhone} address={isPickup ? order.pickupAddress : order.deliveryAddress} contactId={isPickup ? order.farmerId : order.consumerId} navigationUrl={navigationUrl} mapPath={mapPath} navigationLabel={isPickup ? 'Navigate to pickup' : 'Navigate to delivery'} /></div></Card>
      {(order.status === 'accepted' || order.status === 'pickup' || order.status === 'out_for_delivery') && <ActiveStatusCard status={order.status} />}
      <Card><div className="mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><h2 className="font-semibold">Order items</h2></div><div className="space-y-3">{order.items.map((item) => <div key={item.productId} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"><div><p className="font-medium">{item.productName}</p><p className="text-sm text-muted">{order.farmerName}</p></div><span className="font-semibold">Quantity: {item.quantity}</span></div>)}</div></Card>
      {(order.pickupParcelPhoto || order.deliveryParcelPhoto) && <Card><h2 className="mb-4 font-semibold">Parcel photos</h2><div className="grid gap-4 sm:grid-cols-2">{order.pickupParcelPhoto && <div><p className="mb-2 text-sm text-muted">Pickup photo</p><img src={order.pickupParcelPhoto} alt="Parcel at pickup" className="max-h-64 w-full rounded-2xl object-cover" /></div>}{order.deliveryParcelPhoto && <div><p className="mb-2 text-sm text-muted">Delivery photo</p><img src={order.deliveryParcelPhoto} alt="Parcel at delivery" className="max-h-64 w-full rounded-2xl object-cover" /></div>}</div></Card>}
      {(order.status === 'accepted' || order.status === 'pickup' || order.status === 'out_for_delivery') && <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm"><Camera className="h-5 w-5 text-primary" /><span>{parcelPhoto ? 'Parcel photo selected' : `Add ${order.status === 'out_for_delivery' ? 'delivery' : 'pickup'} parcel photo (optional)`}</span><input type="file" accept="image/*" className="sr-only" onChange={handleParcelPhoto} /></label>}
      <div className="flex flex-wrap gap-3">{order.status === 'accepted' && !order.deliveryAgentId && <><Button loading={updating} onClick={() => updateStatus('pickup')}>Accept delivery</Button><Button variant="danger" loading={updating} onClick={() => updateStatus('cancelled')}>Reject request</Button></>}{order.status === 'pickup' && order.deliveryAgentId && <Button variant="outline" loading={updating} onClick={() => updateStatus('out_for_delivery')}>Mark as picked up</Button>}{order.status === 'out_for_delivery' && <Button variant="accent" loading={updating} onClick={() => updateStatus('completed')}><CheckCircle2 className="h-4 w-4" /> Mark as delivered</Button>}</div>
    </div>
  )
}

function LocationPanel({ title, name, phone, address, contactId, navigationUrl, mapPath, navigationLabel }: { title: string; name: string; phone?: string; address?: string; contactId: string; navigationUrl: string | null; mapPath: string; navigationLabel: string }) {
  return <div><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 font-medium">{name}</p><p className="mt-1 flex items-center gap-2 text-sm text-muted"><Phone className="h-4 w-4 text-primary" />{phone || 'Phone not provided'}</p><p className="mt-2 flex items-start gap-2 text-sm text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{address || 'Address unavailable'}</p></div><div className="flex gap-2"><a href={phone ? `tel:${phone}` : undefined} className={`inline-flex items-center justify-center rounded-xl border border-border p-2.5 ${phone ? 'text-primary hover:bg-primary/10' : 'pointer-events-none text-muted opacity-50'}`} aria-label={`Call ${name}`} title={`Call ${name}`}><Phone className="h-5 w-5" /></a><Link to={`/delivery/messages?contactId=${contactId}`} className="inline-flex items-center justify-center rounded-xl border border-border p-2.5 text-primary hover:bg-primary/10" aria-label={`Message ${name}`} title={`Message ${name}`}><MessageCircle className="h-5 w-5" /></Link></div></div><Link to={mapPath} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"><Navigation className="h-4 w-4" /> {navigationLabel}</Link>{!navigationUrl && <p className="mt-2 text-xs text-muted">The map will use the saved address.</p>}</div>
}
