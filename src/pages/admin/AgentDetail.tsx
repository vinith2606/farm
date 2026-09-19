import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Car, CheckCircle, IdCard, Lock, Mail, Phone, ShieldCheck, Unlock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, AvailabilityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import api, { endpoints } from '@/services/api'
import type { DeliveryPartner } from './Agents'

function verificationVariant(status?: string) {
  return status === 'verified' ? 'success' as const : status === 'rejected' ? 'danger' as const : 'warning' as const
}

export default function AdminAgentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [partner, setPartner] = useState<DeliveryPartner | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(endpoints.admin.users).then((response) => {
      const match = (response.data.users || []).find((user: DeliveryPartner) => String(user.id) === String(id) && user.role === 'delivery')
      setPartner(match || null)
      if (!match) setError('This delivery partner profile is unavailable.')
    }).catch(() => setError('Unable to load delivery partner details right now.')).finally(() => setLoading(false))
  }, [id])

  const reviewDocument = async (document: 'aadhaar' | 'driving_license', status: 'verified' | 'rejected') => {
    if (!partner) return
    setUpdating(true)
    setError('')
    try {
      const response = await api.put(`/admin/delivery-partners/${partner.id}/verification`, { document, status })
      setPartner(response.data.user)
    } catch (reviewError: any) {
      setError(reviewError?.response?.data?.message || 'Unable to update verification status.')
    } finally {
      setUpdating(false)
    }
  }

  const updateAccountStatus = async (status: 'active' | 'suspended') => {
    if (!partner) return
    setUpdating(true)
    try {
      const response = await api.put(`/admin/users/${partner.id}/status`, { status })
      setPartner(response.data.user)
    } catch (statusError: any) {
      setError(statusError?.response?.data?.message || 'Unable to update account status.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>
  if (!partner) return <div className="space-y-6"><Button variant="ghost" size="sm" onClick={() => navigate('/admin/agents')}><ArrowLeft className="h-4 w-4" /> Back to delivery partners</Button><Card><EmptyState icon={Car} title="Delivery partner not found" description={error} /></Card></div>

  const VerificationCard = ({ title, icon: Icon, value, status, document }: { title: string; icon: typeof IdCard; value?: string; status?: string; document: 'aadhaar' | 'driving_license' }) => (
    <Card className="space-y-4">
      <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h2 className="font-semibold">{title}</h2></div>
      <p className="text-sm font-medium">{value || 'Not provided'}</p>
      <Badge variant={verificationVariant(status)}><ShieldCheck className="h-4 w-4" /> {status || 'pending'}</Badge>
      {value?.trim() && status !== 'verified' && <div className="flex flex-wrap gap-2"><Button size="sm" loading={updating} onClick={() => reviewDocument(document, 'verified')}><CheckCircle className="h-4 w-4" /> Approve</Button><Button size="sm" variant="danger" loading={updating} onClick={() => reviewDocument(document, 'rejected')}>Reject</Button></div>}
    </Card>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/agents')}><ArrowLeft className="h-4 w-4" /> Back to delivery partners</Button>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Delivery Partner Management</p><h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">{partner.name}</h1><p className="mt-1 text-sm text-muted">Joined {new Date(partner.createdAt).toLocaleDateString()}</p></div><Badge variant={partner.accountStatus === 'suspended' ? 'danger' : 'success'}>{partner.accountStatus === 'suspended' ? 'Suspended' : 'Active'}</Badge></div>
      <Card><div className="flex items-center gap-4">{partner.avatar ? <img src={partner.avatar} alt={partner.name} className="h-20 w-20 rounded-full object-cover border-2 border-primary" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary text-3xl font-bold text-background">{partner.name.charAt(0).toUpperCase()}</div>}<div className="space-y-2"><h2 className="text-xl font-semibold">{partner.name}</h2><p className="flex items-center gap-2 text-sm text-muted"><Phone className="h-4 w-4 text-primary" />{partner.phone || 'Mobile number not provided'}</p><p className="flex items-center gap-2 text-sm text-muted"><Mail className="h-4 w-4 text-primary" />{partner.email || 'Email not provided'}</p></div></div></Card>
      <div className="grid gap-6 md:grid-cols-2"><VerificationCard title="Aadhaar Verification" icon={IdCard} value={partner.aadhaarNumber} status={partner.aadhaarStatus} document="aadhaar" /><VerificationCard title="Driving Licence Verification" icon={BadgeCheck} value={partner.drivingLicenseNumber} status={partner.drivingLicenseStatus} document="driving_license" /></div>
      <div className="grid gap-6 md:grid-cols-2"><Card><div className="mb-4 flex items-center gap-2"><Car className="h-5 w-5 text-primary" /><h2 className="font-semibold">Vehicle Details</h2></div><dl className="space-y-3 text-sm"><div><dt className="text-muted">Vehicle type</dt><dd className="font-medium">{partner.vehicleType || 'Not provided'}</dd></div><div><dt className="text-muted">Vehicle number</dt><dd className="font-medium">{partner.vehicleNumber || 'Not provided'}</dd></div></dl></Card><Card className="space-y-4"><h2 className="font-semibold">Availability & Account Status</h2><div><p className="mb-1 text-xs text-muted">Availability Status</p><AvailabilityBadge available={partner.availabilityStatus !== 'unavailable'} /></div><div><p className="mb-1 text-xs text-muted">Account Status</p><Badge variant={partner.accountStatus === 'suspended' ? 'danger' : 'success'}>{partner.accountStatus === 'suspended' ? 'Suspended' : 'Active'}</Badge></div>{partner.accountStatus === 'suspended' ? <Button className="w-full" loading={updating} onClick={() => updateAccountStatus('active')}><Unlock className="h-4 w-4" /> Activate Account</Button> : <Button className="w-full" variant="danger" loading={updating} onClick={() => updateAccountStatus('suspended')}><Lock className="h-4 w-4" /> Suspend Account</Button>}</Card></div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
