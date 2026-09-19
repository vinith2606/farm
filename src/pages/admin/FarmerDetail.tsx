import { useEffect, useState } from 'react'
import { ArrowLeft, Ban, CheckCircle, ExternalLink, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import api, { endpoints } from '@/services/api'

type Farmer = {
  id: number
  role: string
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  farmName?: string
  description?: string
  avatar?: string
  certificateId?: number
  certificateType?: string
  certificateDocumentUrl?: string
  certificateDownloadUrl?: string
  certificateReviewStatus?: 'verified' | 'pending' | 'rejected' | 'expired'
  certificateRejectionReason?: string
  createdAt: string
}

function certificateVariant(status?: Farmer['certificateReviewStatus']) {
  if (status === 'verified') return 'success' as const
  if (status === 'rejected') return 'danger' as const
  return 'warning' as const
}

export default function AdminFarmerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')

  const loadFarmer = async () => {
    try {
      const response = await api.get(endpoints.admin.users)
      const match = (response.data.users || []).find((user: any) => String(user.id) === String(id) && user.role === 'farmer')
      if (match) {
        console.log('Farmer matched:', { id: match.id, address: match.address, city: match.city, description: match.description, farmName: match.farmName })
        setFarmer(match as Farmer)
      } else {
        setFarmer(null)
      }
    } catch (err) {
      console.error('Load farmer error:', err)
      setError('Unable to load farmer details right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFarmer() }, [id])

  const reviewCertificate = async (status: 'verified' | 'rejected') => {
    if (!farmer?.certificateId) return
    setReviewing(true)
    setError('')
    try {
      await api.put(endpoints.certificates.review(String(farmer.certificateId)), { status })
      await loadFarmer()
    } catch (reviewError: any) {
      setError(reviewError?.response?.data?.message || 'Unable to update certificate status.')
    } finally {
      setReviewing(false)
    }
  }

  if (loading) return <Card><p className="py-10 text-center text-muted">Loading farmer details...</p></Card>
  if (!farmer) return <Card><EmptyState icon={MapPin} title="Farmer not found" description={error || 'This farmer profile is unavailable.'} /></Card>

  const status = farmer.certificateReviewStatus || 'pending'
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/farmers')}><ArrowLeft className="h-4 w-4" /> Back to farmers</Button>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Farmer Management</p><h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">{farmer.name}</h1><p className="mt-1 text-sm text-muted">Joined {new Date(farmer.createdAt).toLocaleDateString()}</p></div><Badge variant={certificateVariant(status)}><ShieldCheck className="h-4 w-4" /> {status}</Badge></div>

      <Card><div className="flex flex-col items-center gap-5 sm:flex-row"><div>{farmer.avatar ? <img src={farmer.avatar} alt={farmer.name} className="h-28 w-28 rounded-full border-2 border-primary object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-full gradient-primary text-4xl font-bold text-background">{farmer.name.charAt(0)}</div>}</div><div className="space-y-3"><h2 className="text-xl font-semibold">{farmer.name}</h2><p className="flex items-center gap-2 text-sm text-muted"><Phone className="h-4 w-4 text-primary" />{farmer.phone || 'Mobile number not provided'}</p><p className="flex items-center gap-2 text-sm text-muted"><Mail className="h-4 w-4 text-primary" />{farmer.email || 'Email not provided'}</p></div></div></Card>

      <div className="grid gap-6 md:grid-cols-2"><Card><h2 className="mb-4 font-semibold">Farm details</h2><dl className="space-y-4 text-sm"><div><dt className="text-muted">Farm name</dt><dd className="mt-1 font-medium">{farmer.farmName || 'Not provided'}</dd></div><div><dt className="text-muted">Description</dt><dd className="mt-1 whitespace-pre-wrap text-foreground">{farmer.description || 'Not provided'}</dd></div><div><dt className="text-muted">Address</dt><dd className="mt-1 flex items-start gap-2 font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{farmer.address || 'Not provided'}</dd></div><div><dt className="text-muted">City</dt><dd className="mt-1 font-medium">{farmer.city || 'Not provided'}</dd></div></dl></Card><Card><h2 className="mb-4 font-semibold">Certificate status</h2><div className="space-y-3"><Badge variant={certificateVariant(status)}><ShieldCheck className="h-4 w-4" /> {status}</Badge>{farmer.certificateId ? <><p className="text-sm"><span className="text-muted">Type:</span> {farmer.certificateType || 'Certificate'}</p>{farmer.certificateDownloadUrl && <a href={farmer.certificateDownloadUrl} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-4 w-4" /> Download certificate</a>}{status !== 'verified' && <div className="flex flex-wrap gap-2 pt-2"><Button size="sm" loading={reviewing} onClick={() => reviewCertificate('verified')}><CheckCircle className="h-4 w-4" /> Approve</Button><Button size="sm" variant="danger" loading={reviewing} onClick={() => reviewCertificate('rejected')}><Ban className="h-4 w-4" /> Reject</Button></div>}</> : <p className="text-sm text-muted">No certificate uploaded yet.</p>}</div></Card></div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
