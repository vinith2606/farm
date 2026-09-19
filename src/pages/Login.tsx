import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Leaf, Lock, Mail, Phone, User } from 'lucide-react'
import { useAuth } from '@/context/AppContext'
import type { UserRole } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import api, { endpoints } from '@/services/api'
import { getCurrentLocation, reverseGeocode } from '@/utils/locationService'

const roleRoutes: Record<UserRole, string> = {
  farmer: '/farmer/dashboard',
  consumer: '/consumer/home',
  delivery: '/delivery/dashboard',
  admin: '/admin/dashboard',
}

const roleLabels: Record<UserRole, string> = {
  farmer: 'Farmer',
  consumer: 'Consumer',
  delivery: 'Delivery Agent',
  admin: 'Admin',
}

type AuthFormValues = {
  name: string
  email: string
  phone: string
  password: string
}

export default function Login() {
  const { role } = useParams<{ role: UserRole }>()
  const location = useLocation()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>(location.pathname.startsWith('/signup/') ? 'signup' : 'signin')
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthFormValues>({
    defaultValues: { name: '', email: '', phone: '', password: '' },
  })

  if (!role || !roleRoutes[role as UserRole]) {
    navigate('/')
    return null
  }

  const userRole = role as UserRole
  const isAdminRole = userRole === 'admin'
  const displayedRole = useMemo(() => t(`landing.${userRole === 'delivery' ? 'delivery' : userRole}`), [t, userRole])

  useEffect(() => {
    if (isAdminRole) {
      setMode('signin')
      if (location.pathname.startsWith('/signup/')) {
        navigate('/login/admin', { replace: true })
      }
      return
    }

    setMode(location.pathname.startsWith('/signup/') ? 'signup' : 'signin')
  }, [isAdminRole, location.pathname, navigate])

  const onSubmit = async (data: AuthFormValues) => {
    try {
      setErrorMessage('')

      let signupLocation = {
        lat: 12.9716,
        lng: 77.5946,
        address: 'Default Location',
        city: 'Bangalore',
      }

      if (mode === 'signup') {
        try {
          const coords = await getCurrentLocation()
          const reverse = await reverseGeocode(coords)
          signupLocation = {
            lat: coords.lat,
            lng: coords.lng,
            address: reverse.address,
            city: reverse.city,
          }
        } catch (error) {
          console.warn('Signup location warning:', error)
        }
      }

      const payload = {
        role: userRole,
        email: data.email,
        password: data.password,
        ...(mode === 'signup' && {
          name: data.name,
          phone: data.phone,
          lat: signupLocation.lat,
          lng: signupLocation.lng,
          address: signupLocation.address,
          city: signupLocation.city,
        }),
      }

      const endpoint = mode === 'signup' ? endpoints.auth.register : endpoints.auth.login
      const response = await api.post(endpoint, payload)

      const token = response.data?.token || ''
      const user = response.data?.user || {}
      const userName = user.name || data.name || data.email.split('@')[0] || 'User'
      const userProfile = {
        id: user.id ? String(user.id) : undefined,
        email: user.email || data.email,
        phone: user.phone || data.phone || '',
        certificateStatus: user.certificateStatus || 'pending',
        location: (user.lat && user.lng) ? {
          lat: user.lat,
          lng: user.lng,
          address: user.address || '',
          city: user.city || '',
        } : undefined,
      }

      if (token) localStorage.setItem('farmdirect_token', token)
      login(userRole, userName, userProfile)
      navigate(roleRoutes[userRole])
    } catch (error: any) {
      console.error('Login error:', error)
      const serverMessage = error?.response?.data?.message
      const clientMessage = error?.message
      setErrorMessage(serverMessage || clientMessage || 'Unable to complete authentication right now.')
    }
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/90 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>

        <Card className="!p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-background" />
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
              {mode === 'signup' ? 'Create account' : t('auth.welcomeBack')}
            </h1>
            <p className="text-muted text-sm mt-1">
              {mode === 'signup'
                ? `Join as a ${roleLabels[userRole]}`
                : t('auth.signInTo', { role: displayedRole })}
            </p>
          </div>

          {!isAdminRole && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-elevated p-1">
              <button
                type="button"
                onClick={() => navigate(`/login/${userRole}`)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === 'signin' ? 'bg-primary text-background' : 'text-muted hover:text-foreground'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => navigate(`/signup/${userRole}`)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-primary text-background' : 'text-muted hover:text-foreground'}`}
              >
                Sign up
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'signup' && (
              <>
                <Input
                  label="Full name"
                  type="text"
                  icon={<User className="w-4 h-4" />}
                  placeholder="Enter your full name"
                  {...register('name', { required: 'Name is required' })}
                  error={errors.name?.message}
                />
                <Input
                  label="Phone"
                  type="tel"
                  icon={<Phone className="w-4 h-4" />}
                  placeholder="Enter phone number"
                  {...register('phone', { required: 'Phone is required' })}
                  error={errors.phone?.message}
                />
              </>
            )}

            <Input
              label={t('auth.email')}
              type="email"
              icon={<Mail className="w-4 h-4" />}
              placeholder="name@example.com"
              {...register('email', { required: 'Email is required' })}
              error={errors.email?.message}
            />
            <Input
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              icon={<Lock className="w-4 h-4" />}
              placeholder="Enter your password"
              rightElement={<button type="button" onClick={() => setShowPassword((visible) => !visible)} className="text-muted hover:text-primary" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
              error={errors.password?.message}
            />

            {mode === 'signin' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted">
                  <input type="checkbox" className="rounded border-border" />
                  {t('auth.rememberMe')}
                </label>
                <a href="#" className="text-primary hover:underline">{t('auth.forgotPassword')}</a>
              </div>
            )}

            {errorMessage && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{errorMessage}</p>}

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              {mode === 'signup' ? 'Create account' : t('auth.login')}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
