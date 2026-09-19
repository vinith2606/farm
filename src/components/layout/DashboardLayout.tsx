import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar, BottomNav } from './Sidebar'
import { Navbar } from './Navbar'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { FloatingChatButton } from '@/components/common/FloatingChatButton'

interface DashboardLayoutProps {
  showSearch?: boolean
  showChat?: boolean
}

export function DashboardLayout({ showSearch = true, showChat = true }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useTranslation()

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
