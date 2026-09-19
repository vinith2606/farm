import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Package, ShoppingBag, CreditCard, DollarSign, Truck, Award,
  MessageSquare, Star, BarChart3, User, X, Leaf,
  Home, Search, Map, History, ShoppingCart, Users, FileText, Shield,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { cn } from '@/utils/cn'
import { useAuth } from '@/context/AppContext'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, products: Package, orders: ShoppingBag,
  payments: CreditCard, delivery: Truck, certificate: Award,
  messages: MessageSquare, reviews: Star, analytics: BarChart3,
  profile: User, home: Home, search: Search,
  map: Map, history: History, earnings: DollarSign, cart: ShoppingCart, farmers: Users, consumers: Users,
  agents: Truck, certificates: Award, reports: FileText, complaints: MessageSquare,
}

const navConfig: Record<UserRole, { key: string; path: string; icon: string }[]> = {
  farmer: [
    { key: 'dashboard', path: '/farmer/dashboard', icon: 'dashboard' },
    { key: 'products', path: '/farmer/products', icon: 'products' },
    { key: 'orders', path: '/farmer/orders', icon: 'orders' },
    { key: 'delivery', path: '/farmer/delivery', icon: 'delivery' },
    { key: 'analytics', path: '/farmer/analytics', icon: 'analytics' },
    { key: 'certificate', path: '/farmer/certificate', icon: 'certificate' },
    { key: 'messages', path: '/farmer/messages', icon: 'messages' },
    { key: 'profile', path: '/farmer/profile', icon: 'profile' },
  ],
  consumer: [
    { key: 'home', path: '/consumer/home', icon: 'home' },
    { key: 'search', path: '/consumer/search', icon: 'search' },
    { key: 'map', path: '/consumer/map', icon: 'map' },
    { key: 'cart', path: '/consumer/cart', icon: 'cart' },
    { key: 'orders', path: '/consumer/orders', icon: 'orders' },
    { key: 'messages', path: '/consumer/messages', icon: 'messages' },
    { key: 'profile', path: '/consumer/profile', icon: 'profile' },
  ],
  delivery: [
    { key: 'dashboard', path: '/delivery/dashboard', icon: 'dashboard' },
    { key: 'orders', path: '/delivery/orders', icon: 'orders' },
    { key: 'map', path: '/delivery/map', icon: 'map' },
    { key: 'history', path: '/delivery/history', icon: 'history' },
    { key: 'earnings', path: '/delivery/earnings', icon: 'earnings' },
    { key: 'messages', path: '/delivery/messages', icon: 'messages' },
    { key: 'profile', path: '/delivery/profile', icon: 'profile' },
  ],
  admin: [
    { key: 'dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { key: 'farmers', path: '/admin/farmers', icon: 'farmers' },
    { key: 'consumers', path: '/admin/consumers', icon: 'consumers' },
    { key: 'agents', path: '/admin/agents', icon: 'agents' },
    { key: 'products', path: '/admin/products', icon: 'products' },
    { key: 'orders', path: '/admin/orders', icon: 'orders' },
    { key: 'reports', path: '/admin/reports', icon: 'reports' },
    { key: 'complaints', path: '/admin/complaints', icon: 'complaints' },
  ],
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const { role, certificateStatus } = useAuth()
  const navigate = useNavigate()
  if (!role) return null

  const items = navConfig[role].filter((item) => !(role === 'farmer' && item.key === 'certificate' && certificateStatus === 'verified'))

  const content = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
          <Leaf className="w-6 h-6 text-background" />
        </div>
        <div>
          <h1 className="font-bold text-lg font-[family-name:var(--font-display)] text-foreground">{t('app.name')}</h1>
          <p className="text-xs text-muted capitalize">{t(`landing.${role === 'delivery' ? 'delivery' : role}`)}</p>
        </div>
        <button onClick={onClose} className="ml-auto lg:hidden p-1 rounded-lg hover:bg-surface-hover text-muted">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard
          return (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all',
                  isActive
                    ? 'gradient-primary text-background shadow-md shadow-primary/20'
                    : 'text-muted hover:bg-primary/10 hover:text-primary'
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {t(`nav.${item.key}`)}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted hover:text-primary w-full px-4 py-2 rounded-xl hover:bg-primary/5"
        >
          <Shield className="w-4 h-4" />
          Switch Role
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-surface border-r border-border h-screen sticky top-0">
        {content}
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-surface border-r border-border z-50 lg:hidden shadow-2xl"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export function BottomNav() {
  const { t } = useTranslation()
  const { role } = useAuth()
  if (!role) return null

  const mobileNav: Record<UserRole, { key: string; path: string; icon: string }[]> = {
    farmer: navConfig.farmer.slice(0, 5),
    consumer: navConfig.consumer.slice(0, 5),
    delivery: navConfig.delivery.slice(0, 4),
    admin: navConfig.admin.slice(0, 5),
  }

  const items = mobileNav[role]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden glass border-t border-border">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs transition-colors min-w-[60px]',
                  isActive ? 'text-primary font-semibold' : 'text-muted'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-[56px]">{t(`nav.${item.key}`)}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
