import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumb() {
  const { t } = useTranslation()
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length <= 1) return null

  const labels: Record<string, string> = {
    farmer: t('landing.farmer'),
    consumer: t('landing.consumer'),
    delivery: t('landing.delivery'),
    admin: t('landing.admin'),
    dashboard: t('nav.dashboard'),
    products: t('nav.products'),
    orders: t('nav.orders'),
    cart: t('nav.cart'),
    map: t('nav.map'),
    search: t('nav.search'),
    messages: t('nav.messages'),
    reviews: t('nav.reviews'),
    certificate: t('nav.certificate'),
    analytics: t('nav.analytics'),
    settings: t('nav.settings'),
    profile: t('nav.profile'),
    farmers: t('nav.farmers'),
    reports: t('nav.reports'),
    certificates: t('nav.certificates'),
    agents: t('nav.agents'),
    payments: t('nav.payments'),
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted mb-4 flex-wrap">
      <Link to="/" className="hover:text-primary flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
        {t('breadcrumb.home')}
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" />
            {isLast ? (
              <span className="text-foreground font-medium capitalize">
                {labels[seg] || seg}
              </span>
            ) : (
              <Link to={path} className="hover:text-primary capitalize">
                {labels[seg] || seg}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
