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

function normalizeLocationCandidate(value: string | null | undefined): string {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function buildAddressSearchQuery(parts: Array<string | null | undefined>): string {
  const cleaned = parts
    .map(normalizeLocationCandidate)
    .filter(Boolean)
    .filter((part, index, array) => array.indexOf(part) === index)

  return cleaned.join(', ')
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const normalizedAddress = normalizeLocationCandidate(address)
  if (!normalizedAddress) return null

  const candidateQueries = Array.from(new Set([
    normalizedAddress,
    `${normalizedAddress}, India`,
    normalizedAddress.replace(/,\s*India$/i, ''),
  ]))

  for (const query of candidateQueries) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&addressdetails=1&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )
      const results = await response.json()
      if (!Array.isArray(results) || results.length === 0) continue

      const exactMatch = results.find((result) => {
        const displayName = String(result?.display_name || '').toLowerCase()
        return displayName.includes(normalizedAddress.toLowerCase())
      })

      const selected = exactMatch || results[0]
      if (!selected) continue

      return {
        lat: Number(selected.lat),
        lng: Number(selected.lon),
      }
    } catch {
      continue
    }
  }

  return null
}

export interface ReverseGeocodedAddress {
  address: string
  area: string
  landmark: string
  city: string
  state: string
  pincode: string
  houseNumber: string
  displayName: string
}

export async function reverseGeocode(coords: Coordinates): Promise<ReverseGeocodedAddress> {
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
    const addressParts = data.address || {}
    const address = addressParts.road || addressParts.pedestrian || addressParts.footway || ''
    const area = addressParts.neighbourhood || addressParts.suburb || addressParts.quarter || addressParts.residential || addressParts.village || ''
    const landmark = addressParts.amenity || addressParts.building || addressParts.shop || addressParts.leisure || area
    const city = addressParts.city || addressParts.town || addressParts.village || addressParts.municipality || addressParts.county || ''
    const state = addressParts.state || addressParts.region || ''
    const pincode = addressParts.postcode || ''
    const displayName = city ? `${city}, India` : address || data.display_name || DEFAULT_LOCATION_LABEL

    return {
      address: address || area || data.display_name || '',
      area,
      landmark,
      city,
      state,
      pincode,
      houseNumber: addressParts.house_number || '',
      displayName,
    }
  } catch (error) {
    return {
      address: '',
      area: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      houseNumber: '',
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
