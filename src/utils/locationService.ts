export interface Coordinates {
  lat: number
  lng: number
}

export const DEFAULT_LOCATION: Coordinates = {
  lat: 12.9716,
  lng: 77.5946,
}

export const DEFAULT_LOCATION_LABEL = 'Bengaluru, India'

export function isValidCoordinates(value: { lat?: number; lng?: number } | null | undefined): value is Coordinates {
  return Boolean(value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)) && Number(value.lat) >= -90 && Number(value.lat) <= 90 && Number(value.lng) >= -180 && Number(value.lng) <= 180)
}

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

export function getCurrentLocation(): Promise<Coordinates> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(DEFAULT_LOCATION)
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => resolve(DEFAULT_LOCATION),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60_000,
      }
    )
  })
}

export function attachDistanceToMarkers<T extends { lat: number; lng: number }>(
  markers: T[],
  center: Coordinates
): Array<T & { distance: number }> {
  return markers.filter(isValidCoordinates)
    .map((marker) => ({
      ...marker,
      distance: getDistanceKm(center.lat, center.lng, marker.lat, marker.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
}

export function buildOpenStreetMapEmbedUrl(center: Coordinates, marker?: Coordinates): string {
  const padding = 0.02
  const bbox = [
    center.lng - padding,
    center.lat - padding,
    center.lng + padding,
    center.lat + padding,
  ].join(',')

  const markerParam = marker ? `&marker=${marker.lat},${marker.lng}` : ''

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markerParam}`
}

export function buildDirectionsUrl(start: Coordinates, end: Coordinates): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${start.lat}%2C${start.lng}%3B${end.lat}%2C${end.lng}`
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address.trim()) return null
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`)
    const results = await response.json()
    if (!results[0]) return null
    return { lat: Number(results[0].lat), lng: Number(results[0].lon) }
  } catch {
    return null
  }
}

export async function reverseGeocode(coords: Coordinates): Promise<{ address: string; city: string; displayName: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    const data = await response.json()
    const address = data.address?.road || data.address?.neighbourhood || data.address?.suburb || data.address?.village || data.address?.town || data.address?.city || data.display_name || ''
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || ''
    const displayName = city ? `${city}, India` : address || data.display_name || DEFAULT_LOCATION_LABEL

    return {
      address: address || data.display_name || DEFAULT_LOCATION_LABEL,
      city: city || DEFAULT_LOCATION_LABEL,
      displayName,
    }
  } catch (error) {
    return {
      address: DEFAULT_LOCATION_LABEL,
      city: DEFAULT_LOCATION_LABEL,
      displayName: DEFAULT_LOCATION_LABEL,
    }
  }
}

export async function getRouteDurationMinutes(start: Coordinates, end: Coordinates): Promise<number> {
  if (!isValidCoordinates(start) || !isValidCoordinates(end)) return 0

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false&alternatives=false&steps=false`
    )
    const data = await response.json()
    const durationSeconds = Number(data?.routes?.[0]?.duration ?? 0)
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0
    return Math.max(1, Math.round(durationSeconds / 60))
  } catch {
    return 0
  }
}
