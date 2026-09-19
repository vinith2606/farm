import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Menu, Bell, Moon, Sun, LogOut, User, ChevronDown,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AppContext'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { SearchBar } from '@/components/common/SearchBar'
import { cn } from '@/utils/cn'
import { reverseGeocode } from '@/utils/locationService'
import api from '@/services/api'
import { initSocket, getSocket } from '@/services/socket'

interface NavbarProps {
  onMenuClick: () => void
  showSearch?: boolean
}

type NotificationItem = {
  id: string
  kind: 'message' | 'order'
  entityId: string
  title: string
  message: string
  read: boolean
  link: string
}

export function Navbar({ onMenuClick, showSearch = true }: NavbarProps) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { userName, userAvatar: profileAvatar, logout, role, userId } = useAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [liveLocation, setLiveLocation] = useState('Location unavailable')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const getStoredReadIds = (key: string) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]')
      return new Set<string>(Array.isArray(value) ? value : [])
    } catch {
      return new Set<string>()
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!userId || !role) return
    const storageKey = `farmdirect_read_notifications_${userId}`
    const readNotificationIds = getStoredReadIds(storageKey)
    const loadNotifications = async () => {
      try {
        const [messagesResponse, ordersResponse] = await Promise.all([
          api.get('/messages', { params: { userId } }),
          api.get('/orders', { params: { userId, role } }),
        ])
        const messages = (messagesResponse.data.messages || [])
          .filter((message: any) => Number(message.receiver_id) === Number(userId))
          .slice(0, 5)
          .map((message: any) => ({ id: `message-${message.id}`, kind: 'message' as const, entityId: String(message.id), title: t('nav.messages'), message: message.content, read: Boolean(message.read) || readNotificationIds.has(`message-${message.id}`), link: `/${role}/messages?contactId=${message.sender_id}` }))
        const orders = (ordersResponse.data.orders || []).slice(0, 5).map((order: any) => { const notificationId = `order-${order.id}-${order.updated_at || order.updatedAt || order.created_at || order.createdAt || ''}`; return { id: notificationId, kind: 'order' as const, entityId: String(order.id), title: `${t('nav.orders')} #${order.id}`, message: `${t('common.status')}: ${String(order.status || 'pending').replace(/_/g, ' ')}`, read: readNotificationIds.has(notificationId), link: role === 'consumer' ? `/consumer/orders/${order.id}` : role === 'delivery' ? `/delivery/orders/${order.id}` : role === 'admin' ? `/admin/orders/${order.id}` : `/farmer/orders/${order.status || 'pending'}` } })
        setNotifications([...messages, ...orders].sort((left, right) => Number(right.entityId) - Number(left.entityId)))
      } catch {
        setNotifications([])
      }
    }
    loadNotifications()
    const socket = initSocket(userId)
    socket.on('new_message', loadNotifications)
    socket.on('order_created', loadNotifications)
    socket.on('order_updated', loadNotifications)
    socket.on('delivery_order_available', loadNotifications)
    return () => {
      getSocket()?.off('new_message', loadNotifications)
      getSocket()?.off('order_created', loadNotifications)
      getSocket()?.off('order_updated', loadNotifications)
      getSocket()?.off('delivery_order_available', loadNotifications)
    }
  }, [role, userId, t])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLiveLocation('Location unavailable')
      return
    }

    const updateLocation = async ({ coords }: GeolocationPosition) => {
      const lat = coords.latitude
      const lng = coords.longitude

      try {
        const location = await reverseGeocode({ lat, lng })
        setLiveLocation(`Live • ${location.displayName}`)
      } catch (error) {
        setLiveLocation('Location unavailable')
      }
    }

    const handleError = () => {
      setLiveLocation('Location unavailable')
    }

    const watchId = navigator.geolocation.watchPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000,
    })

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const unread = notifications.filter((notification) => !notification.read).length

  const persistRead = (ids: string[]) => {
    if (!userId) return
    const key = `farmdirect_read_notifications_${userId}`
    const stored = getStoredReadIds(key)
    ids.forEach((id) => stored.add(id))
    localStorage.setItem(key, JSON.stringify([...stored]))
  }

  const markNotificationRead = async (notification: NotificationItem) => {
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item))
    persistRead([notification.id])
    if (notification.kind === 'message' && userId) {
      await api.put(`/messages/${notification.entityId}/read`, { userId }).catch(() => {})
    }
    setNotifOpen(false)
    navigate(notification.link)
  }

  const markAllNotificationsRead = async () => {
    const unreadItems = notifications.filter((notification) => !notification.read)
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    persistRead(unreadItems.map((item) => item.id))
    if (userId) await Promise.all(unreadItems.filter((item) => item.kind === 'message').map((item) => api.put(`/messages/${item.entityId}/read`, { userId }).catch(() => {})))
  }

  return (
    <header className="sticky top-0 z-20 glass border-b border-border">
      <div className="flex items-center gap-4 px-4 lg:px-6 h-16">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-surface-hover text-foreground"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {showSearch && (
          <div className="hidden md:block flex-1 max-w-md">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSubmit={() => role === 'consumer' && navigate(`/consumer/search?q=${search}`)}
            />
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <LanguageSelector compact />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-foreground"
            aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5" />}
          </button>

          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-xl hover:bg-surface-hover relative text-foreground"
              aria-label={t('common.notifications')}
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-surface border border-border shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
                  <span className="font-semibold text-foreground">{t('common.notifications')}</span>
                  {unread > 0 && <button type="button" onClick={markAllNotificationsRead} className="text-xs font-medium text-primary hover:underline">{t('common.viewAll')}</button>}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted text-center">{t('common.noData')}</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => markNotificationRead(n)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') markNotificationRead(n) }}
                        className={cn(
                          'p-4 border-b border-border hover:bg-surface-hover cursor-pointer',
                          !n.read && 'bg-primary/5'
                        )}
                      >
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl hover:bg-surface-hover"
            >
              {profileAvatar ? <img src={profileAvatar} alt={userName} className="w-8 h-8 rounded-xl object-cover border border-primary/30" /> : <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-background text-sm font-bold">{userName.charAt(0).toUpperCase()}</div>}
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium max-w-[100px] truncate text-foreground">{userName}</span>
                <span className="text-[10px] text-primary font-medium truncate max-w-[140px]">{liveLocation}</span>
              </div>
              <ChevronDown className="w-4 h-4 hidden sm:block text-muted" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-surface border border-border shadow-xl z-50 py-2">
                <button
                  onClick={() => { navigate(`/${role}/profile`); setProfileOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-primary/10 text-foreground"
                >
                  <User className="w-4 h-4" /> {t('common.profile')}
                </button>
                <button
                  onClick={() => { logout(); navigate('/'); setProfileOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10"
                >
                  <LogOut className="w-4 h-4" /> {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
