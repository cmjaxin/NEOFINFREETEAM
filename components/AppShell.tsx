'use client'
import { useState, useRef, useEffect } from 'react'
import { AppProvider } from '@/lib/appContext'
import Sidebar from '@/components/Sidebar'
import OnboardingDashboard from '@/components/views/OnboardingDashboard'
import TeamDirectory from '@/components/views/TeamDirectory'
import Terminated from '@/components/views/Terminated'
import Templates from '@/components/views/Templates'
import Production from '@/components/views/Production'
import Wins from '@/components/views/Wins'
import Marketing from '@/components/views/Marketing'
import Reels from '@/components/views/Reels'
import OpenHouse from '@/components/views/OpenHouse'
import EmployeeProfile from '@/components/views/EmployeeProfile'
import AddEmployeeModal from '@/components/modals/AddEmployeeModal'
import SettingsModal from '@/components/modals/SettingsModal'
import { useApp } from '@/lib/appContext'
import { Profile } from '@/lib/types'
import Image from 'next/image'

function Shell() {
  const { view, showAdd, showSettings, profile } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pullY, setPullY] = useState(0)
  const [releasing, setReleasing] = useState(false)
  const touchStartY = useRef(0)
  const pullYRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const THRESHOLD = 110

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0].clientY
      pullYRef.current = 0
    }
    function onTouchMove(e: TouchEvent) {
      // Check the main scroll container's scroll position
      const scrollTop = scrollRef.current?.scrollTop ?? 0
      if (scrollTop > 0) {
        if (pullYRef.current > 0) {
          pullYRef.current = 0
          setPullY(0)
        }
        return
      }
      const dy = e.touches[0].clientY - touchStartY.current
      if (dy > 0) {
        const clamped = Math.min(dy * 0.3, THRESHOLD + 24)
        pullYRef.current = clamped
        setPullY(clamped)
      } else if (pullYRef.current > 0) {
        pullYRef.current = 0
        setPullY(0)
      }
    }
    function onTouchEnd() {
      if (pullYRef.current >= THRESHOLD) {
        setReleasing(true)
        setTimeout(() => window.location.reload(), 300)
      } else {
        setReleasing(false)
        setPullY(0)
        pullYRef.current = 0
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const pullPct = Math.min(pullY / THRESHOLD, 1)
  const ready = pullY >= THRESHOLD

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

        {/* Pull-to-refresh indicator — fixed so it overlays Reels/full-screen views */}
        {pullY > 4 && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            pointerEvents: 'none',
            paddingTop: Math.max(0, pullY - 34) / 2,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#0A2540', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: Math.min(pullPct * 2, 1),
              transform: `scale(${0.4 + pullPct * 0.6}) rotate(${pullPct * 240}deg)`,
              transition: releasing ? 'transform 0.25s, opacity 0.2s' : 'none',
              boxShadow: '0 2px 16px rgba(10,37,64,0.35)',
              marginTop: 10,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </div>
          </div>
        )}
        <div ref={scrollRef} className="main-content" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {view === 'dashboard' && <OnboardingDashboard />}
          {view === 'directory' && <TeamDirectory />}
          {view === 'terminated' && <Terminated />}
          {view === 'templates' && <Templates />}
          {view === 'production' && <Production />}
          {view === 'wins' && <Wins />}
          {view === 'profile' && <EmployeeProfile />}
          {view === 'marketing' && <Marketing />}
          {view === 'reels' && <Reels />}
          {view === 'openhouse' && <OpenHouse />}
        </div>{/* end main-content */}
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
