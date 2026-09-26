import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, ShoppingCart, MapPin, ChevronRight, ShieldCheck } from 'lucide-react'
import { useCart, useAuth } from '@/context/AppContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'
import { getDistanceKm } from '@/utils/locationService'

type SavedAddress = {
  id: number
  label: string
  address_line: string
  landmark?: string
  city: string
  state?: string
  pincode?: string
  is_default: number
  lat?: number
  lng?: number
}

export default function ConsumerCart() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { items, wishlist, removeItem, updateQuantity, total, clearCart } = useCart()
  const { userId, userName, userLocation } = useAuth()
  const { toast } = useToast()
  const [addressLine, setAddressLine] = useState(userLocation?.address || '')
  const [landmark, setLandmark] = useState('')
  const [city, setCity] = useState(userLocation?.city || '')
  const [state, setState] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod'>('upi')
  const [loading, setLoading] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [deliveryCoordinates, setDeliveryCoordinates] = useState({ lat: userLocation?.lat || null, lng: userLocation?.lng || null })

  const hasSavedAddress = savedAddresses.length > 0 && selectedAddressId !== null

  useEffect(() => {
    if (!userId) {
      setSavedAddresses([])
      setSelectedAddressId(null)
      return
    }

    api.get(`/users/${userId}/addresses`).then((response) => {
      const addresses = response.data.addresses || []
      setSavedAddresses(addresses)
      const defaultAddress = addresses.find((address: SavedAddress) => Number(address.is_default) === 1) || addresses[0]
      if (defaultAddress) {
        selectSavedAddress(defaultAddress)
      } else {
        setSelectedAddressId(null)
      }
    }).catch(() => {
      setSavedAddresses([])
      setSelectedAddressId(null)
    })
  }, [userId])

  const selectSavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id)
    setDeliveryCoordinates({ lat: address.lat ?? null, lng: address.lng ?? null })
    setAddressLine(address.address_line || '')
    setLandmark(address.landmark || '')
    setCity(address.city || '')
    setState(address.state || '')
    setPinCode(address.pincode || '')
  }

  if (items.length === 0 && wishlist.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title={t('common.emptyState')}
        description="Add products from search to build your cart."
        action={{ label: t('nav.search'), onClick: () => navigate('/consumer/search') }}
      />
    )
  }

  const farmerDistance = items.length > 0 && items[0].product.farmerLat != null && items[0].product.farmerLng != null && userLocation?.lat != null && userLocation?.lng != null
    ? getDistanceKm(userLocation.lat, userLocation.lng, items[0].product.farmerLat, items[0].product.farmerLng)
    : 0

  const delivery = total >= 499 ? 0 : farmerDistance <= 5 ? 25 : farmerDistance <= 15 ? 45 : farmerDistance <= 30 ? 70 : 95
  const savings = items.reduce((sum, { product, quantity }) => sum + (product.recommendedPrice && product.recommendedPrice > product.price ? product.recommendedPrice - product.price : 0) * quantity, 0)
  const grandTotal = total + delivery

  const fullAddressRequired = !hasSavedAddress && (!addressLine.trim() || !city.trim() || !state.trim() || !pinCode.trim())

  const handleCheckout = async () => {
    if (!userId) {
      toast('Please sign in to place an order.', 'warning')
      return
    }

    if (!hasSavedAddress && fullAddressRequired) {
      toast('Please enter your complete delivery address before placing the order.', 'warning')
      return
    }

    const farmerIds = Array.from(new Set(items.map(({ product }) => product.farmerId)))
    if (farmerIds.length > 1) {
      toast('All items in the cart must be from the same farmer to checkout.', 'warning')
      return
    }

    const orderItems = items.map(({ product, quantity }) => ({
      product_id: Number(product.id),
      product_name: product.name,
      quantity,
      price: product.price,
      image: product.image,
    }))

    const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId)
    const checkoutAddress = selectedAddress
      ? [selectedAddress.address_line, selectedAddress.landmark, selectedAddress.city, selectedAddress.state, selectedAddress.pincode].filter(Boolean).join(', ') || 'Delivery address not provided'
      : [addressLine, landmark, city, state, pinCode].filter(Boolean).join(', ') || 'Delivery address not provided'
    const selectedAddressText = selectedAddress ? [selectedAddress.address_line, selectedAddress.landmark, selectedAddress.city, selectedAddress.state, selectedAddress.pincode].filter(Boolean).join(', ') : ''
    const coordinates = selectedAddressText === checkoutAddress ? deliveryCoordinates : { lat: null, lng: null }

    try {
      setLoading(true)
      await api.post('/orders', {
        consumer_id: Number(userId),
        consumer_name: userName,
        farmer_id: Number(items[0].product.farmerId),
        farmer_name: items[0].product.farmerName,
        items: orderItems,
        total: grandTotal,
        address: checkoutAddress,
        delivery_lat: coordinates.lat,
        delivery_lng: coordinates.lng,
        payment_method: paymentMethod,
      })

      clearCart()
      toast(t('toast.orderPlaced'), 'success')
      navigate('/consumer/orders')
    } catch (error) {
      console.error('Order checkout failed:', error)
      toast('Unable to place order right now. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-primary">FarmDirect quick delivery</p>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{location.pathname.endsWith('/checkout') ? 'Checkout' : 'Your cart'}</h1>
        </div>
        <span className="text-sm text-muted">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {items.length > 0 && (
            <>
              <SavedAddressPicker addresses={savedAddresses} selectedAddressId={selectedAddressId} onSelect={selectSavedAddress} />

              <Card className="border-primary/20 bg-primary/5">
                <p className="text-sm font-semibold text-primary">Expected delivery</p>
                <p className="mt-1 text-sm text-muted">Approximately {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()} based on current fulfilment estimates.</p>
              </Card>

              <Card padding="none" className="overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-semibold">Basket items</h2>
                  <p className="text-sm text-muted">Sold by {items[0].product.farmerName}</p>
                </div>
                <div className="divide-y divide-border">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-3 p-4 sm:p-5">
                      <img src={product.image} alt={product.name} className="h-20 w-20 rounded-xl object-cover bg-surface-elevated" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted">{product.unit} · {product.farmerName}</p>
                        <p className="mt-1 font-bold text-primary">{formatCurrency(product.price)}</p>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <div className="flex items-center rounded-xl border border-primary overflow-hidden">
                          <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(product.id, quantity - 1)} className="px-2 py-1.5 text-primary hover:bg-primary/10"><Minus className="h-4 w-4" /></button>
                          <span className="min-w-8 text-center text-sm font-semibold">{quantity}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(product.id, quantity + 1)} className="px-2 py-1.5 text-primary hover:bg-primary/10"><Plus className="h-4 w-4" /></button>
                        </div>
                        <button type="button" onClick={() => removeItem(product.id)} className="text-xs text-danger hover:underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {!hasSavedAddress && (
                <Card>
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="font-semibold">Delivery address</h2>
                      <p className="text-xs text-muted">Add each address detail for accurate delivery.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-foreground sm:col-span-2">
                      Address line
                      <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="House / flat number, street, area" className="mt-1.5 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </label>

                    <label className="block text-sm font-medium text-foreground">
                      Landmark
                      <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near school, temple, shop..." className="mt-1.5 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </label>

                    <label className="block text-sm font-medium text-foreground">
                      City
                      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" className="mt-1.5 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </label>

                    <label className="block text-sm font-medium text-foreground">
                      State
                      <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Karnataka" className="mt-1.5 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </label>

                    <label className="block text-sm font-medium text-foreground">
                      PIN code
                      <input value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="560001" className="mt-1.5 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </label>
                  </div>

                  <p className="mt-3 text-xs text-muted">Saved addresses are used automatically when selected; full address entry is only required when no saved address is available.</p>
                </Card>
              )}

              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Payment method</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${paymentMethod === 'upi' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} />
                    UPI / online
                  </label>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                    Cash on delivery
                  </label>
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <h2 className="mb-4 font-semibold">Bill details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Items total</span><span>{formatCurrency(total)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Delivery fee</span><span className={delivery === 0 ? 'text-primary' : ''}>{delivery === 0 ? 'FREE' : formatCurrency(delivery)}</span></div>
              {savings > 0 && <div className="flex justify-between text-primary"><span>Price savings</span><span>-{formatCurrency(savings)}</span></div>}
              <div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><span>To pay</span><span className="text-primary">{formatCurrency(grandTotal)}</span></div>
            </div>
            <Button size="lg" className="mt-5 w-full" loading={loading} onClick={handleCheckout}>{location.pathname.endsWith('/checkout') ? 'Place order' : 'Proceed to checkout'} <ChevronRight className="h-5 w-5" /></Button>
            <p className="mt-3 text-center text-xs text-muted">Freshness guaranteed · Secure checkout</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SavedAddressPicker({ addresses, selectedAddressId, onSelect }: { addresses: SavedAddress[]; selectedAddressId: number | null; onSelect: (address: SavedAddress) => void }) {
  if (addresses.length === 0) return null

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="font-semibold">Saved addresses</h2><p className="text-xs text-muted">Select an address for this order.</p></div>
        <MapPin className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-2">
        {addresses.map((address) => (
          <button key={address.id} type="button" onClick={() => onSelect(address)} className={`block w-full rounded-2xl border p-3 text-left transition-colors ${selectedAddressId === address.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            <div className="flex items-center justify-between gap-3"><span className="font-semibold text-sm">{address.label || 'Saved address'}</span>{address.is_default ? <span className="text-xs font-semibold text-primary">Default</span> : null}</div>
            <p className="mt-1 text-sm text-muted">{[address.address_line, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</p>
          </button>
        ))}
      </div>
    </Card>
  )
}
