import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, Package, ShieldCheck, Sprout, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SearchBar } from '@/components/common/SearchBar'
import { ProductCard } from '@/components/cards/ProductCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import api from '@/services/api'
import { normalizeProducts } from '@/utils/productService'
import { getCurrentLocation, getDistanceKm, DEFAULT_LOCATION } from '@/utils/locationService'

export default function ConsumerHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [products, setProducts] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [response, currentLocation] = await Promise.all([api.get('/products'), getCurrentLocation()])
        const rawProducts = response.data.products || []
        setProducts(normalizeProducts(rawProducts).map((product: any, index: number) => ({
          ...product,
          farmerLat: rawProducts[index].farmer_lat,
          farmerLng: rawProducts[index].farmer_lng,
          farmerPhone: rawProducts[index].farmer_phone,
        })))
        setLocation(currentLocation)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((product) => counts.set(product.category, (counts.get(product.category) || 0) + 1))
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
  }, [products])

  const nearbyProducts = useMemo(() => products
    .filter((product) => product.farmerLat != null && product.farmerLng != null)
    .map((product) => ({ ...product, distance: getDistanceKm(location.lat, location.lng, product.farmerLat, product.farmerLng) }))
    .filter((product) => product.distance <= 50)
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 4), [location, products])

  const allFarmers = useMemo(() => {
    const farmers = new Map<string, any>()
    products.forEach((product) => {
      if (!farmers.has(product.farmerId)) farmers.set(product.farmerId, product)
    })
    return Array.from(farmers.values()).slice(0, 6)
  }, [products])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[20px] gradient-hero p-8 lg:p-12">
        <div className="relative z-10 max-w-2xl">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-2 text-3xl font-bold text-white font-[family-name:var(--font-display)] lg:text-4xl">{t('consumer.heroBanner')}</motion.h1>
          <p className="mb-6 text-white/90">{t('app.description')}</p>
          <SearchBar
            large
            value={query}
            onChange={setQuery}
            onSubmit={() => navigate(`/consumer/search?q=${encodeURIComponent(query)}`)}
            className="max-w-2xl"
            suggestions={products.map((product) => product.name).filter(Boolean)}
          />
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{t('consumer.categories')}</h2><Link to="/consumer/search" className="flex items-center gap-1 text-sm text-primary">{t('common.seeMore')} <ArrowRight className="h-4 w-4" /></Link></div>
        {categories.length === 0 ? <Card><EmptyState icon={Sprout} title="No categories yet" description="Product categories will appear as farmers upload inventory." /></Card> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{categories.map((category) => <Link key={category.name} to={`/consumer/search?category=${encodeURIComponent(category.name)}`}><Card hover className="text-center !p-4"><Sprout className="mx-auto mb-2 h-7 w-7 text-primary" /><p className="truncate text-sm font-medium">{category.name}</p><p className="text-xs text-muted">{category.count} products</p></Card></Link>)}</div>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{t('consumer.featuredProducts')}</h2><Link to="/consumer/search" className="flex items-center gap-1 text-sm text-primary">{t('common.viewAll')} <ArrowRight className="h-4 w-4" /></Link></div>
        {loading ? <Card><p className="py-8 text-center text-muted">Loading products...</p></Card> : products.length === 0 ? <Card><EmptyState icon={Package} title="No products yet" description="Products from farmers will appear here." /></Card> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{t('consumer.nearbyFarmers')}</h2><p className="text-sm text-muted">{t('landing.farmerDesc')}</p></div><Users className="h-5 w-5 text-primary" /></div>
        {allFarmers.length === 0 ? <Card><EmptyState icon={Users} title="No farmers yet" description="Farmer profiles will appear as products are uploaded." /></Card> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{allFarmers.map((farmer) => <Link key={farmer.farmerId} to={`/consumer/farmer/${farmer.farmerId}`}><Card hover className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-xl">🌾</div><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{farmer.farmerName}</h3><p className="truncate text-sm text-muted">{farmer.farmerPhone || 'Contact available in profile'}</p>{farmer.verified && <Badge variant="verified" className="mt-2"><ShieldCheck className="h-3 w-3" /> Verified farmer</Badge>}</div></Card></Link>)}</div>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{t('consumer.nearby')}</h2><p className="text-sm text-muted">{t('consumer.availableNow')}</p></div><MapPin className="h-5 w-5 text-primary" /></div>
        {nearbyProducts.length === 0 ? <Card><EmptyState icon={MapPin} title="No nearby products" description="Products appear here when farmers share a location." /></Card> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{nearbyProducts.map((product) => <div key={product.id} className="relative"><ProductCard product={product} /><span className="absolute bottom-16 right-3 rounded-full bg-background/90 px-2 py-1 text-xs text-primary">{product.distance} km away</span></div>)}</div>}
      </section>
    </div>
  )
}
