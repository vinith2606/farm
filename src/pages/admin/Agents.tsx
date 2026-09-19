import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search, Truck, Lock, Unlock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge, AvailabilityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import api, { endpoints } from '@/services/api'

export interface DeliveryPartner {
  id: number
  role: 'delivery'
  name: string
  email: string
  phone: string
  avatar?: string
  aadhaarNumber?: string
  aadhaarStatus?: 'verified' | 'pending' | 'rejected'
  drivingLicenseNumber?: string
  drivingLicenseStatus?: 'verified' | 'pending' | 'rejected'
  vehicleType?: string
  vehicleNumber?: string
  availabilityStatus?: 'available' | 'unavailable'
  accountStatus?: 'active' | 'suspended'
  createdAt: string
}

export default function AdminAgents() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<DeliveryPartner[]>([])
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    api.get(endpoints.admin.users).then((response) => setUsers(response.data.users || [])).catch(() => setUsers([]))
  }, [])

  const filtered = useMemo(() => users
    .filter((user) => user.role === 'delivery')
    .filter((user) => [user.name, user.email, user.phone, user.vehicleNumber || ''].some((value) => value.toLowerCase().includes(search.toLowerCase()))), [search, users])

  const updateAccountStatus = async (partner: DeliveryPartner, status: 'active' | 'suspended') => {
    setUpdating(partner.id)
    try {
      const response = await api.put(`/admin/users/${partner.id}/status`, { status })
      setUsers((current) => current.map((item) => item.id === partner.id ? { ...item, accountStatus: response.data.user.accountStatus } : item))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('admin.manageAgents')}</h1>
      <Input icon={<Search className="w-4 h-4" />} placeholder={t('common.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
      {filtered.length === 0 ? (
        <Card><EmptyState icon={Truck} title={t('common.noData')} description={t('admin.manageAgents')} /></Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm text-foreground">
            <thead><tr className="border-b border-border bg-surface-elevated"><th className="p-4 text-left">{t('common.name')}</th><th className="p-4 text-left hidden md:table-cell">{t('common.phone')}</th><th className="p-4 text-left hidden lg:table-cell">{t('common.status')}</th><th className="p-4 text-left hidden sm:table-cell">{t('farmer.availability')}</th><th className="p-4 text-left">{t('common.status')}</th><th className="p-4 text-right">{t('common.actions')}</th></tr></thead>
            <tbody>{filtered.map((user) => (
              <tr key={user.id} onClick={() => navigate(`/admin/agents/${user.id}`)} onKeyDown={(event) => event.key === 'Enter' && navigate(`/admin/agents/${user.id}`)} tabIndex={0} className="cursor-pointer border-b border-border hover:bg-primary/5 focus:bg-primary/10 focus:outline-none">
                <td className="p-4"><p className="font-medium">{user.name}</p><p className="text-xs text-muted">Joined {new Date(user.createdAt).toLocaleDateString()}</p></td>
                <td className="p-4 hidden md:table-cell">{user.phone || 'Not provided'}</td>
                <td className="p-4 hidden lg:table-cell"><Badge variant={user.aadhaarStatus === 'verified' ? 'success' : user.aadhaarStatus === 'rejected' ? 'danger' : 'warning'}>{user.aadhaarStatus || 'pending'}</Badge></td>
                <td className="p-4 hidden sm:table-cell"><AvailabilityBadge available={user.availabilityStatus !== 'unavailable'} /></td>
                <td className="p-4"><Badge variant={user.accountStatus === 'suspended' ? 'danger' : 'success'}>{user.accountStatus === 'suspended' ? 'Suspended' : 'Active'}</Badge></td>
                <td className="p-4 text-right" onClick={(event) => event.stopPropagation()}><Button size="sm" variant={user.accountStatus === 'suspended' ? 'primary' : 'danger'} loading={updating === user.id} onClick={() => updateAccountStatus(user, user.accountStatus === 'suspended' ? 'active' : 'suspended')}>{user.accountStatus === 'suspended' ? <><Unlock className="h-4 w-4" /> Activate</> : <><Lock className="h-4 w-4" /> Suspend</>}</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
