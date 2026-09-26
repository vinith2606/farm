import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SearchBarProps {
  value?: string
  onChange?: (v: string) => void
  onSubmit?: () => void
  className?: string
  large?: boolean
  suggestions?: string[]
}

export function SearchBar({ value = '', onChange, onSubmit, className, large, suggestions = [] }: SearchBarProps) {
  const { t } = useTranslation()
  const filteredSuggestions = value.trim()
    ? suggestions.filter((item) => item.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : []

  return (
    <div className={cn('relative w-full', className)}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
        className="relative w-full"
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
      {filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChange?.(suggestion)}
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-primary/5 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
