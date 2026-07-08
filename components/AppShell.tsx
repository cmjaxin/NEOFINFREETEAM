'use client'
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

function Shell() {
  const { view, showAdd, showSettings } = useApp()
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', height: '100vh' }}>
        {view === 'dashboard' && <OnboardingDashboard />}
        {view === 'directory' && <TeamDirectory />}
        {view === 'terminated' && <Terminated />}
        {view === 'templates' && <Templates />}
        {view === 'profile' && <EmployeeProfile />}
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
