import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import api from '@/services/api'
import { initSocket, getSocket } from '@/services/socket'

export function FloatingChatButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role } = useAuth()
  const { userId } = useAuth()
  const [unread, setUnread] = useState(0)

  const path = role === 'farmer' ? '/farmer/messages' : role === 'consumer' ? '/consumer/messages' : role === 'delivery' ? '/delivery/messages' : '/'

  useEffect(() => {
    let mounted = true
    if (!userId) return

    // fetch messages and compute unread count
    api.get('/messages', { params: { userId } }).then((res) => {
      if (!mounted) return
      const msgs = res.data?.messages || []
      const unreadCount = msgs.filter((m: any) => Number(m.receiver_id) === Number(userId) && m.read === 0).length
      setUnread(unreadCount)
    }).catch(() => {})

    const socket = initSocket(userId)
    socket.on('new_message', (msg: any) => {
      try {
        if (Number(msg.receiver_id) === Number(userId)) setUnread((v) => v + 1)
      } catch (e) {}
    })

    socket.on('message_read', (data: any) => {
      try {
        if (data && data.id) setUnread((v) => Math.max(0, v - 1))
      } catch (e) {}
    })

    return () => {
      mounted = false
      try {
        getSocket()?.off('new_message')
        getSocket()?.off('message_read')
      } catch (e) {}
    }
  }, [userId])

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate(path)}
      className="fixed bottom-20 lg:bottom-6 right-6 z-40 w-14 h-14 rounded-full gradient-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center"
      aria-label={t('common.chat')}
    >
      <MessageCircle className="w-6 h-6" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] px-1 h-5 bg-accent text-dark text-xs font-bold rounded-full flex items-center justify-center">
          {unread}
        </span>
      )}
    </motion.button>
  )
}
