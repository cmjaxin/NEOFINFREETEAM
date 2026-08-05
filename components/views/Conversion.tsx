'use client'

import { useState, useEffect, useCallback } from 'react'

interface ConversionRow {
  user_id: string
  name: string
  leads: number
  apps: number
  funded: number
}

function pct(num: number, denom: number) {
  if (!denom) return '—'
  return (num / denom * 100).toFixed(1) + '%'
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface EditState { user_id: string; apps: string; funded: string }

export default function Conversion({ isAdmin = false }: { isAdmin?: boolean }) {
  const [month, setMonth]     = useState(thisMonth)
  const [rows, setRows]       = useState<ConversionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async (m: string) => {
    setLoading(true)
    const res  = await fetch(`/api/conversion?month=${m}`)
    const data = await res.json()
    setRows(data.rows ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load(month) }, [load, month])

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    await fetch('/api/conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: editing.user_id,
        month,
        apps:   parseInt(editing.apps)   || 0,
        funded: parseInt(editing.funded) || 0,
      }),
    })
    setSaving(false)
    setEditing(null)
    load(month)
  }

  const totals = rows.reduce(
    (acc, r) => ({ leads: acc.leads + r.leads, apps: acc.apps + r.apps, funded: acc.funded + r.funded }),
    { leads: 0, apps: 0, funded: 0 },
  )

  const card = (label: string, value: string, accent = false) => (
    <div key={label} style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? '#2DAEFF' : '#fff' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>{label}</div>
    </div>
  )

  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #2d3e4f', whiteSpace: 'nowrap' }
  const tdStyle: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid #1a2633', color: '#cbd5e1', fontSize: 13 }
  const pctStyle: React.CSSProperties = { ...tdStyle, color: '#2DAEFF', fontWeight: 700 }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Conversion</h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Leads · Apps · Funded</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} style={btnStyle}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', minWidth: 130, textAlign: 'center' }}>{monthLabel(month)}</span>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} disabled={month >= thisMonth()} style={btnStyle}>›</button>
          <button onClick={() => load(month)} style={{ ...btnStyle, marginLeft: 4 }}>↺</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {card('Total Leads',   loading ? '—' : totals.leads.toLocaleString())}
        {card('Total Apps',    loading ? '—' : totals.apps.toLocaleString())}
        {card('Total Funded',  loading ? '—' : totals.funded.toLocaleString())}
        {card('Lead → App',    loading ? '—' : pct(totals.apps,   totals.leads), true)}
        {card('Lead → Funded', loading ? '—' : pct(totals.funded, totals.leads), true)}
        {card('App → Funded',  loading ? '—' : pct(totals.funded, totals.apps),  true)}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #2d3e4f', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1a2633' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Leads</th>
              <th style={thStyle}>Apps</th>
              <th style={thStyle}>Funded</th>
              <th style={thStyle}>L→A</th>
              <th style={thStyle}>L→F</th>
              <th style={thStyle}>A→F</th>
              {isAdmin && <th style={thStyle} />}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isAdmin ? 8 : 7 }).map((_, j) => (
                      <td key={j} style={tdStyle}>
                        <div style={{ height: 12, background: '#2d3e4f', borderRadius: 4, opacity: .5 }} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map(row => {
                  const isEditing = editing?.user_id === row.user_id
                  return (
                    <tr key={row.user_id} style={{ background: isEditing ? 'rgba(45,174,255,0.04)' : 'transparent' }}>
                      <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>{row.name}</td>
                      <td style={tdStyle}>{row.leads || '—'}</td>
                      {isEditing ? (
                        <>
                          <td style={tdStyle}><input type="number" min={0} value={editing!.apps} onChange={e => setEditing(s => s && ({ ...s, apps: e.target.value }))} style={inputStyle} /></td>
                          <td style={tdStyle}><input type="number" min={0} value={editing!.funded} onChange={e => setEditing(s => s && ({ ...s, funded: e.target.value }))} style={inputStyle} /></td>
                        </>
                      ) : (
                        <>
                          <td style={tdStyle}>{row.apps || '—'}</td>
                          <td style={tdStyle}>{row.funded || '—'}</td>
                        </>
                      )}
                      <td style={pctStyle}>{pct(row.apps,   row.leads)}</td>
                      <td style={pctStyle}>{pct(row.funded, row.leads)}</td>
                      <td style={pctStyle}>{pct(row.funded, row.apps)}</td>
                      {isAdmin && (
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <>
                              <button onClick={saveEdit} disabled={saving} style={saveBtnStyle}>{saving ? '…' : 'Save'}</button>
                              <button onClick={() => setEditing(null)} style={cancelBtnStyle}>✕</button>
                            </>
                          ) : (
                            <button onClick={() => setEditing({ user_id: row.user_id, apps: String(row.apps), funded: String(row.funded) })} style={editBtnStyle}>Edit</button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
            }
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#1a2633', borderTop: '2px solid #2d3e4f' }}>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 700 }}>Total</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>{totals.leads || '—'}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>{totals.apps || '—'}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>{totals.funded || '—'}</td>
                <td style={{ ...pctStyle, fontWeight: 700 }}>{pct(totals.apps,   totals.leads)}</td>
                <td style={{ ...pctStyle, fontWeight: 700 }}>{pct(totals.funded, totals.leads)}</td>
                <td style={{ ...pctStyle, fontWeight: 700 }}>{pct(totals.funded, totals.apps)}</td>
                {isAdmin && <td style={tdStyle} />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isAdmin && (
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
          Leads are pushed automatically via webhook. Click <strong style={{ color: '#94a3b8' }}>Edit</strong> on any row to enter apps and funded numbers.
        </p>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = { background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 7, color: '#cbd5e1', fontSize: 14, padding: '5px 10px', cursor: 'pointer' }
const inputStyle: React.CSSProperties = { width: 65, padding: '3px 7px', border: '1px solid #2DAEFF', borderRadius: 6, background: '#000a15', color: '#fff', fontSize: 13 }
const editBtnStyle: React.CSSProperties = { background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 6, color: '#94a3b8', fontSize: 11, fontWeight: 600, padding: '3px 10px', cursor: 'pointer' }
const saveBtnStyle: React.CSSProperties = { background: '#2DAEFF', border: 'none', borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 700, padding: '3px 10px', cursor: 'pointer', marginRight: 4 }
const cancelBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '3px 6px' }
