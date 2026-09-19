import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, MapPin, Package, Tag, Trash2, User } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, AvailabilityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/utils/cn'
import { normalizeProduct } from '@/utils/productService'
import api from '@/services/api'
import type { Product } from '@/types'

export default function AdminProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/products/${id}`).then((response) => setProduct(normalizeProduct(response.data.product))).catch(() => setError('Unable to load product details right now.')).finally(() => setLoading(false))
  }, [id])

  const removeProduct = async () => {
    if (!product || !window.confirm(`Remove ${product.name}?`)) return
    setRemoving(true)
    try {
      await api.delete(`/products/${product.id}`)
      navigate('/admin/products')
    } catch (removeError: any) {
      setError(removeError?.response?.data?.message || 'Unable to remove product right now.')
    } finally {
      setRemoving(false)
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>
  if (!product) return <div className="space-y-6"><Button variant="ghost" size="sm" onClick={() => navigate('/admin/products')}><ArrowLeft className="h-4 w-4" /> Back to products</Button><Card><EmptyState icon={Package} title="Product not found" description={error || 'This product is unavailable.'} /></Card></div>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/products')}><ArrowLeft className="h-4 w-4" /> Back to products</Button>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Product Management</p><h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">{product.name}</h1><p className="mt-1 text-sm text-muted">Product #{product.id}</p></div><AvailabilityBadge available={product.available} /></div>
      <Card><div className="grid gap-6 md:grid-cols-[220px_1fr]">{product.image ? <img src={product.image} alt={product.name} className="aspect-square w-full rounded-2xl object-cover bg-surface-elevated" /> : <div className="flex aspect-square items-center justify-center rounded-2xl bg-surface-elevated text-muted"><Package className="h-16 w-16" /></div>}<div className="space-y-5"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="default"><Tag className="h-3.5 w-3.5" /> {product.category}</Badge><AvailabilityBadge available={product.available} /></div><p className="mt-4 text-3xl font-bold text-primary">{formatCurrency(product.price)}</p><p className="mt-1 text-sm text-muted">{product.quantity} {product.unit} available</p></div><p className="whitespace-pre-wrap text-sm text-muted">{product.description || 'No description provided.'}</p><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="flex items-center gap-2 text-muted"><User className="h-4 w-4" /> Farmer</dt><dd className="mt-1 font-semibold">{product.farmerName}</dd></div><div><dt className="flex items-center gap-2 text-muted"><CalendarDays className="h-4 w-4" /> Harvest Date</dt><dd className="mt-1 font-semibold">{formatDate(product.harvestDate)}</dd></div><div><dt className="flex items-center gap-2 text-muted"><MapPin className="h-4 w-4" /> Farmer Location</dt><dd className="mt-1 font-semibold">{product.farmerCity || product.farmerAddress || 'Not provided'}</dd></div><div><dt className="flex items-center gap-2 text-muted"><Package className="h-4 w-4" /> Available Quantity</dt><dd className="mt-1 font-semibold">{product.quantity} {product.unit}</dd></div></dl></div></div></Card>
      <div className="flex justify-end"><Button variant="danger" loading={removing} onClick={removeProduct}><Trash2 className="h-4 w-4" /> Remove Product</Button></div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
