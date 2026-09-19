import { useEffect, useState } from 'react'
import { ArrowLeft, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Modal'
import { RatingCard, StarRating } from '@/components/cards/RatingCard'
import { useAuth } from '@/context/AppContext'
import { formatDate } from '@/utils/cn'
import api from '@/services/api'

type Review = { id: number; user_name: string; rating: number; comment: string; created_at: string }

export default function DeliveryReviews() {
  const navigate = useNavigate(); const { userId } = useAuth(); const [reviews, setReviews] = useState<Review[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { if (!userId) return; api.get('/reviews', { params: { targetType: 'delivery', targetId: userId } }).then(({ data }) => setReviews(data.reviews || [])).catch(() => setReviews([])).finally(() => setLoading(false)) }, [userId])
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  return <div className="mx-auto max-w-3xl space-y-5"><button onClick={() => navigate('/delivery/profile')} className="flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Back to profile</button><div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Ratings & reviews</h1><p className="mt-1 text-sm text-muted">Feedback from farmers and consumers after completed deliveries.</p></div><div className="grid gap-5 sm:grid-cols-[220px_1fr]"><Card><RatingCard rating={average} reviewCount={reviews.length} title="Delivery partner rating" /></Card><Card><div className="flex items-center gap-3"><Star className="h-7 w-7 fill-accent text-accent" /><div><p className="text-sm text-muted">Average rating</p><p className="text-3xl font-bold">{average ? average.toFixed(1) : '—'} <span className="text-sm font-normal text-muted">/ 5</span></p><StarRating rating={average} size="sm" /></div></div></Card></div>{loading ? <Card><p className="py-8 text-center text-muted">Loading reviews...</p></Card> : reviews.length === 0 ? <Card><EmptyState icon={Star} title="No reviews yet" description="Ratings and reviews will appear here after completed deliveries." /></Card> : <div className="space-y-3">{reviews.map((review) => <Card key={review.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{review.user_name}</p><StarRating rating={review.rating} size="sm" /></div><p className="text-xs text-muted">{formatDate(review.created_at)}</p></div><p className="mt-3 text-sm text-muted">{review.comment}</p></Card>)}</div>}</div>
}
