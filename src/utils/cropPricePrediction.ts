export interface CropPricePoint {
  month: string
  price: number
}

export interface CropPrediction {
  crop: string
  currentPrice: number
  predictedPrice: number
  confidence: number
  change: number
  history: CropPricePoint[]
  source?: string
  retrievedAt?: string
  error?: string
}

export const cropOptions = ['tomato', 'onion', 'potato', 'rice', 'wheat', 'mango']

export function predictCropPrice(crop = 'tomato'): CropPrediction {
  return { crop, currentPrice: 0, predictedPrice: 0, confidence: 0, change: 0, history: [], error: 'Enter a product name to load its price recommendation.' }
}

export async function fetchCropPricePrediction(crop = 'tomato'): Promise<CropPrediction> {
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '')
  const response = await fetch(`${apiBase}/market/prices?crop=${encodeURIComponent(crop)}`)
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.message || 'Unable to retrieve market prices.')
  return payload as CropPrediction
}
