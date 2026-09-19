import { useEffect, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Star, Camera, Save, User, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AppContext'
import type { UserRole } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api, { endpoints } from '@/services/api'

export default function ProfilePage({ role: _role }: { role: UserRole }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, userName, userEmail, userPhone, userLocation, farmName, userDescription, userAvatar, certificateStatus, updateProfile } = useAuth()
  const [name, setName] = useState(userName)
  const [phone, setPhone] = useState(userPhone)
  const [email, setEmail] = useState(userEmail)
  const [farmNameValue, setFarmNameValue] = useState(farmName)
  const [description, setDescription] = useState(userDescription)
  const [avatar, setAvatar] = useState(userAvatar)
  const [currentCertificateStatus, setCurrentCertificateStatus] = useState(certificateStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!_role || !userId) return
    api.get(`/users/${userId}`)
      .then((response) => {
        const user = response.data.user
        setName(user.name || '')
        setPhone(user.phone || '')
        setEmail(user.email || '')
        setFarmNameValue(user.farmName || '')
        setDescription(user.description || '')
        setAvatar(user.avatar || '')
        setCurrentCertificateStatus(user.certificateStatus || 'pending')
        updateProfile(user.name, {
          id: String(user.id),
          email: user.email || '',
          phone: user.phone || '',
          farmName: user.farmName || '',
          description: user.description || '',
          avatar: user.avatar || '',
          certificateStatus: user.certificateStatus || 'pending',
          location: user.lat && user.lng ? { lat: user.lat, lng: user.lng, address: user.address || '', city: user.city || '' } : undefined,
        })
      })
      .catch(() => {})
  }, [userId, _role])

  if (_role === 'farmer') {
    const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => setAvatar(String(reader.result || ''))
      reader.readAsDataURL(file)
    }

    const saveProfile = async () => {
      if (!userId || !name.trim() || !phone.trim()) {
        setError('Farmer name and phone number are required.')
        return
      }

      setSaving(true)
      setError('')
      try {
        const response = await api.put(endpoints.users.profile(userId), {
          name,
          phone,
          email,
          farmName: farmNameValue,
          description,
          avatar,
        })
        const savedUser = response.data.user
        updateProfile(savedUser.name, {
          id: String(savedUser.id),
          email: savedUser.email || '',
          phone: savedUser.phone || '',
          certificateStatus: savedUser.certificateStatus || 'pending',
          farmName: savedUser.farmName || '',
          description: savedUser.description || '',
          avatar: savedUser.avatar || '',
          location: savedUser.lat && savedUser.lng ? {
            lat: savedUser.lat,
            lng: savedUser.lng,
            address: savedUser.address || '',
            city: savedUser.city || '',
          } : undefined,
        })
        setCurrentCertificateStatus(savedUser.certificateStatus || 'pending')
        navigate('/farmer/profile')
      } catch (saveError: any) {
        setError(saveError?.response?.data?.message || 'Unable to save profile right now.')
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.profile')}</h1>
          <p className="text-muted mt-1">{t('farmer.description')}</p>
        </div>

        <Card>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="Farmer profile" className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
              ) : (
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-bold">{name.charAt(0).toUpperCase()}</div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-background flex items-center justify-center cursor-pointer shadow-lg" aria-label={t('common.add')}>
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
              </label>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="absolute top-0 right-0 w-8 h-8 rounded-full bg-danger text-white flex items-center justify-center shadow-lg"
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">{name || t('landing.farmer')}</h2>
              <CertificateBadgeForStatus status={currentCertificateStatus} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={`${t('landing.farmer')} *`} value={name} onChange={(event) => setName(event.target.value)} icon={<UserIcon />} />
            <Input label={`${t('common.phone')} *`} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} icon={<Phone className="w-4 h-4" />} />
            <Input label={`${t('common.email')} (optional)`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="w-4 h-4" />} />
            <Input label={t('farmer.farmName')} value={farmNameValue} onChange={(event) => setFarmNameValue(event.target.value)} placeholder={t('farmer.farmName')} />
          </div>
          <label className="block text-sm font-medium text-foreground mt-4 mb-1.5">{t('common.description')} (optional)</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder={t('common.description')} className="w-full px-4 py-2.5 rounded-2xl border border-border bg-surface-elevated text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-center">
          <Button type="button" onClick={saveProfile} loading={saving}><Save className="w-4 h-4" /> Save</Button>
        </div>
      </div>
    )
  }

  const locationLabel = userLocation?.city ? `${userLocation.city}, India` : userLocation?.address || t('common.noData')

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.profile')}</h1>
      <Card className="text-center !p-8">
        {userAvatar ? <img src={userAvatar} alt={userName} className="w-24 h-24 rounded-full object-cover border-2 border-primary mx-auto mb-4" /> : <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">{userName.charAt(0)}</div>}
        <h2 className="text-xl font-bold">{userName}</h2>
        <Badge variant="verified" className="mt-2">✓ {t('common.verified')}</Badge>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Star className="w-4 h-4 fill-accent text-accent" />
          <span className="font-medium">4.8</span>
        </div>
      </Card>
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-primary" /><span>{userEmail || t('common.email')}</span></div>
          <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-primary" /><span>{userPhone || t('common.phone')}</span></div>
          <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-primary" /><span>{locationLabel}</span></div>
        </div>
      </Card>
    </div>
  )
}

function CertificateBadgeForStatus({ status }: { status: 'verified' | 'pending' | 'rejected' | 'expired' }) {
  const { t } = useTranslation()
  const labels = { verified: `✓ ${t('common.verified')}`, pending: `⏳ ${t('farmer.kanban.pending')}`, rejected: `✗ ${t('common.reject')}`, expired: `⚠ ${t('common.warning')}` }
  const variants = { verified: 'success', pending: 'warning', rejected: 'danger', expired: 'warning' } as const
  return <Badge variant={variants[status]} className="mt-2">{labels[status]}</Badge>
}

function UserIcon() {
  return <User className="w-4 h-4" />
}
