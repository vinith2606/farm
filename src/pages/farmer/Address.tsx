import { useEffect, useState } from 'react'
import { ArrowLeft, LocateFixed, MapPin, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api, { endpoints } from '@/services/api'
import { getCurrentLocation, reverseGeocode } from '@/utils/locationService'

export default function FarmerAddress() {
  const navigate = useNavigate()
  const { userId, userName, userEmail, userPhone, updateProfile } = useAuth()
  const { toast } = useToast()
  const [houseNumber, setHouseNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [buildingBlock, setBuildingBlock] = useState('')
  const [landmark, setLandmark] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}`).then((response) => {
      const user = response.data.user
      setHouseNumber(user.houseNumber || '')
      setFloor(user.floor || '')
      setBuildingBlock(user.buildingBlock || '')
      setLandmark(user.landmark || '')
      setAddress(user.address || '')
      setCity(user.city || '')
      setState(user.state || '')
      setPincode(user.pincode || '')
      setCoordinates({ lat: user.lat || 0, lng: user.lng || 0 })
    }).catch(() => setError('Unable to load your address right now.')).finally(() => setLoading(false))
  }, [userId])

  const useLocation = async () => {
    setLocating(true)
    const nextCoordinates = await getCurrentLocation()
    const location = await reverseGeocode(nextCoordinates)
    setCoordinates(nextCoordinates)
    setAddress(location.address)
    setCity(location.city)
    setLocating(false)
  }

  const save = async () => {
    if (!userId || !houseNumber.trim() || !floor.trim() || !buildingBlock.trim() || !landmark.trim() || !city.trim() || !state.trim() || !pincode.trim()) { setError('All address fields are required.'); return }
    setSaving(true)
    setError('')
    try {
      const completeAddress = [houseNumber, floor, buildingBlock, landmark, city, state, pincode].filter(Boolean).join(', ')
      const response = await api.put(endpoints.users.profile(userId), { name: userName, phone: userPhone, email: userEmail, address: completeAddress, city, houseNumber, floor, buildingBlock, landmark, state, pincode, lat: coordinates.lat || null, lng: coordinates.lng || null })
      const user = response.data.user
      updateProfile(user.name, { id: String(user.id), email: user.email || '', phone: user.phone || '', farmName: user.farmName || '', description: user.description || '', avatar: user.avatar || '', certificateStatus: user.certificateStatus || 'pending', location: user.lat && user.lng ? { lat: user.lat, lng: user.lng, address: user.address || '', city: user.city || '' } : undefined })
      toast('Farm address updated successfully.', 'success')
      navigate('/farmer/profile')
    } catch (saveError: any) { setError(saveError?.response?.data?.message || 'Unable to save your address right now.') } finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-2xl space-y-5"><Button variant="ghost" size="sm" onClick={() => navigate('/farmer/profile')}><ArrowLeft className="h-4 w-4" /> Back to profile</Button><Card><div className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Farm address</h1><p className="mt-1 text-sm text-muted">Enter the complete address used by customers and deliveries.</p></div><MapPin className="h-6 w-6 text-primary" /></div>{loading ? <p className="py-8 text-center text-muted">Loading address...</p> : <><div className="grid gap-4 sm:grid-cols-2"><Input label="House number *" value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} placeholder="12A" /><Input label="Floor *" value={floor} onChange={(event) => setFloor(event.target.value)} placeholder="2nd floor" /><Input label="Building & block *" value={buildingBlock} onChange={(event) => setBuildingBlock(event.target.value)} placeholder="Green Residency, Block B" /><Input label="Landmark *" value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Near landmark" /><Input label="Street / area" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, area, layout" /><Input label="City *" value={city} onChange={(event) => setCity(event.target.value)} /><Input label="State *" value={state} onChange={(event) => setState(event.target.value)} /><Input label="Pincode *" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="560001" /></div><Button variant="outline" className="mt-4" onClick={useLocation} loading={locating}><LocateFixed className="h-4 w-4" /> Use current location</Button>{error && <p className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-6 flex justify-end"><Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Save address</Button></div></>}</Card></div>
}
