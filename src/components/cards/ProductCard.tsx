import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Heart } from 'lucide-react'
import type { Product } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge, AvailabilityBadge } from '@/components/ui/Badge'
import { StarRating } from '@/components/cards/RatingCard'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/cn'
import { useCart } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'

interface ProductCardProps {
  product: Product
  linkPrefix?: string
  onAddToCart?: () => void
}

export function ProductCard({ product, linkPrefix = '/consumer/product', onAddToCart }: ProductCardProps) {
  const { t } = useTranslation()
  const { addItem, wishlist, toggleWishlist } = useCart()
  const { toast } = useToast()
  const isLiked = wishlist.some((item) => item.id === product.id)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
    toast(t('toast.addedToCart'), 'success')
    onAddToCart?.()
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
    toast(isLiked ? 'Removed from wishlist.' : 'Added to wishlist.', 'success')
  }

  return (
    <Link to={`${linkPrefix}/${product.id}`}>
      <Card hover padding="none" className="overflow-hidden group">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          {product.verified && (
            <div className="absolute top-3 left-3">
              <Badge variant="verified">✓ {t('common.verified')}</Badge>
            </div>
          )}
          <button type="button" onClick={handleWishlist} className="absolute top-3 right-3 p-2 rounded-full glass opacity-0 group-hover:opacity-100 transition-opacity">
            <Heart className={`w-4 h-4 ${isLiked ? 'text-foreground' : 'text-muted'}`} />
          </button>
          <div className="absolute bottom-3 right-3">
            <AvailabilityBadge available={product.available} />
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-primary font-medium mb-1">{product.category}</p>
          <h3 className="font-semibold text-base mb-1 line-clamp-1">{product.name}</h3>
          <p className="text-xs text-muted mb-2">{product.farmerName}</p>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
              <span className="text-xs text-subtle">/{product.unit}</span>
            </div>
            <StarRating rating={product.rating} showValue />
          </div>
          <p className="text-xs text-subtle mb-3">{t('farmer.harvestDate')}: {formatDate(product.harvestDate)}</p>
          <Button
            size="sm"
            className="w-full"
            disabled={!product.available}
            onClick={handleAdd}
          >
            <ShoppingCart className="w-4 h-4" />
            {t('common.addToCart')}
          </Button>
        </div>
      </Card>
    </Link>
  )
}

export function ProductListItem({ product, linkPrefix = '/consumer/product' }: { product: Product; linkPrefix?: string }) {
  return (
    <Link to={`${linkPrefix}/${product.id}`}>
      <Card hover className="flex gap-4 items-center !p-4">
        <img src={product.image} alt={product.name} className="w-24 h-24 rounded-2xl object-cover shrink-0 bg-surface-elevated" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-muted">{product.farmerName}</p>
            </div>
            <span className="text-lg font-bold text-primary shrink-0">{formatCurrency(product.price)}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <StarRating rating={product.rating} showValue />
            <AvailabilityBadge available={product.available} />
          </div>
        </div>
      </Card>
    </Link>
  )
}
