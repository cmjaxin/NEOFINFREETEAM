'use client'
import { useApp } from '@/lib/appContext'
import { roleMeta, statusPillMeta } from '@/lib/utils'

export default function TeamDirectory() {
  const { employees, dirSearch, setDirSearch, setView, setSelectedId, setProfileFrom, setProfileTab, setShowAdd } = useApp()

  const list = employees.filter(e => e.status !== 'terminated')
  const filtered = dirSearch
    ? list.filter(e =>
        e.name.toLowerCase().includes(dirSearch.toLowerCase()) ||
        e.onboarding_role.toLowerCase().includes(dirSearch.toLowerCase()) ||
        e.title.toLowerCase().includes(dirSearch.toLowerCase())
      )
    : list

  function openProfile(id: string) {
    setSelectedId(id)
    setProfileFrom('directory')
    setProfileTab('profile')
    setView('profile')
  }

  const addBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, background: '#0A2540', color: '#fff',
    border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 40px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontWeight: 800, letterSpacing: '-.02em', fontSize: 32, margin: 0, color: '#0A2540' }}>Team Directory</h1>
          <div style={{ fontSize: 14, color: '#858889', marginTop: 5 }}>{list.length} {list.length === 1 ? 'member' : 'members'}</div>
        </div>
        <button onClick={() => setShowAdd(true)} style={addBtnStyle}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>Add employee
        </button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <input
          value={dirSearch} onChange={e => setDirSearch(e.target.value)}
          placeholder="Search name, role or title…"
          style={{ width: 280, maxWidth: '100%', padding: '10px 14px', border: '1px solid #DCE1E6', borderRadius: 9, fontSize: 14, background: '#fff', color: '#26303B' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#5BCBF5' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#DCE1E6' }}
        />
      </div>

      {list.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: '56px 30px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#0A2540' }}>No employees yet</div>
          <div style={{ fontSize: 14, color: '#858889', marginTop: 8 }}>Add an employee to build their profile.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(214px,1fr))', gap: 18 }}>
        {filtered.map(emp => {
          const rm = roleMeta(emp.onboarding_role)
          const sp = statusPillMeta(emp.status)
          const initials = emp.name.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
          return (
            <div
              key={emp.id}
              onClick={() => openProfile(emp.id)}
              style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 28px rgba(10,37,64,.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
            >
              <div style={{
                height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(emp.headshot_url
                  ? { backgroundImage: `url(${emp.headshot_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: rm.bg }),
              }}>
                {!emp.headshot_url && (
                  <span style={{ fontSize: 36, fontWeight: 800, color: rm.fg }}>{initials}</span>
                )}
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#132B44', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                {emp.title && <div style={{ fontSize: 12.5, color: '#858889', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.title}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 9 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: sp.bg, color: sp.fg }}>{sp.label}</span>
                  {emp.team && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#EEF1F4', color: '#5F6B76', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{emp.team}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
