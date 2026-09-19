import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Eye, Package, Search, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge, AvailabilityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/utils/cn'
import { normalizeProducts } from '@/utils/productService'
import api from '@/services/api'
import type { Product } from '@/types'

export default function AdminProducts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/products', { params: { includeUnavailable: true } })
      setProducts(normalizeProducts(response.data.products || []))
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProducts() }, [])

  const filtered = useMemo(() => products.filter((product) =>
    [product.name, product.category, product.farmerName].some((value) => value.toLowerCase().includes(search.toLowerCase()))
  ), [products, search])

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Remove ${product.name}?`)) return
    setRemoving(product.id)
    try {
      await api.delete(`/products/${product.id}`)
      setProducts((current) => current.filter((item) => item.id !== product.id))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.products')}</h1>
      <Input icon={<Search className="h-4 w-4" />} placeholder={t('common.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
      {loading ? <Card><p className="py-8 text-center text-muted">{t('common.loading')}</p></Card> : filtered.length === 0 ? <Card><EmptyState icon={Package} title={t('common.noData')} description={t('farmer.productsCount')} /></Card> : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm text-foreground">
            <thead><tr className="border-b border-border bg-surface-elevated"><th className="p-4 text-left">{t('common.name')}</th><th className="p-4 text-left">{t('consumer.categories')}</th><th className="p-4 text-left hidden md:table-cell">{t('nav.farmers')}</th><th className="p-4 text-left">{t('common.price')}</th><th className="p-4 text-left hidden lg:table-cell">{t('common.quantity')}</th><th className="p-4 text-left hidden lg:table-cell">{t('farmer.harvestDate')}</th><th className="p-4 text-left">{t('farmer.availability')}</th><th className="p-4 text-right">{t('common.actions')}</th></tr></thead>
            <tbody>{filtered.map((product) => <tr key={product.id} className="border-b border-border hover:bg-primary/5">
              <td className="p-4"><p className="font-medium">{product.name}</p><p className="text-xs text-muted">#{product.id}</p></td>
              <td className="p-4"><Badge variant="default">{product.category}</Badge></td>
              <td className="p-4 hidden md:table-cell">{product.farmerName}</td>
              <td className="p-4 font-semibold">{formatCurrency(product.price)}</td>
              <td className="p-4 hidden lg:table-cell">{product.quantity} {product.unit}</td>
              <td className="p-4 hidden lg:table-cell">{formatDate(product.harvestDate)}</td>
              <td className="p-4"><AvailabilityBadge available={product.available} /></td>
              <td className="p-4"><div className="flex justify-end gap-2"><Button size="icon" variant="ghost" aria-label={`View ${product.name}`} onClick={() => navigate(`/admin/products/${product.id}`)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-danger" loading={removing === product.id} aria-label={`Remove ${product.name}`} onClick={() => removeProduct(product)}><Trash2 className="h-4 w-4" /></Button></div></td>
            </tr>)}</tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
