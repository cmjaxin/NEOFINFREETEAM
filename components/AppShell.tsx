'use client'
import { useState } from 'react'
import { AppProvider } from '@/lib/appContext'
import Sidebar from '@/components/Sidebar'
import OnboardingDashboard from '@/components/views/OnboardingDashboard'
import TeamDirectory from '@/components/views/TeamDirectory'
import Terminated from '@/components/views/Terminated'
import Templates from '@/components/views/Templates'
import EmployeeProfile from '@/components/views/EmployeeProfile'
import AddEmployeeModal from '@/components/modals/AddEmployeeModal'
import SettingsModal from '@/components/modals/SettingsModal'
import { useApp } from '@/lib/appContext'
import { Profile } from '@/lib/types'
import Image from 'next/image'

function Shell() {
  const { view, showAdd, showSettings } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="mobile-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main style={{ flex: 1, overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top header */}
        <div className="mobile-header">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#fff', display: 'flex', alignItems: 'center' }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Image src="/neo-logo.png" alt="NEO Home Loans" width={110} height={36} style={{ height: 32, width: 'auto' }} priority />
        </div>

        <div className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
          {view === 'dashboard' && <OnboardingDashboard />}
          {view === 'directory' && <TeamDirectory />}
          {view === 'terminated' && <Terminated />}
          {view === 'templates' && <Templates />}
          {view === 'profile' && <EmployeeProfile />}
        </div>
      </main>

      {showAdd && <AddEmployeeModal />}
      {showSettings && <SettingsModal />}
    </div>
  )
}

export default function AppShell({ profile }: { profile: Profile }) {
  return (
    <AppProvider profile={profile}>
      <Shell />
    </AppProvider>
  )
}
