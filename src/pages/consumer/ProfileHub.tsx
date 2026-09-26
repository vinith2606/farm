import { ChevronRight, Heart, HelpCircle, LogOut, MapPin, Package, ShoppingCart, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AppContext'

const items = [
  { labelKey: 'common.edit', descriptionKey: 'common.profile', icon: UserRound, path: '/consumer/profile/edit' },
  { labelKey: 'common.address', descriptionKey: 'common.address', icon: MapPin, path: '/consumer/profile/address' },
  { labelKey: 'nav.orders', descriptionKey: 'consumer.orderHistoryHint', icon: Package, path: '/consumer/orders' },
  { labelKey: 'common.help', descriptionKey: 'common.help', icon: HelpCircle, path: '/consumer/help' },
]

export default function ConsumerProfileHub() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userName, userEmail, userAvatar, logout } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="bg-surface-elevated">
        <div className="flex items-center gap-4">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="h-20 w-20 rounded-full border-2 border-primary object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-background">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">{userName}</h1>
            <p className="mt-1 truncate text-sm text-muted">{userEmail || t('common.email')}</p>
            <Badge variant="default" className="mt-3">{t('landing.consumer')}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full border border-border bg-surface-elevated text-foreground hover:bg-surface-hover" onClick={() => navigate('/consumer/cart')}>
          <ShoppingCart className="h-4 w-4" />
          Cart
        </Button>
        <Button variant="secondary" className="w-full border border-border bg-surface-elevated text-foreground hover:bg-surface-hover" onClick={() => navigate('/consumer/wishlist')}>
          <Heart className="h-4 w-4" />
          Wishlist
        </Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t('common.profile')}</h2>
          <p className="mt-1 text-sm text-muted">{t('consumer.welcome')}</p>
        </div>
        <div>
          {items.map(({ labelKey, descriptionKey, icon: Icon, path }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="flex w-full items-center gap-4 border-b border-border px-5 py-4 text-left last:border-0 hover:bg-primary/5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t(labelKey)}</span>
                <span className="mt-1 block text-sm text-muted">{t(descriptionKey)}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted" />
            </button>
          ))}
        </div>
      </Card>

      <Button
        variant="danger"
        className="w-full"
        onClick={() => {
          logout()
          navigate('/')
        }}
      >
        <LogOut className="h-4 w-4" /> {t('common.logout')}
      </Button>
    </div>
  )
}
