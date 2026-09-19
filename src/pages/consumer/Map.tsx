import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { MapView, LocationCard } from '@/components/common/MapView'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Modal'
import { attachDistanceToMarkers, DEFAULT_LOCATION, geocodeAddress, getCurrentLocation } from '@/utils/locationService'
import api from '@/services/api'
import type { FarmerMarker } from '@/types'

type FarmerFilter = 'all' | 'verified' | 'nearby'

export default function ConsumerMap() {
  const { t } = useTranslation()
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION)
  const [farmers, setFarmers] = useState<FarmerMarker[]>([])
  const [filter, setFilter] = useState<FarmerFilter>('all')

  useEffect(() => {
    getCurrentLocation().then(setUserLocation)
    api.get('/admin/users').then(async (response) => {
      const farmerUsers = (response.data.users || []).filter((user: any) => user.role === 'farmer')
      const farmerMarkers = (await Promise.all(farmerUsers.map(async (user: any) => {
        const coordinates = user.lat != null && user.lng != null ? { lat: Number(user.lat), lng: Number(user.lng) } : await geocodeAddress([user.address, user.city, 'India'].filter(Boolean).join(', '))
        if (!coordinates) return null
        return { id: String(user.id), name: user.farmName || user.name, ...coordinates, rating: 0, verified: user.certificateStatus === 'verified', phone: user.phone }
      }))).filter(Boolean)
      setFarmers(farmerMarkers as FarmerMarker[])
    }).catch(() => setFarmers([]))
  }, [])

  const nearbyFarmers = useMemo(() => attachDistanceToMarkers(farmers, userLocation), [farmers, userLocation])
  const filteredFarmers = useMemo(() => {
    if (filter === 'verified') return nearbyFarmers.filter((farmer) => farmer.verified)
    if (filter === 'nearby') return nearbyFarmers.filter((farmer) => farmer.distance <= 70)
    return nearbyFarmers
  }, [filter, nearbyFarmers])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('map.title')}</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('consumer.filters')}>
        {(['all', 'verified', 'nearby'] as FarmerFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${filter === option ? 'border-primary bg-primary text-background' : 'border-border bg-surface text-muted hover:border-primary hover:text-primary'}`}
          >
            {option === 'all' ? t('common.viewAll') : option === 'verified' ? t('common.verified') : t('consumer.nearby')}
          </button>
        ))}
      </div>
      <MapView markers={filteredFarmers} center={userLocation} height="450px" />
      {filteredFarmers.length === 0 ? (
        <Card><EmptyState icon={MapPin} title={t('common.noData')} description={filter === 'nearby' ? t('consumer.nearby') : t('consumer.nearbyFarmers')} /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFarmers.map((m) => <LocationCard key={m.id} marker={m} origin={userLocation} />)}
        </div>
      )}
    </div>
  )
}
