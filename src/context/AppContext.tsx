import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { UserRole, CartItem, Product, Location } from '@/types'
import api from '@/services/api'

interface AuthProfile {
  id?: string
  email: string
  phone: string
  farmName?: string
  description?: string
  avatar?: string
  certificateStatus?: 'verified' | 'pending' | 'rejected' | 'expired'
  location?: Location
}

interface AuthContextType {
  userId?: string
  role: UserRole | null
  userName: string
  userEmail: string
  userPhone: string
  userLocation?: Location
  farmName: string
  userDescription: string
  userAvatar: string
  certificateStatus: 'verified' | 'pending' | 'rejected' | 'expired'
  login: (role: UserRole, name?: string, profile?: Partial<AuthProfile>) => void
  updateProfile: (name: string, profileData: Partial<AuthProfile>) => void
  logout: () => void
  isAuthenticated: boolean
}

interface CartContextType {
  items: CartItem[]
  wishlist: Product[]
  addItem: (product: Product, qty?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  toggleWishlist: (product: Product) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const AuthContext = createContext<AuthContextType | null>(null)
const CartContext = createContext<CartContextType | null>(null)

const emptyProfile: AuthProfile = {
  email: '',
  phone: '',
  location: undefined,
}

function getStoredProfile(): AuthProfile {
  if (typeof window === 'undefined') return emptyProfile

  try {
    const raw = localStorage.getItem('farmdirect_profile')
    return raw ? { ...emptyProfile, ...JSON.parse(raw) } : emptyProfile
  } catch {
    return emptyProfile
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(() => {
    return localStorage.getItem('farmdirect_role') as UserRole | null
  })
  const storedProfile = getStoredProfile()
  const [userName, setUserName] = useState(() => localStorage.getItem('farmdirect_user') || 'Guest')
  const [userId, setUserId] = useState<string | undefined>(() => localStorage.getItem('farmdirect_user_id') || storedProfile.id)
  const [profile, setProfile] = useState<AuthProfile>(() => storedProfile)

  useEffect(() => {
    if (!userId || !role) return

    const refreshProfile = async () => {
      try {
        const response = await api.get(`/users/${userId}`)
        const user = response.data.user
        const nextProfile = {
          ...profile,
          id: String(user.id),
          email: user.email || '',
          phone: user.phone || '',
          farmName: user.farmName || '',
          description: user.description || '',
          avatar: user.avatar || '',
          certificateStatus: user.certificateStatus || 'pending',
          location: user.lat && user.lng ? {
            lat: user.lat,
            lng: user.lng,
            address: user.address || '',
            city: user.city || '',
          } : undefined,
        }
        setUserName(user.name || 'User')
        setProfile(nextProfile)
        localStorage.setItem('farmdirect_user', user.name || 'User')
        localStorage.setItem('farmdirect_profile', JSON.stringify(nextProfile))
      } catch {
        // Keep the cached session available while the API is offline.
      }
    }

    refreshProfile()
    const interval = window.setInterval(refreshProfile, 15000)
    return () => window.clearInterval(interval)
  }, [userId, role])

  const login = (r: UserRole, name = 'User', profileData?: Partial<AuthProfile>) => {
    const nextProfile = { ...emptyProfile, ...profileData }

    setRole(r)
    setUserName(name)
    setProfile(nextProfile)
    if (nextProfile.id) setUserId(nextProfile.id)

    localStorage.setItem('farmdirect_role', r)
    localStorage.setItem('farmdirect_user', name)
    localStorage.setItem('farmdirect_profile', JSON.stringify(nextProfile))
    if (nextProfile.id) localStorage.setItem('farmdirect_user_id', nextProfile.id)
  }

  const updateProfile = (name: string, profileData: Partial<AuthProfile>) => {
    const nextProfile = { ...profile, ...profileData }
    setUserName(name)
    setProfile(nextProfile)
    localStorage.setItem('farmdirect_user', name)
    localStorage.setItem('farmdirect_profile', JSON.stringify(nextProfile))
  }

  const logout = () => {
    setRole(null)
    setUserName('Guest')
    setUserId(undefined)
    setProfile(emptyProfile)
    localStorage.removeItem('farmdirect_role')
    localStorage.removeItem('farmdirect_user')
    localStorage.removeItem('farmdirect_user_id')
    localStorage.removeItem('farmdirect_profile')
    localStorage.removeItem('farmdirect_token')
  }

  return (
    <AuthContext.Provider
      value={{
        userId,
        role,
        userName,
        userEmail: profile.email,
        userPhone: profile.phone,
        userLocation: profile.location,
        farmName: profile.farmName || '',
        userDescription: profile.description || '',
        userAvatar: profile.avatar || '',
        certificateStatus: profile.certificateStatus || 'pending',
        login,
        updateProfile,
        logout,
        isAuthenticated: !!role,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<Product[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedWishlist = localStorage.getItem('farmdirect_wishlist')
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist))
    } catch {
      setWishlist([])
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('farmdirect_wishlist', JSON.stringify(wishlist))
    }
  }, [wishlist])

  const addItem = (product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { product, quantity: qty }]
    })
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeItem(productId)
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    )
  }

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.id === product.id)
      return exists ? prev.filter((item) => item.id !== product.id) : [...prev, product]
    })
  }

  const clearCart = () => setItems([])
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, wishlist, addItem, removeItem, updateQuantity, toggleWishlist, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
