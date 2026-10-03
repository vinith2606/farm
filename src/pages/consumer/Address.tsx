import { useEffect, useState } from 'react'
import { ArrowLeft, LocateFixed, MapPin, Plus, Save, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'
import { requestCurrentLocation, reverseGeocode } from '@/utils/locationService'

type AddressLabel = 'Home' | 'Work' | 'Other'
type Address = { id: number; label: AddressLabel; address_line: string; landmark?: string; city: string; state?: string; pincode?: string; is_default: number; lat?: number; lng?: number }

export default function ConsumerAddress() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [editing, setEditing] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null)
  const [label, setLabel] = useState<AddressLabel>('Home')
  const [addressLine, setAddressLine] = useState('')
  const [landmark, setLandmark] = useState('')
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
      setError('Unable to load saved addresses right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAddresses() }, [userId])

  const resetForm = () => {
    setEditing(false)
    setEditingAddressId(null)
    setLabel('Home')
    setAddressLine('')
    setLandmark('')
    setCity('')
    setState('')
    setPincode('')
    setCoordinates({ lat: 0, lng: 0 })
  }

  const editAddress = (saved: Address) => {
    setEditing(true)
    setEditingAddressId(saved.id)
    setLabel(saved.label === 'Work' || saved.label === 'Other' ? saved.label : 'Home')
    setAddressLine(saved.address_line || '')
    setLandmark(saved.landmark || '')
    setCity(saved.city || '')
    setState(saved.state || '')
    setPincode(saved.pincode || '')
    setCoordinates({ lat: saved.lat ?? 0, lng: saved.lng ?? 0 })
  }

  const useLocation = async () => {
    setLocating(true)
    setError('')
    try {
      const next = await requestCurrentLocation()
      const location = await reverseGeocode(next)
      setCoordinates(next)
      setAddressLine([location.address, location.area].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', ') || addressLine)
      setLandmark(location.landmark || landmark)
      setCity(location.city || city)
      setState(location.state || state)
      setPincode(location.pincode || pincode)
      if (!location.state && !location.pincode) setError('Location found, but state and PIN code could not be resolved. Please enter them manually.')
    } catch {
      setError('Unable to read this location. Please enter the address details manually.')
    } finally {
      setLocating(false)
    }
  }

  const saveAddress = async () => {
    if (!userId || !addressLine.trim() || !city.trim()) {
      setError('Address line and city are required.')
      return
    }
    setSaving(true)
    setError('')
    const hasCoordinates = coordinates.lat !== 0 || coordinates.lng !== 0
    const payload = {
      label,
      address_line: addressLine,
      landmark,
      city,
      state,
      pincode,
      lat: hasCoordinates ? coordinates.lat : null,
      lng: hasCoordinates ? coordinates.lng : null,
      is_default: addresses.length === 0,
    }

    try {
      const response = editingAddressId
        ? await api.put(`/users/${userId}/addresses/${editingAddressId}`, payload)
        : await api.post(`/users/${userId}/addresses`, payload)
      setAddresses((current) => editingAddressId
        ? current.map((saved) => saved.id === editingAddressId ? response.data.address : saved)
        : [response.data.address, ...current])
      resetForm()
      toast(editingAddressId ? 'Address updated successfully.' : 'Address saved successfully.', 'success')
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || 'Unable to save address right now.')
    } finally {
      setSaving(false)
    }
  }

  const removeAddress = async (addressId: number) => {
    if (!userId) return
    try {
      await api.delete(`/users/${userId}/addresses/${addressId}`)
      setAddresses((current) => current.filter((address) => address.id !== addressId))
      toast('Address removed.', 'success')
    } catch {
      setError('Unable to remove address right now.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/consumer/profile')}><ArrowLeft className="h-4 w-4" /> Back to profile</Button>
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Saved addresses</h1><p className="mt-1 text-sm text-muted">Store multiple addresses for faster checkout.</p></div>
          <Button size="sm" variant="outline" onClick={() => { resetForm(); setEditing(true) }}><Plus className="h-4 w-4" /> New address</Button>
        </div>
        {editing && (
          <div className="mt-6 border-t border-border pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">Save as<select value={label} onChange={(event) => setLabel(event.target.value as AddressLabel)} className="mt-1.5 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground"><option>Home</option><option>Work</option><option>Other</option></select></label>
              <Input label="Address line *" value={addressLine} onChange={(event) => setAddressLine(event.target.value)} />
              <Input label="Landmark" value={landmark} onChange={(event) => setLandmark(event.target.value)} />
              <Input label="City *" value={city} onChange={(event) => setCity(event.target.value)} />
              <Input label="State" value={state} onChange={(event) => setState(event.target.value)} />
              <Input label="PIN code" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={useLocation} loading={locating}><LocateFixed className="h-4 w-4" /> Use location</Button>
              <Button onClick={saveAddress} loading={saving}><Save className="h-4 w-4" /> {editingAddressId ? 'Update address' : 'Save address'}</Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </Card>
      <Card padding="none" className="overflow-hidden">
        {loading ? <p className="p-6 text-center text-muted">Loading addresses...</p> : addresses.length === 0 ? (
          <div className="p-8 text-center"><MapPin className="mx-auto h-10 w-10 text-muted/50" /><p className="mt-2 text-sm text-muted">No saved addresses yet.</p></div>
        ) : (
          <div>{addresses.map((address) => (
            <div key={address.id} className="border-b border-border px-5 py-4 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{address.label}</p>{Number(address.is_default) === 1 && <span className="text-xs font-semibold text-primary">Default</span>}</div>
                  <p className="mt-1 text-sm text-muted">{[address.address_line, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</p>
                </div>
                <button type="button" onClick={() => editAddress(address)} className="text-sm font-semibold text-primary">Edit</button>
              </div>
              <button type="button" onClick={() => removeAddress(address.id)} className="mt-3 inline-flex items-center gap-1 text-sm text-danger"><Trash2 className="h-4 w-4" /> Remove</button>
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  )
}