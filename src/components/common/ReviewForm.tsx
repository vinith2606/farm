import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import api from '@/services/api'

export default function ReviewForm({ targetType, targetId, orderId, reviewerId, reviewerName, reviewerRole, title, onSubmitted }: { targetType: 'farmer' | 'delivery'; targetId: string; orderId: string; reviewerId: string; reviewerName: string; reviewerRole: 'farmer' | 'consumer'; title: string; onSubmitted?: () => void }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!rating || !comment.trim()) { setError('Choose a rating and write a short review.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/reviews', { target_type: targetType, target_id: Number(targetId), order_id: Number(orderId), reviewer_role: reviewerRole, user_id: Number(reviewerId), user_name: reviewerName, rating, comment: comment.trim() })
      setSubmitted(true)
      onSubmitted?.()
    } catch (submitError: any) { setError(submitError?.response?.data?.message || submitError?.message || 'Unable to submit review right now.') } finally { setSaving(false) }
  }

  if (submitted) return <p className="text-sm font-medium text-primary">Review submitted successfully.</p>
  return <div className="space-y-3"><h3 className="font-semibold">{title}</h3><div className="flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)}><Star className={`h-6 w-6 ${value <= rating ? 'fill-accent text-accent' : 'text-border-light'}`} /></button>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Share your experience" className="w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />{error && <p className="text-sm text-danger">{error}</p>}<Button size="sm" onClick={submit} loading={saving}>Submit review</Button></div>
}
