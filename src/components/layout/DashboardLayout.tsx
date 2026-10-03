import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar, BottomNav } from './Sidebar'
import { Navbar } from './Navbar'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { FloatingChatButton } from '@/components/common/FloatingChatButton'
import { useAuth } from '@/context/AppContext'

interface DashboardLayoutProps {
  showSearch?: boolean
  showChat?: boolean
}

export function DashboardLayout({ showSearch = true, showChat = true }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { role, isAuthenticated } = useAuth()
  useTranslation()

  const routeRole = location.pathname.split('/')[1]
  const roleHome = {
    farmer: '/farmer/dashboard',
    consumer: '/consumer/home',
    delivery: '/delivery/dashboard',
    admin: '/admin/dashboard',
  } as const

  if (!isAuthenticated) return <Navigate to="/" replace />
  if (role !== routeRole) return <Navigate to={role ? roleHome[role] : '/'} replace />

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} showSearch={showSearch} />

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden">
          <Breadcrumb />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <BottomNav />
      {showChat && <FloatingChatButton />}
    </div>
  )
}
