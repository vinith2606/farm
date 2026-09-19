import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search, Ban, CheckCircle, Users, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import api, { endpoints } from '@/services/api'

interface AdminUser {
  id: number
  role: 'farmer' | 'consumer' | 'delivery' | 'admin'
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  farmName?: string
  description?: string
  avatar?: string
  createdAt: string
  certificateId?: number
  certificateType?: string
  certificateDocumentUrl?: string
  certificateDownloadUrl?: string
  certificateReviewStatus?: 'verified' | 'pending' | 'rejected' | 'expired'
  certificateRejectionReason?: string
}

export default function AdminFarmers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [reviewing, setReviewing] = useState<number | null>(null)

  useEffect(() => {
    api.get(endpoints.admin.users).then((response) => setUsers(response.data.users || [])).catch(() => setUsers([]))
  }, [])

  const filtered = useMemo(() => {
    return users
      .filter((user) => user.role === 'farmer')
      .filter(
        (user) =>
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase())
      )
  }, [search, users])

  const reviewCertificate = async (user: AdminUser, status: 'verified' | 'rejected') => {
    if (!user.certificateId) return
    setReviewing(user.certificateId)
    try {
      const response = await api.put(endpoints.certificates.review(String(user.certificateId)), { status })
      setUsers((current) => current.map((item) => item.id === user.id ? {
        ...item,
        certificateReviewStatus: response.data.certificate.status,
      } : item))
    } finally {
      setReviewing(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('admin.manageFarmers')}</h1>
      <Input icon={<Search className="w-4 h-4" />} placeholder={t('common.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Users} title={t('common.noData')} description={t('admin.manageFarmers')} /></Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm text-foreground">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                <th className="text-left p-4 font-semibold">{t('common.name')}</th>
                <th className="text-left p-4 font-semibold hidden md:table-cell">{t('common.email')}</th>
                <th className="text-left p-4 font-semibold hidden lg:table-cell">{t('common.phone')}</th>
                <th className="text-left p-4 font-semibold hidden sm:table-cell">{t('common.status')}</th>
                <th className="text-left p-4 font-semibold">{t('nav.certificate')}</th>
                <th className="text-right p-4 font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} onClick={() => navigate(`/admin/farmers/${user.id}`)} onKeyDown={(event) => event.key === 'Enter' && navigate(`/admin/farmers/${user.id}`)} tabIndex={0} className="cursor-pointer border-b border-border hover:bg-primary/5 focus:bg-primary/10 focus:outline-none">
                  <td className="p-4">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">{user.email}</td>
                  <td className="p-4 hidden lg:table-cell">{user.phone || '—'}</td>
                  <td className="p-4 hidden sm:table-cell"><Badge variant="success">{user.role}</Badge></td>
                  <td className="p-4">
                    {user.certificateId ? (
                      <div className="flex items-center gap-2">
                        <Badge variant={user.certificateReviewStatus === 'verified' ? 'success' : user.certificateReviewStatus === 'rejected' ? 'danger' : 'warning'}>
                          {user.certificateReviewStatus || 'pending'}
                        </Badge>
                          {user.certificateDownloadUrl && <a href={user.certificateDownloadUrl} title="Download certificate" className="text-primary"><ExternalLink className="w-4 h-4" /></a>}
                      </div>
                    ) : <span className="text-muted">Not uploaded</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); navigate(`/admin/farmers/${user.id}`) }} title="View farmer details"><span className="text-xs">View</span></Button>
                      {user.certificateReviewStatus !== 'verified' && <><Button size="icon" variant="ghost" disabled={!user.certificateId || reviewing === user.certificateId} onClick={(event) => { event.stopPropagation(); reviewCertificate(user, 'verified') }} title="Approve certificate"><CheckCircle className="w-4 h-4 text-primary" /></Button><Button size="icon" variant="ghost" disabled={!user.certificateId || reviewing === user.certificateId} onClick={(event) => { event.stopPropagation(); reviewCertificate(user, 'rejected') }} title="Reject certificate"><Ban className="w-4 h-4 text-danger" /></Button></>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
