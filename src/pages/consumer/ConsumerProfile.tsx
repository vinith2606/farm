import { useEffect, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Camera, Mail, Phone, Save, Trash2, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'

export default function ConsumerProfile() {
  const navigate = useNavigate()
  const { userId, userName, userEmail, userPhone, userAvatar, updateProfile } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(userName)
  const [phone, setPhone] = useState(userPhone)
  const [email, setEmail] = useState(userEmail)
  const [avatar, setAvatar] = useState(userAvatar)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}`).then((response) => {
      const user = response.data.user
      setName(user.name || '')
      setPhone(user.phone || '')
      setEmail(user.email || '')
      setAvatar(user.avatar || '')
    }).catch(() => setError('Unable to load your profile right now.'))
  }, [userId])

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { setError('Profile photo must be smaller than 4 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setAvatar(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    if (!userId || !name.trim() || !phone.trim()) { setError('Name and phone number are required.'); return }
    setSaving(true)
    setError('')
    try {
      const response = await api.put(`/users/${userId}/profile`, { name, phone, email, avatar })
      const user = response.data.user
      updateProfile(user.name, { id: String(user.id), email: user.email || '', phone: user.phone || '', avatar: user.avatar || '', location: user.lat && user.lng ? { lat: user.lat, lng: user.lng, address: user.address || '', city: user.city || '' } : undefined })
      toast('Profile saved successfully.', 'success')
      navigate('/consumer/profile')
    } catch (saveError: any) { setError(saveError?.response?.data?.message || 'Unable to save profile right now.') } finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-2xl space-y-5"><Button variant="ghost" size="sm" onClick={() => navigate('/consumer/profile')}><ArrowLeft className="h-4 w-4" /> Back to profile</Button><div className="text-center"><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Edit profile</h1><p className="mt-1 text-sm text-muted">Update your account details.</p></div><Card><div className="flex flex-col items-center gap-3 text-center"><div className="relative">{avatar ? <img src={avatar} alt={name} className="h-24 w-24 rounded-full border-2 border-primary object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-background">{name.charAt(0).toUpperCase()}</div>}<label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-background shadow-lg" aria-label="Upload profile photo"><Camera className="h-4 w-4" /><input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} /></label>{avatar && <button type="button" onClick={() => setAvatar('')} className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white" aria-label="Remove profile photo"><Trash2 className="h-4 w-4" /></button>}</div><h2 className="text-xl font-bold">{name || 'Consumer'}</h2></div></Card><Card><div className="grid gap-4"><Input label="Name *" value={name} onChange={(event) => setName(event.target.value)} icon={<User className="h-4 w-4" />} /><Input label="Phone number *" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} icon={<Phone className="h-4 w-4" />} /><Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} /></div>{error && <p className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-6 flex justify-center"><Button onClick={saveProfile} loading={saving}><Save className="h-4 w-4" /> Save profile</Button></div></Card></div>
}
