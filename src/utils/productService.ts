import type { Product } from '@/types'

const productImageMap: Record<string, string[]> = {
  tomato: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=900&q=80'],
  onion: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=900&q=80'],
  carrot: ['https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=900&q=80'],
  mango: ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=900&q=80'],
  banana: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=900&q=80'],
  apple: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=900&q=80'],
  rice: ['https://images.unsplash.com/photo-1586201375761-83865001e31e?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=900&q=80'],
  wheat: ['https://images.unsplash.com/photo-1464226184884-fa52ac9fc5d6?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=900&q=80'],
  vegetable: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1464226184884-fa52ac9fc5d6?auto=format&fit=crop&w=900&q=80'],
  fruit: ['https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=900&q=80'],
  dairy: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&w=900&q=80'],
  spices: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=900&q=80'],
  herb: ['https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80'],
  flower: ['https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80'],
  default: ['https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80'],
}

function getDemoProductImage(name: string, category: string, id: string) {
  const normalizedName = (name || '').toLowerCase()
  const normalizedCategory = (category || '').toLowerCase()
  const lookupKeys = [normalizedName, normalizedCategory, ...normalizedName.split(/\s+/)]

  const match = lookupKeys.find((key) => productImageMap[key])
  const chosenSet = match ? productImageMap[match] : productImageMap.default

  const key = `${name}-${category}-${id}`
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return chosenSet[hash % chosenSet.length]
}

export function normalizeProduct(product: any): Product {
  const normalizedId = String(product.id ?? product.product_id ?? Math.random())
  const name = product.name || 'Fresh produce'
  const category = product.category || 'General'
  return {
    id: normalizedId,
    name,
    description: product.description || '',
    price: Number(product.price || 0),
    recommendedPrice: product.recommended_price ?? product.recommendedPrice ?? undefined,
    image: product.image || getDemoProductImage(name, category, normalizedId),
    category,
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
