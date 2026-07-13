'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────────────────────────
interface FundedRecord {
  id: string
  loName: string
  branch: string
  clientName: string
  fundedDate: string   // YYYY-MM-DD
  loanAmount: number
  loanType?: string
}

interface WeeklyAppRecord {
  id: string
  weekLabel: string   // e.g. "Jul 4–10"
  weekStart: string   // YYYY-MM-DD
  totalFamilies: number
  totalVolume: number
  sgFamilies: number
  blFamilies: number
  totalApps: number
  sgApps: number
  blApps: number
}

// ── Placeholder data ───────────────────────────────────────────────────────
const PLACEHOLDER_FUNDED: FundedRecord[] = [
  { id: '1', loName: 'Josh Mettle', branch: 'Mettle', clientName: 'Sample Client A', fundedDate: '2026-01-15', loanAmount: 485000 },
  { id: '2', loName: 'Josh Mettle', branch: 'Mettle', clientName: 'Sample Client B', fundedDate: '2026-02-03', loanAmount: 620000 },
  { id: '3', loName: 'Katrinka Condie', branch: 'Condie', clientName: 'Sample Client C', fundedDate: '2026-01-28', loanAmount: 530000 },
  { id: '4', loName: 'Jason Drobeck', branch: 'Drobeck', clientName: 'Sample Client D', fundedDate: '2026-03-11', loanAmount: 710000 },
  { id: '5', loName: 'Aaron Thomas', branch: 'Thomas', clientName: 'Sample Client E', fundedDate: '2026-02-19', loanAmount: 395000 },
  { id: '6', loName: 'Greg Allen', branch: 'Allen', clientName: 'Sample Client F', fundedDate: '2026-03-05', loanAmount: 450000 },
  { id: '7', loName: 'Josh Mettle', branch: 'Mettle', clientName: 'Sample Client G', fundedDate: '2026-04-08', loanAmount: 890000 },
  { id: '8', loName: 'Katrinka Condie', branch: 'Condie', clientName: 'Sample Client H', fundedDate: '2026-04-22', loanAmount: 560000 },
  { id: '9', loName: 'Jason Drobeck', branch: 'Drobeck', clientName: 'Sample Client I', fundedDate: '2026-05-14', loanAmount: 675000 },
  { id: '10', loName: 'Josh Mettle', branch: 'Mettle', clientName: 'Sample Client J', fundedDate: '2026-06-03', loanAmount: 1050000 },
  { id: '11', loName: 'Aaron Thomas', branch: 'Thomas', clientName: 'Sample Client K', fundedDate: '2026-05-29', loanAmount: 420000 },
  { id: '12', loName: 'Greg Allen', branch: 'Allen', clientName: 'Sample Client L', fundedDate: '2026-06-17', loanAmount: 380000 },
]

const PLACEHOLDER_WEEKLY_APPS: WeeklyAppRecord[] = [
  { id: 'w1', weekLabel: 'May 9–15', weekStart: '2026-05-09', totalFamilies: 31, totalVolume: 17932399, sgFamilies: 21, blFamilies: 10, totalApps: 132, sgApps: 50, blApps: 82 },
  { id: 'w2', weekLabel: 'May 16–22', weekStart: '2026-05-16', totalFamilies: 24, totalVolume: 11021334, sgFamilies: 16, blFamilies: 8, totalApps: 121, sgApps: 43, blApps: 78 },
  { id: 'w3', weekLabel: 'May 23–29', weekStart: '2026-05-23', totalFamilies: 28, totalVolume: 14261312, sgFamilies: 20, blFamilies: 8, totalApps: 87, sgApps: 39, blApps: 48 },
  { id: 'w4', weekLabel: 'May 30–Jun 5', weekStart: '2026-05-30', totalFamilies: 32, totalVolume: 19037937, sgFamilies: 27, blFamilies: 5, totalApps: 78, sgApps: 42, blApps: 36 },
  { id: 'w5', weekLabel: 'Jun 6–12', weekStart: '2026-06-06', totalFamilies: 26, totalVolume: 16585994, sgFamilies: 20, blFamilies: 6, totalApps: 81, sgApps: 38, blApps: 43 },
  { id: 'w6', weekLabel: 'Jun 13–19', weekStart: '2026-06-13', totalFamilies: 19, totalVolume: 13505427, sgFamilies: 18, blFamilies: 1, totalApps: 81, sgApps: 39, blApps: 42 },
  { id: 'w7', weekLabel: 'Jun 20–26', weekStart: '2026-06-20', totalFamilies: 14, totalVolume: 4874589, sgFamilies: 9, blFamilies: 5, totalApps: 68, sgApps: 33, blApps: 35 },
  { id: 'w8', weekLabel: 'Jun 27–Jul 3', weekStart: '2026-06-27', totalFamilies: 27, totalVolume: 12290220, sgFamilies: 20, blFamilies: 7, totalApps: 81, sgApps: 42, blApps: 39 },
  { id: 'w9', weekLabel: 'Jul 4–10', weekStart: '2026-07-04', totalFamilies: 15, totalVolume: 8342088, sgFamilies: 14, blFamilies: 1, totalApps: 60, sgApps: 45, blApps: 15 },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + n
}

function pctChange(cur: number, prev: number) {
  if (!prev) return null
  return ((cur - prev) / prev) * 100
}

function DeltaBadge({ cur, prev }: { cur: number; prev: number }) {
  const p = pctChange(cur, prev)
  if (p === null) return null
  const up = p > 0.5, down = p < -0.5
  const color = up ? '#22c55e' : down ? '#f05252' : '#6b7a99'
  const arrow = up ? '▲' : down ? '▼' : '—'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 11, fontWeight: 700, fontFamily: 'Consolas, monospace',
      background: up ? 'rgba(34,197,94,0.12)' : down ? 'rgba(240,82,82,0.1)' : 'rgba(107,122,153,0.1)',
      color, borderRadius: 4, padding: '2px 7px', marginLeft: 6,
    }}>
      {arrow} {Math.abs(p).toFixed(0)}%
    </span>
  )
}

// ── Sub-tab nav ────────────────────────────────────────────────────────────
const SUB_TABS = [
  { id: 'branch', label: 'Branch Production' },
  { id: 'apps', label: 'Applications' },
] as const
type SubTab = typeof SUB_TABS[number]['id']

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  page: { padding: '28px 32px', maxWidth: 1200, margin: '0 auto' } as React.CSSProperties,
  subNav: { display: 'flex', gap: 0, borderBottom: '2px solid #1f2a45', marginBottom: 28 } as React.CSSProperties,
  subTab: (active: boolean): React.CSSProperties => ({
    padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '.5px',
    color: active ? '#22c55e' : '#6b7a99',
    borderBottom: active ? '2px solid #22c55e' : '2px solid transparent',
    marginBottom: -2, background: 'none', border: 'none', borderBottomStyle: 'solid',
    borderBottomWidth: 2, borderBottomColor: active ? '#22c55e' : 'transparent',
    transition: 'color .15s',
  }),
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 } as React.CSSProperties,
  kpiCard: { background: '#111520', border: '1px solid #1f2a45', borderRadius: 10, padding: '18px 20px', position: 'relative', overflow: 'hidden' } as React.CSSProperties,
  kpiAccent: (color: string): React.CSSProperties => ({ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }),
  kpiLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7a99', marginBottom: 8 } as React.CSSProperties,
  kpiValue: { fontFamily: 'Impact, Arial Narrow, sans-serif', fontSize: '2rem', lineHeight: 1, color: '#e2e8f0' } as React.CSSProperties,
  kpiSub: { fontSize: 11, color: '#6b7a99', marginTop: 5 } as React.CSSProperties,
  card: { background: '#111520', border: '1px solid #1f2a45', borderRadius: 10, overflow: 'hidden', marginBottom: 20 } as React.CSSProperties,
  cardHead: { padding: '13px 20px', borderBottom: '1px solid #1f2a45', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10 } as React.CSSProperties,
  cardTitle: { fontFamily: 'Impact, Arial Narrow, sans-serif', fontSize: '0.95rem', letterSpacing: 2, color: '#22c55e', textTransform: 'uppercase' as const } as React.CSSProperties,
  cardBody: { padding: '18px 20px' } as React.CSSProperties,
  tbl: { width: '100%', borderCollapse: 'collapse' as const },
  th: { fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#6b7a99', padding: '8px 14px', textAlign: 'left' as const, borderBottom: '1px solid #1f2a45' },
  thR: { fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#6b7a99', padding: '8px 14px', textAlign: 'right' as const, borderBottom: '1px solid #1f2a45' },
  td: { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid rgba(31,42,69,0.4)', color: '#e2e8f0' },
  tdR: { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid rgba(31,42,69,0.4)', color: '#e2e8f0', textAlign: 'right' as const, fontFamily: 'Consolas, monospace' },
  uploadZone: { border: '2px dashed #1f2a45', borderRadius: 10, padding: 32, textAlign: 'center' as const, cursor: 'pointer', transition: 'border-color .15s, background .15s' } as React.CSSProperties,
  btn: { background: '#22c55e', color: '#000', border: 'none', borderRadius: 7, padding: '9px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  btnGhost: { background: '#1f2a45', color: '#e2e8f0', border: 'none', borderRadius: 7, padding: '9px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  toggleGroup: { display: 'flex', background: '#1f2a45', borderRadius: 5, padding: 2, gap: 2 } as React.CSSProperties,
  toggleBtn: (active: boolean): React.CSSProperties => ({
    padding: '4px 14px', fontSize: 10, fontWeight: 700, borderRadius: 3, cursor: 'pointer', letterSpacing: '.5px',
    background: active ? '#111520' : 'transparent', color: active ? '#e2e8f0' : '#6b7a99', border: 'none',
  }),
}

// ── Bar chart helper ────────────────────────────────────────────────────────
function MiniBarChart({ values, labels, color, formatVal }: { values: number[]; labels: string[]; color: string; formatVal: (n: number) => string }) {
  const max = Math.max(...values) || 1
  const n = values.length
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
      {values.map((v, i) => {
        const h = Math.max(Math.round((v / max) * 85), v > 0 ? 4 : 0)
        const isCur = i === n - 1
        const isPeak = v === max && v > 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 9, fontFamily: 'Consolas, monospace', color: isCur || isPeak ? color : 'transparent', marginBottom: 2 }}>
              {formatVal(v)}
            </div>
            <div style={{ width: '100%', height: h, background: color, borderRadius: '3px 3px 0 0', opacity: isCur ? 1 : isPeak ? 0.8 : 0.4, boxShadow: isCur ? `0 0 8px ${color}55` : undefined }} />
            <div style={{ fontSize: 9, color: '#6b7a99', marginTop: 4, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {labels[i]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// BRANCH PRODUCTION TAB
// ══════════════════════════════════════════════════════════════════════════
function BranchProduction({ funded, onUpload, uploading }: {
  funded: FundedRecord[]
  onUpload: (file: File) => void
  uploading: boolean
}) {
  const [period, setPeriod] = useState<'ytd' | 'mtd' | '30d'>('ytd')
  const fileRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  function inPeriod(r: FundedRecord) {
    const d = new Date(r.fundedDate)
    if (period === 'ytd') return d.getFullYear() === thisYear
    if (period === 'mtd') return d.getFullYear() === thisYear && d.getMonth() === thisMonth
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    return d >= cutoff
  }

  const filtered = funded.filter(inPeriod)

  // Aggregate by branch
  const branchMap: Record<string, { families: number; volume: number; los: Set<string> }> = {}
  filtered.forEach(r => {
    if (!branchMap[r.branch]) branchMap[r.branch] = { families: 0, volume: 0, los: new Set() }
    branchMap[r.branch].families++
    branchMap[r.branch].volume += r.loanAmount
    branchMap[r.branch].los.add(r.loName)
  })
  const branches = Object.entries(branchMap).sort((a, b) => b[1].volume - a[1].volume)

  // Aggregate by LO
  const loMap: Record<string, { families: number; volume: number; branch: string }> = {}
  filtered.forEach(r => {
    if (!loMap[r.loName]) loMap[r.loName] = { families: 0, volume: 0, branch: r.branch }
    loMap[r.loName].families++
    loMap[r.loName].volume += r.loanAmount
  })
  const los = Object.entries(loMap).sort((a, b) => b[1].volume - a[1].volume)

  const totalFam = filtered.length
  const totalVol = filtered.reduce((s, r) => s + r.loanAmount, 0)
  const avgLoan = totalFam > 0 ? totalVol / totalFam : 0
  const maxVol = branches[0]?.[1].volume || 1

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={s.toggleGroup}>
          {(['ytd', 'mtd', '30d'] as const).map(p => (
            <button key={p} style={s.toggleBtn(period === p)} onClick={() => setPeriod(p)}>
              {p === 'ytd' ? 'YTD' : p === 'mtd' ? 'This Month' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div style={s.kpiGrid}>
        {[
          { label: 'Families Funded', value: totalFam, sub: period.toUpperCase(), color: '#22c55e', fmt: (n: number) => String(n) },
          { label: 'Total Volume', value: totalVol, sub: period.toUpperCase(), color: '#4bc8f2', fmt: fmtMoney },
          { label: 'Avg Loan Size', value: avgLoan, sub: 'per family', color: '#f0b429', fmt: fmtMoney },
          { label: 'Active Branches', value: branches.length, sub: 'with funded loans', color: '#a78bfa', fmt: (n: number) => String(n) },
        ].map(t => (
          <div key={t.label} style={s.kpiCard}>
            <div style={s.kpiAccent(t.color)} />
            <div style={s.kpiLabel}>{t.label}</div>
            <div style={{ ...s.kpiValue, color: t.color }}>{t.fmt(t.value)}</div>
            <div style={s.kpiSub}>{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Branch leaderboard */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>Branch Leaderboard</div>
          <div style={{ fontSize: 11, color: '#6b7a99' }}>Sorted by funded volume</div>
        </div>
        <div>
          {branches.length === 0 && (
            <div style={{ padding: 24, color: '#6b7a99', textAlign: 'center' }}>No funded data for this period — upload a file below.</div>
          )}
          {branches.map(([branch, data], i) => {
            const pct = (data.volume / maxVol * 100).toFixed(1)
            const medals = ['🥇', '🥈', '🥉']
            return (
              <div key={branch} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid rgba(31,42,69,0.4)', background: i === 0 ? 'rgba(34,197,94,0.04)' : undefined }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {i < 3 ? medals[i] : <span style={{ fontFamily: 'Impact, sans-serif', color: '#6b7a99' }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{branch} Branch</span>
                    <span style={{ fontSize: 12, color: '#6b7a99', fontFamily: 'Consolas, monospace' }}>{data.families} {data.families === 1 ? 'family' : 'families'}</span>
                  </div>
                  <div style={{ height: 6, background: '#1f2a45', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? '#22c55e' : i === 1 ? 'rgba(34,197,94,.7)' : i === 2 ? 'rgba(34,197,94,.5)' : 'rgba(34,197,94,.3)', borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ fontFamily: 'Consolas, monospace', fontSize: 14, fontWeight: 700, color: i === 0 ? '#22c55e' : '#e2e8f0', whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
                  {fmtMoney(data.volume)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* LO table */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>Loan Officer Breakdown</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Loan Officer</th>
                <th style={s.th}>Branch</th>
                <th style={s.thR}>Families</th>
                <th style={s.thR}>Volume</th>
                <th style={s.thR}>Avg Loan</th>
              </tr>
            </thead>
            <tbody>
              {los.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#6b7a99' }}>No data — upload a file below</td></tr>
              )}
              {los.map(([name, data], i) => (
                <tr key={name} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ ...s.td, color: '#6b7a99', fontFamily: 'Consolas, monospace' }}>{i + 1}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{name}</td>
                  <td style={{ ...s.td, color: '#6b7a99' }}>{data.branch}</td>
                  <td style={s.tdR}>{data.families}</td>
                  <td style={{ ...s.tdR, color: '#22c55e', fontWeight: 700 }}>{fmtMoney(data.volume)}</td>
                  <td style={s.tdR}>{fmtMoney(data.volume / data.families)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loan detail table */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>Funded Loans — Detail</div>
          <div style={{ fontSize: 11, color: '#6b7a99' }}>{filtered.length} records</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Loan Officer</th>
                <th style={s.th}>Branch</th>
                <th style={s.th}>Client</th>
                <th style={s.thR}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#6b7a99' }}>No records</td></tr>
              )}
              {[...filtered].sort((a, b) => b.fundedDate.localeCompare(a.fundedDate)).map(r => (
                <tr key={r.id}>
                  <td style={{ ...s.td, fontFamily: 'Consolas, monospace', fontSize: 12 }}>{r.fundedDate}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{r.loName}</td>
                  <td style={{ ...s.td, color: '#6b7a99' }}>{r.branch}</td>
                  <td style={s.td}>{r.clientName}</td>
                  <td style={{ ...s.tdR, color: '#22c55e', fontWeight: 700 }}>{fmtMoney(r.loanAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload */}
      <UploadCard
        title="Import Funded Loans"
        note="Each row = one funded loan"
        columns={['A · Date (MM/DD/YYYY)', 'B · LO Name', 'C · Branch', 'D · Client Name', 'E · Loan Amount ($)']}
        exampleRow={['06/15/2026', 'Josh Mettle', 'Mettle', 'John Smith', '525000']}
        fileRef={fileRef}
        onUpload={onUpload}
        uploading={uploading}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// APPLICATIONS TAB
// ══════════════════════════════════════════════════════════════════════════
function ApplicationsTab({ weeks, onUpload, uploading }: {
  weeks: WeeklyAppRecord[]
  onUpload: (file: File) => void
  uploading: boolean
}) {
  const [view, setView] = useState<'weekly' | 'roll4' | 'ytd'>('weekly')
  const fileRef = useRef<HTMLInputElement>(null)

  const sorted = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const cur = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]

  // Aggregated values for selected view
  let display = cur
  let prevDisplay = prev
  if (view === 'roll4') {
    const last4 = sorted.slice(-4)
    const prior4 = sorted.slice(-8, -4)
    const agg = (arr: WeeklyAppRecord[]) => arr.reduce((acc, w) => ({
      ...acc,
      totalFamilies: acc.totalFamilies + w.totalFamilies,
      totalVolume: acc.totalVolume + w.totalVolume,
      sgFamilies: acc.sgFamilies + w.sgFamilies,
      blFamilies: acc.blFamilies + w.blFamilies,
      totalApps: acc.totalApps + w.totalApps,
      sgApps: acc.sgApps + w.sgApps,
      blApps: acc.blApps + w.blApps,
    }), { ...last4[0], totalFamilies: 0, totalVolume: 0, sgFamilies: 0, blFamilies: 0, totalApps: 0, sgApps: 0, blApps: 0 })
    display = agg(last4)
    prevDisplay = agg(prior4)
  } else if (view === 'ytd') {
    const agg = (arr: WeeklyAppRecord[]) => arr.reduce((acc, w) => ({
      ...acc,
      totalFamilies: acc.totalFamilies + w.totalFamilies,
      totalVolume: acc.totalVolume + w.totalVolume,
      sgFamilies: acc.sgFamilies + w.sgFamilies,
      blFamilies: acc.blFamilies + w.blFamilies,
      totalApps: acc.totalApps + w.totalApps,
      sgApps: acc.sgApps + w.sgApps,
      blApps: acc.blApps + w.blApps,
    }), { ...sorted[0], totalFamilies: 0, totalVolume: 0, sgFamilies: 0, blFamilies: 0, totalApps: 0, sgApps: 0, blApps: 0 })
    display = agg(sorted)
    prevDisplay = null as unknown as WeeklyAppRecord
  }

  const periodLabel = view === 'weekly' ? `Current Week — ${cur?.weekLabel || ''}` : view === 'roll4' ? 'Last 4 Weeks' : 'Year to Date'

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={s.toggleGroup}>
          {(['weekly', 'roll4', 'ytd'] as const).map(p => (
            <button key={p} style={s.toggleBtn(view === p)} onClick={() => setView(p)}>
              {p === 'weekly' ? 'Weekly' : p === 'roll4' ? '4-Wk Rolling' : 'YTD'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div style={s.kpiGrid}>
        {[
          { label: 'RESPA Families', value: display?.totalFamilies ?? 0, prev: prevDisplay?.totalFamilies, color: '#22c55e', fmt: String },
          { label: 'Funded Volume', value: display?.totalVolume ?? 0, prev: prevDisplay?.totalVolume, color: '#4bc8f2', fmt: fmtMoney },
          { label: 'Initial Apps', value: display?.totalApps ?? 0, prev: prevDisplay?.totalApps, color: '#a78bfa', fmt: String },
          { label: 'Self Gen Apps', value: display?.sgApps ?? 0, prev: prevDisplay?.sgApps, color: '#f0b429', fmt: String },
        ].map(t => (
          <div key={t.label} style={s.kpiCard}>
            <div style={s.kpiAccent(t.color)} />
            <div style={s.kpiLabel}>{t.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <div style={{ ...s.kpiValue, color: t.color }}>{t.fmt(t.value)}</div>
              {prevDisplay && <DeltaBadge cur={t.value} prev={t.prev!} />}
            </div>
            <div style={s.kpiSub}>{periodLabel}</div>
          </div>
        ))}
      </div>

      {/* WoW comparison */}
      {view === 'weekly' && prev && (
        <div style={s.card}>
          <div style={s.cardHead}>
            <div style={s.cardTitle}>Week-over-Week Comparison</div>
            <div style={{ fontSize: 11, color: '#6b7a99' }}>{prev.weekLabel} → {cur.weekLabel}</div>
          </div>
          <div style={{ ...s.cardBody, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Total Families', prev.totalFamilies, cur.totalFamilies, (n: number) => n + ' fam'],
              ['Volume', prev.totalVolume, cur.totalVolume, fmtMoney],
              ['Self Gen Families', prev.sgFamilies, cur.sgFamilies, (n: number) => n + ' fam'],
              ['Better Leads Families', prev.blFamilies, cur.blFamilies, (n: number) => n + ' fam'],
              ['Initial Apps', prev.totalApps, cur.totalApps, (n: number) => n + ' apps'],
              ['Self Gen Apps', prev.sgApps, cur.sgApps, (n: number) => n + ' apps'],
              ['Better Leads Apps', prev.blApps, cur.blApps, (n: number) => n + ' apps'],
            ].map(([label, p, c, fmt]) => {
              const pv = p as number, cv = c as number
              const fmtFn = fmt as (n: number) => string
              const pct = pctChange(cv, pv)
              const up = pct !== null && pct > 0.5
              const dn = pct !== null && pct < -0.5
              return (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(31,42,69,0.4)' }}>
                  <span style={{ fontSize: 12, color: '#6b7a99' }}>{label as string}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#b0baca', fontFamily: 'Consolas, monospace' }}>{fmtFn(pv)}</span>
                    <span style={{ color: '#6b7a99' }}>→</span>
                    <span style={{ fontFamily: 'Consolas, monospace', fontSize: 13, fontWeight: 700, color: up ? '#22c55e' : dn ? '#f05252' : '#e2e8f0' }}>{fmtFn(cv)}</span>
                    {pct !== null && <DeltaBadge cur={cv} prev={pv} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Trend charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={s.card}>
          <div style={s.cardHead}><div style={s.cardTitle}>Weekly Families Funded</div></div>
          <div style={s.cardBody}>
            <MiniBarChart values={sorted.map(w => w.totalFamilies)} labels={sorted.map(w => w.weekLabel.split('–')[0])} color="#22c55e" formatVal={String} />
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardHead}><div style={s.cardTitle}>Weekly Initial Apps</div></div>
          <div style={s.cardBody}>
            <MiniBarChart values={sorted.map(w => w.totalApps)} labels={sorted.map(w => w.weekLabel.split('–')[0])} color="#a78bfa" formatVal={String} />
          </div>
        </div>
      </div>

      {/* Self Gen vs Better Leads split */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>Self Gen vs Better Leads — Weekly Families</div>
        </div>
        <div style={s.cardBody}>
          {(() => {
            const maxV = Math.max(...sorted.map(w => w.totalFamilies)) || 1
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                  {sorted.map((w, i) => {
                    const isCur = i === sorted.length - 1
                    const sgH = Math.max(Math.round(w.sgFamilies / maxV * 85), w.sgFamilies > 0 ? 3 : 0)
                    const blH = Math.max(Math.round(w.blFamilies / maxV * 85), w.blFamilies > 0 ? 3 : 0)
                    return (
                      <div key={w.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {isCur && <div style={{ fontSize: 9, fontFamily: 'Consolas, monospace', color: '#22c55e', marginBottom: 2 }}>{w.totalFamilies}</div>}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <div style={{ width: '100%', height: sgH, background: '#22c55e', opacity: isCur ? 1 : 0.5, borderRadius: '2px 2px 0 0' }} title={`SG: ${w.sgFamilies}`} />
                          <div style={{ width: '100%', height: blH, background: '#f0b429', opacity: isCur ? 1 : 0.5, borderRadius: '0 0 2px 2px' }} title={`BL: ${w.blFamilies}`} />
                        </div>
                        <div style={{ fontSize: 9, color: '#6b7a99', marginTop: 4, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 34, overflow: 'hidden' }}>
                          {w.weekLabel.split('–')[0]}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: '#6b7a99' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2, display: 'inline-block' }} />Self Gen</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#f0b429', borderRadius: 2, display: 'inline-block' }} />Better Leads</span>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* History table */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardTitle}>Weekly History</div>
          <div style={{ fontSize: 11, color: '#6b7a99' }}>{sorted.length} weeks · newest first</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.th}>Week</th>
                <th style={s.thR}>Families</th>
                <th style={s.thR}>Volume</th>
                <th style={s.thR}>SG Fam</th>
                <th style={s.thR}>BL Fam</th>
                <th style={s.thR}>Apps</th>
                <th style={s.thR}>SG Apps</th>
                <th style={s.thR}>BL Apps</th>
                <th style={s.thR}>WoW Fam</th>
                <th style={s.thR}>WoW Apps</th>
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((w, ri) => {
                const origIdx = sorted.length - 1 - ri
                const prevW = origIdx > 0 ? sorted[origIdx - 1] : null
                const isCur = ri === 0
                return (
                  <tr key={w.id} style={{ background: isCur ? 'rgba(34,197,94,0.04)' : undefined }}>
                    <td style={{ ...s.td, fontWeight: isCur ? 700 : 500 }}>{isCur ? '★ ' : ''}{w.weekLabel}</td>
                    <td style={{ ...s.tdR, color: isCur ? '#22c55e' : '#e2e8f0', fontWeight: isCur ? 700 : 400 }}>{w.totalFamilies}</td>
                    <td style={s.tdR}>{fmtMoney(w.totalVolume)}</td>
                    <td style={s.tdR}>{w.sgFamilies}</td>
                    <td style={s.tdR}>{w.blFamilies}</td>
                    <td style={{ ...s.tdR, color: isCur ? '#a78bfa' : '#e2e8f0', fontWeight: isCur ? 700 : 400 }}>{w.totalApps}</td>
                    <td style={s.tdR}>{w.sgApps}</td>
                    <td style={s.tdR}>{w.blApps}</td>
                    <td style={{ ...s.tdR, fontSize: 11 }}>{prevW ? <DeltaBadge cur={w.totalFamilies} prev={prevW.totalFamilies} /> : '—'}</td>
                    <td style={{ ...s.tdR, fontSize: 11 }}>{prevW ? <DeltaBadge cur={w.totalApps} prev={prevW.totalApps} /> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload */}
      <UploadCard
        title="Upload Weekly Applications"
        note="One row per week"
        columns={['A · Week Label', 'B · Families', 'C · Volume ($)', 'D · SG Families', 'E · BL Families', 'F · Total Apps', 'G · SG Apps', 'H · BL Apps']}
        exampleRow={['Jul 11–17', '22', '11000000', '17', '5', '75', '50', '25']}
        fileRef={fileRef}
        onUpload={onUpload}
        uploading={uploading}
      />
    </div>
  )
}

// ── Reusable upload card ───────────────────────────────────────────────────
function UploadCard({ title, note, columns, exampleRow, fileRef, onUpload, uploading }: {
  title: string
  note: string
  columns: string[]
  exampleRow: string[]
  fileRef: React.RefObject<HTMLInputElement | null>
  onUpload: (file: File) => void
  uploading: boolean
}) {
  return (
    <div style={s.card}>
      <div style={s.cardHead}>
        <div style={s.cardTitle}>{title}</div>
        <div style={{ fontSize: 11, color: '#6b7a99' }}>{note} · duplicates auto-skipped</div>
      </div>
      <div style={s.cardBody}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div
            style={{ ...s.uploadZone, borderColor: uploading ? '#22c55e' : '#1f2a45' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#22c55e' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1f2a45' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#1f2a45'; const f = e.dataTransfer.files[0]; if (f) onUpload(f) }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>{uploading ? '⏳' : '📊'}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{uploading ? 'Processing…' : 'Drop Excel file here'}</div>
            <div style={{ fontSize: 12, color: '#6b7a99' }}>or click to browse · .xlsx / .xls</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6b7a99', marginBottom: 10 }}>Required Format — Row 1 is header</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...s.tbl, fontSize: 11 }}>
                <thead><tr>{columns.map(c => <th key={c} style={{ ...s.th, whiteSpace: 'nowrap', fontSize: 10 }}>{c}</th>)}</tr></thead>
                <tbody><tr>{exampleRow.map((v, i) => <td key={i} style={{ ...s.tdR, fontSize: 11 }}>{v}</td>)}</tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function Production() {
  const [activeTab, setActiveTab] = useState<SubTab>('branch')
  const [fundedRecords, setFundedRecords] = useState<FundedRecord[]>(PLACEHOLDER_FUNDED)
  const [weeklyApps, setWeeklyApps] = useState<WeeklyAppRecord[]>(PLACEHOLDER_WEEKLY_APPS)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  async function handleFundedUpload(file: File) {
    setUploading(true)
    setUploadMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
      const existingDates = new Set(fundedRecords.map(r => r.id))
      const newRecs: FundedRecord[] = []
      rows.slice(1).forEach((row, i) => {
        if (!row[0] && !row[1]) return
        const rec: FundedRecord = {
          id: `upload-${Date.now()}-${i}`,
          fundedDate: String(row[0] || '').trim(),
          loName: String(row[1] || '').trim(),
          branch: String(row[2] || '').trim(),
          clientName: String(row[3] || '').trim(),
          loanAmount: parseFloat(String(row[4]).replace(/[^0-9.]/g, '')) || 0,
        }
        if (rec.loName && rec.loanAmount > 0) newRecs.push(rec)
      })
      setFundedRecords(prev => [...prev, ...newRecs])
      setUploadMsg(`✅ Imported ${newRecs.length} record(s)`)
    } catch (e) {
      setUploadMsg(`❌ Error reading file`)
    }
    setUploading(false)
  }

  async function handleAppsUpload(file: File) {
    setUploading(true)
    setUploadMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
      const existingLabels = new Set(weeklyApps.map(w => w.weekLabel))
      const newWeeks: WeeklyAppRecord[] = []
      let dups = 0
      rows.slice(1).forEach((row, i) => {
        const label = String(row[0] || '').trim()
        if (!label) return
        if (existingLabels.has(label)) { dups++; return }
        newWeeks.push({
          id: `upload-${Date.now()}-${i}`,
          weekLabel: label,
          weekStart: '',
          totalFamilies: parseInt(String(row[1])) || 0,
          totalVolume: parseFloat(String(row[2]).replace(/[^0-9.]/g, '')) || 0,
          sgFamilies: parseInt(String(row[3])) || 0,
          blFamilies: parseInt(String(row[4])) || 0,
          totalApps: parseInt(String(row[5])) || 0,
          sgApps: parseInt(String(row[6])) || 0,
          blApps: parseInt(String(row[7])) || 0,
        })
      })
      setWeeklyApps(prev => [...prev, ...newWeeks])
      setUploadMsg(`✅ Imported ${newWeeks.length} week(s)${dups ? `, ${dups} duplicate(s) skipped` : ''}`)
    } catch {
      setUploadMsg('❌ Error reading file')
    }
    setUploading(false)
  }

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Impact, Arial Narrow, sans-serif', fontSize: '1.6rem', letterSpacing: 3, color: '#22c55e', textTransform: 'uppercase' }}>
          Production
        </h1>
        <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 4 }}>FinFree Division · Team Stats</div>
      </div>

      {uploadMsg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: uploadMsg.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(240,82,82,0.08)', border: `1px solid ${uploadMsg.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(240,82,82,0.25)'}`, borderRadius: 8, fontSize: 13, color: '#e2e8f0' }}>
          {uploadMsg}
        </div>
      )}

      {/* Sub-tab nav */}
      <div style={s.subNav}>
        {SUB_TABS.map(tab => (
          <button key={tab.id} style={s.subTab(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'branch' && (
        <BranchProduction funded={fundedRecords} onUpload={handleFundedUpload} uploading={uploading} />
      )}
      {activeTab === 'apps' && (
        <ApplicationsTab weeks={weeklyApps} onUpload={handleAppsUpload} uploading={uploading} />
      )}
    </div>
  )
}
