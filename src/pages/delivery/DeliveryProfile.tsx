import { useEffect, useState, type ChangeEvent } from 'react'
import { Camera, LogOut, Mail, MapPin, Phone, Save, Trash2, User, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'
import { getCurrentLocation, reverseGeocode } from '@/utils/locationService'

export default function DeliveryProfile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, userName, userEmail, userPhone, userLocation, userAvatar, updateProfile, logout } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(userName)
  const [email, setEmail] = useState(userEmail)
  const [phone, setPhone] = useState(userPhone)
  const [avatar, setAvatar] = useState(userAvatar)
  const [license, setLicense] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [address, setAddress] = useState(userLocation?.address || '')
  const [city, setCity] = useState(userLocation?.city || '')
  const [coordinates, setCoordinates] = useState({ lat: userLocation?.lat || 0, lng: userLocation?.lng || 0 })
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}`).then((response) => {
      const user = response.data.user
      setName(user.name || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setAvatar(user.avatar || '')
      setLicense(user.drivingLicenseNumber || '')
      setVehicleType(user.vehicleType || '')
      setVehicleNumber(user.vehicleNumber || '')
      setAddress(user.address || '')
      setCity(user.city || '')
    }).catch(() => setError('Unable to load delivery profile right now.'))
  }, [userId])

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setError('Profile photo must be smaller than 4 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatar(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const useLocation = async () => {
    setLocating(true)
    const coords = await getCurrentLocation()
    const location = await reverseGeocode(coords)
    setCoordinates(coords)
    setAddress(location.address)
    setCity(location.city)
    setLocating(false)
  }

  const save = async () => {
    if (!userId || !name.trim() || !phone.trim()) {
      setError('Full name and phone number are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await api.put(`/users/${userId}/profile`, { name, email, phone, avatar, address, city, lat: coordinates.lat || null, lng: coordinates.lng || null, drivingLicenseNumber: license, vehicleType, vehicleNumber })
      const user = response.data.user
      updateProfile(user.name, { id: String(user.id), email: user.email || '', phone: user.phone || '', avatar: user.avatar || '', location: user.lat && user.lng ? { lat: user.lat, lng: user.lng, address: user.address || '', city: user.city || '' } : undefined })
      toast('Delivery profile saved successfully.', 'success')
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || 'Unable to save delivery profile right now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.profile')}</h1><p className="mt-1 text-sm text-muted">Manage your delivery partner information.</p></div>
      <Card><div className="flex items-center gap-4"><div className="relative">{avatar ? <img src={avatar} alt={name} className="h-20 w-20 rounded-full border-2 border-primary object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-background">{name.charAt(0).toUpperCase()}</div>}<label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-background shadow-lg" aria-label="Upload profile photo"><Camera className="h-3.5 w-3.5" /><input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} /></label>{avatar && <button type="button" onClick={() => setAvatar('')} className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-lg" aria-label="Remove profile photo"><Trash2 className="h-3.5 w-3.5" /></button>}</div><div><h2 className="text-xl font-bold">{name || 'Delivery partner'}</h2><p className="text-sm text-muted">Delivery partner profile</p></div></div></Card>
      <Card><h2 className="mb-4 font-semibold">Personal information</h2><div className="grid gap-4 sm:grid-cols-2"><Input label="Full name *" value={name} onChange={(event) => setName(event.target.value)} icon={<User className="h-4 w-4" />} /><Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} /><Input label="Phone number *" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} icon={<Phone className="h-4 w-4" />} /></div></Card>
      <Card><div className="mb-4 flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h2 className="font-semibold">Vehicle and license</h2></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Driving license number" value={license} onChange={(event) => setLicense(event.target.value)} placeholder="DL-XX-00000000000" /><Input label="Vehicle type" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} placeholder="Bike, scooter, van" /><Input label="Vehicle number" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="KA 01 AB 1234" /></div></Card>
      <Card><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Address</h2><p className="text-sm text-muted">Use your current location or enter it manually.</p></div><Button type="button" variant="outline" size="sm" onClick={useLocation} loading={locating}><MapPin className="h-4 w-4" /> Use location</Button></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium sm:col-span-2">Address<textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={3} placeholder="House number, street, area, landmark" className="mt-1.5 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm" /></label><Input label="City" value={city} onChange={(event) => setCity(event.target.value)} /></div></Card>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-between gap-3"><Button type="button" variant="danger" onClick={() => { logout(); navigate('/') }}><LogOut className="h-4 w-4" /> Logout</Button><Button type="button" onClick={save} loading={saving}><Save className="h-4 w-4" /> Save</Button></div>
    </div>
  )
}
