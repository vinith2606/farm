import { useEffect, useState } from 'react'
import { MapView, LocationCard } from '@/components/common/MapView'
import { useAuth } from '@/context/AppContext'
import api from '@/services/api'
import { DEFAULT_LOCATION, isValidCoordinates } from '@/utils/locationService'
import type { FarmerMarker } from '@/types'

export default function FarmerDelivery() {
  const { userId } = useAuth()
  const [nearbyAgents, setNearbyAgents] = useState<FarmerMarker[]>([])
  const [center, setCenter] = useState(DEFAULT_LOCATION)
  const [farmerLocation, setFarmerLocation] = useState<{ lat: number; lng: number } | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}`).then((response) => {
      const user = response.data.user
      const location = { lat: Number(user.lat), lng: Number(user.lng) }
      if (user.lat != null && user.lng != null && isValidCoordinates(location)) {
        setFarmerLocation(location)
        setCenter(location)
      } else {
        setFarmerLocation(undefined)
      }
    }).catch(() => setFarmerLocation(undefined))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    const loadAgents = async () => {
      try {
        const response = await api.get('/locations/delivery')
        const agentUsers = response.data.agents || []
        const agents = agentUsers.filter((user: any) => user.lat != null && user.lng != null && isValidCoordinates({ lat: Number(user.lat), lng: Number(user.lng) }))
          .map((user: any) => {
          const coordinates = { lat: Number(user.lat), lng: Number(user.lng) }
          return { id: String(user.id), name: user.name, ...coordinates, rating: 0, verified: user.accountStatus !== 'suspended', phone: user.phone, deliveryStatus: user.availabilityStatus === 'unavailable' ? 'Unavailable' : 'Available' }
        }) as FarmerMarker[]
        if (active) setNearbyAgents(agents)
      } catch {
        if (active) setNearbyAgents([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAgents()
    const interval = window.setInterval(loadAgents, 15000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [userId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">All Delivery Agents</h1>
          <p className="text-sm text-muted">View every delivery partner with a shared location.</p>
        </div>
      </div>

      <MapView markers={nearbyAgents} center={center} height="420px" />

      {loading ? <p className="text-sm text-muted">Finding nearby delivery partners...</p> : nearbyAgents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No delivery partners with a shared location were found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nearbyAgents.map((agent) => <LocationCard key={agent.id} marker={agent} origin={farmerLocation} />)}
        </div>
      )}
    </div>
  )
}
