import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Mail, Phone, MapPin, Star, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import api from '@/services/api'
import { ProductCard } from '@/components/cards/ProductCard'
import { normalizeProducts } from '@/utils/productService'

interface FarmerProfileData {
  id: string
  role: string
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  farmName?: string
  description?: string
  avatar?: string
  certificateStatus?: 'verified' | 'pending' | 'rejected' | 'expired'
  rating?: number
  reviewCount?: number
  created_at?: string
}

export default function FarmerProfileView() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [farmer, setFarmer] = useState<FarmerProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    if (!id) return

    const loadFarmer = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await api.get(`/users/${id}`)
        const farmerResponse = response.data.user || {}
        const reviewsResponse = await api.get('/reviews', { params: { targetType: 'farmer', targetId: id } })
        const reviews = reviewsResponse.data.reviews || []
        const derivedRating = reviews.length
          ? reviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) / reviews.length
          : Number(farmerResponse.rating ?? 0)

        setFarmer({
          ...farmerResponse,
          rating: derivedRating || Number(farmerResponse.rating ?? 0),
          reviewCount: Number(farmerResponse.reviewCount ?? reviews.length ?? 0),
        })

        const productsResponse = await api.get(`/products/farmer/${id}`)
        setProducts(normalizeProducts(productsResponse.data.products || []))
      } catch (err) {
        console.error('Failed to load farmer profile:', err)
        setError(t('common.noData'))
        setFarmer(null)
      } finally {
        setLoading(false)
      }
    }

    loadFarmer()
  }, [id, t])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card><p className="text-center py-8 text-muted">Loading farmer profile...</p></Card>
      </div>
    )
  }

  if (!farmer || error) {
    return (
      <div className="space-y-6">
        <Link to="/consumer/search" className="text-sm text-primary hover:underline">← {t('common.back')}</Link>
        <Card>
          <EmptyState icon={Star} title={t('common.noData')} description="Farmer profile not available." />
        </Card>
      </div>
    )
  }

  const location = farmer.city ? `${farmer.city}, India` : farmer.address || 'Location unavailable'
  const averageRating = Number(farmer.rating ?? 0)
  const certificateVariant = farmer.certificateStatus === 'verified' ? 'verified' : farmer.certificateStatus === 'rejected' ? 'danger' : 'pending'
  const certificateLabel = farmer.certificateStatus === 'verified' ? t('common.verified') : farmer.certificateStatus === 'rejected' ? 'Rejected' : farmer.certificateStatus === 'expired' ? 'Expired' : 'Not uploaded'

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/consumer/search" className="text-sm text-primary hover:underline">← {t('common.back')}</Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold font-[family-name:var(--font-display)]">{farmer.name}{farmer.certificateStatus === 'verified' ? <span className="inline-flex" aria-label={t('common.verified')} title={t('common.verified')}><CheckCircle2 className="h-5 w-5 text-primary" /></span> : <span className="inline-flex" aria-label={certificateLabel} title={certificateLabel}><XCircle className="h-5 w-5 text-accent" /></span>}</h1>
      <Card className="text-center !p-8">
        {farmer.avatar ? <img src={farmer.avatar} alt={farmer.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4" /> : <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">{farmer.name.charAt(0)}</div>}
        <h2 className="flex items-center justify-center gap-2 text-xl font-semibold">{farmer.name}{farmer.certificateStatus === 'verified' ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-accent" />}</h2>
        <Badge variant={certificateVariant} className="mt-2">{certificateLabel}</Badge>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Star className="w-4 h-4 fill-accent text-accent" />
          <span className="font-medium">{averageRating ? averageRating.toFixed(1) : '—'}</span>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-primary" /><span>{farmer.email}</span></div>
          <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-primary" /><span>{farmer.phone || 'Phone not provided'}</span></div>
          <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-primary" /><span>{location}</span></div>
        </div>
      </Card>
      {(farmer.farmName || farmer.description) && <Card><h2 className="font-semibold">{farmer.farmName || 'About this farmer'}</h2><p className="mt-2 text-sm text-muted">{farmer.description || 'No description provided.'}</p></Card>}
      <section><h2 className="text-lg font-semibold mb-4">Products from {farmer.name}</h2>{products.length === 0 ? <Card><EmptyState icon={PackageIcon} title="No products available" description="This farmer has not listed products yet." /></Card> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}</section>
    </div>
  )
}

function PackageIcon({ className }: { className?: string }) {
  return <span className={className}>📦</span>
}
