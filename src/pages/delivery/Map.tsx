import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Navigation, MapPin, Clock, Package } from 'lucide-react'
import { MapView } from '@/components/common/MapView'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import api from '@/services/api'
import { normalizeOrders } from '@/utils/orderService'
import { buildDirectionsUrl, DEFAULT_LOCATION, geocodeAddress, getRouteDurationMinutes, isValidCoordinates, requestCurrentLocation } from '@/utils/locationService'
import type { Coordinates } from '@/utils/locationService'

export default function DeliveryMap() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [order, setOrder] = useState<any>(null)
  const [target, setTarget] = useState<Coordinates | null>(null)
  const [origin, setOrigin] = useState<Coordinates | null>(null)
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null)
  const address = params.get('address') || ''

  useEffect(() => {
    const orderId = params.get('orderId')
    const userId = localStorage.getItem('farmdirect_user_id')
    const latitudeParam = params.get('lat')
    const longitudeParam = params.get('lng')
    const latitude = Number(latitudeParam)
    const longitude = Number(longitudeParam)
    if (latitudeParam && longitudeParam && isValidCoordinates({ lat: latitude, lng: longitude })) setTarget({ lat: latitude, lng: longitude })

    requestCurrentLocation().then(setOrigin).catch(() => setOrigin(null))

    if (!orderId || !userId) return
    api.get('/orders', { params: { userId, role: 'delivery' } }).then(async (response) => {
      const next = normalizeOrders(response.data.orders || []).find((item) => item.id === orderId)
      setOrder(next || null)

      if (!next) return

      const orderLatitudeParam = params.get('lat')
      const orderLongitudeParam = params.get('lng')
      const orderLatitude = Number(orderLatitudeParam)
      const orderLongitude = Number(orderLongitudeParam)
      const hasExplicitTarget = Boolean(orderLatitudeParam && orderLongitudeParam && isValidCoordinates({ lat: orderLatitude, lng: orderLongitude }))
      const pickupCoordinates = next.farmerLat != null && next.farmerLng != null ? { lat: next.farmerLat, lng: next.farmerLng } : null
      const deliveryCoordinates = next.consumerLat != null && next.consumerLng != null ? { lat: next.consumerLat, lng: next.consumerLng } : null

      if (!hasExplicitTarget) {
        const selectedTarget = address && orderLatitude === 0 && orderLongitude === 0
          ? (pickupCoordinates && address === next.pickupAddress ? pickupCoordinates : deliveryCoordinates)
          : (pickupCoordinates && !deliveryCoordinates ? pickupCoordinates : deliveryCoordinates)

        if (selectedTarget) setTarget(selectedTarget)
        else if (address) setTarget(await geocodeAddress(address))
      }
    }).catch(() => setOrder(null))
  }, [params, address])

  useEffect(() => {
    if (!order || !origin) {
      setEtaMinutes(null)
      return
    }

    const pickupCoordinates = order.farmerLat != null && order.farmerLng != null ? { lat: order.farmerLat, lng: order.farmerLng } : null
    const deliveryCoordinates = order.consumerLat != null && order.consumerLng != null ? { lat: order.consumerLat, lng: order.consumerLng } : null
    const selectedAddress = address?.trim()
    const isPickupRoute = Boolean(
      (selectedAddress && order.pickupAddress && selectedAddress === order.pickupAddress) ||
      (pickupCoordinates && isValidCoordinates(target) && target.lat === pickupCoordinates.lat && target.lng === pickupCoordinates.lng)
    )

    const routeDestination = isPickupRoute ? pickupCoordinates ?? target : deliveryCoordinates ?? target
    if (!routeDestination) return

    let cancelled = false
    getRouteDurationMinutes(origin, routeDestination).then((minutes) => {
      if (!cancelled) setEtaMinutes(minutes)
    })

    return () => {
      cancelled = true
    }
  }, [address, order, origin, target])

  const pickupCoordinates = order?.farmerLat != null && order?.farmerLng != null ? { lat: order.farmerLat, lng: order.farmerLng } : null
  const deliveryCoordinates = order?.consumerLat != null && order?.consumerLng != null ? { lat: order.consumerLat, lng: order.consumerLng } : null
  const selectedAddress = address?.trim()
  const isPickupRoute = Boolean(
    (selectedAddress && order?.pickupAddress && selectedAddress === order.pickupAddress) ||
    (pickupCoordinates && isValidCoordinates(target) && Number(target.lat.toFixed(6)) === Number(pickupCoordinates.lat.toFixed(6)) && Number(target.lng.toFixed(6)) === Number(pickupCoordinates.lng.toFixed(6)))
  )
  const routeDestination = isPickupRoute ? pickupCoordinates ?? target : deliveryCoordinates ?? target
  const routeLabel = isPickupRoute ? order?.farmerName : order?.consumerName

  const handleNavigate = () => {
    if (!order || !routeDestination) return
    const navigationWindow = window.open('about:blank', '_blank')
    if (!navigationWindow) return
    navigationWindow.opener = null
    navigationWindow.location.href = origin
      ? buildDirectionsUrl(origin, routeDestination)
      : `https://www.openstreetmap.org/?mlat=${routeDestination.lat}&mlon=${routeDestination.lng}#map=15/${routeDestination.lat}/${routeDestination.lng}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('delivery.mapView')}</h1>
      <MapView markers={order && routeDestination ? [{ id: 'target', name: routeLabel || order.consumerName, lat: routeDestination.lat, lng: routeDestination.lng, rating: 0, verified: false }] : []} showRoute={Boolean(order && routeDestination)} center={routeDestination || target || DEFAULT_LOCATION} height="400px" />
      {!order ? (
        <Card><EmptyState icon={Package} title={t('common.noData')} description="Assign a delivery order to see routes and ETA." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center gap-3 mb-2"><MapPin className="w-5 h-5 text-primary" /><h3 className="font-semibold">{t('delivery.pickupRoute')}</h3></div>
              <p className="text-sm text-muted">{order.farmerName}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-2"><Navigation className="w-5 h-5 text-blue" /><h3 className="font-semibold">{t('delivery.deliveryRoute')}</h3></div>
              <p className="text-sm text-muted">{order.consumerName}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-2"><Clock className="w-5 h-5 text-accent" /><h3 className="font-semibold">{t('common.eta')}</h3></div>
              <p className="text-2xl font-bold text-primary">{etaMinutes ? `${etaMinutes} min` : origin ? 'Calculating...' : 'Location unavailable'}</p>
            </Card>
          </div>
          <Button size="lg" className="w-full sm:w-auto" onClick={handleNavigate} disabled={!routeDestination}><Navigation className="w-5 h-5" />{t('common.navigate')}</Button>
        </>
      )}
    </div>
  )
}
