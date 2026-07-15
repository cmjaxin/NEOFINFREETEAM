'use client'
import Image from 'next/image'
import { useApp } from '@/lib/appContext'
import { initials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile, view, setView, setShowSettings, pendingProfiles } = useApp()
  const router = useRouter()

  async function signOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  function navStyle(active: boolean): React.CSSProperties {
    return {
      display: 'flex', alignItems: 'center', gap: 11, width: '100%',
      padding: '10px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
      fontSize: 14, fontWeight: 600, textAlign: 'left',
      background: active ? 'rgba(91,203,245,0.16)' : 'transparent',
      color: active ? '#FFFFFF' : '#9FB0C4',
      transition: 'background 0.12s, color 0.12s',
    }
  }

  const inits = initials(profile?.full_name ?? '')

  function handleNav(id: 'dashboard' | 'directory' | 'terminated' | 'templates' | 'production' | 'wins') {
    setView(id)
    onClose()
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`} style={{ width: 250, flexShrink: 0, background: '#0A2540', height: '100vh', display: 'flex', flexDirection: 'column', padding: '22px 20px' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src="/neo-logo.png" alt="NEO Home Loans" width={150} height={50} style={{ width: '100%', maxWidth: 150, height: 'auto' }} priority />
      </div>
      <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6E8199', margin: '12px 0 22px', textAlign: 'center', fontWeight: 600 }}>
        FinFree Division · Team HQ
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {([
          { id: 'dashboard', label: 'Onboarding' },
          { id: 'directory', label: 'Team Directory' },
          { id: 'production', label: 'Production' },
          { id: 'wins', label: 'Monthly Wins' },
          { id: 'terminated', label: 'Terminated' },
          { id: 'templates', label: 'Templates' },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => handleNav(id)} style={navStyle(view === id)}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'currentColor', opacity: .75, flexShrink: 0 }} />
            {label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(91,203,245,0.2)', color: '#5BCBF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {inits}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
            <div style={{ fontSize: 11, color: '#7E8CA0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => setShowSettings(true)} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: 8, color: '#DCE7F2', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Settings
            {pendingProfiles.length > 0 && (
              <span style={{ marginLeft: 6, background: '#5BCBF5', color: '#0A2540', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '1px 6px' }}>
                {pendingProfiles.length}
              </span>
            )}
          </button>
          <button onClick={signOut} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: 8, color: '#DCE7F2', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
