'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────────────────────────
interface FundedRecord {
  id: string
  loName: string
  branch: string
  clientName: string
  fundedDate: string
  loanAmount: number
}

interface WeeklyAppRecord {
  id: string
  weekLabel: string
  weekStart: string
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
  { id: '1',  loName: 'Josh Mettle',      branch: 'Mettle',  clientName: 'Sample Client A', fundedDate: '2026-01-15', loanAmount: 485000 },
  { id: '2',  loName: 'Josh Mettle',      branch: 'Mettle',  clientName: 'Sample Client B', fundedDate: '2026-02-03', loanAmount: 620000 },
  { id: '3',  loName: 'Katrinka Condie',  branch: 'Condie',  clientName: 'Sample Client C', fundedDate: '2026-01-28', loanAmount: 530000 },
  { id: '4',  loName: 'Jason Drobeck',    branch: 'Drobeck', clientName: 'Sample Client D', fundedDate: '2026-03-11', loanAmount: 710000 },
  { id: '5',  loName: 'Aaron Thomas',     branch: 'Thomas',  clientName: 'Sample Client E', fundedDate: '2026-02-19', loanAmount: 395000 },
  { id: '6',  loName: 'Greg Allen',       branch: 'Allen',   clientName: 'Sample Client F', fundedDate: '2026-03-05', loanAmount: 450000 },
  { id: '7',  loName: 'Josh Mettle',      branch: 'Mettle',  clientName: 'Sample Client G', fundedDate: '2026-04-08', loanAmount: 890000 },
  { id: '8',  loName: 'Katrinka Condie',  branch: 'Condie',  clientName: 'Sample Client H', fundedDate: '2026-04-22', loanAmount: 560000 },
  { id: '9',  loName: 'Jason Drobeck',    branch: 'Drobeck', clientName: 'Sample Client I', fundedDate: '2026-05-14', loanAmount: 675000 },
  { id: '10', loName: 'Josh Mettle',      branch: 'Mettle',  clientName: 'Sample Client J', fundedDate: '2026-06-03', loanAmount: 1050000 },
  { id: '11', loName: 'Aaron Thomas',     branch: 'Thomas',  clientName: 'Sample Client K', fundedDate: '2026-05-29', loanAmount: 420000 },
  { id: '12', loName: 'Greg Allen',       branch: 'Allen',   clientName: 'Sample Client L', fundedDate: '2026-06-17', loanAmount: 380000 },
]

const PLACEHOLDER_WEEKLY_APPS: WeeklyAppRecord[] = [
  { id: 'w1', weekLabel: 'May 9–15',      weekStart: '2026-05-09', totalFamilies: 31, totalVolume: 17932399, sgFamilies: 21, blFamilies: 10, totalApps: 132, sgApps: 50,  blApps: 82 },
  { id: 'w2', weekLabel: 'May 16–22',     weekStart: '2026-05-16', totalFamilies: 24, totalVolume: 11021334, sgFamilies: 16, blFamilies: 8,  totalApps: 121, sgApps: 43,  blApps: 78 },
  { id: 'w3', weekLabel: 'May 23–29',     weekStart: '2026-05-23', totalFamilies: 28, totalVolume: 14261312, sgFamilies: 20, blFamilies: 8,  totalApps: 87,  sgApps: 39,  blApps: 48 },
  { id: 'w4', weekLabel: 'May 30–Jun 5',  weekStart: '2026-05-30', totalFamilies: 32, totalVolume: 19037937, sgFamilies: 27, blFamilies: 5,  totalApps: 78,  sgApps: 42,  blApps: 36 },
  { id: 'w5', weekLabel: 'Jun 6–12',      weekStart: '2026-06-06', totalFamilies: 26, totalVolume: 16585994, sgFamilies: 20, blFamilies: 6,  totalApps: 81,  sgApps: 38,  blApps: 43 },
  { id: 'w6', weekLabel: 'Jun 13–19',     weekStart: '2026-06-13', totalFamilies: 19, totalVolume: 13505427, sgFamilies: 18, blFamilies: 1,  totalApps: 81,  sgApps: 39,  blApps: 42 },
  { id: 'w7', weekLabel: 'Jun 20–26',     weekStart: '2026-06-20', totalFamilies: 14, totalVolume: 4874589,  sgFamilies: 9,  blFamilies: 5,  totalApps: 68,  sgApps: 33,  blApps: 35 },
  { id: 'w8', weekLabel: 'Jun 27–Jul 3',  weekStart: '2026-06-27', totalFamilies: 27, totalVolume: 12290220, sgFamilies: 20, blFamilies: 7,  totalApps: 81,  sgApps: 42,  blApps: 39 },
  { id: 'w9', weekLabel: 'Jul 4–10',      weekStart: '2026-07-04', totalFamilies: 15, totalVolume: 8342088,  sgFamilies: 14, blFamilies: 1,  totalApps: 60,  sgApps: 45,  blApps: 15 },
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
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 11, fontWeight: 700, fontFamily: 'Consolas, monospace',
      background: up ? 'rgba(34,197,94,0.1)' : down ? 'rgba(240,82,82,0.08)' : '#F4F6F8',
      color: up ? '#16a34a' : down ? '#dc2626' : '#858889',
      borderRadius: 5, padding: '2px 7px', marginLeft: 4,
    }}>
      {up ? '▲' : down ? '▼' : '—'} {Math.abs(p).toFixed(0)}%
    </span>
  )
}

// ── Shared design tokens (matches rest of app) ─────────────────────────────
const C = {
  bg: '#F4F6F8',
  white: '#fff',
  navy: '#0A2540',
  border: '#E4E8EC',
  borderSoft: '#DCE1E6',
  text: '#26303B',
  muted: '#858889',
  dim: '#5C6570',
  accent: '#5BCBF5',
  accentDark: '#0A2540',
  green: '#16a34a',
  greenBg: 'rgba(34,197,94,0.08)',
  red: '#dc2626',
  amber: '#d97706',
}

const SUB_TABS = [
  { id: 'branch', label: 'Branch Production' },
  { id: 'apps',   label: 'Applications' },
] as const
type SubTab = typeof SUB_TABS[number]['id']

// ── Shared card wrapper ────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, ...style }}>
      {children}
    </div>
  )
}
function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, letterSpacing: '.01em' }}>{title}</div>
      {right}
    </div>
  )
}

// ── Toggle group ───────────────────────────────────────────────────────────
function ToggleGroup<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', background: '#F4F6F8', border: `1px solid ${C.border}`, borderRadius: 8, padding: 2, gap: 2 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{
          padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: 'none',
          background: value === o.id ? C.white : 'transparent',
          color: value === o.id ? C.navy : C.muted,
          boxShadow: value === o.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          transition: 'all .12s',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Mini bar chart ─────────────────────────────────────────────────────────
function MiniBarChart({ values, labels, color, formatVal }: { values: number[]; labels: string[]; color: string; formatVal: (n: number) => string }) {
  const max = Math.max(...values) || 1
  const n = values.length
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 100 }}>
      {values.map((v, i) => {
        const h = Math.max(Math.round((v / max) * 82), v > 0 ? 4 : 0)
        const isCur = i === n - 1
        const isPeak = v === max && v > 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 9, fontFamily: 'Consolas, monospace', color: isCur || isPeak ? color : 'transparent', marginBottom: 2 }}>
              {formatVal(v)}
            </div>
            <div style={{ width: '100%', height: h, background: color, borderRadius: '3px 3px 0 0', opacity: isCur ? 1 : isPeak ? 0.7 : 0.35 }} />
            <div style={{ fontSize: 9, color: C.muted, marginTop: 4, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 34, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {labels[i]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// BRANCH PRODUCTION
// ══════════════════════════════════════════════════════════════════════════
function BranchProduction({ funded, onUpload, uploading, uploadMsg }: {
  funded: FundedRecord[]
  onUpload: (file: File) => void
  uploading: boolean
  uploadMsg: string
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

  const branchMap: Record<string, { families: number; volume: number }> = {}
  filtered.forEach(r => {
    if (!branchMap[r.branch]) branchMap[r.branch] = { families: 0, volume: 0 }
    branchMap[r.branch].families++
    branchMap[r.branch].volume += r.loanAmount
  })
  const branches = Object.entries(branchMap).sort((a, b) => b[1].volume - a[1].volume)

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
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <ToggleGroup
          options={[{ id: 'ytd', label: 'YTD' }, { id: 'mtd', label: 'This Month' }, { id: '30d', label: 'Last 30 Days' }]}
          value={period} onChange={setPeriod}
        />
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Families Funded', value: String(totalFam), accent: C.accent },
          { label: 'Total Volume',    value: fmtMoney(totalVol), accent: C.accent },
          { label: 'Avg Loan Size',   value: fmtMoney(avgLoan),  accent: '#a78bfa' },
          { label: 'Branches Active', value: String(branches.length), accent: '#f0b429' },
        ].map(t => (
          <div key={t.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: t.accent }} />
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{t.label}</div>
            <div style={{ fontWeight: 800, fontSize: 28, color: C.navy, lineHeight: 1 }}>{t.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{period === 'ytd' ? 'Year to date' : period === 'mtd' ? 'This month' : 'Last 30 days'}</div>
          </div>
        ))}
      </div>

      {/* Branch leaderboard */}
      <Card>
        <CardHead title="Branch Leaderboard" right={<span style={{ fontSize: 12, color: C.muted }}>By funded volume</span>} />
        <div>
          {branches.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 14 }}>No funded data — upload a file below.</div>
          )}
          {branches.map(([branch, data], i) => {
            const pct = (data.volume / maxVol * 100).toFixed(1)
            return (
              <div key={branch} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: i === 0 ? '#F8FFF9' : undefined }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {i < 3 ? medals[i] : <span style={{ fontWeight: 700, color: C.muted, fontSize: 13 }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{branch} Branch</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{data.families} {data.families === 1 ? 'family' : 'families'}</span>
                  </div>
                  <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? C.accent : C.accentDark, borderRadius: 3, opacity: i === 0 ? 1 : 0.4 + (0.5 / (i + 1)) }} />
                  </div>
                </div>
                <div style={{ fontFamily: 'Consolas, monospace', fontSize: 14, fontWeight: 700, color: i === 0 ? C.accentDark : C.text, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
                  {fmtMoney(data.volume)}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* LO table */}
      <Card>
        <CardHead title="Loan Officer Breakdown" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['#', 'Loan Officer', 'Branch', 'Families', 'Volume', 'Avg Loan'].map((h, i) => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, padding: '9px 16px', textAlign: i > 2 ? 'right' : 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {los.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 14 }}>No data — upload a file below</td></tr>
              )}
              {los.map(([name, data], i) => (
                <tr key={name} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#FAFBFC' : C.white }}>
                  <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12, fontFamily: 'Consolas, monospace' }}>{i + 1}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: C.navy, fontSize: 13 }}>{name}</td>
                  <td style={{ padding: '10px 16px', color: C.dim, fontSize: 13 }}>{data.branch}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13 }}>{data.families}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, fontWeight: 700, color: C.navy }}>{fmtMoney(data.volume)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, color: C.dim }}>{fmtMoney(data.volume / data.families)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Loan detail */}
      <Card>
        <CardHead title="Funded Loans — Detail" right={<span style={{ fontSize: 12, color: C.muted }}>{filtered.length} records</span>} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Date', 'Loan Officer', 'Branch', 'Client', 'Amount'].map((h, i) => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, padding: '9px 16px', textAlign: i === 4 ? 'right' : 'left', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => b.fundedDate.localeCompare(a.fundedDate)).map((r, i) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#FAFBFC' : C.white }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'Consolas, monospace', fontSize: 12, color: C.dim }}>{r.fundedDate}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: C.navy, fontSize: 13 }}>{r.loName}</td>
                  <td style={{ padding: '10px 16px', color: C.dim, fontSize: 13 }}>{r.branch}</td>
                  <td style={{ padding: '10px 16px', color: C.text, fontSize: 13 }}>{r.clientName}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, fontWeight: 700, color: C.navy }}>{fmtMoney(r.loanAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <UploadCard
        title="Import Funded Loans"
        note="One row per funded loan"
        columns={['A · Date (MM/DD/YYYY)', 'B · LO Name', 'C · Branch', 'D · Client Name', 'E · Loan Amount ($)']}
        exampleRow={['06/15/2026', 'Josh Mettle', 'Mettle', 'John Smith', '525000']}
        fileRef={fileRef}
        onUpload={onUpload}
        uploading={uploading}
        uploadMsg={uploadMsg}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// APPLICATIONS
// ══════════════════════════════════════════════════════════════════════════
function ApplicationsTab({ weeks, onUpload, uploading, uploadMsg }: {
  weeks: WeeklyAppRecord[]
  onUpload: (file: File) => void
  uploading: boolean
  uploadMsg: string
}) {
  const [view, setView] = useState<'weekly' | 'roll4' | 'ytd'>('weekly')
  const fileRef = useRef<HTMLInputElement>(null)

  const sorted = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const cur = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]

  type AggRow = Omit<WeeklyAppRecord, 'id' | 'weekLabel' | 'weekStart'>
  function agg(arr: WeeklyAppRecord[]): AggRow {
    return arr.reduce((acc, w) => ({
      totalFamilies: acc.totalFamilies + w.totalFamilies,
      totalVolume:   acc.totalVolume   + w.totalVolume,
      sgFamilies:    acc.sgFamilies    + w.sgFamilies,
      blFamilies:    acc.blFamilies    + w.blFamilies,
      totalApps:     acc.totalApps     + w.totalApps,
      sgApps:        acc.sgApps        + w.sgApps,
      blApps:        acc.blApps        + w.blApps,
    }), { totalFamilies: 0, totalVolume: 0, sgFamilies: 0, blFamilies: 0, totalApps: 0, sgApps: 0, blApps: 0 })
  }

  const display  = view === 'weekly' ? cur  : view === 'roll4' ? agg(sorted.slice(-4))  : agg(sorted)
  const prevDisp = view === 'weekly' ? prev : view === 'roll4' ? agg(sorted.slice(-8, -4)) : null

  const maxFam = Math.max(...sorted.map(w => w.totalFamilies)) || 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <ToggleGroup
          options={[{ id: 'weekly', label: 'Weekly' }, { id: 'roll4', label: '4-Wk Rolling' }, { id: 'ytd', label: 'YTD' }]}
          value={view} onChange={setView}
        />
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'RESPA Families', value: display?.totalFamilies ?? 0, prev: prevDisp?.totalFamilies, accent: C.accent, fmt: String },
          { label: 'Funded Volume',  value: display?.totalVolume   ?? 0, prev: prevDisp?.totalVolume,   accent: C.accent, fmt: fmtMoney },
          { label: 'Initial Apps',   value: display?.totalApps     ?? 0, prev: prevDisp?.totalApps,     accent: '#a78bfa', fmt: String },
          { label: 'Self Gen Apps',  value: display?.sgApps        ?? 0, prev: prevDisp?.sgApps,        accent: '#f0b429', fmt: String },
        ].map(t => (
          <div key={t.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: t.accent }} />
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{t.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, fontSize: 28, color: C.navy, lineHeight: 1 }}>{t.fmt(t.value)}</div>
              {prevDisp != null && t.prev != null && <DeltaBadge cur={t.value} prev={t.prev} />}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{view === 'weekly' ? cur?.weekLabel : view === 'roll4' ? 'Last 4 weeks' : 'Year to date'}</div>
          </div>
        ))}
      </div>

      {/* WoW comparison */}
      {view === 'weekly' && prev && (
        <Card>
          <CardHead title="Week-over-Week Comparison" right={<span style={{ fontSize: 12, color: C.muted }}>{prev.weekLabel} → {cur.weekLabel}</span>} />
          <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              ['Total Families', prev.totalFamilies, cur.totalFamilies, (n: number) => n + ' fam'],
              ['Funded Volume',  prev.totalVolume,   cur.totalVolume,   fmtMoney],
              ['Self Gen Fam',   prev.sgFamilies,    cur.sgFamilies,    (n: number) => n + ' fam'],
              ['Better Leads Fam', prev.blFamilies,  cur.blFamilies,    (n: number) => n + ' fam'],
              ['Initial Apps',   prev.totalApps,     cur.totalApps,     (n: number) => n + ' apps'],
              ['SG Apps',        prev.sgApps,         cur.sgApps,       (n: number) => n + ' apps'],
              ['BL Apps',        prev.blApps,         cur.blApps,       (n: number) => n + ' apps'],
            ] as [string, number, number, (n: number) => string][]).map(([label, pv, cv, fmt]) => {
              const p = pctChange(cv, pv)
              const up = p !== null && p > 0.5, dn = p !== null && p < -0.5
              return (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: C.muted, fontFamily: 'Consolas, monospace' }}>{fmt(pv)}</span>
                    <span style={{ color: C.border }}>→</span>
                    <span style={{ fontFamily: 'Consolas, monospace', fontSize: 13, fontWeight: 700, color: up ? C.green : dn ? C.red : C.navy }}>{fmt(cv)}</span>
                    {p !== null && <DeltaBadge cur={cv} prev={pv} />}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Trend charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 0 }}>
        <Card style={{ marginBottom: 20 }}>
          <CardHead title="Weekly Families Funded" />
          <div style={{ padding: '16px 20px' }}>
            <MiniBarChart values={sorted.map(w => w.totalFamilies)} labels={sorted.map(w => w.weekLabel.split('–')[0])} color={C.accent} formatVal={String} />
          </div>
        </Card>
        <Card style={{ marginBottom: 20 }}>
          <CardHead title="Weekly Initial Apps" />
          <div style={{ padding: '16px 20px' }}>
            <MiniBarChart values={sorted.map(w => w.totalApps)} labels={sorted.map(w => w.weekLabel.split('–')[0])} color="#a78bfa" formatVal={String} />
          </div>
        </Card>
      </div>

      {/* SG vs BL split */}
      <Card>
        <CardHead title="Self Gen vs Better Leads — Weekly Families" />
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 95 }}>
            {sorted.map((w, i) => {
              const isCur = i === sorted.length - 1
              const sgH = Math.max(Math.round(w.sgFamilies / maxFam * 80), w.sgFamilies > 0 ? 3 : 0)
              const blH = Math.max(Math.round(w.blFamilies / maxFam * 80), w.blFamilies > 0 ? 3 : 0)
              return (
                <div key={w.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {isCur && <div style={{ fontSize: 9, fontFamily: 'Consolas, monospace', color: C.navy, fontWeight: 700, marginBottom: 2 }}>{w.totalFamilies}</div>}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <div style={{ width: '100%', height: sgH, background: C.accent, opacity: isCur ? 1 : 0.45, borderRadius: '2px 2px 0 0' }} title={`SG: ${w.sgFamilies}`} />
                    <div style={{ width: '100%', height: blH, background: '#f0b429', opacity: isCur ? 1 : 0.45 }} title={`BL: ${w.blFamilies}`} />
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 4, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 34, overflow: 'hidden' }}>
                    {w.weekLabel.split('–')[0]}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: C.dim }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: C.accent, borderRadius: 2, display: 'inline-block' }} />Self Gen</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#f0b429', borderRadius: 2, display: 'inline-block' }} />Better Leads</span>
          </div>
        </div>
      </Card>

      {/* History table */}
      <Card>
        <CardHead title="Weekly History" right={<span style={{ fontSize: 12, color: C.muted }}>{sorted.length} weeks · newest first</span>} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Week', 'Families', 'Volume', 'SG Fam', 'BL Fam', 'Apps', 'SG Apps', 'BL Apps', 'WoW Fam', 'WoW Apps'].map((h, i) => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, padding: '9px 14px', textAlign: i === 0 ? 'left' : 'right', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((w, ri) => {
                const origIdx = sorted.length - 1 - ri
                const prevW = origIdx > 0 ? sorted[origIdx - 1] : null
                const isCur = ri === 0
                return (
                  <tr key={w.id} style={{ borderBottom: `1px solid ${C.border}`, background: isCur ? '#F0FAFB' : ri % 2 === 1 ? '#FAFBFC' : C.white }}>
                    <td style={{ padding: '10px 14px', fontWeight: isCur ? 700 : 500, color: C.navy, fontSize: 13, whiteSpace: 'nowrap' }}>{isCur ? '★ ' : ''}{w.weekLabel}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, fontWeight: isCur ? 700 : 400, color: isCur ? C.navy : C.text }}>{w.totalFamilies}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, color: C.text }}>{fmtMoney(w.totalVolume)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, color: C.dim }}>{w.sgFamilies}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, color: C.dim }}>{w.blFamilies}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, fontWeight: isCur ? 700 : 400, color: isCur ? C.navy : C.text }}>{w.totalApps}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, color: C.dim }}>{w.sgApps}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas, monospace', fontSize: 13, color: C.dim }}>{w.blApps}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12 }}>{prevW ? <DeltaBadge cur={w.totalFamilies} prev={prevW.totalFamilies} /> : <span style={{ color: C.muted }}>—</span>}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12 }}>{prevW ? <DeltaBadge cur={w.totalApps} prev={prevW.totalApps} /> : <span style={{ color: C.muted }}>—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <UploadCard
        title="Upload Weekly Applications"
        note="One row per week"
        columns={['A · Week Label', 'B · Families', 'C · Volume ($)', 'D · SG Fam', 'E · BL Fam', 'F · Total Apps', 'G · SG Apps', 'H · BL Apps']}
        exampleRow={['Jul 11–17', '22', '11000000', '17', '5', '75', '50', '25']}
        fileRef={fileRef}
        onUpload={onUpload}
        uploading={uploading}
        uploadMsg={uploadMsg}
      />
    </div>
  )
}

// ── Upload card ────────────────────────────────────────────────────────────
function UploadCard({ title, note, columns, exampleRow, fileRef, onUpload, uploading, uploadMsg }: {
  title: string; note: string; columns: string[]; exampleRow: string[]
  fileRef: React.RefObject<HTMLInputElement | null>; onUpload: (f: File) => void
  uploading: boolean; uploadMsg: string
}) {
  return (
    <Card>
      <CardHead title={title} right={<span style={{ fontSize: 12, color: C.muted }}>{note} · duplicates auto-skipped</span>} />
      <div style={{ padding: '20px 24px' }}>
        {uploadMsg && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: uploadMsg.startsWith('✅') ? C.greenBg : 'rgba(220,38,38,0.07)', border: `1px solid ${uploadMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, fontSize: 13, color: C.navy }}>
            {uploadMsg}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div
            style={{ border: `2px dashed ${uploading ? C.accent : C.borderSoft}`, borderRadius: 10, padding: 28, textAlign: 'center', cursor: 'pointer', transition: 'all .15s', background: uploading ? '#F0FAFB' : C.bg }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = C.accent }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderSoft }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = C.borderSoft; const f = e.dataTransfer.files[0]; if (f) onUpload(f) }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{uploading ? '⏳' : '📊'}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>{uploading ? 'Processing…' : 'Drop Excel file here'}</div>
            <div style={{ fontSize: 12, color: C.muted }}>or click to browse · .xlsx / .xls</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>Required Format — Row 1 is header</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {columns.map(c => <th key={c} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 10 }}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>{exampleRow.map((v, i) => <td key={i} style={{ padding: '6px 10px', fontFamily: 'Consolas, monospace', color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>{v}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function Production() {
  const [activeTab, setActiveTab] = useState<SubTab>('branch')
  const [fundedRecords, setFundedRecords] = useState<FundedRecord[]>(PLACEHOLDER_FUNDED)
  const [weeklyApps, setWeeklyApps] = useState<WeeklyAppRecord[]>(PLACEHOLDER_WEEKLY_APPS)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  async function handleFundedUpload(file: File) {
    setUploading(true); setUploadMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
      const newRecs: FundedRecord[] = []
      rows.slice(1).forEach((row, i) => {
        if (!row[1]) return
        const amt = parseFloat(String(row[4]).replace(/[^0-9.]/g, '')) || 0
        if (amt > 0) newRecs.push({ id: `u-${Date.now()}-${i}`, fundedDate: String(row[0]).trim(), loName: String(row[1]).trim(), branch: String(row[2]).trim(), clientName: String(row[3]).trim(), loanAmount: amt })
      })
      setFundedRecords(prev => [...prev, ...newRecs])
      setUploadMsg(`✅ Imported ${newRecs.length} record(s)`)
    } catch { setUploadMsg('❌ Error reading file') }
    setUploading(false)
  }

  async function handleAppsUpload(file: File) {
    setUploading(true); setUploadMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
      const existingLabels = new Set(weeklyApps.map(w => w.weekLabel))
      const newWeeks: WeeklyAppRecord[] = []; let dups = 0
      rows.slice(1).forEach((row, i) => {
        const label = String(row[0]).trim(); if (!label) return
        if (existingLabels.has(label)) { dups++; return }
        newWeeks.push({ id: `u-${Date.now()}-${i}`, weekLabel: label, weekStart: '', totalFamilies: +row[1]||0, totalVolume: parseFloat(String(row[2]).replace(/[^0-9.]/g,''))||0, sgFamilies: +row[3]||0, blFamilies: +row[4]||0, totalApps: +row[5]||0, sgApps: +row[6]||0, blApps: +row[7]||0 })
      })
      setWeeklyApps(prev => [...prev, ...newWeeks])
      setUploadMsg(`✅ Imported ${newWeeks.length} week(s)${dups ? `, ${dups} duplicate(s) skipped` : ''}`)
    } catch { setUploadMsg('❌ Error reading file') }
    setUploading(false)
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 40px 90px' }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontWeight: 800, letterSpacing: '-.02em', fontSize: 32, margin: 0, color: C.navy }}>Production</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 5 }}>FinFree Division · Team Stats</div>
      </div>

      {/* Sub-tab nav */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, marginBottom: 28 }}>
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setUploadMsg('') }} style={{
            padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none',
            color: activeTab === tab.id ? C.navy : C.muted,
            borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`,
            marginBottom: -2, transition: 'color .12s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'branch' && <BranchProduction funded={fundedRecords} onUpload={handleFundedUpload} uploading={uploading} uploadMsg={uploadMsg} />}
      {activeTab === 'apps'   && <ApplicationsTab  weeks={weeklyApps}    onUpload={handleAppsUpload}   uploading={uploading} uploadMsg={uploadMsg} />}
    </div>
  )
}
