import { useEffect, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Clock, FileText, Send } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { Card } from '@/components/ui/Card'
import { CertificateBadge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AppContext'
import { useNavigate } from 'react-router-dom'
import api, { endpoints } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function FarmerCertificate() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { userId, userName, certificateStatus } = useAuth()
  const navigate = useNavigate()
  const [certificate, setCertificate] = useState<any>(null)
  const [farmerName, setFarmerName] = useState(userName)
  const [certificateNumber, setCertificateNumber] = useState('')
  const [file, setFile] = useState('')
  const [type, setType] = useState('Organic farming certificate')
  const [expiryDate, setExpiryDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [extractedName, setExtractedName] = useState('')
  const [extractedCertificateNumber, setExtractedCertificateNumber] = useState('')
  const [error, setError] = useState('')

  const extractCertificateFields = (text: string) => {
    const lines = text.split(/\r?\n/).map((line) => line.replace(/[^a-zA-Z0-9 .:/#-]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean)
    const nameLineIndex = lines.findIndex((line) => /(?:farmer|holder|applicant|name)\s*[:#-]/i.test(line))
    const certificationLineIndex = lines.findIndex((line) => /this\s+is\s+to\s+certify\s+that/i.test(line))
    const labelledName = nameLineIndex >= 0
      ? lines[nameLineIndex].replace(/^(?:farmer|holder|applicant|name)\s*[:#-]?\s*/i, '').trim()
      : ''
    const nameAfterCertification = certificationLineIndex >= 0
      ? lines.slice(certificationLineIndex + 1).find((line) => line.length > 2 && !/^(?:d\/o|s\/o|w\/o|address|at|pin)\b/i.test(line)) || ''
      : ''
    const name = labelledName || nameAfterCertification
    const idMatch = text.match(/(?:certificate\s*(?:no|number|id)|cert(?:ificate)?\s*id|registration\s*(?:no|number|id)?)\s*\.?\s*[:#-]\s*([A-Z0-9][A-Z0-9./-]{3,})/i)
    const standaloneIdMatch = text.match(/\b(?:TC|CERT|REG)[-\s]?[A-Z0-9./-]{3,}\b/i)
    const certificateId = (idMatch?.[1] || standaloneIdMatch?.[0] || '').replace(/\s+/g, '').replace(/[.,:;]+$/, '')
    setOcrText(text)
    setExtractedName(name)
    setExtractedCertificateNumber(certificateId)
    setCertificateNumber(certificateId)
    if (name) setFarmerName(name)
    if (!name || !certificateId) setError('OCR could not find both the farmer name and certificate ID. Please upload a clearer image.')
  }

  useEffect(() => {
    if (certificateStatus === 'verified') navigate('/farmer/dashboard', { replace: true })
  }, [certificateStatus, navigate])

  useEffect(() => {
    if (!userId) return
    api.get(endpoints.certificates.list, { params: { farmerId: userId } })
      .then((response) => { const existing = response.data.certificates?.[0] || null; setCertificate(existing); if (existing?.certificate_number) setCertificateNumber(existing.certificate_number) })
      .catch(() => setCertificate(null))
  }, [userId])

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!selected.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (selected.size > 4 * 1024 * 1024) {
      setError('Please choose a file smaller than 4 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result || '')
      setFile(dataUrl)
      setExtracting(true)
      setError('')
      try {
        const worker = await createWorker('eng')
        const result = await worker.recognize(dataUrl)
        await worker.terminate()
        extractCertificateFields(result.data.text)
      } catch {
        setError('Unable to read this certificate. Please upload a clearer image.')
      } finally {
        setExtracting(false)
      }
    }
    reader.readAsDataURL(selected)
    setError('')
  }

  const uploadCertificate = async () => {
    if (!userId || !farmerName.trim() || !certificateNumber.trim() || !file || !type.trim() || !extractedName || !extractedCertificateNumber || extracting) {
      setError('Farmer name, certificate number, type, and image are required.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const response = await api.post(endpoints.certificates.upload, {
        farmer_id: Number(userId),
        farmer_name: farmerName,
        certificate_number: certificateNumber,
        type,
        document_url: file,
        expiry_date: expiryDate || null,
        ocr_text: ocrText,
        extracted_name: extractedName,
        extracted_certificate_number: extractedCertificateNumber,
      })
      setCertificate(response.data.certificate)
      setFile('')
      toast(t('toast.certUploaded'), 'success')
    } catch (uploadError: any) {
      setError(uploadError?.response?.data?.message || 'Unable to upload certificate right now.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.certificate')}</h1>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold">{t('farmer.verificationStatus')}</h2>
            <CertificateBadge status={certificate?.status || 'pending'} />
          </div>
          <Clock className="w-12 h-12 text-accent" />
        </div>

        <div
          className="border-2 border-dashed border-primary/40 rounded-[20px] p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
        >
          <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="font-medium">{extracting ? 'Reading certificate with OCR...' : 'Choose your certificate document'}</p>
          <p className="text-sm text-muted mt-1">JPG, PNG, or WEBP up to 4 MB</p>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="mt-4 block w-full text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-background" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Input label="Farmer name *" value={farmerName} onChange={(event) => setFarmerName(event.target.value)} />
          <Input label="Certificate number *" value={certificateNumber} onChange={(event) => setCertificateNumber(event.target.value)} />
          <Input label="Certificate type" value={type} onChange={(event) => setType(event.target.value)} />
          <Input label="Expiry date (optional)" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
        </div>
        {extractedCertificateNumber && <p className="mt-3 text-sm text-primary">OCR extracted certificate ID: {extractedCertificateNumber}</p>}
        {extractedName && <p className="mt-1 text-sm text-primary">OCR extracted farmer name: {extractedName}</p>}
        {error && <p className="text-sm text-danger mt-3">{error}</p>}
        <Button className="mt-4" onClick={uploadCertificate} loading={uploading || extracting} disabled={extracting || !extractedName || !extractedCertificateNumber}><Send className="w-4 h-4" /> Submit for approval</Button>
      </Card>

      <Card>
        <h2 className="font-semibold mb-4">{t('farmer.verificationTimeline')}</h2>
        <p className="text-sm text-muted">Upload a certificate to start the verification timeline.</p>
      </Card>

      <Card>
        <h2 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5" />{t('farmer.certDetails')}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted">Type</p><p className="font-medium">{certificate?.type || '—'}</p></div>
          <div><p className="text-muted">Expiry</p><p className="font-medium">{certificate?.expiry_date || '—'}</p></div>
          <div><p className="text-muted">Review</p><p className="font-medium">{certificate?.rejection_reason || 'Waiting for admin review'}</p></div>
          <div><p className="text-muted">Status</p><CertificateBadge status={certificate?.status || 'pending'} /></div>
        </div>
      </Card>
    </div>
  )
}
