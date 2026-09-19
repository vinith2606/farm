import { useEffect, useState } from 'react'
import { ArrowLeft, Car, Save, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api from '@/services/api'

export default function DeliveryVehicle() {
  const navigate = useNavigate(); const { userId, userName, userEmail, userPhone } = useAuth(); const { toast } = useToast()
  const [license, setLicense] = useState(''); const [vehicleType, setVehicleType] = useState(''); const [vehicleNumber, setVehicleNumber] = useState(''); const [licenseStatus, setLicenseStatus] = useState('pending'); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  useEffect(() => { if (!userId) return; api.get(`/users/${userId}`).then(({ data }) => { const user = data.user; setLicense(user.drivingLicenseNumber || ''); setVehicleType(user.vehicleType || ''); setVehicleNumber(user.vehicleNumber || ''); setLicenseStatus(user.drivingLicenseStatus || 'pending') }).catch(() => setError('Unable to load vehicle details right now.')) }, [userId])
  const save = async () => { if (!userId) return; setSaving(true); setError(''); try { await api.put(`/users/${userId}/profile`, { name: userName, phone: userPhone, email: userEmail, drivingLicenseNumber: license, vehicleType, vehicleNumber }); toast('Vehicle details saved.', 'success') } catch (saveError: any) { setError(saveError?.response?.data?.message || 'Unable to save vehicle details right now.') } finally { setSaving(false) } }
  return <div className="mx-auto max-w-2xl space-y-5"><Button variant="ghost" size="sm" onClick={() => navigate('/delivery/profile')}><ArrowLeft className="h-4 w-4" /> Back to profile</Button><Card><div className="flex items-center gap-3"><Car className="h-6 w-6 text-primary" /><div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Vehicle & licence</h1><p className="mt-1 text-sm text-muted">Provide details for partner verification.</p></div></div><div className="mt-5 flex items-center gap-3"><Badge variant={licenseStatus === 'verified' ? 'success' : licenseStatus === 'rejected' ? 'danger' : 'warning'}><ShieldCheck className="h-4 w-4" /> Licence {licenseStatus}</Badge>{licenseStatus === 'verified' && <span className="text-sm font-semibold text-primary">Your licence is verified.</span>}</div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Input label="Driving licence number" value={license} onChange={(event) => setLicense(event.target.value)} placeholder="DL-XX-00000000000" /><Input label="Vehicle type" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} placeholder="Bike, scooter, van" /><Input label="Vehicle number" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="KA 01 AB 1234" /></div>{error && <p className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-6 flex justify-center"><Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Save details</Button></div></Card></div>
}
