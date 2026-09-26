import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Menu, Moon, Sun, LogOut, User, ChevronDown,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AppContext'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { SearchBar } from '@/components/common/SearchBar'
import { reverseGeocode } from '@/utils/locationService'

interface NavbarProps {
  onMenuClick: () => void
  showSearch?: boolean
}

export function Navbar({ onMenuClick, showSearch = true }: NavbarProps) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { userName, userAvatar: profileAvatar, logout, role } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [liveLocation, setLiveLocation] = useState('Location unavailable')
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
