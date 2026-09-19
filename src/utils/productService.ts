import type { Product } from '@/types'

export function normalizeProduct(product: any): Product {
  return {
    id: String(product.id),
    name: product.name || '',
    description: product.description || '',
    price: Number(product.price || 0),
    recommendedPrice: product.recommended_price ?? product.recommendedPrice ?? undefined,
    image: product.image || '',
    category: product.category || 'General',
    farmerId: String(product.farmer_id || product.farmerId || ''),
    farmerName: product.farmer_name || product.farmerName || 'Unknown Farmer',
    harvestDate: product.harvest_date || product.harvestDate || '',
    quantity: Number(product.quantity || 0),
    unit: product.unit || 'kg',
    available: (product.available === 1 || product.available === true) && Number(product.quantity || 0) > 0,
    verified: product.verified === 1 || product.verified === true,
    rating: Number(product.rating ?? 0),
    reviewCount: Number(product.review_count ?? product.reviewCount ?? 0),
    farmerLat: product.farmer_lat ?? product.farmerLat,
    farmerLng: product.farmer_lng ?? product.farmerLng,
    farmerPhone: product.farmer_phone ?? product.farmerPhone,
    farmName: product.farm_name ?? product.farmName,
    farmerAddress: product.farmer_address ?? product.farmerAddress,
    farmerCity: product.farmer_city ?? product.farmerCity,
    certificateStatus: product.certificate_status ?? product.certificateStatus ?? 'pending',
  }
}

export function normalizeProducts(products: any[]): Product[] {
  return products.map(normalizeProduct)
}
