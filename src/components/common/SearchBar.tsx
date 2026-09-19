import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SearchBarProps {
  value?: string
  onChange?: (v: string) => void
  onSubmit?: () => void
  className?: string
  large?: boolean
}

export function SearchBar({ value = '', onChange, onSubmit, className, large }: SearchBarProps) {
  const { t } = useTranslation()

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
      className={cn('relative w-full', className)}
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={t('common.searchPlaceholder')}
        className={cn(
          'w-full pl-12 pr-4 rounded-2xl border border-border bg-surface-elevated text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
          large ? 'py-4 text-base shadow-lg' : 'py-2.5 text-sm'
        )}
      />
    </form>
  )
}
