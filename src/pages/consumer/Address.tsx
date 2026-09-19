import { useEffect, useState } from 'react'
import { ArrowLeft, LocateFixed, MapPin, Plus, Save, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'
import { getCurrentLocation, reverseGeocode } from '@/utils/locationService'

type Address = { id: number; label: string; address_line: string; landmark?: string; city: string; state?: string; pincode?: string; is_default: number; lat?: number; lng?: number }

export default function ConsumerAddress() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [editing, setEditing] = useState(false)
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
    try { const response = await api.get(`/users/${userId}/addresses`); setAddresses(response.data.addresses || []) } catch { setError('Unable to load saved addresses right now.') } finally { setLoading(false) }
  }
  useEffect(() => { loadAddresses() }, [userId])

  const resetForm = () => { setEditing(false); setAddressLine(''); setLandmark(''); setCity(''); setState(''); setPincode(''); setCoordinates({ lat: 0, lng: 0 }) }
  const editAddress = (address: Address) => { setEditing(true); setAddressLine(address.address_line || ''); setLandmark(address.landmark || ''); setCity(address.city || ''); setState(address.state || ''); setPincode(address.pincode || ''); setCoordinates({ lat: address.lat || 0, lng: address.lng || 0 }) }
  const useLocation = async () => { setLocating(true); const next = await getCurrentLocation(); const location = await reverseGeocode(next); setCoordinates(next); setAddressLine(location.address); setCity(location.city); setLocating(false) }
  const saveAddress = async () => {
    if (!userId || !addressLine.trim() || !city.trim()) { setError('Address line and city are required.'); return }
    setSaving(true); setError('')
    try { const response = await api.post(`/users/${userId}/addresses`, { label: 'Home', address_line: addressLine, landmark, city, state, pincode, lat: coordinates.lat || null, lng: coordinates.lng || null, is_default: addresses.length === 0 }); setAddresses((current) => [response.data.address, ...current]); resetForm(); toast('Address saved successfully.', 'success') } catch (saveError: any) { setError(saveError?.response?.data?.message || 'Unable to save address right now.') } finally { setSaving(false) }
  }
  const removeAddress = async (addressId: number) => { if (!userId) return; try { await api.delete(`/users/${userId}/addresses/${addressId}`); setAddresses((current) => current.filter((address) => address.id !== addressId)); toast('Address removed.', 'success') } catch { setError('Unable to remove address right now.') } }

  return <div className="mx-auto max-w-2xl space-y-5"><Button variant="ghost" size="sm" onClick={() => navigate('/consumer/profile')}><ArrowLeft className="h-4 w-4" /> Back to profile</Button><Card><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Saved addresses</h1><p className="mt-1 text-sm text-muted">Store multiple addresses for faster checkout.</p></div><Button size="sm" variant="outline" onClick={() => { resetForm(); setEditing(true) }}><Plus className="h-4 w-4" /> New address</Button></div>{editing && <div className="mt-6 border-t border-border pt-5"><div className="grid gap-4 sm:grid-cols-2"><Input label="Address line *" value={addressLine} onChange={(event) => setAddressLine(event.target.value)} /><Input label="Landmark" value={landmark} onChange={(event) => setLandmark(event.target.value)} /><Input label="City *" value={city} onChange={(event) => setCity(event.target.value)} /><Input label="State" value={state} onChange={(event) => setState(event.target.value)} /><Input label="PIN code" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} /></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={useLocation} loading={locating}><LocateFixed className="h-4 w-4" /> Use location</Button><Button onClick={saveAddress} loading={saving}><Save className="h-4 w-4" /> Save address</Button><Button variant="ghost" onClick={resetForm}>Cancel</Button></div></div>}{error && <p className="mt-4 text-sm text-danger">{error}</p>}</Card><Card padding="none" className="overflow-hidden">{loading ? <p className="p-6 text-center text-muted">Loading addresses...</p> : addresses.length === 0 ? <div className="p-8 text-center"><MapPin className="mx-auto h-10 w-10 text-muted/50" /><p className="mt-2 text-sm text-muted">No saved addresses yet.</p></div> : <div>{addresses.map((address) => <div key={address.id} className="flex items-start gap-3 border-b border-border p-5 last:border-0"><MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold">{address.label || 'Saved address'}</p>{address.is_default ? <span className="text-xs font-semibold text-primary">Default</span> : null}</div><p className="mt-1 text-sm text-muted">{[address.address_line, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</p><div className="mt-3 flex gap-3"><button type="button" onClick={() => editAddress(address)} className="text-sm font-semibold text-primary">Edit</button><button type="button" onClick={() => removeAddress(address.id)} className="flex items-center gap-1 text-sm font-semibold text-danger"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div></div></div>)}</div>}</Card></div>
}
