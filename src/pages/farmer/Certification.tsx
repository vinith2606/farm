import { useEffect, useState, type ChangeEvent } from 'react'
import { ArrowLeft, CheckCircle2, FileCheck2, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, CertificateBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AppContext'
import { useToast } from '@/context/ToastContext'
import api, { endpoints } from '@/services/api'

export default function FarmerCertification() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { toast } = useToast()
  const [farmer, setFarmer] = useState<any>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [certificateNumber, setCertificateNumber] = useState('')
  const [file, setFile] = useState('')
  const [type, setType] = useState('Organic farming certificate')
  const [expiryDate, setExpiryDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!userId) return
    try {
      const [userResponse, certificateResponse] = await Promise.all([api.get(`/users/${userId}`), api.get(endpoints.certificates.list, { params: { farmerId: userId } })])
      setFarmer(userResponse.data.user)
      const existing = certificateResponse.data.certificates?.[0] || null
      setCertificate(existing)
      setCertificateNumber(existing?.certificate_number || '')
    } catch { setError('Unable to load certification details right now.') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId])

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!selected.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (selected.size > 4 * 1024 * 1024) { setError('Please choose a file smaller than 4 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setFile(String(reader.result || ''))
    reader.readAsDataURL(selected)
    setError('')
  }

  const upload = async () => {
    if (!userId || !certificateNumber.trim() || !file || !type.trim()) { setError('Certificate number, type, and image are required.'); return }
    setUploading(true)
    setError('')
    try {
      const response = await api.post(endpoints.certificates.upload, { farmer_id: Number(userId), farmer_name: farmer?.name, certificate_number: certificateNumber, type, document_url: file, expiry_date: expiryDate || null })
      setCertificate(response.data.certificate)
      setFile('')
      toast('Certificate uploaded for review.', 'success')
    } catch (uploadError: any) { setError(uploadError?.response?.data?.message || 'Unable to upload certificate right now.') } finally { setUploading(false) }
  }

  const status = certificate?.status || farmer?.certificateStatus || 'pending'
  return <div className="mx-auto max-w-2xl space-y-5"><Button variant="ghost" size="sm" onClick={() => navigate('/farmer/profile')}><ArrowLeft className="h-4 w-4" /> Back to profile</Button>{loading ? <Card><p className="py-8 text-center text-muted">Loading certification...</p></Card> : <><Card><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Certification</h1><p className="mt-1 text-sm text-muted">{farmer?.farmName || 'Farm details'} verification</p></div><FileCheck2 className="h-7 w-7 text-primary" /></div><div className="mt-5 flex items-center gap-3">{status === 'verified' ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Badge variant={status === 'rejected' ? 'danger' : status === 'expired' ? 'warning' : 'pending'}>{status === 'verified' ? 'Verified' : status === 'rejected' ? 'Rejected' : status === 'expired' ? 'Expired' : 'Not uploaded'}</Badge>}{status === 'verified' && <p className="font-semibold text-primary">You are already verified.</p>}</div><dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2"><div><dt className="text-muted">Farmer name</dt><dd className="mt-1 font-semibold">{farmer?.name || 'Not provided'}</dd></div><div className="sm:col-span-2"><dt className="text-muted">Farm description</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{farmer?.description || 'Not provided'}</dd></div><div><dt className="text-muted">Address</dt><dd className="mt-1 font-semibold">{farmer?.address || 'Not provided'}</dd></div><div><dt className="text-muted">City</dt><dd className="mt-1 font-semibold">{farmer?.city || 'Not provided'}</dd></div></dl></Card>{certificate?.document_url && <Card><h2 className="font-semibold">Uploaded certificate</h2><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">{certificate.type}</p><CertificateBadge status={certificate.status || 'pending'} /></div><a href={certificate.document_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">View document</a></div></Card>}{status !== 'verified' && <Card><h2 className="font-semibold">Upload certificate</h2><div className="mt-4 space-y-4"><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-primary/40 p-4 text-sm hover:bg-primary/5"><Upload className="h-5 w-5 text-primary" /><span>{file ? 'Certificate selected' : 'Choose PDF, JPG, or PNG up to 4 MB'}</span><input type="file" accept=".pdf,image/png,image/jpeg" onChange={handleFile} className="sr-only" /></label><div className="grid gap-4 sm:grid-cols-2"><Input label="Certificate type" value={type} onChange={(event) => setType(event.target.value)} /><Input label="Expiry date" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></div><Button onClick={upload} loading={uploading}><Upload className="h-4 w-4" /> Submit certificate</Button></div></Card>}{error && <p className="text-sm text-danger">{error}</p>}</>}</div>
}
