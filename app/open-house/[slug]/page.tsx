'use client'
import { useState, useEffect, useRef, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildScenarios, cumulativeCost, totalOutOfPocket, breakevenMonths, fmtDollars, fmtRate, TCAInputs, LoanScenario } from '@/lib/openHouseMath'

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
  advisor_name: string; advisor_title: string; advisor_email: string
  advisor_phone: string; advisor_photo: string; advisor_nmls: string
  partner_name: string; partner_title: string; partner_email: string
  partner_phone: string; partner_photo: string; partner_nmls: string
}

export default function OpenHousePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = use(paramsPromise)
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'tca' | 'contact'>('overview')

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
        setPage({ partner_name: '', partner_title: '', partner_email: '', partner_phone: '', partner_photo: '', partner_nmls: '', ...row } as PageData)
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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: C.navy, padding: '14px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/neo-logo.png" alt="NEO Home Loans" style={{ height: 32, width: 'auto' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()}
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Print / Save PDF
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
                {/* SA explanation */}
                <div style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1a4a7c 100%)', borderRadius: 14, padding: 24, color: '#fff' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>What is Seller Advantage?</div>
                  <div style={{ fontSize: 14, lineHeight: 1.75, opacity: 0.85 }}>
                    With the Seller Advantage program, the seller contributes <strong>{fmtDollars(page.seller_contribution)}</strong> to permanently buy down your interest rate.
                    This rolls into the purchase price (<strong>{fmtPrice(saPurchasePrice)}</strong>) but dramatically lowers your monthly payment — saving you real money every month for the life of the loan.
                  </div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seller Contribution</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{fmtDollars(page.seller_contribution)}</div>
                    </div>
                    {scenarios.length > 1 && (() => {
                      const monthlySavings = Math.max(0, scenarios[0].monthlyTotal - scenarios[1].monthlyTotal)
                      const breakeven = breakevenMonths(scenarios[0], scenarios[1], inputs.downPct)
                      const annualSavings = monthlySavings * 12
                      return (
                        <div style={{ display: 'contents' }}>
                          <div>
                            <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Savings</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{fmtDollars(monthlySavings)}/mo</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Annual Savings</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{fmtDollars(annualSavings)}/yr</div>
                          </div>
                          {breakeven && (
                            <div>
                              <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Breakeven</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{(breakeven / 12).toFixed(1)} yrs</div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Monthly comparison */}
                <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4 }}>Monthly Payment Comparison</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Including taxes, insurance{page.hoa_monthly ? ', and HOA' : ''}</div>
                  <PaymentBars scenarios={scenarios} />
                </div>

                {/* ARM detail section */}
                {(() => {
                  const armS = scenarios.find(s => s.isArm)
                  if (!armS) return null
                  const fixedYrs = (armS.armFixedMonths ?? 0) / 12
                  const adjustedRate = armS.armAdjustedRate ?? inputs.marketRate
                  const adjustedPI = armS.armAdjustedMonthlyPI ?? 0
                  const adjustedTotal = armS.armAdjustedMonthlyTotal ?? 0
                  const balAtAdjust = armS.armBalanceAtAdjustment ?? 0
                  const savingsVsMarket30 = cumulativeCost(scenarios[0], 360) - cumulativeCost(armS, 360)
                  return (
                    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, background: '#F0F9FF' }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: C.navy }}>ARM Breakdown: {armS.label}</div>
                        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>How the payment changes when the fixed period ends</div>
                      </div>
                      {/* Phase timeline */}
                      <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
                          <div style={{ flex: fixedYrs, background: C.accent, borderRadius: '8px 0 0 8px', padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Years 1–{fixedYrs} (Fixed)</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{fmtPrice(Math.round(armS.monthlyPI))}<span style={{ fontSize: 12, fontWeight: 400 }}>/mo P&I</span></div>
                            <div style={{ fontSize: 12, color: C.navy, opacity: 0.7, marginTop: 2 }}>Rate: {fmtRate(armS.rate)}</div>
                          </div>
                          <div style={{ flex: 30 - fixedYrs, background: '#E9EDF2', borderRadius: '0 8px 8px 0', padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Years {fixedYrs + 1}–30 (Adjusted)</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: C.dim }}>{fmtPrice(Math.round(adjustedPI))}<span style={{ fontSize: 12, fontWeight: 400 }}>/mo P&I</span></div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Rate adjusts to: {fmtRate(adjustedRate)} (estimated)</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                          {[
                            { label: 'Balance at Rate Reset', val: fmtDollars(balAtAdjust), note: `After ${fixedYrs} yrs of payments` },
                            { label: 'Payment Increase at Reset', val: fmtPrice(Math.round(adjustedTotal - armS.monthlyTotal)) + '/mo', note: 'vs fixed period payment' },
                            { label: '30yr Savings vs Market', val: savingsVsMarket30 >= 0 ? fmtDollars(savingsVsMarket30) : `–${fmtDollars(Math.abs(savingsVsMarket30))}`, note: 'total cumulative difference', highlight: savingsVsMarket30 >= 0 },
                          ].map(item => (
                            <div key={item.label} style={{ padding: '12px 14px', background: C.bg, borderRadius: 8 }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{item.label}</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: item.highlight ? C.green : C.dim }}>{item.val}</div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.note}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(91,203,245,0.08)', borderRadius: 8, fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
                          <strong>Strategy tip:</strong> The ARM gives the lowest payment for the first {fixedYrs} years. If you plan to sell or refinance before year {fixedYrs}, you capture maximum savings with no rate adjustment risk. The fixed rate locks in security if you stay longer.
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Cumulative cost chart */}
                <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4 }}>Total Cost Over Time</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Cumulative payments including all monthly costs</div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                    {scenarios.map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <div style={{ width: 24, height: 3, background: s.color, borderRadius: 99 }} />
                        <span style={{ color: C.dim, fontWeight: 600 }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <CumulativeChart scenarios={scenarios} />
                </div>

                {/* Comparison table */}
                <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 16 }}>Scenario Comparison</div>
                  <ComparisonTable scenarios={scenarios} inputs={inputs} />
                </div>

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
