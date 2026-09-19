import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import api from '@/services/api'

type Complaint = { id: number; role: string; name: string; phone: string; subject: string; description: string; status: string; created_at: string }

export default function AdminComplaints() {
  const { t } = useTranslation()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get('/admin/complaints').then(({ data }) => setComplaints(data.complaints || [])).catch(() => setComplaints([])).finally(() => setLoading(false)) }, [])
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.complaints')}</h1><p className="mt-1 text-sm text-muted">{t('common.help')}</p></div>{loading ? <Card><p className="py-8 text-center text-muted">{t('common.loading')}</p></Card> : complaints.length === 0 ? <Card><EmptyState icon={ClipboardList} title={t('common.noData')} description={t('common.help')} /></Card> : <div className="space-y-4">{complaints.map((complaint) => <Card key={complaint.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /><h2 className="font-semibold">{complaint.subject}</h2></div><p className="mt-2 text-sm text-muted">{complaint.name} · {complaint.phone}</p></div><div className="flex gap-2"><Badge variant="default">{complaint.role}</Badge><Badge variant={complaint.status === 'open' ? 'warning' : 'success'}>{complaint.status}</Badge></div></div><p className="mt-4 text-sm leading-6">{complaint.description}</p><p className="mt-4 text-xs text-muted">{t('common.date')}: {new Date(complaint.created_at).toLocaleString()}</p></Card>)}</div>}</div>
}
