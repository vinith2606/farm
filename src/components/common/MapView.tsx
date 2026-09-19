import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { Navigation, Locate } from 'lucide-react'
import type { FarmerMarker } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StarRating } from '@/components/cards/RatingCard'
import { buildDirectionsUrl, DEFAULT_LOCATION, isValidCoordinates, getCurrentLocation } from '@/utils/locationService'

interface MapViewProps {
  markers?: FarmerMarker[]
  showRoute?: boolean
  height?: string
  center?: { lat: number; lng: number }
}

export function MapView({ markers = [], showRoute = false, height = '400px', center = DEFAULT_LOCATION }: MapViewProps) {
  const validMarkers = markers.filter(isValidCoordinates)
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[20px] border border-border" style={{ height }}>
        <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitMapToMarkers markers={validMarkers} fallbackCenter={center} />
          {validMarkers.map((marker) => (
            <CircleMarker key={marker.id} center={[marker.lat, marker.lng]} radius={9} pathOptions={{ color: marker.verified ? '#168A4A' : '#D97706', fillColor: marker.verified ? '#55D98A' : '#FBBF24', fillOpacity: 0.9, weight: 3 }}>
              <Tooltip direction="top" offset={[0, -8]} permanent>{marker.name}</Tooltip>
              <Popup><strong>{marker.name}</strong><br />Coordinates: {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}{marker.phone && <><br />{marker.phone}</>}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {showRoute && validMarkers.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
          <span className="text-foreground font-medium">Route active:</span> {markers[0].name} is within the nearby delivery zone.
        </div>
      )}
    </div>
  )
}

function FitMapToMarkers({ markers, fallbackCenter }: { markers: FarmerMarker[]; fallbackCenter: { lat: number; lng: number } }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length === 0) {
      map.setView([fallbackCenter.lat, fallbackCenter.lng], 12)
      return
    }
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 13)
      return
    }
    map.fitBounds(markers.map((marker) => [marker.lat, marker.lng] as [number, number]), { padding: [32, 32] })
  }, [fallbackCenter.lat, fallbackCenter.lng, map, markers])

  return null
}

export function LocationCard({ marker, origin }: { marker: FarmerMarker; origin?: { lat: number; lng: number } }) {
  const { t } = useTranslation()

  const handleNavigate = () => {
    const destination = { lat: marker.lat, lng: marker.lng }
    getCurrentLocation().then((currentLocation) => {
      const directionsUrl = buildDirectionsUrl(origin || currentLocation || DEFAULT_LOCATION, destination)
      window.open(directionsUrl, '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <Card className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-2xl shrink-0">
        🌾
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold truncate">{marker.name}</h4>
          {marker.verified && <Badge variant="verified">✓</Badge>}
        </div>
        <StarRating rating={marker.rating} size="sm" showValue />
        {marker.distance != null && (
          <p className="text-xs text-muted flex items-center gap-1 mt-1">
            <Locate className="w-3 h-3" /> {marker.distance} {t('common.km')} away
          </p>
        )}
        {marker.phone && <p className="text-xs text-muted mt-1">Phone: {marker.phone}</p>}
        {marker.deliveryStatus && <Badge variant={marker.deliveryStatus === 'Available' ? 'success' : 'warning'}>{marker.deliveryStatus}</Badge>}
      </div>
      <Button size="sm" variant="outline" onClick={handleNavigate}>
        <Navigation className="w-4 h-4" />
        {t('common.navigate')}
      </Button>
    </Card>
  )
}
