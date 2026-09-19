import { useTranslation } from 'react-i18next'
import { languages } from '@/i18n'
import { Globe, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = languages.find((l) => l.code === i18n.resolvedLanguage) || languages[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors text-foreground',
          compact && 'p-2'
        )}
        aria-label="Select language"
      >
        <Globe className="w-4 h-4 text-primary" />
        {!compact && (
          <>
            <span className="text-sm font-medium">{current.native}</span>
            <ChevronDown className={cn('w-3 h-3 transition-transform text-muted', open && 'rotate-180')} />
          </>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 py-2 rounded-2xl bg-surface border border-border shadow-xl z-[100] max-h-64 overflow-y-auto">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false) }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm hover:bg-primary/10 transition-colors flex justify-between text-foreground',
                i18n.resolvedLanguage === lang.code && 'text-primary font-semibold bg-primary/5'
              )}
            >
              <span>{lang.native}</span>
              <span className="text-subtle text-xs">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
