'use client'
import { useApp } from '@/lib/appContext'
import Avatar from '@/components/ui/Avatar'
import { fmtDate } from '@/lib/utils'

export default function Terminated() {
  const { employees, setView, setSelectedId, setProfileFrom, setProfileTab } = useApp()
  const list = employees.filter(e => e.status === 'terminated').sort((a, b) => {
    const da = a.termination_date ?? ''
    const db = b.termination_date ?? ''
    return db.localeCompare(da)
  })

  function openProfile(id: string) {
    setSelectedId(id)
    setProfileFrom('terminated')
    setProfileTab('profile')
    setView('profile')
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 40px 90px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontWeight: 800, letterSpacing: '-.02em', fontSize: 32, margin: 0, color: '#0A2540' }}>Terminated</h1>
        <div style={{ fontSize: 14, color: '#858889', marginTop: 5 }}>{list.length} former {list.length === 1 ? 'employee' : 'employees'}</div>
      </div>

      {list.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: '56px 30px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#0A2540' }}>No terminated employees</div>
          <div style={{ fontSize: 14, color: '#858889', marginTop: 8 }}>Open an employee's profile and choose "Terminate" to move them here.</div>
        </div>
      )}

      {list.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 14, overflow: 'hidden' }}>
          {list.map(emp => (
            <div
              key={emp.id}
              onClick={() => openProfile(emp.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: '1px solid #F2F4F6', cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F6F8FA')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <Avatar name={emp.name} role={emp.onboarding_role} headshotUrl={emp.headshot_url} size={40} radius={10} fontSize={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, color: '#132B44' }}>{emp.name}</div>
                <div style={{ fontSize: 12.5, color: '#9AA0A6', marginTop: 2 }}>{emp.title || '—'}</div>
              </div>
              {emp.team && (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#EEF1F4', color: '#5F6B76', flexShrink: 0 }}>
                  {emp.team}
                </span>
              )}
              <div style={{ fontSize: 12.5, color: '#858889', width: 150, textAlign: 'right', flexShrink: 0 }}>
                Terminated {fmtDate(emp.termination_date, { month: 'short', day: 'numeric', year: 'numeric' }) || '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
