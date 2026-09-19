import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, MessageSquare, Phone } from 'lucide-react'
import { useAuth } from '@/context/AppContext'
import api, { endpoints } from '@/services/api'
import { initSocket, getSocket } from '@/services/socket'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/cn'

export default function FarmerMessages() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const [contacts, setContacts] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [contactFilter, setContactFilter] = useState<'consumer' | 'delivery'>('consumer')

  const activeContact = contacts.find((c) => c.id === activeId)
  const filteredContacts = useMemo(() => contacts.filter((contact) => contact.role === contactFilter), [contacts, contactFilter])

  useEffect(() => {
    if (!filteredContacts.some((contact) => contact.id === activeId)) setActiveId(filteredContacts[0]?.id || null)
  }, [activeId, filteredContacts])

  const fetchContacts = async () => {
    if (!userId) return
    try {
      const response = await api.get(endpoints.chat.contacts, { params: { userId, role: 'farmer' } })
      const next = Array.isArray(response.data.contacts) ? response.data.contacts.map((c: any) => ({ ...c, id: String(c.id) })) : []
      setContacts(next)
      if (!activeId && next[0]) setActiveId(next[0].id)
    } catch (error) {
      console.error('Failed to load farmer chat contacts:', error)
      setContacts([])
    }
  }

  const fetchMessages = async (contactId: string) => {
    if (!userId) return
    try {
      const response = await api.get(endpoints.messages.list, { params: { userId, contactId } })
      setMessages(Array.isArray(response.data.messages) ? response.data.messages : [])
    } catch (error) {
      console.error('Failed to load farmer messages:', error)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    if (!userId || !activeContact || !message.trim()) return
    try {
      await api.post(endpoints.messages.send, {
        sender_id: Number(userId),
        sender_name: localStorage.getItem('farmdirect_user') || 'User',
        receiver_id: Number(activeContact.id),
        receiver_name: activeContact.name,
        content: message.trim(),
      })
      setMessage('')
      fetchMessages(activeContact.id)
    } catch (error) {
      console.error('Failed to send farmer message:', error)
    }
  }

  useEffect(() => {
    if (!userId) return
    fetchContacts()
    const socket = initSocket(userId)

    socket.on('new_message', (msg: any) => {
      if (!activeContact) return
      const related =
        (String(msg.sender_id) === String(userId) && String(msg.receiver_id) === activeContact.id) ||
        (String(msg.receiver_id) === String(userId) && String(msg.sender_id) === activeContact.id)

      if (related) {
        setMessages((prev) => [msg, ...prev])
      }
    })

    return () => {
      getSocket()?.off('new_message')
    }
  }, [userId, activeContact])

  useEffect(() => {
    if (activeId) fetchMessages(activeId)
  }, [activeId])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">{t('nav.messages')}</h1>

      <div className="flex gap-2">
        <Button size="sm" variant={contactFilter === 'consumer' ? 'primary' : 'outline'} onClick={() => setContactFilter('consumer')}>{t('nav.consumers')}</Button>
        <Button size="sm" variant={contactFilter === 'delivery' ? 'primary' : 'outline'} onClick={() => setContactFilter('delivery')}>{t('nav.agents')}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-border font-semibold">{t('common.contacts')}</div>
          <div className="overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">{t('common.noData')}</div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setActiveId(contact.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors text-left border-b border-border',
                    activeId === contact.id ? 'bg-primary/10' : ''
                  )}
                >
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-background font-bold">
                    {contact.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted truncate">{contact.role}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card padding="none" className="lg:col-span-2 flex flex-col overflow-hidden">
          {activeContact ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="font-semibold">{activeContact.name}</p>
                  <p className="text-xs text-muted">{activeContact.role}</p>
                </div>
                <a href={activeContact.phone ? `tel:${activeContact.phone}` : undefined} className={cn('inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-3 py-1.5 text-sm font-medium text-primary', activeContact.phone ? 'hover:bg-primary/10' : 'pointer-events-none opacity-50')} aria-label={`Call ${activeContact.name}`}><Phone className="w-4 h-4" /> {t('common.call')}</a>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
                {messages.length === 0 ? (
                  <p className="text-center text-muted text-sm py-8">No messages yet.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={cn('flex', String(msg.sender_id) === String(userId) ? 'justify-end' : 'justify-start')}>
                      <div className="max-w-[70%] px-4 py-2 rounded-2xl bg-surface-elevated text-sm text-foreground">
                        {msg.content}
                        <p className="text-[10px] opacity-60 mt-1 text-right">{formatDateTime(msg.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-border">
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  {[t('common.navigate'), t('common.accept'), t('common.success')].map((quick) => (
                    <button key={quick} onClick={() => setMessage(quick)} className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary whitespace-nowrap hover:bg-primary/20">
                      {quick}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('common.reply')}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-border bg-surface-elevated text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button size="icon" onClick={sendMessage}><Send className="w-5 h-5" /></Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={MessageSquare} title={t('common.noData')} description={t('common.chat')} />
          )}
        </Card>
      </div>
    </div>
  )
}
