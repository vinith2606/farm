import { useState } from 'react'
import { Camera, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import api from '@/services/api'

export default function ReviewForm({ targetType, targetId, orderId, reviewerId, reviewerName, reviewerRole, title, onSubmitted }: { targetType: 'product' | 'farmer' | 'delivery'; targetId: string; orderId?: string; reviewerId: string; reviewerName: string; reviewerRole: 'farmer' | 'consumer'; title: string; onSubmitted?: () => void }) {
  const [rating, setRating] = useState(0)
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be smaller than 4 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImagePreview(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    const normalizedTargetId = Number(targetId)
    const normalizedOrderId = Number(orderId || 0)
    const normalizedReviewerId = Number(reviewerId)

    if (!rating) {
      setError('Choose a star rating first.')
      return
    }
    if (targetType !== 'product' && (!Number.isFinite(normalizedOrderId) || normalizedOrderId <= 0)) {
      setError('Review details are incomplete. Please try again.')
      return
    }
    if (!Number.isFinite(normalizedTargetId) || !Number.isFinite(normalizedReviewerId)) {
      setError('Review details are incomplete. Please try again.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const sanitizedComment = targetType === 'product'
        ? description.trim() || 'Product review'
        : 'Star rating review'

      await api.post('/reviews', {
        target_type: targetType,
        target_id: normalizedTargetId,
        order_id: normalizedOrderId || 0,
        reviewer_role: reviewerRole,
        user_id: normalizedReviewerId,
        user_name: reviewerName,
        rating,
        comment: sanitizedComment,
        image_url: targetType === 'product' ? imagePreview || undefined : undefined,
      })
      setSubmitted(true)
      onSubmitted?.()
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || submitError?.message || 'Unable to submit review right now.')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) return <p className="text-sm font-medium text-primary">Review submitted successfully.</p>

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)}>
            <Star className={`h-6 w-6 ${value <= rating ? 'fill-accent text-accent' : 'text-border-light'}`} />
          </button>
        ))}
      </div>
      {targetType === 'product' && (
        <>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Write a short review about this product (optional)"
            className="w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-foreground">
            <Camera className="h-4 w-4 text-primary" />
            <span>{imagePreview ? 'Change product photo (optional)' : 'Add product photo (optional)'}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
          </label>
          {imagePreview && <img src={imagePreview} alt="Product review preview" className="max-h-40 w-full rounded-2xl object-cover" />}
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button size="sm" onClick={submit} loading={saving}>Submit rating</Button>
    </div>
  )
}
