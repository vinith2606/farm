import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'

export function StarRating({ rating, size = 'sm', showValue }: { rating: number; size?: 'sm' | 'md' | 'lg'; showValue?: boolean }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(100, ((rating - index) * 100)))

        return (
          <div key={index} className="relative inline-flex items-center justify-center">
            <Star className={cn(sizes[size], 'text-border-light')} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star className={cn(sizes[size], 'fill-accent text-accent')} />
            </div>
          </div>
        )
      })}
      {showValue && rating > 0 && <span className="ml-1 text-sm font-medium text-foreground">{rating.toFixed(1)}</span>}
    </div>
  )
}

export function RatingCard({ rating, reviewCount, title }: { rating: number; reviewCount: number; title?: string }) {
  return (
    <div className="text-center p-6">
      <p className="text-5xl font-bold text-primary font-[family-name:var(--font-display)]">{rating > 0 ? rating.toFixed(1) : '—'}</p>
      <StarRating rating={rating} size="md" />
      {title && <p className="text-sm text-muted mt-2">{title}</p>}
      <p className="text-xs text-subtle mt-1">{reviewCount} reviews</p>
    </div>
  )
}
