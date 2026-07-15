'use client'
import { useState, useMemo } from 'react'
import { useApp } from '@/lib/appContext'
import { Employee, Win } from '@/lib/types'

const C = {
  bg: '#F4F6F8', white: '#fff', navy: '#0A2540', border: '#E4E8EC',
  borderSoft: '#DCE1E6', text: '#26303B', muted: '#858889', dim: '#5C6570',
  accent: '#5BCBF5', green: '#16a34a', greenBg: 'rgba(34,197,94,0.08)',
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function avatarColor(name: string): string {
  const palette = ['#5BCBF5','#f472b6','#f59e0b','#34d399','#a78bfa','#fb923c','#06b6d4','#6366f1']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return palette[hash % palette.length]
}

interface MonthGroup {
  year: number
  month: number
  key: string
  label: string
  entries: Array<{ win: Win; employee: Employee | null }>
}

export default function Wins() {
  const { wins: winMap, employees } = useApp()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const allWins = useMemo(() => {
    const flat: Array<{ win: Win; employee: Employee | null }> = []
    for (const [empId, winList] of Object.entries(winMap)) {
      const emp = employees.find(e => e.id === empId) ?? null
      for (const w of winList) flat.push({ win: w, employee: emp })
    }
    return flat.sort((a, b) => new Date(b.win.created_at).getTime() - new Date(a.win.created_at).getTime())
  }, [winMap, employees])

  const monthGroups = useMemo(() => {
    const map = new Map<string, MonthGroup>()
    for (const entry of allWins) {
      const d = new Date(entry.win.created_at)
      const year = d.getFullYear()
      const month = d.getMonth()
      const key = `${year}-${String(month).padStart(2, '0')}`
      if (!map.has(key)) {
        map.set(key, { year, month, key, label: `${MONTH_NAMES[month]} ${year}`, entries: [] })
      }
      map.get(key)!.entries.push(entry)
    }
    return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month)
  }, [allWins])

  const activeGroup = selectedKey
    ? monthGroups.find(g => g.key === selectedKey)
    : monthGroups[0]

  const totalWins = allWins.length

  if (monthGroups.length === 0) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <div style={{ fontWeight: 800, fontSize: 24, color: C.navy, marginBottom: 8 }}>No wins logged yet</div>
        <div style={{ fontSize: 15, color: C.muted }}>
          Head to a team member&#39;s profile and log their first win to see it here!
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh', background: C.bg }}>

      {/* Sidebar: month list */}
      <aside style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.white, display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 16px', fontWeight: 700, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted }}>
          By Month
        </div>
        {monthGroups.map(g => {
          const isActive = (activeGroup?.key ?? monthGroups[0]?.key) === g.key
          return (
            <button key={g.key} onClick={() => setSelectedKey(g.key)} style={{
              width: '100%', textAlign: 'left', padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: isActive ? 'rgba(91,203,245,0.1)' : 'transparent',
              borderLeft: `3px solid ${isActive ? C.accent : 'transparent'}`,
              transition: 'all 0.12s',
            }}>
              <div style={{ fontWeight: isActive ? 700 : 500, fontSize: 14, color: isActive ? C.navy : C.dim }}>{g.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{g.entries.length} {g.entries.length === 1 ? 'win' : 'wins'}</div>
            </button>
          )
        })}
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted }}>
          {totalWins} total wins logged
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        {activeGroup && (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                Monthly Wins
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: C.navy, margin: 0, letterSpacing: '-.02em' }}>
                {activeGroup.label}
              </h1>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 6 }}>
                {activeGroup.entries.length} {activeGroup.entries.length === 1 ? 'win' : 'wins'} logged this month
              </div>
            </div>

            <WinsByEmployee entries={activeGroup.entries} />
          </>
        )}
      </main>
    </div>
  )
}

function WinsByEmployee({ entries }: { entries: Array<{ win: Win; employee: Employee | null }> }) {
  const byEmp = useMemo(() => {
    const map = new Map<string, { employee: Employee | null; wins: Win[]; name: string }>()
    for (const { win, employee } of entries) {
      const key = employee?.id ?? win.employee_id
      const name = employee?.name ?? 'Unknown'
      if (!map.has(key)) map.set(key, { employee, wins: [], name })
      map.get(key)!.wins.push(win)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [entries])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {byEmp.map(({ employee, wins, name }) => (
        <EmployeeWinCard key={employee?.id ?? name} employee={employee} wins={wins} name={name} />
      ))}
    </div>
  )
}

function EmployeeWinCard({ employee, wins, name }: { employee: Employee | null; wins: Win[]; name: string }) {
  const color = avatarColor(name)
  const inits = initials(name)

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${C.border}`, background: '#FAFBFC' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, flexShrink: 0,
        }}>
          {inits}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{name}</div>
          {employee && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
              {[employee.title || employee.onboarding_role, employee.team].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div style={{
          background: 'rgba(91,203,245,0.12)', color: C.navy, borderRadius: 20,
          padding: '4px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {wins.length} {wins.length === 1 ? 'win' : 'wins'}
        </div>
      </div>

      <div style={{ padding: '4px 0' }}>
        {wins.map((w, i) => (
          <div key={w.id} style={{
            padding: '14px 20px',
            borderBottom: i < wins.length - 1 ? `1px solid ${C.bg}` : 'none',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🏆</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.6 }}>{w.body}</p>
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
                Logged by {w.author_name} · {fmtDate(w.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
