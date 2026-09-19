import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Lock, Unlock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Modal'
import api, { endpoints } from '@/services/api'

interface Consumer {
  id: number
  role: 'consumer'
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  avatar?: string
  accountStatus?: 'active' | 'suspended'
  createdAt: string
}

export default function AdminConsumers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<Consumer[]>([])
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    api.get(endpoints.admin.users).then((response) => setUsers(response.data.users || [])).catch(() => setUsers([]))
  }, [])

  const filtered = useMemo(() => {
    return users
      .filter((user) => user.role === 'consumer')
      .filter(
        (user) =>
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          user.phone.toLowerCase().includes(search.toLowerCase())
      )
  }, [search, users])

  const updateAccountStatus = async (consumer: Consumer, status: 'active' | 'suspended') => {
    setUpdating(consumer.id)
    try {
      const response = await api.put(`/api/admin/users/${consumer.id}/status`, { status })
      setUsers((current) => current.map((item) => item.id === consumer.id ? {
        ...item,
        accountStatus: response.data.user.accountStatus,
      } : item))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('admin.manageConsumers')}</h1>
      <Input icon={<Search className="w-4 h-4" />} placeholder={t('common.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Users} title={t('common.noData')} description={t('admin.manageConsumers')} /></Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm text-foreground">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                <th className="text-left p-4 font-semibold">{t('common.name')}</th>
                <th className="text-left p-4 font-semibold hidden md:table-cell">{t('common.email')}</th>
                <th className="text-left p-4 font-semibold hidden lg:table-cell">{t('common.phone')}</th>
                <th className="text-left p-4 font-semibold">{t('common.status')}</th>
                <th className="text-right p-4 font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} onClick={() => navigate(`/admin/consumers/${user.id}`)} onKeyDown={(event) => event.key === 'Enter' && navigate(`/admin/consumers/${user.id}`)} tabIndex={0} className="cursor-pointer border-b border-border hover:bg-primary/5 focus:bg-primary/10 focus:outline-none">
                  <td className="p-4">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">{user.email}</td>
                  <td className="p-4 hidden lg:table-cell">{user.phone || '—'}</td>
                  <td className="p-4">
                    <Badge variant={user.accountStatus === 'active' ? 'success' : 'danger'}>
                      {user.accountStatus === 'active' ? t('common.available') : t('common.suspend')}
                    </Badge>
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant={user.accountStatus === 'active' ? 'danger' : 'primary'}
                        loading={updating === user.id}
                        onClick={() => updateAccountStatus(user, user.accountStatus === 'active' ? 'suspended' : 'active')}
                      >
                        {user.accountStatus === 'active' ? (
                          <>
                            <Lock className="w-4 h-4" />
                            {t('common.suspend')}
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            {t('common.accept')}
                          </>
                        )}
                      </Button>
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
