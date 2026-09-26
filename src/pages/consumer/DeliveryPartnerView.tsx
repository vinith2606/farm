import { useEffect, useState } from 'react'
import { ArrowLeft, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { StarRating } from '@/components/cards/RatingCard'
import api from '@/services/api'
import { formatDate } from '@/utils/cn'

type Partner = { name: string; email: string; phone: string; avatar?: string; vehicleType?: string; vehicleNumber?: string; availabilityStatus?: string; rating?: number; reviewCount?: number }
type Review = { id: number; user_name: string; rating: number; comment: string; created_at: string }

export default function DeliveryPartnerView() {
  const { id } = useParams(); const [partner, setPartner] = useState<Partner | null>(null); const [reviews, setReviews] = useState<Review[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { if (!id) return; Promise.all([api.get(`/users/${id}`), api.get('/reviews', { params: { targetType: 'delivery', targetId: id } })]).then(([userResponse, reviewResponse]) => { setPartner(userResponse.data.user); setReviews(reviewResponse.data.reviews || []) }).catch(() => setPartner(null)).finally(() => setLoading(false)) }, [id])
  if (loading) return <Card><p className="py-8 text-center text-muted">Loading delivery partner...</p></Card>
  if (!partner) return <Card><EmptyState icon={Truck} title="Delivery partner not found" description="This profile is unavailable." /></Card>
  const average = Number(partner.rating ?? (reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0))
  return <div className="mx-auto max-w-3xl space-y-5"><Link to="/consumer/orders" className="flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Back to orders</Link><Card className="text-center">{partner.avatar ? <img src={partner.avatar} alt={partner.name} className="mx-auto h-20 w-20 rounded-full object-cover border-2 border-primary" /> : <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-background">{partner.name.charAt(0).toUpperCase()}</div>}<h1 className="mt-4 text-2xl font-bold font-[family-name:var(--font-display)]">{partner.name}</h1><p className="mt-1 text-sm text-muted">{partner.phone || 'Phone not provided'}</p><Badge variant="available" className="mt-3"><Truck className="h-3.5 w-3.5" /> Delivery partner</Badge><div className="mt-4 flex items-center justify-center gap-2"><StarRating rating={average} size="md" /><span className="font-semibold">{average ? average.toFixed(1) : 'No rating'}</span><span className="text-sm text-muted">({Number(partner.reviewCount ?? reviews.length)} reviews)</span></div></Card><Card><h2 className="mb-4 font-semibold">Vehicle details</h2><div className="grid gap-4 text-sm sm:grid-cols-2"><div><p className="text-muted">Vehicle type</p><p className="font-medium">{partner.vehicleType || 'Not provided'}</p></div><div><p className="text-muted">Vehicle number</p><p className="font-medium">{partner.vehicleNumber || 'Not provided'}</p></div></div></Card><Card><h2 className="mb-4 font-semibold">Ratings & reviews</h2>{reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet.</p> : <div className="space-y-4">{reviews.map((review) => <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{review.user_name}</p><StarRating rating={review.rating} size="sm" /></div><span className="text-xs text-muted">{formatDate(review.created_at)}</span></div><p className="mt-2 text-sm text-muted">{review.comment}</p></div>)}</div>}</Card></div>
}
