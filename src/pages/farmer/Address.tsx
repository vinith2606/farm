import { useEffect, useState } from 'react'
import { ArrowLeft, LocateFixed, MapPin, Plus, Save, Star, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'
import { requestCurrentLocation, reverseGeocode } from '@/utils/locationService'

type Address = {
  id: number
  label: string
  address_line: string
  landmark?: string
  city: string
  state?: string
  pincode?: string
  is_default: number
  lat?: number
  lng?: number
}
type AddressLabel = 'Home' | 'Work' | 'Other'

export default function FarmerAddress() {
  const navigate = useNavigate()
  const { userId, userName, userEmail, userPhone, farmName, userDescription, userAvatar, updateProfile } = useAuth()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState<AddressLabel>('Home')
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

  const loadAddresses = async () => {
    if (!userId) return
    try {
      const response = await api.get(`/users/${userId}/addresses`)
      setAddresses(response.data.addresses || [])
    } catch {
      setError('Unable to load farm addresses right now.')
    } finally {
      setLoading(false)
    }
  }

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
    }).catch(() => setError('Unable to load your address right now.')).finally(() => {
      loadAddresses()
    })
  }, [userId])

  const resetForm = () => {
    setEditing(false)
    setLabel('Home')
    setHouseNumber('')
    setFloor('')
    setBuildingBlock('')
    setLandmark('')
    setAddress('')
    setCity('')
    setState('')
    setPincode('')
    setCoordinates({ lat: 0, lng: 0 })
  }

  const useLocation = async () => {
    setLocating(true)
    setError('')
    try {
      const nextCoordinates = await requestCurrentLocation()
      const location = await reverseGeocode(nextCoordinates)
      setCoordinates(nextCoordinates)
      setHouseNumber(location.houseNumber || houseNumber)
      setAddress(location.address || location.area || address)
      setBuildingBlock(location.area || buildingBlock)
      setLandmark(location.landmark || landmark)
      setCity(location.city || city)
      setState(location.state || state)
      setPincode(location.pincode || pincode)
      if (!location.state && !location.pincode) {
        setError('Location found, but address details could not be resolved. Please fill in state and PIN code.')
      }
    } catch {
      setError('Unable to read this location. Please enter the address details manually.')
    } finally {
      setLocating(false)
    }
  }

  const save = async () => {
    if (!userId || !houseNumber.trim() || !floor.trim() || !buildingBlock.trim() || !landmark.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setError('All address fields are required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const completeAddress = [houseNumber, floor, buildingBlock, landmark, city, state, pincode].filter(Boolean).join(', ')
      const hasCoordinates = coordinates.lat !== 0 || coordinates.lng !== 0
      const response = await api.post(`/users/${userId}/addresses`, {
        label,
        address_line: completeAddress,
        landmark,
        city,
        state,
        pincode,
        lat: hasCoordinates ? coordinates.lat : null,
        lng: hasCoordinates ? coordinates.lng : null,
        is_default: addresses.length === 0,
      })

      const savedAddress = response.data.address
      setAddresses((current) => [savedAddress, ...current])
      resetForm()
      updateProfile(userName, {
        id: String(userId),
        email: userEmail,
        phone: userPhone,
        farmName,
        description: userDescription,
        avatar: userAvatar || '',
        location: savedAddress.lat != null && savedAddress.lng != null ? {
          lat: savedAddress.lat,
          lng: savedAddress.lng,
          address: savedAddress.address_line || '',
          city: savedAddress.city || '',
        } : undefined,
      })
      toast('Farm location saved successfully.', 'success')
      setEditing(false)
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || 'Unable to save your address right now.')
    } finally {
      setSaving(false)
    }
  }

  const setAsDefault = async (addressId: number) => {
    if (!userId) return
    try {
      const response = await api.put(`/users/${userId}/addresses/${addressId}/default`)
      const defaultAddress = response.data.address
      if (defaultAddress) {
        setAddresses((current) => current.map((item) => ({ ...item, is_default: item.id === defaultAddress.id ? 1 : 0 })))
        updateProfile(userName, {
          id: String(userId),
          email: userEmail,
          phone: userPhone,
          farmName,
          description: userDescription,
          avatar: userAvatar || '',
          location: defaultAddress.lat != null && defaultAddress.lng != null ? {
            lat: defaultAddress.lat,
            lng: defaultAddress.lng,
            address: defaultAddress.address_line || '',
            city: defaultAddress.city || '',
          } : undefined,
        })
      }
      toast('Default farm location updated.', 'success')
    } catch {
      setError('Unable to update the default farm location right now.')
    }
  }

  const removeAddress = async (addressId: number) => {
    if (!userId) return
    try {
      await api.delete(`/users/${userId}/addresses/${addressId}`)
      setAddresses((current) => current.filter((address) => address.id !== addressId))
      toast('Farm location removed.', 'success')
    } catch {
      setError('Unable to remove the farm location right now.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/farmer/profile')}>
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Button>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Farm locations</h1>
            <p className="mt-1 text-sm text-muted">Save multiple farm locations and keep one as the default.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { resetForm(); setEditing(true) }}>
            <Plus className="h-4 w-4" /> Add another
          </Button>
        </div>

        {editing && (
          <div className="mt-6 border-t border-border pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">Save as<select value={label} onChange={(event) => setLabel(event.target.value as AddressLabel)} className="mt-1.5 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground"><option>Home</option><option>Work</option><option>Other</option></select></label>
              <Input label="House number *" value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} placeholder="12A" />
              <Input label="Floor *" value={floor} onChange={(event) => setFloor(event.target.value)} placeholder="2nd floor" />
              <Input label="Building & block *" value={buildingBlock} onChange={(event) => setBuildingBlock(event.target.value)} placeholder="Green Residency, Block B" />
              <Input label="Landmark *" value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Near landmark" />
              <Input label="Street / area" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, area, layout" />
              <Input label="City *" value={city} onChange={(event) => setCity(event.target.value)} />
              <Input label="State *" value={state} onChange={(event) => setState(event.target.value)} />
              <Input label="Pincode *" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="560001" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={useLocation} loading={locating}>
                <LocateFixed className="h-4 w-4" /> Use current location
              </Button>
              <Button onClick={save} loading={saving}>
                <Save className="h-4 w-4" /> Save location
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </Card>

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-muted">Loading farm locations...</p>
        ) : addresses.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted/50" />
            <p className="mt-2 text-sm text-muted">No saved farm locations yet.</p>
          </div>
        ) : (
          <div>
            {addresses.map((saved) => (
              <div key={saved.id} className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{saved.label || 'Farm location'}</p>
                    {Number(saved.is_default) === 1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <Star className="h-3 w-3 fill-current" /> Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted">{saved.address_line || 'Address not provided'}</p>
                  {saved.landmark && <p className="mt-1 text-sm text-muted">Landmark: {saved.landmark}</p>}
                  <p className="mt-1 text-sm text-muted">{[saved.city, saved.state, saved.pincode].filter(Boolean).join(', ')}</p>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAsDefault(saved.id)} disabled={Number(saved.is_default) === 1}>
                    Set default
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => removeAddress(saved.id)}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
