'use client'
import { useState, useEffect, useRef, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildScenarios, cumulativeCost, totalOutOfPocket, breakevenMonths, wealthSavings, totalInterestAndMI, fmtDollars, fmtRate, TCAInputs, LoanScenario } from '@/lib/openHouseMath'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  dim: '#374151', green: '#16a34a', text: '#1F2937',
}

function fmtPrice(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function CumulativeChart({ scenarios }: { scenarios: LoanScenario[] }) {
  const checkpoints = [12, 24, 36, 60, 120, 180, 240, 360]
  const labels = ['1yr', '2yr', '3yr', '5yr', '10yr', '15yr', '20yr', '30yr']
  const W = 600, H = 200, PAD = { top: 12, right: 16, bottom: 32, left: 68 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const allVals = scenarios.flatMap(s => checkpoints.map(m => cumulativeCost(s, m)))
  const maxVal = Math.max(...allVals)

  function x(i: number) { return PAD.left + (i / (checkpoints.length - 1)) * cW }
  function y(v: number) { return PAD.top + cH - (v / maxVal) * cH }

  function path(s: LoanScenario) {
    return checkpoints.map((m, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(cumulativeCost(s, m)).toFixed(1)}`).join(' ')
  }

  const gridLines = 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Grid */}
      {Array.from({ length: gridLines + 1 }, (_, i) => {
        const v = (maxVal / gridLines) * i
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#E4E8EC" strokeWidth="1" />
            <text x={PAD.left - 6} y={yy + 4} textAnchor="end" fontSize="10" fill={C.muted}>
              {v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        )
      })}
      {/* X labels */}
      {labels.map((lbl, i) => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10" fill={C.muted}>{lbl}</text>
      ))}
      {/* Lines */}
      {scenarios.map(s => (
        <path key={s.label} d={path(s)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {/* Dots at 5yr */}
      {scenarios.map(s => {
        const m = 60, i = 4
        const v = cumulativeCost(s, m)
        return <circle key={s.label} cx={x(i)} cy={y(v)} r="4" fill={s.color} />
      })}
    </svg>
  )
}

// ─── Monthly Payment Bars ─────────────────────────────────────────────────────
function PaymentBars({ scenarios }: { scenarios: LoanScenario[] }) {
  const max = Math.max(...scenarios.map(s => s.monthlyTotal))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {scenarios.map(s => (
        <div key={s.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: C.dim }}>{s.label}</span>
            <span style={{ fontWeight: 800, color: s.color, fontSize: 15 }}>{fmtPrice(Math.round(s.monthlyTotal))}<span style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}>/mo</span></span>
          </div>
          <div style={{ height: 10, background: '#E9EDF2', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${(s.monthlyTotal / max) * 100}%`, height: '100%', background: s.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
            P&I {fmtPrice(Math.round(s.monthlyPI))} · Rate {fmtRate(s.rate)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Comparison Table ─────────────────────────────────────────────────────────
function ComparisonTable({ scenarios, inputs }: { scenarios: LoanScenario[]; inputs: TCAInputs }) {
  const checkpoints = [60, 120, 180, 360]
  const labels = ['5 Years', '10 Years', '15 Years', '30 Years']
  const { downPct } = inputs

  // Breakeven between market and first SA scenario
  const saScenario = scenarios.find(s => s.label !== 'Market Rate')
  const market = scenarios[0]
  const breakeven = saScenario ? breakevenMonths(market, saScenario, downPct) : null
  const breakevenYrs = breakeven ? (breakeven / 12).toFixed(1) : null

  return (
    <div>
      {/* Breakeven callout */}
      {breakeven && (
        <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>📈</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.green }}>Breakeven at {breakevenYrs} years</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
              After {breakevenYrs} years, the Seller Advantage loan saves more total money than the higher purchase price cost — and keeps saving every month after.
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: C.muted, fontWeight: 700, borderBottom: `2px solid ${C.border}` }}>Total Out-of-Pocket</th>
              {scenarios.map(s => (
                <th key={s.label} style={{ textAlign: 'right', padding: '10px 16px', color: s.color, fontWeight: 700, borderBottom: `2px solid ${s.color}` }}>{s.label}</th>
              ))}
            </tr>
            <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 16px', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>Down payment + all monthly costs</td>
              {scenarios.map(s => <td key={s.label} />)}
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((m, i) => (
              <tr key={m} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : '#F8FAFC' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: C.dim }}>{labels[i]}</td>
                {scenarios.map(s => {
                  const cost = totalOutOfPocket(s, m, downPct)
                  const best = Math.min(...scenarios.map(x => totalOutOfPocket(x, m, downPct)))
                  const isBest = Math.abs(cost - best) < 1
                  return (
                    <td key={s.label} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: isBest ? 800 : 500, color: isBest ? C.green : C.dim }}>
                      {fmtDollars(cost)}
                      {isBest && <span style={{ fontSize: 10, color: C.green, marginLeft: 4 }}>✓ Best</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr style={{ background: '#F0F9FF', borderTop: `2px solid ${C.accent}` }}>
              <td style={{ padding: '10px 16px', fontWeight: 700, color: C.navy }}>Down Payment</td>
              {scenarios.map(s => (
                <td key={s.label} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: C.dim }}>
                  {fmtDollars(s.purchasePrice * downPct)}
                </td>
              ))}
            </tr>
            <tr style={{ background: '#F0F9FF' }}>
              <td style={{ padding: '10px 16px', fontWeight: 700, color: C.navy }}>Loan Amount</td>
              {scenarios.map(s => (
                <td key={s.label} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: C.dim }}>
                  {fmtDollars(s.loanAmount)}
                </td>
              ))}
            </tr>
            <tr style={{ background: '#F0F9FF' }}>
              <td style={{ padding: '10px 16px', fontWeight: 700, color: C.navy }}>Monthly P&I</td>
              {scenarios.map(s => (
                <td key={s.label} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: s.color }}>
                  {fmtDollars(s.monthlyPI)}/mo
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Photo Gallery ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos, address }: { photos: string[]; address: string }) {
  const [idx, setIdx] = useState(0)
  if (!photos || photos.length === 0) {
    return (
      <div style={{ width: '100%', height: 360, background: '#E4E8EC', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🏡</div>
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <img src={photos[idx]} alt={address} style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }} />
      {photos.length > 1 && (
        <div>
          <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => setIdx(i => (i + 1) % photos.length)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 99, background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 99 }}>
            {idx + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
interface PageData {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  beds: number; baths: number; sqft: number; lot_size: string; year_built: number
  description: string; photos: string[]
  list_price: number; hoa_monthly: number; annual_taxes: number; annual_insurance: number
  down_pct: number; seller_contribution: number
  market_rate: number; sa_30yr_rate: number | null; sa_arm_rate: number | null; sa_arm_years: number; sa_arm_adjusted_rate: number | null
  ufmip_pct: number | null
  annual_mip_pct: number | null
  advisor_name: string; advisor_title: string; advisor_email: string
  advisor_phone: string; advisor_photo: string; advisor_nmls: string
  partner_name: string; partner_title: string; partner_email: string
  partner_phone: string; partner_photo: string; partner_nmls: string; partner_logo: string
}

export default function OpenHousePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = use(paramsPromise)
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'tca' | 'contact'>('tca')

  useEffect(() => {
    const sb = createClient()
    sb.from('open_house_pages')
      .select('*')
      .eq('slug', params.slug)
      .limit(1)
      .then(({ data, error }) => {
        if (error) { setDbError(`DB error: ${error.message} (code: ${error.code})`); setLoading(false); return }
        if (!data || data.length === 0) { setDbError(`No row found for slug "${params.slug}"`); setLoading(false); return }
        if (data[0].status !== 'active') { setDbError(`Row found but status is "${data[0].status}" not "active"`); setLoading(false); return }
        const row = data[0]
        setPage({ partner_name: '', partner_title: '', partner_email: '', partner_phone: '', partner_photo: '', partner_nmls: '', partner_logo: '', ...row } as PageData)
        setLoading(false)
      }, (e: unknown) => { setDbError(`Fetch threw: ${e}`); setLoading(false) })
  }, [params.slug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ color: C.muted, fontSize: 16 }}>Loading property…</div>
    </div>
  )
  if (dbError || !page) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>Page not found</div>
        <div style={{ color: C.muted, marginTop: 8 }}>This listing may have been removed.</div>
        {dbError && <div style={{ marginTop: 16, padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', textAlign: 'left', fontFamily: 'monospace', wordBreak: 'break-all' }}>{dbError}</div>}
      </div>
    </div>
  )

  const inputs: TCAInputs = {
    listPrice: page.list_price,
    sellerContribution: page.seller_contribution ?? 0,
    downPct: page.down_pct ?? 0.035,
    marketRate: page.market_rate,
    sa30yrRate: page.sa_30yr_rate,
    saArmRate: page.sa_arm_rate,
    saArmYears: page.sa_arm_years ?? 5,
    hoaMonthly: page.hoa_monthly ?? 0,
    annualTaxes: page.annual_taxes ?? 0,
    annualInsurance: page.annual_insurance ?? 0,
    saArmAdjustedRate: page.sa_arm_adjusted_rate ?? null,
    ufmipPct: page.ufmip_pct ?? 0.0175,
    annualMipPct: page.annual_mip_pct ?? 0.0055,
  }
  const scenarios = buildScenarios(inputs)
  const fullAddress = [page.address, page.city, page.state, page.zip].filter(Boolean).join(', ')
  const saPurchasePrice = page.list_price + (page.seller_contribution ?? 0)
  const hasSA = (page.sa_30yr_rate ?? 0) > 0 || (page.sa_arm_rate ?? 0) > 0

  const TABS = [
    { id: 'overview', label: 'Property' },
    { id: 'tca', label: 'Seller Advantage' },
    { id: 'contact', label: 'Contact Advisor' },
  ] as const

  function openFlyer() {
    if (!page) return
    const photos = page.photos ?? []
    const heroPhoto = photos[0] ?? ''
    const smallPhotos = [photos[1] ?? '', photos[2] ?? '', photos[3] ?? '']
    const market = scenarios[0]
    const desc = (page.description ?? '').slice(0, 700)
    const advisorNmls = page.advisor_nmls ? `NMLS# ${page.advisor_nmls}` : ''
    const partnerNmls = page.partner_nmls ? `NMLS# ${page.partner_nmls}` : ''

    function summaryRows() {
      const rows = [
        { label: 'Purchase Price', vals: scenarios.map(s => fmtDollars(s.purchasePrice)) },
        { label: 'Loan Amount', vals: scenarios.map(s => fmtDollars(s.loanAmount)) },
        { label: 'Interest Rate', vals: scenarios.map(s => s.isArm ? `${fmtRate(s.rate)} (${inputs.saArmYears}yr ARM)` : fmtRate(s.rate)) },
        { label: 'Term', vals: scenarios.map(() => '360 mos') },
        { label: 'Payment', vals: scenarios.map(s => fmtDollars(s.monthlyTotal) + '/mo') },
      ]
      const savingsVals = scenarios.map((s, i) => i === 0 ? 0 : market.monthlyTotal - s.monthlyTotal)
      const ws120Vals = scenarios.map((s, i) => i === 0 ? 0 : wealthSavings(market, s, 120))

      const bodyRows = rows.map((r, ri) => `
        <tr style="background:${ri % 2 === 0 ? '#fff' : '#F8FAFC'}">
          <td style="padding:5px 8px;font-weight:600;color:#374151;font-size:10px">${r.label}</td>
          ${r.vals.map(v => `<td style="padding:5px 8px;text-align:right;color:#1F2937;font-size:10px">${v}</td>`).join('')}
        </tr>`).join('')

      const savingsRow = `<tr style="background:#F0FDF4">
        <td style="padding:5px 8px;font-weight:700;color:#0A2540;font-size:10px">Monthly Savings</td>
        ${savingsVals.map((v, i) => `<td style="padding:5px 8px;text-align:right;font-weight:800;color:${v > 0 ? '#16a34a' : '#6B7280'};font-size:10px">${v > 0 ? `+${fmtDollars(v)}/mo` : '$0.00'}</td>`).join('')}
      </tr>`
      const ws120Row = `<tr style="background:#F0FDF4">
        <td style="padding:5px 8px;font-weight:700;color:#0A2540;font-size:10px">Savings (120 mos)</td>
        ${ws120Vals.map((v, i) => `<td style="padding:5px 8px;text-align:right;font-weight:800;color:${v > 0 ? '#16a34a' : '#6B7280'};font-size:10px">${v > 0 ? `+${fmtDollars(v)}` : '$0'}</td>`).join('')}
      </tr>`

      return bodyRows + savingsRow + ws120Row
    }

    const NEO_NAVY = '#0A2540'
    const NEO_CYAN = '#5BCBF5'
    const priceStr = fmtDollars(page.list_price)
    const saRateStr = page.sa_30yr_rate ? fmtRate(page.sa_30yr_rate) : page.sa_arm_rate ? fmtRate(page.sa_arm_rate) : ''
    const partnerLogo = page.partner_logo || ''

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Open House — ${page.address}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: letter portrait; margin: 0; }
body { width: 8.5in; height: 11in; overflow: hidden; font-family: 'Arial', Helvetica, sans-serif; background: #fff; color: #1F2937; }

/* ── HERO ── */
.hero { display: flex; height: 3.05in; }
.hero-photo { flex: 0 0 62%; overflow: hidden; position: relative; }
.hero-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero-no-photo { width: 100%; height: 100%; background: #CBD5E1; display: flex; align-items: center; justify-content: center; font-size: 48px; }
.partner-corner {
  flex: 0 0 38%;
  background: ${NEO_CYAN};
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 22px 24px; gap: 18px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.partner-logo-wrap { display: flex; align-items: center; justify-content: center; width: 100%; }
.partner-logo-wrap img { max-width: 160px; max-height: 80px; object-fit: contain; display: block; }
.partner-logo-placeholder {
  font-size: 22px; font-weight: 900; color: ${NEO_NAVY};
  text-transform: uppercase; letter-spacing: 0.08em;
  text-align: center; line-height: 1.2;
  border: 3px dashed rgba(10,37,64,0.3); padding: 12px 20px; border-radius: 6px;
}
.address-block { text-align: right; width: 100%; }
.address-street { font-size: 14px; font-weight: 800; color: ${NEO_NAVY}; line-height: 1.2; }
.address-city { font-size: 12px; font-weight: 500; color: ${NEO_NAVY}; opacity: 0.75; margin-top: 3px; }

/* ── PRICE BANNER ── */
.price-banner {
  background: ${NEO_NAVY}; height: 0.52in;
  display: flex; align-items: center; gap: 0; padding: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.price-left {
  width: 62%; display: flex; align-items: center; gap: 14px; padding: 0 22px;
  border-right: 1px solid rgba(91,203,245,0.25);
}
.price-tag { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.65); letter-spacing: 0.12em; text-transform: uppercase; }
.price-value { font-size: 28px; font-weight: 900; color: ${NEO_CYAN}; letter-spacing: -0.01em; }
.price-right {
  width: 38%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 18px;
}
.sa-badge {
  font-size: 11px; font-weight: 700; color: ${NEO_CYAN};
  letter-spacing: 0.06em; text-transform: uppercase;
}
.sa-rate { font-size: 20px; font-weight: 900; color: #fff; }
.sa-label { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.08em; }

/* ── MAIN CONTENT ── */
.main-content { display: flex; height: 5.38in; }
.left-col { flex: 0 0 62%; padding: 14px 16px 10px 22px; display: flex; flex-direction: column; gap: 11px; overflow: hidden; border-right: 2px solid #E4E8EC; }
.right-col { flex: 0 0 38%; padding: 10px 16px 10px 10px; display: flex; flex-direction: column; gap: 8px; }
.small-photo { flex: 1; overflow: hidden; border-radius: 7px; }
.small-photo img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 7px; }
.small-photo-empty { width: 100%; height: 100%; background: #F1F5F9; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #CBD5E1; }

.description { font-size: 10px; line-height: 1.7; color: #374151; flex-shrink: 0; }

/* Table */
.table-section { flex: 1; overflow: hidden; }
.table-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: ${NEO_NAVY}; margin-bottom: 5px; }
table { width: 100%; border-collapse: collapse; }
thead tr { background: ${NEO_NAVY}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
thead th { padding: 5px 7px; color: #fff; font-weight: 700; font-size: 8.5px; text-align: right; white-space: nowrap; }
thead th:first-child { text-align: left; font-size: 8px; opacity: 0.7; }
tbody tr:nth-child(even) { background: #F8FAFC; }
tbody td { padding: 4.5px 7px; border-bottom: 1px solid #E4E8EC; font-size: 9px; color: #374151; }
tbody td:not(:first-child) { text-align: right; font-weight: 600; }
tbody td:first-child { color: #6B7280; font-size: 8.5px; }
.savings-row td { background: #ECFDF5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.savings-row td:first-child { font-weight: 700; color: ${NEO_NAVY}; }
.savings-row td:not(:first-child) { color: #15803D; font-weight: 800; font-size: 9.5px; }

/* ── CONTACT BAR ── */
.contact-bar {
  height: 1.25in;
  background: ${NEO_NAVY};
  display: flex; align-items: stretch;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.contact-cell { flex: 1; display: flex; align-items: center; gap: 13px; padding: 0 20px; }
.contact-divider { width: 1px; background: rgba(91,203,245,0.2); margin: 16px 0; flex-shrink: 0; }
.contact-center { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0 16px; }
.contact-center img { max-height: 34px; max-width: 110px; object-fit: contain; filter: brightness(0) invert(1); }
.contact-photo { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid ${NEO_CYAN}; }
.contact-init { width: 54px; height: 54px; border-radius: 50%; background: rgba(91,203,245,0.15); border: 2px solid rgba(91,203,245,0.4); display: flex; align-items: center; justify-content: center; color: ${NEO_CYAN}; font-size: 22px; font-weight: 800; flex-shrink: 0; }
.contact-info { color: #fff; }
.ci-role { font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${NEO_CYAN}; margin-bottom: 3px; }
.ci-name { font-size: 14px; font-weight: 800; line-height: 1.1; }
.ci-detail { font-size: 9px; color: rgba(255,255,255,0.6); margin-top: 4px; line-height: 1.5; }

/* ── FOOTER ── */
.footer {
  height: 0.2in; background: #F1F5F9;
  display: flex; align-items: center; justify-content: space-between; padding: 0 18px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  border-top: 2px solid ${NEO_CYAN};
}
.footer span { font-size: 6.5px; color: #9CA3AF; }
.ehl { font-size: 7px; font-weight: 700; color: #9CA3AF; letter-spacing: 0.05em; }
</style>
</head>
<body>

<!-- ═══ HERO ═══ -->
<div class="hero">
  <div class="hero-photo">
    ${heroPhoto
      ? `<img src="${heroPhoto}" alt="${page.address}" />`
      : `<div class="hero-no-photo">🏡</div>`}
  </div>
  <div class="partner-corner">
    <div class="partner-logo-wrap">
      ${partnerLogo
        ? `<img src="${partnerLogo}" alt="${page.partner_name}" />`
        : `<div class="partner-logo-placeholder">Partner<br>Logo</div>`}
    </div>
    <div class="address-block">
      <div class="address-street">${page.address}</div>
      <div class="address-city">${[page.city, page.state, page.zip].filter(Boolean).join(', ')}</div>
    </div>
  </div>
</div>

<!-- ═══ PRICE BANNER ═══ -->
<div class="price-banner">
  <div class="price-left">
    <span class="price-tag">Price</span>
    <span class="price-value">${priceStr}</span>
  </div>
  <div class="price-right">
    ${hasSA && saRateStr ? `
    <div style="text-align:center">
      <div class="sa-badge">Seller Advantage Rate</div>
      <div class="sa-rate">${saRateStr}</div>
      <div class="sa-label">Permanent Buydown</div>
    </div>` : ''}
  </div>
</div>

<!-- ═══ MAIN CONTENT ═══ -->
<div class="main-content">
  <div class="left-col">
    ${desc ? `<p class="description">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}
    ${hasSA ? `
    <div class="table-section">
      <div class="table-title">Financing Comparison</div>
      <table>
        <thead>
          <tr>
            <th>Summary</th>
            ${scenarios.map(s => `<th>${s.label.replace('Seller Advantage ', 'SA ')}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${summaryRows()}</tbody>
      </table>
    </div>` : ''}
  </div>
  <div class="right-col">
    ${smallPhotos.map((url, i) => `
    <div class="small-photo">
      ${url ? `<img src="${url}" alt="Photo ${i + 2}" />` : `<div class="small-photo-empty">🏠</div>`}
    </div>`).join('')}
  </div>
</div>

<!-- ═══ CONTACT BAR ═══ -->
<div class="contact-bar">
  ${page.partner_name ? `
  <div class="contact-cell">
    ${page.partner_photo
      ? `<img class="contact-photo" src="${page.partner_photo}" alt="${page.partner_name}" />`
      : `<div class="contact-init">${(page.partner_name[0] ?? '?').toUpperCase()}</div>`}
    <div class="contact-info">
      <div class="ci-role">${page.partner_title || 'Listing Agent'}</div>
      <div class="ci-name">${page.partner_name}</div>
      <div class="ci-detail">${[page.partner_phone, page.partner_email, partnerNmls].filter(Boolean).join('<br>')}</div>
    </div>
  </div>
  <div class="contact-divider"></div>` : ''}

  <div class="contact-center">
    <img src="/neo-logo.png" alt="NEO Home Loans" />
  </div>

  ${page.advisor_name ? `
  <div class="contact-divider"></div>
  <div class="contact-cell" style="justify-content:flex-end">
    <div class="contact-info" style="text-align:right">
      <div class="ci-role">${page.advisor_title || 'Mortgage Advisor'}</div>
      <div class="ci-name">${page.advisor_name}</div>
      <div class="ci-detail">${[page.advisor_phone, page.advisor_email, advisorNmls].filter(Boolean).join('<br>')}</div>
    </div>
    ${page.advisor_photo
      ? `<img class="contact-photo" src="${page.advisor_photo}" alt="${page.advisor_name}" />`
      : `<div class="contact-init">${(page.advisor_name[0] ?? '?').toUpperCase()}</div>`}
  </div>` : ''}
</div>

<!-- ═══ FOOTER ═══ -->
<div class="footer">
  <span>Better Mortgage Corporation NMLS #330511. Equal Housing Lender. www.nmlsconsumeraccess.org · Rates shown are estimates only and subject to credit approval.</span>
  <span class="ehl">⊟ EQUAL HOUSING LENDER</span>
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: C.navy, padding: '14px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/neo-logo.png" alt="NEO Home Loans" style={{ height: 32, width: 'auto' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={openFlyer}
              style={{ background: '#5BCBF5', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#0A2540', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Download Flyer
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Photos */}
        <PhotoGallery photos={page.photos ?? []} address={page.address} />

        {/* Price + Address */}
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{fmtPrice(page.list_price)}</div>
              {hasSA && <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>SA Purchase Price: {fmtPrice(saPurchasePrice)}</div>}
              <div style={{ fontSize: 16, color: C.dim, marginTop: 6, fontWeight: 600 }}>{page.address}</div>
              <div style={{ fontSize: 14, color: C.muted }}>{page.city}{page.city && page.state ? ', ' : ''}{page.state} {page.zip}</div>
            </div>
            {hasSA && (
              <div style={{ background: 'linear-gradient(135deg, #0A2540, #1a4a7c)', borderRadius: 12, padding: '12px 18px', color: '#fff', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Seller Advantage</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtRate(page.sa_30yr_rate ?? page.sa_arm_rate ?? 0)}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>permanent rate buydown</div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, padding: '14px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
            {[
              { label: 'Beds', val: page.beds },
              { label: 'Baths', val: page.baths },
              { label: 'Sq Ft', val: page.sqft ? page.sqft.toLocaleString() : null },
              { label: 'Lot', val: page.lot_size || null },
              { label: 'Year Built', val: page.year_built || null },
              { label: 'HOA', val: page.hoa_monthly ? `${fmtPrice(page.hoa_monthly)}/mo` : null },
            ].filter(r => r.val).map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginTop: 2 }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: '10px 22px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 14, fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? C.navy : C.muted,
                borderBottom: `2px solid ${activeTab === t.id ? C.navy : 'transparent'}`, marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {page.description && (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 10 }}>About This Home</div>
                <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{page.description}</div>
              </div>
            )}
            {/* Monthly cost breakdown */}
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4 }}>Monthly Cost Breakdown</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Based on {(inputs.downPct * 100).toFixed(1)}% down · includes taxes, insurance{page.hoa_monthly ? ', and HOA' : ''}</div>
              <PaymentBars scenarios={scenarios} />
            </div>
          </div>
        )}

        {/* Seller Advantage TCA Tab */}
        {activeTab === 'tca' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {hasSA ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── Section 1: Summary Table ─────────────────────────────── */}
                <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, background: '#F8FAFC' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: C.navy }}>Loan Comparison</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Side-by-side breakdown of all scenarios</div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                          <th style={{ textAlign: 'left', padding: '10px 20px', color: C.muted, fontWeight: 700, borderBottom: `2px solid ${C.border}` }}> </th>
                          {scenarios.map(s => (
                            <th key={s.label} style={{ textAlign: 'right', padding: '10px 20px', color: s.color, fontWeight: 700, borderBottom: `2px solid ${s.color}`, whiteSpace: 'nowrap' }}>{s.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            label: 'Purchase Price',
                            values: scenarios.map(s => fmtDollars(s.purchasePrice)),
                          },
                          {
                            label: 'Down Payment',
                            values: scenarios.map(s => fmtDollars(s.purchasePrice * inputs.downPct)),
                          },
                          {
                            label: 'Loan Amount',
                            values: scenarios.map(s => fmtDollars(s.loanAmount)),
                          },
                          {
                            label: 'Interest Rate',
                            values: scenarios.map(s => s.isArm ? `${fmtRate(s.rate)} (${inputs.saArmYears}yr ARM)` : fmtRate(s.rate)),
                          },
                          {
                            label: 'Term',
                            values: scenarios.map(s => '30 years'),
                          },
                          {
                            label: 'Monthly Payment',
                            values: scenarios.map(s => fmtDollars(s.monthlyTotal) + '/mo'),
                          },
                        ].map((row, i) => (
                          <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : '#F8FAFC' }}>
                            <td style={{ padding: '10px 20px', fontWeight: 600, color: C.dim }}>{row.label}</td>
                            {row.values.map((v, j) => (
                              <td key={j} style={{ padding: '10px 20px', textAlign: 'right', color: C.dim }}>{v}</td>
                            ))}
                          </tr>
                        ))}
                        {/* Monthly Savings — highlighted green */}
                        <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(22,163,74,0.06)' }}>
                          <td style={{ padding: '10px 20px', fontWeight: 700, color: C.navy }}>Monthly Savings</td>
                          {scenarios.map((s, i) => {
                            const savings = i === 0 ? 0 : scenarios[0].monthlyTotal - s.monthlyTotal
                            return (
                              <td key={s.label} style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 800, color: savings > 0 ? C.green : C.muted }}>
                                {savings > 0 ? `+${fmtDollars(savings)}/mo` : '$0.00'}
                              </td>
                            )
                          })}
                        </tr>
                        {/* Savings 120 months — highlighted */}
                        <tr style={{ background: 'rgba(22,163,74,0.06)' }}>
                          <td style={{ padding: '10px 20px', fontWeight: 700, color: C.navy }}>Savings (120 mos)</td>
                          {scenarios.map((s, i) => {
                            const ws = i === 0 ? 0 : wealthSavings(scenarios[0], s, 120)
                            return (
                              <td key={s.label} style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 800, color: ws > 0 ? C.green : C.muted }}>
                                {ws > 0 ? `+${fmtDollars(ws)}` : '$0'}
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Section 2: Monthly Savings Bar Chart ─────────────────── */}
                {(() => {
                  const market = scenarios[0]
                  const saScenarios = scenarios.slice(1)
                  const maxSavings = Math.max(...saScenarios.map(s => market.monthlyTotal - s.monthlyTotal), 1)
                  const W = 560, H = 200, PAD = { top: 30, right: 20, bottom: 40, left: 70 }
                  const cW = W - PAD.left - PAD.right
                  const cH = H - PAD.top - PAD.bottom
                  const allScenarios = [market, ...saScenarios]
                  const barW = Math.min(80, cW / allScenarios.length - 16)
                  return (
                    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4 }}>Monthly Savings</div>
                      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>vs Market Rate payment</div>
                      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                        {/* Y grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(t => {
                          const val = maxSavings * t
                          const yy = PAD.top + cH - t * cH
                          return (
                            <g key={t}>
                              <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#E4E8EC" strokeWidth="1" />
                              <text x={PAD.left - 6} y={yy + 4} textAnchor="end" fontSize="10" fill={C.muted}>
                                {val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${Math.round(val)}`}
                              </text>
                            </g>
                          )
                        })}
                        {/* Bars */}
                        {allScenarios.map((s, i) => {
                          const savings = i === 0 ? 0 : market.monthlyTotal - s.monthlyTotal
                          const barH = Math.max(2, (savings / maxSavings) * cH)
                          const spacing = cW / allScenarios.length
                          const cx = PAD.left + spacing * i + spacing / 2
                          const barColor = i === 0 ? '#D1D5DB' : '#F87171'
                          const barX = cx - barW / 2
                          const barY = PAD.top + cH - barH
                          return (
                            <g key={s.label}>
                              <rect x={barX} y={barY} width={barW} height={barH} fill={barColor} rx="4" />
                              <text x={cx} y={barY - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={i === 0 ? C.muted : '#DC2626'}>
                                {i === 0 ? '$0' : `+${fmtDollars(savings)}/mo`}
                              </text>
                              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill={C.dim} fontWeight="600">
                                {i === 0 ? 'Market' : s.label.replace('Seller Advantage ', 'SA ')}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  )
                })()}

                {/* ── Section 3: Savings over 120 Months Bar Chart ─────────── */}
                {(() => {
                  const market = scenarios[0]
                  const allScenarios = scenarios
                  const wealthVals = allScenarios.map((s, i) => i === 0 ? 0 : wealthSavings(market, s, 120))
                  const maxW = Math.max(...wealthVals, 1)
                  const W = 560, H = 200, PAD = { top: 30, right: 20, bottom: 40, left: 80 }
                  const cW = W - PAD.left - PAD.right
                  const cH = H - PAD.top - PAD.bottom
                  const barW = Math.min(80, cW / allScenarios.length - 16)
                  return (
                    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4 }}>Savings over 120 Months</div>
                      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Payment savings + equity advantage at 10 years</div>
                      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                        {[0, 0.25, 0.5, 0.75, 1].map(t => {
                          const val = maxW * t
                          const yy = PAD.top + cH - t * cH
                          return (
                            <g key={t}>
                              <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#E4E8EC" strokeWidth="1" />
                              <text x={PAD.left - 6} y={yy + 4} textAnchor="end" fontSize="10" fill={C.muted}>
                                {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${Math.round(val)}`}
                              </text>
                            </g>
                          )
                        })}
                        {allScenarios.map((s, i) => {
                          const val = wealthVals[i]
                          const barH = Math.max(2, (val / maxW) * cH)
                          const spacing = cW / allScenarios.length
                          const cx = PAD.left + spacing * i + spacing / 2
                          const barColor = i === 0 ? '#D1D5DB' : '#3B82F6'
                          const barX = cx - barW / 2
                          const barY = PAD.top + cH - barH
                          return (
                            <g key={s.label}>
                              <rect x={barX} y={barY} width={barW} height={barH} fill={barColor} rx="4" />
                              <text x={cx} y={barY - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={i === 0 ? C.muted : '#1D4ED8'}>
                                {i === 0 ? '$0' : `+${fmtDollars(val)}`}
                              </text>
                              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill={C.dim} fontWeight="600">
                                {i === 0 ? 'Market' : s.label.replace('Seller Advantage ', 'SA ')}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  )
                })()}

                {/* ── Section 4: Interest + MI in 30 Years Bar Chart ───────── */}
                {(() => {
                  const allScenarios = scenarios
                  const totals = allScenarios.map(s => totalInterestAndMI(s))
                  const maxT = Math.max(...totals, 1)
                  const W = 560, H = 220, PAD = { top: 30, right: 20, bottom: 40, left: 80 }
                  const cW = W - PAD.left - PAD.right
                  const cH = H - PAD.top - PAD.bottom
                  const barW = Math.min(80, cW / allScenarios.length - 16)
                  return (
                    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4 }}>Interest and MI Paid in 30 Years</div>
                      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Total interest + mortgage insurance over full loan term</div>
                      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                        {[0, 0.25, 0.5, 0.75, 1].map(t => {
                          const val = maxT * t
                          const yy = PAD.top + cH - t * cH
                          return (
                            <g key={t}>
                              <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#E4E8EC" strokeWidth="1" />
                              <text x={PAD.left - 6} y={yy + 4} textAnchor="end" fontSize="10" fill={C.muted}>
                                {val >= 1000000 ? `$${(val / 1000000).toFixed(2)}M` : val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${Math.round(val)}`}
                              </text>
                            </g>
                          )
                        })}
                        {allScenarios.map((s, i) => {
                          const val = totals[i]
                          const barH = Math.max(2, (val / maxT) * cH)
                          const spacing = cW / allScenarios.length
                          const cx = PAD.left + spacing * i + spacing / 2
                          const barColor = i === 0 ? '#D1D5DB' : '#8B5CF6'
                          const barX = cx - barW / 2
                          const barY = PAD.top + cH - barH
                          return (
                            <g key={s.label}>
                              <rect x={barX} y={barY} width={barW} height={barH} fill={barColor} rx="4" />
                              <text x={cx} y={barY - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={i === 0 ? C.muted : '#6D28D9'}>
                                {fmtDollars(val)}
                              </text>
                              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill={C.dim} fontWeight="600">
                                {i === 0 ? 'Market' : s.label.replace('Seller Advantage ', 'SA ')}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  )
                })()}

                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, padding: '0 4px' }}>
                  * Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan.
                  Rates shown are for illustration purposes only and are subject to credit approval.
                  Taxes, insurance, and HOA estimates may vary. Consult your loan advisor for personalized numbers.
                </div>
              </div>
            ) : (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 32, textAlign: 'center', color: C.muted }}>
                No Seller Advantage scenarios configured for this listing.
              </div>
            )}
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                {page.advisor_photo ? (
                  <img src={page.advisor_photo} alt={page.advisor_name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                    {page.advisor_name?.[0] ?? '?'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: C.navy }}>{page.advisor_name || 'Your Loan Advisor'}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{page.advisor_title || 'Mortgage Advisor'}</div>
                  {page.advisor_nmls && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>NMLS# {page.advisor_nmls}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {page.advisor_phone && (
                  <a href={`tel:${page.advisor_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: C.navy, borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                    <span>📞</span> {page.advisor_phone}
                  </a>
                )}
                {page.advisor_email && (
                  <a href={`mailto:${page.advisor_email}?subject=Question about ${page.address}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.navy, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                    <span>✉️</span> {page.advisor_email}
                  </a>
                )}
              </div>
            </div>
            {/* Partner / Realtor card */}
            {page.partner_name && (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Listing Agent</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                  {page.partner_photo ? (
                    <img src={page.partner_photo} alt={page.partner_name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                      {page.partner_name[0]}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: C.navy }}>{page.partner_name}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{page.partner_title || 'Listing Agent'}</div>
                    {page.partner_nmls && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>NMLS# {page.partner_nmls}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {page.partner_phone && (
                    <a href={`tel:${page.partner_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.navy, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                      📞 {page.partner_phone}
                    </a>
                  )}
                  {page.partner_email && (
                    <a href={`mailto:${page.partner_email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.navy, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                      ✉️ {page.partner_email}
                    </a>
                  )}
                </div>
              </div>
            )}

            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.navy, marginBottom: 16 }}>Get Pre-Qualified</div>
              <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 16 }}>
                Ready to make an offer? Contact your advisor to get pre-qualified and lock in the Seller Advantage rate for this property.
              </div>
              {page.advisor_phone && (
                <a href={`tel:${page.advisor_phone}`} style={{ display: 'block', padding: '13px', background: C.accent, borderRadius: 10, color: C.navy, fontWeight: 800, fontSize: 15, textDecoration: 'none', textAlign: 'center' }}>
                  Call Now →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header { background: #0A2540 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          button { display: none !important; }
          [style*="position: fixed"] { display: none !important; }
          .print-hide { display: none !important; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Montserrat', system-ui, sans-serif; }
        a { color: inherit; }
      `}</style>
    </div>
  )
}
