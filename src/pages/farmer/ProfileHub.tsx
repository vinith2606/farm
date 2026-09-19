import { CheckCircle2, ChevronRight, FileCheck2, HelpCircle, LogOut, MapPin, Package, UserRound, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AppContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const menuItems = [
  { labelKey: 'common.edit', descriptionKey: 'farmer.dashboard', icon: UserRound, path: '/farmer/profile/edit' },
  { labelKey: 'common.address', descriptionKey: 'common.address', icon: MapPin, path: '/farmer/profile/address' },
  { labelKey: 'nav.certificate', descriptionKey: 'farmer.certDetails', icon: FileCheck2, path: '/farmer/profile/certification' },
  { labelKey: 'nav.orders', descriptionKey: 'farmer.recentOrders', icon: Package, path: '/farmer/orders' },
  { labelKey: 'common.help', descriptionKey: 'common.help', icon: HelpCircle, path: '/farmer/help' },
]

export default function FarmerProfileHub() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userName, userEmail, userAvatar, certificateStatus, logout } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="bg-surface-elevated">
        <div className="flex items-center gap-4">
          {userAvatar ? <img src={userAvatar} alt={userName} className="h-20 w-20 rounded-full border-2 border-primary object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-background">{userName.charAt(0).toUpperCase()}</div>}
          <div className="min-w-0"><h1 className="flex items-center gap-2 truncate font-[family-name:var(--font-display)] text-2xl font-bold">{userName}{certificateStatus === 'verified' ? <span className="inline-flex" aria-label={t('common.verified')} title={t('common.verified')}><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /></span> : <span className="inline-flex" aria-label={t('farmer.kanban.pending')} title={t('farmer.kanban.pending')}><XCircle className="h-5 w-5 shrink-0 text-accent" /></span>}</h1><p className="mt-1 truncate text-sm text-muted">{userEmail || t('common.email')}</p><Badge variant={certificateStatus === 'verified' ? 'success' : 'warning'} className="mt-3">{certificateStatus === 'verified' ? t('common.verified') : t('farmer.kanban.pending')}</Badge></div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">{t('common.profile')}</h2><p className="mt-1 text-sm text-muted">{t('common.profile')}</p></div>
        <div>{menuItems.map(({ labelKey, descriptionKey, icon: Icon, path }) => <button key={path} type="button" onClick={() => navigate(path)} className="flex w-full items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-0 hover:bg-primary/5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{t(labelKey)}</span><span className="mt-1 block text-sm text-muted">{t(descriptionKey)}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-muted" /></button>)}</div>
      </Card>

      <Button type="button" variant="danger" className="w-full" onClick={() => { logout(); navigate('/') }}><LogOut className="h-4 w-4" /> {t('common.logout')}</Button>
    </div>
  )
}
