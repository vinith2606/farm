import { forwardRef, type HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glass?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, glass = false, padding = 'md', children, ...props }, ref) => {
    const Comp = hover ? motion.div : 'div'
    const hoverProps = hover
      ? { whileHover: { y: -4, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }, transition: { duration: 0.2 } }
      : {}

    return (
      <Comp
        ref={ref}
        className={cn(
          'rounded-[20px] bg-surface border border-border text-foreground shadow-[var(--shadow-card)]',
          glass && 'glass',
          paddingMap[padding],
          className
        )}
        {...hoverProps}
        {...(props as object)}
      >
        {children}
      </Comp>
    )
  }
)
Card.displayName = 'Card'

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: string
  color?: 'primary' | 'accent' | 'blue' | 'earth' | 'danger'
}) {
  const colorMap = {
    primary: 'bg-primary/15 text-primary',
    accent: 'bg-accent/15 text-accent',
    blue: 'bg-blue/15 text-blue',
    earth: 'bg-earth/15 text-earth',
    danger: 'bg-danger/15 text-danger',
  }

  return (
    <Card hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted mb-1">{title}</p>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-foreground">{value}</p>
          {trend && <p className="text-xs text-primary mt-1">{trend}</p>}
        </div>
        <div className={cn('p-3 rounded-2xl', colorMap[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  )
}
