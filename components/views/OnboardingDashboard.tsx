'use client'
import { useApp } from '@/lib/appContext'
import Avatar from '@/components/ui/Avatar'
import Chip from '@/components/ui/Chip'
import ProgressBar from '@/components/ui/ProgressBar'
import { roleMeta, progressMeta, fmtDate, dayInfo } from '@/lib/utils'

export default function OnboardingDashboard() {
  const { employees, search, setSearch, roleFilter, setRoleFilter, setView, setSelectedId, setProfileFrom, setProfileTab, progress, setShowAdd } = useApp()

  const onboarding = employees.filter(e => e.status === 'onboarding')
  const filtered = onboarding.filter(e => {
    const matchRole = roleFilter === 'all' || e.onboarding_role === roleFilter
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const stats = {
    active: onboarding.length,
    avg: onboarding.length
      ? Math.round(onboarding.reduce((sum, e) => sum + progress(e).pct, 0) / onboarding.length * 100) + '%'
      : '—',
    attention: onboarding.filter(e => {
      const di = dayInfo(e.start_date)
      const { done, total } = progress(e)
      return di.diff >= 0 && done < total
    }).length,
  }

  function openProfile(id: string) {
    setSelectedId(id)
    setProfileFrom('dashboard')
    setProfileTab('onboarding')
    setView('profile')
  }

  const addBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, background: '#0A2540', color: '#fff',
    border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }

  const filterPillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 999, border: `1px solid ${active ? '#0A2540' : '#DCE1E6'}`,
    background: active ? '#0A2540' : '#fff', color: active ? '#fff' : '#5C6570',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 40px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
        <div>
          <h1 style={{ fontWeight: 800, letterSpacing: '-.02em', fontSize: 32, margin: 0, color: '#0A2540' }}>Team Onboarding</h1>
          <div style={{ fontSize: 14, color: '#858889', marginTop: 5 }}>
            {onboarding.length === 0 ? 'No one in onboarding' : `${onboarding.length} ${onboarding.length === 1 ? 'person' : 'people'} in onboarding`}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} style={addBtnStyle}>
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>Add new hire
        </button>
      </div>

      {onboarding.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: '60px 30px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#0A2540' }}>No one in onboarding</div>
          <div style={{ fontSize: 14, color: '#858889', marginTop: 8, marginBottom: 20 }}>Add a new hire to start their onboarding checklist.</div>
          <button onClick={() => setShowAdd(true)} style={addBtnStyle}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span>Add new hire</button>
        </div>
      )}

      {onboarding.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'In onboarding', value: stats.active, color: '#0A2540' },
              { label: 'Avg completion', value: stats.avg, color: '#0A2540' },
              { label: 'Needs attention', value: stats.attention, color: '#C0632B' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: '#fff', border: '1px solid #E4E8EC', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#858889' }}>{s.label}</div>
                <div style={{ fontWeight: 800, fontSize: 32, color: s.color, marginTop: 6, lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['all', 'MA', 'LSCA', 'PP'] as const).map(r => (
                <button key={r} onClick={() => setRoleFilter(r)} style={filterPillStyle(roleFilter === r)}>
                  {r === 'all' ? 'All roles' : r === 'LSCA' ? 'LS/CA' : r}
                </button>
              ))}
            </div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name…"
              style={{ width: 220, padding: '9px 13px', border: '1px solid #DCE1E6', borderRadius: 9, fontSize: 14, background: '#fff', color: '#26303B' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#5BCBF5' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#DCE1E6' }}
            />
          </div>

          {filtered.length === 0 && (
            <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 14, padding: 44, textAlign: 'center', fontSize: 14, color: '#858889' }}>
              No one matches your filters.
            </div>
          )}

          {filtered.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 90px 155px 1.5fr 135px', gap: 16, padding: '12px 22px', borderBottom: '1px solid #EEF1F4', fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#9AA0A6' }}>
                <div>Team member</div><div>Role</div><div>Start</div><div>Progress</div><div>Status</div>
              </div>
              {filtered.map(emp => {
                const rm = roleMeta(emp.onboarding_role)
                const { done, total, pct } = progress(emp)
                const di = dayInfo(emp.start_date)
                const sm = progressMeta(done, total)
                const attention = di.diff >= 0 && done < total
                return (
                  <div
                    key={emp.id}
                    onClick={() => openProfile(emp.id)}
                    style={{ display: 'grid', gridTemplateColumns: '2.2fr 90px 155px 1.5fr 135px', gap: 16, alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid #F2F4F6', cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F6F8FA')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                      <Avatar name={emp.name} role={emp.onboarding_role} headshotUrl={emp.headshot_url} size={40} radius={10} fontSize={14} />
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: '#132B44', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                    </div>
                    <div><Chip label={rm.label} bg={rm.bg} fg={rm.fg} /></div>
                    <div>
                      <div style={{ fontSize: 13.5, color: '#45505B' }}>{fmtDate(emp.start_date, { month: 'short', day: 'numeric', year: 'numeric' }) || 'No date'}</div>
                      <div style={{ fontSize: 12, color: '#9AA0A6', marginTop: 1 }}>{di.label}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ProgressBar pct={pct} />
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5F6B76', width: 36, textAlign: 'right' }}>{Math.round(pct * 100)}%</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Chip label={sm.label} bg={sm.bg} fg={sm.fg} size="md" />
                      {attention && <span title="Started but not finished" style={{ width: 8, height: 8, borderRadius: '50%', background: '#E0A33A', flexShrink: 0 }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
