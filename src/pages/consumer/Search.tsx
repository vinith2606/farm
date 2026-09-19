import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Grid, List, Package } from 'lucide-react'
import { ProductCard, ProductListItem } from '@/components/cards/ProductCard'
import { SearchBar } from '@/components/common/SearchBar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import api from '@/services/api'
import { normalizeProducts } from '@/utils/productService'
import { DEFAULT_LOCATION, getCurrentLocation, getDistanceKm } from '@/utils/locationService'

export default function ConsumerSearch() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState(params.get('q') || '')
  const [filters, setFilters] = useState({ verified: false, available: false, nearby: false })
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(DEFAULT_LOCATION)

  const categoryFilter = params.get('category') || 'None'

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const [response, currentLocation] = await Promise.all([
          api.get('/products', { params: { includeUnavailable: true } }),
          getCurrentLocation(),
        ])
        setProducts(normalizeProducts(response.data.products || []))
        setLocation(currentLocation)
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const categories = useMemo(() => {
    const names = new Set(products.map((product) => product.category).filter(Boolean))
    return ['None', ...Array.from(names).sort()]
  }, [products])

  const handleCategoryChange = (category: string) => {
    const nextParams = new URLSearchParams(params)
    if (category === 'None') nextParams.delete('category')
    else nextParams.set('category', category)
    setParams(nextParams)
  }

  let filteredProducts = products
  if (query) filteredProducts = filteredProducts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  if (categoryFilter !== 'None') filteredProducts = filteredProducts.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase())
  if (filters.verified) filteredProducts = filteredProducts.filter((p) => p.verified)
  if (filters.available) filteredProducts = filteredProducts.filter((p) => p.available)
  if (filters.nearby) {
    filteredProducts = filteredProducts.filter((p) => p.farmerLat != null && p.farmerLng != null && getDistanceKm(location.lat, location.lng, p.farmerLat, p.farmerLng) <= 50)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.search')}</h1>
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Product name</label>
        <SearchBar value={query} onChange={setQuery} large />
      </div>

      <div className="max-w-sm">
        <label htmlFor="product-category" className="mb-2 block text-sm font-medium text-foreground">Category filter</label>
        <select
          id="product-category"
          value={categoryFilter}
          onChange={(event) => handleCategoryChange(event.target.value)}
          className="w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant={view === 'grid' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('grid')}><Grid className="w-4 h-4" />{t('consumer.gridView')}</Button>
        <Button variant={view === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('list')}><List className="w-4 h-4" />{t('consumer.listView')}</Button>
        <div className="flex gap-2 ml-auto flex-wrap">
          {(['verified', 'available', 'nearby'] as const).map((f) => (
            <button key={f} onClick={() => setFilters((prev) => ({ ...prev, [f]: !prev[f] }))}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filters[f] ? 'bg-primary text-background border-primary' : 'border-border text-muted hover:border-primary hover:text-primary')}>
              {t(`consumer.${f === 'nearby' ? 'nearby' : f === 'verified' ? 'verifiedFarmers' : 'availableNow'}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted">{filteredProducts.length} products found</p>

      {loading ? (
        <Card><p className="text-center py-8 text-muted">Loading products...</p></Card>
      ) : filteredProducts.length === 0 ? (
        <Card><EmptyState icon={Package} title={t('common.noData')} description="No products available yet. Farmers are adding fresh inventory." /></Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="space-y-3">{filteredProducts.map((p) => <ProductListItem key={p.id} product={p} />)}</div>
      )}
    </div>
  )
}
