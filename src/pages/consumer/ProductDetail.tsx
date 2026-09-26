import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, ArrowLeft, Package, MapPin, ShieldCheck } from 'lucide-react'
import { ProductCard } from '@/components/cards/ProductCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AvailabilityBadge, CertificateBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/utils/cn'
import { useAuth, useCart } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'
import { normalizeProduct, normalizeProducts } from '@/utils/productService'
import type { Product } from '@/types'
import { StarRating } from '@/components/cards/RatingCard'
import ReviewForm from '@/components/common/ReviewForm'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { addItem } = useCart()
  const { toast } = useToast()
  const { userId, userName } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState<any[]>([])

  const loadProduct = async () => {
    if (!id) return

    try {
      const response = await api.get(`/products/${id}`)
      const currentProduct = normalizeProduct(response.data.product)
      setProduct(currentProduct)

      const reviewsResponse = await api.get('/reviews', { params: { productId: id } })
      setReviews(reviewsResponse.data.reviews || [])

      const relatedResponse = await api.get('/products')
      const relatedProducts = normalizeProducts(relatedResponse.data.products || [])
        .filter((p) => p.category === currentProduct.category && p.id !== currentProduct.id)
        .slice(0, 4)

      setRelated(relatedProducts)
    } catch (err) {
      console.error('Failed to load product detail:', err)
      setError(t('common.noData'))
    }
  }

  useEffect(() => {
    if (!id) return

    const loadData = async () => {
      setLoading(true)
      setError('')
      try {
        await loadProduct()
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, t])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card><p className="text-center py-8 text-muted">Loading product details...</p></Card>
      </div>
    )
  }

  if (!product || error) {
    return (
      <div className="space-y-6">
        <Link to="/consumer/search" className="flex items-center gap-2 text-sm text-muted hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>
        <Card>
          <EmptyState icon={Package} title={t('common.noData')} description="Product not found or has been removed." />
        </Card>
      </div>
    )
  }

  const userReview = userId ? reviews.find((review) => String(review.user_id) === String(userId)) : undefined

  return (
    <div className="space-y-8">
      <Link to="/consumer/search" className="flex items-center gap-2 text-sm text-muted hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-[20px] overflow-hidden aspect-square bg-surface-elevated">
          {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" />}
        </div>
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">{product.name}</h1>
          <p className="text-muted mt-4">{product.description}</p>
          <div className="flex items-baseline gap-3 mt-6">
            <span className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</span>
            <span className="text-subtle">/{product.unit}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted">Available quantity</p><p className="font-semibold">{product.quantity} {product.unit}</p></div>
            <div><p className="text-muted">{t('farmer.harvestDate')}</p><p className="font-semibold">{formatDate(product.harvestDate) || 'Not provided'}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AvailabilityBadge available={product.available} />
            <CertificateBadge status={product.certificateStatus || (product.verified ? 'verified' : 'pending')} />
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button size="lg" disabled={!product.available} onClick={() => { addItem(product); toast(t('toast.addedToCart'), 'success') }}>
              <ShoppingCart className="w-5 h-5" />{t('common.addToCart')}
            </Button>
            <Button size="lg" variant="accent" disabled={!product.available} onClick={() => { addItem(product); navigate('/consumer/checkout') }}>{t('common.buyNow')}</Button>
            <Link
              to={`/consumer/farmer/${product.farmerId}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-elevated px-7 py-3 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              View Farmer Profile
            </Link>
          </div>

          <Card className="mt-6">
            <h3 className="font-semibold mb-3">{t('consumer.farmerCard')}</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-2xl">🌾</div>
              <div>
                <p className="font-semibold">{product.farmerName}</p>
                {product.farmName && <p className="text-sm text-muted">{product.farmName}</p>}
                <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin className="h-4 w-4 text-primary" />{product.farmerCity || product.farmerAddress || 'Location unavailable'}</p>
                <div className="mt-2 flex items-center gap-2"><StarRating rating={product.rating} size="sm" showValue /><span className="text-xs text-muted">({product.reviewCount} reviews)</span></div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div><h2 className="font-semibold">Ratings & Reviews</h2><p className="text-sm text-muted">{product.reviewCount > 0 ? `${product.rating.toFixed(1)} average rating from ${product.reviewCount} reviews.` : 'No reviews yet for this product.'}</p></div>
        </div>
        {!userReview && userId && (
          <div className="mt-5 border-t border-border pt-4">
            <ReviewForm targetType="product" targetId={product.id} reviewerId={userId} reviewerName={userName} reviewerRole="consumer" title="Write a review" onSubmitted={loadProduct} />
          </div>
        )}
        {userReview && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Your review</p>
                <span className="text-xs text-muted">{formatDate(userReview.created_at)}</span>
              </div>
              <div className="mt-2"><StarRating rating={userReview.rating} size="sm" /></div>
              <p className="mt-2 text-sm text-muted">{userReview.comment}</p>
              {userReview.review_image && <img src={userReview.review_image} alt="Your product review" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />}
            </div>
          </div>
        )}
        {reviews.length > 0 && <div className="mt-5 space-y-4 border-t border-border pt-4">{reviews.map((review) => <div key={review.id}><div className="flex items-center justify-between gap-3"><p className="font-medium">{review.user_name}</p><span className="text-xs text-muted">{formatDate(review.created_at)}</span></div><StarRating rating={review.rating} size="sm" /><p className="mt-1 text-sm text-muted">{review.comment}</p>{review.review_image && <img src={review.review_image} alt={`${review.user_name} review`} className="mt-3 max-h-56 w-full rounded-2xl object-cover" />}</div>)}</div>}
      </Card>

      {related.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">{t('consumer.relatedProducts')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
