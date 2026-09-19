import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { reviews } from '@/data'
import { Card } from '@/components/ui/Card'
import { RatingCard, StarRating } from '@/components/cards/RatingCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import { formatDate } from '@/utils/cn'

export default function FarmerReviews() {
  const { t } = useTranslation()
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.reviews')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card><RatingCard rating={avgRating} reviewCount={reviews.length} title={t('farmer.avgRating')} /></Card>
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold">{t('farmer.customerReviews')}</h2>
          {reviews.length === 0 ? (
            <Card>
              <EmptyState icon={Star} title={t('common.noData')} description="Customer reviews will appear here after orders are completed." />
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{review.userName}</p>
                    <StarRating rating={review.rating} size="sm" />
                    <p className="text-sm text-muted mt-1">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm">{review.comment}</p>
                {review.reply ? (
                  <div className="mt-3 p-3 bg-primary/5 rounded-xl text-sm"><strong>Your reply:</strong> {review.reply}</div>
                ) : (
                  <Button variant="outline" size="sm" className="mt-3">{t('common.reply')}</Button>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
