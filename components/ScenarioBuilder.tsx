'use client'
import { useState, useEffect } from 'react'
import { calculateScenario, toRateScenario, ScenarioInputs } from '@/lib/mortgageMath'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a', red: '#dc2626', yellow: '#d97706', purple: '#7C3AED',
}

type BuydownType = 'none' | '1-0' | '2-1' | '3-2-1' | 'permanent'
type LoanType = 'Conventional' | 'FHA' | 'VA' | 'USDA'

const BUYDOWN_OPTIONS: { value: BuydownType; label: string }[] = [
  { value: 'none',      label: 'No Buydown (Market Rate)' },
  { value: '1-0',       label: '1-0 Temporary Buydown' },
  { value: '2-1',       label: '2-1 Temporary Buydown' },
  { value: '3-2-1',     label: '3-2-1 Temporary Buydown' },
  { value: 'permanent', label: 'Permanent Buydown' },
]

const LOAN_TYPES: LoanType[] = ['Conventional', 'FHA', 'VA', 'USDA']

function fmt$(n: number) { return '$' + Math.round(n).toLocaleString() }
function fmtRate(n: number) { return n.toFixed(3).replace(/\.?0+$/, '') + '%' }

function InputRow({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 180px', minWidth: 150 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
      {children}
      {note && <div style={{ fontSize: 10.5, color: C.muted }}>{note}</div>}
    </div>
  )
}

function NumInput({ value, onChange, prefix, suffix, step = '0.01' }: {
  value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; step?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, overflow: 'hidden' }}>
      {prefix && <span style={{ padding: '0 8px', fontSize: 13, color: C.muted, background: C.bg, borderRight: `1px solid ${C.border}`, lineHeight: '36px', flexShrink: 0 }}>{prefix}</span>}
      <input
        type="number" step={step} value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, padding: '8px 10px', border: 'none', outline: 'none', fontSize: 14, color: C.text, background: 'transparent', minWidth: 0 }}
      />
      {suffix && <span style={{ padding: '0 8px', fontSize: 13, color: C.muted, flexShrink: 0 }}>{suffix}</span>}
    </div>
  )
}

interface SharedCosts {
  monthlyTax: string
  monthlyInsurance: string
  monthlyHoa: string
}

interface ScenarioDraft {
  loanType: LoanType
  downPct: string
  noteRate: string
  buydownType: BuydownType
  permanentRate: string
  apr: string
  label: string
  // Manual overrides — when set, skip calculateScenario and build row directly
  buydownRate: string
  marketRate: string
  buydownPayment: string
  marketPayment: string
  totalSubsidy: string
}

const DEFAULT_DRAFT: ScenarioDraft = {
  loanType: 'Conventional',
  downPct: '5',
  noteRate: '7.375',
  buydownType: '1-0',
  permanentRate: '',
  apr: '',
  label: '',
  buydownRate: '',
  marketRate: '',
  buydownPayment: '',
  marketPayment: '',
  totalSubsidy: '',
}

// ─── Inline scenario editor ───────────────────────────────────────────────────

function ScenarioList({ scenarios, setScenarios }: {
  scenarios: any[]
  setScenarios: React.Dispatch<React.SetStateAction<any[]>>
}) {
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState<any>(null)

  function startEdit(i: number) {
    setEditing(i)
    const s = scenarios[i]
    setDraft({
      label: s.label ?? '',
      market_rate: String(s.market_rate ?? ''),
      buydown_rate: String(s.buydown_rate ?? ''),
      market_payment: String(s.market_payment ?? ''),
      buydown_payment: String(s.buydown_payment ?? ''),
      apr: String(s.apr ?? ''),
      down_pct: String(s.down_pct ?? ''),
      loan_type: s.loan_type ?? 'Conventional',
      total_subsidy: String(s.total_subsidy ?? ''),
    })
  }

  function saveEdit(i: number) {
    setScenarios(prev => prev.map((s, idx) => {
      if (idx !== i) return s
      const newMarketRate = parseFloat(draft.market_rate) || s.market_rate
      const newBuydownRate = parseFloat(draft.buydown_rate) || s.buydown_rate
      const newMarketPayment = parseFloat(draft.market_payment) || s.market_payment
      const newBuydownPayment = parseFloat(draft.buydown_payment) || s.buydown_payment
      const origMarketRate = s.market_rate

      // Rebuild piti_schedule: preserve structure (4 entries), update year-1 and market-rate entries
      const newSchedule = (s.piti_schedule ?? []).map((entry: any, ei: number) => {
        const taxIns = (entry.piti ?? 0) - (entry.pi ?? 0) // preserve tax+ins+hoa portion
        if (ei === 0) {
          return { ...entry, rate: newBuydownRate, pi: newBuydownPayment, piti: newBuydownPayment + taxIns }
        }
        if (Math.abs(entry.rate - origMarketRate) < 0.0001) {
          return { ...entry, rate: newMarketRate, pi: newMarketPayment, piti: newMarketPayment + taxIns }
        }
        // Intermediate buydown years (2-1, 3-2-1): scale the spread proportionally
        const origSpread = origMarketRate - entry.rate
        const newSpread = newMarketRate - newBuydownRate
        const origTotalSpread = origMarketRate - s.buydown_rate
        const ratio = origTotalSpread > 0 ? origSpread / origTotalSpread : 0
        const newRate = newMarketRate - ratio * newSpread
        const pi = newMarketPayment * (newBuydownPayment / newMarketPayment) ** ratio
        return { ...entry, rate: newRate, pi: Math.round(pi), piti: Math.round(pi) + taxIns }
      })

      return {
        ...s,
        label: draft.label || s.label,
        market_rate: newMarketRate,
        buydown_rate: newBuydownRate,
        market_payment: newMarketPayment,
        buydown_payment: newBuydownPayment,
        apr: parseFloat(draft.apr) || s.apr,
        down_pct: parseFloat(draft.down_pct) || s.down_pct,
        loan_type: draft.loan_type || s.loan_type,
        total_subsidy: parseFloat(draft.total_subsidy) || s.total_subsidy,
        piti_schedule: newSchedule,
      }
    }))
    setEditing(null)
    setDraft(null)
  }

  const inp: React.CSSProperties = {
    width: '100%', border: `1px solid ${C.border}`, borderRadius: 7,
    padding: '6px 9px', fontSize: 13, color: C.text, background: C.white,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>
        Scenarios ({scenarios.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scenarios.map((s, i) => (
          <div key={i} style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {/* Collapsed row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                  {fmtRate(s.buydown_rate)} Y1 → {fmtRate(s.market_rate)} market
                  {s.piti_schedule && s.piti_schedule[0]?.piti > s.piti_schedule[0]?.pi
                    ? ` · PITI ${fmt$(s.piti_schedule[0].piti)}/mo`
                    : ` · P&I ${fmt$(s.buydown_payment)}/mo`}
                  {s.total_subsidy > 0 && ` · Subsidy ${fmt$(s.total_subsidy)}`}
                </div>
              </div>
              <button
                onClick={() => editing === i ? setEditing(null) : startEdit(i)}
                style={{ background: editing === i ? C.navy : C.white, color: editing === i ? C.white : C.navy, border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                {editing === i ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={() => setScenarios(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>

            {/* Expanded edit form */}
            {editing === i && draft && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 14px 16px', background: C.white }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Label</div>
                    <input style={{ ...inp, gridColumn: '1 / -1' }} value={draft.label} onChange={e => setDraft((d: any) => ({ ...d, label: e.target.value }))} placeholder="Scenario label" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loan Type</div>
                    <select value={draft.loan_type} onChange={e => setDraft((d: any) => ({ ...d, loan_type: e.target.value }))}
                      style={{ ...inp }}>
                      {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Down %</div>
                    <input style={inp} type="number" step="0.5" value={draft.down_pct} onChange={e => setDraft((d: any) => ({ ...d, down_pct: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Initial (Buydown) Rate %</div>
                    <input style={inp} type="number" step="0.001" value={draft.buydown_rate} onChange={e => setDraft((d: any) => ({ ...d, buydown_rate: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Rate %</div>
                    <input style={inp} type="number" step="0.001" value={draft.market_rate} onChange={e => setDraft((d: any) => ({ ...d, market_rate: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Initial Payment /mo</div>
                    <input style={inp} type="number" step="1" value={draft.buydown_payment} onChange={e => setDraft((d: any) => ({ ...d, buydown_payment: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Payment /mo</div>
                    <input style={inp} type="number" step="1" value={draft.market_payment} onChange={e => setDraft((d: any) => ({ ...d, market_payment: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>APR %</div>
                    <input style={inp} type="number" step="0.001" value={draft.apr} onChange={e => setDraft((d: any) => ({ ...d, apr: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buydown Cost $</div>
                    <input style={inp} type="number" step="100" value={draft.total_subsidy} onChange={e => setDraft((d: any) => ({ ...d, total_subsidy: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => saveEdit(i)}
                    style={{ background: C.navy, color: C.white, border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main builder ─────────────────────────────────────────────────────────────

interface Props {
  listPrice: number
  existingScenarios: any[]
  onSave: (scenarios: any[]) => void
  onClose: () => void
  zip?: string
  state?: string
}

export default function ScenarioBuilder({ listPrice, existingScenarios, onSave, onClose, zip, state }: Props) {
  const [shared, setShared] = useState<SharedCosts>({ monthlyTax: '', monthlyInsurance: '', monthlyHoa: '0' })
  const [price, setPrice] = useState(String(listPrice || ''))
  const [estimating, setEstimating] = useState(false)
  const [estimateNote, setEstimateNote] = useState('')
  const [draft, setDraft] = useState<ScenarioDraft>(DEFAULT_DRAFT)
  const [scenarios, setScenarios] = useState<any[]>(existingScenarios ?? [])
  const [preview, setPreview] = useState<ReturnType<typeof calculateScenario> | null>(null)
  const [err, setErr] = useState('')

  function set(field: keyof ScenarioDraft, val: string) {
    setDraft(d => ({ ...d, [field]: val }))
  }

  async function estimateFromZip() {
    const p = parseFloat(price) || listPrice
    if (!p) { setEstimateNote('Enter a purchase price first.'); return }
    setEstimating(true); setEstimateNote('')
    try {
      const res = await fetch('/api/estimate-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip, state, listPrice: p }),
      })
      const data = await res.json()
      if (data.monthlyTax) setShared(s => ({ ...s, monthlyTax: String(Math.round(data.monthlyTax)) }))
      if (data.monthlyInsurance) setShared(s => ({ ...s, monthlyInsurance: String(Math.round(data.monthlyInsurance)) }))
      setEstimateNote(data.note ?? 'Estimated from state averages.')
    } catch {
      setEstimateNote('Could not estimate. Enter manually.')
    }
    setEstimating(false)
  }

  // Live preview calculation
  useEffect(() => {
    const p = parseFloat(price)
    const down = parseFloat(draft.downPct)
    const rate = parseFloat(draft.noteRate)
    const tax = parseFloat(shared.monthlyTax) || 0
    const ins = parseFloat(shared.monthlyInsurance) || 0
    const hoa = parseFloat(shared.monthlyHoa) || 0
    if (!p || !down || !rate) { setPreview(null); return }
    try {
      const inputs: ScenarioInputs = {
        listPrice: p, downPct: down, loanType: draft.loanType,
        noteRate: rate, termYears: 30, buydownType: draft.buydownType,
        permanentRate: draft.permanentRate ? parseFloat(draft.permanentRate) : undefined,
        monthlyTax: tax, monthlyInsurance: ins, monthlyHoa: hoa,
        apr: draft.apr ? parseFloat(draft.apr) : undefined,
        label: draft.label || undefined,
      }
      setPreview(calculateScenario(inputs))
      setErr('')
    } catch (e: any) { setErr(e.message); setPreview(null) }
  }, [draft, shared, price])

  function addScenario() {
    // If manual overrides are present, build the row directly without auto-calculation
    const hasManual = draft.buydownRate || draft.marketRate || draft.buydownPayment || draft.marketPayment
    if (hasManual) {
      const p = parseFloat(price) || listPrice
      const down = parseFloat(draft.downPct) || 0
      const loanAmt = p * (1 - down / 100)
      const mr = parseFloat(draft.marketRate) || parseFloat(draft.noteRate) || 0
      const br = parseFloat(draft.buydownRate) || mr
      const mp = parseFloat(draft.marketPayment) || 0
      const bp = parseFloat(draft.buydownPayment) || mp
      const tax = parseFloat(shared.monthlyTax) || 0
      const ins = parseFloat(shared.monthlyInsurance) || 0
      const hoa = parseFloat(shared.monthlyHoa) || 0
      const taxIns = tax + ins + hoa
      // Build a piti_schedule matching the buydown type
      const isBuydown = br < mr
      const schedule: Array<{rate: number; pi: number; piti: number}> = isBuydown
        ? (() => {
            const years = draft.buydownType === '3-2-1' ? 3 : draft.buydownType === '2-1' ? 2 : 1
            const entries: Array<{rate: number; pi: number; piti: number}> = []
            for (let y = 0; y < years; y++) {
              const spread = mr - br
              const yr = draft.buydownType === '3-2-1' ? br + (spread * y / (years - 1 || 1)) : draft.buydownType === '2-1' ? (y === 0 ? br : br + (mr - br) / 2) : br
              const pi = y === 0 ? bp : Math.round(bp + (mp - bp) * y / years)
              entries.push({ rate: y === 0 ? br : yr, pi: y === 0 ? bp : pi, piti: (y === 0 ? bp : pi) + taxIns })
            }
            entries.push({ rate: mr, pi: mp, piti: mp + taxIns })
            return entries
          })()
        : [{ rate: mr, pi: mp, piti: mp + taxIns }]
      const manualRow = {
        label: draft.label || `${draft.loanType} · ${down}% Down`,
        loan_type: draft.loanType,
        down_pct: down,
        loan_amount: loanAmt,
        buydown_rate: br,
        market_rate: mr,
        buydown_payment: bp,
        market_payment: mp,
        apr: parseFloat(draft.apr) || mr,
        total_subsidy: parseFloat(draft.totalSubsidy) || 0,
        piti_schedule: schedule,
        term_years: 30,
      }
      setScenarios(prev => [...prev, manualRow])
      setDraft(d => ({ ...DEFAULT_DRAFT, noteRate: d.noteRate, buydownType: d.buydownType === 'none' ? '1-0' : d.buydownType }))
      return
    }
    if (!preview) return
    const row = toRateScenario(preview)
    setScenarios(prev => [...prev, row])
    // Reset draft for next scenario, keeping shared costs
    setDraft(d => ({ ...DEFAULT_DRAFT, noteRate: d.noteRate, buydownType: d.buydownType === 'none' ? '1-0' : d.buydownType }))
  }

  function removeScenario(i: number) {
    setScenarios(prev => prev.filter((_, idx) => idx !== i))
  }

  const buydownYears = draft.buydownType === '3-2-1' ? 3 : draft.buydownType === '2-1' ? 2 : draft.buydownType === '1-0' ? 1 : 0

  const panelStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,37,64,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }

  const modalStyle: React.CSSProperties = {
    background: C.white, borderRadius: 18, width: '100%', maxWidth: 820,
    maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  }

  return (
    <div style={panelStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.navy, borderRadius: '18px 18px 0 0' }}>
          <div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 17 }}>Scenario Builder</div>
            <div style={{ color: '#7E9AB5', fontSize: 12, marginTop: 2 }}>Build financing scenarios with live PITI calculations</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#7E9AB5', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Purchase Price */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>Property</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <InputRow label="Purchase Price">
                  <NumInput value={price} onChange={setPrice} prefix="$" step="1000" />
                </InputRow>
              </div>
            </div>

            {/* Shared costs — set once */}
            <div style={{ background: C.bg, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Shared Property Costs</div>
                {(zip || state) && (
                  <button
                    onClick={estimateFromZip}
                    disabled={estimating}
                    style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: 'rgba(91,203,245,0.1)', border: `1px solid rgba(91,203,245,0.3)`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', opacity: estimating ? 0.6 : 1 }}
                  >
                    {estimating ? 'Estimating…' : '⚡ Estimate from zip'}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                Set once — flows through every scenario{estimateNote && <span style={{ color: C.green, marginLeft: 8 }}>{estimateNote}</span>}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <InputRow label="Monthly Taxes" note="e.g. annual tax ÷ 12">
                  <NumInput value={shared.monthlyTax} onChange={v => setShared(s => ({ ...s, monthlyTax: v }))} prefix="$" step="10" />
                </InputRow>
                <InputRow label="Monthly Insurance">
                  <NumInput value={shared.monthlyInsurance} onChange={v => setShared(s => ({ ...s, monthlyInsurance: v }))} prefix="$" step="10" />
                </InputRow>
                <InputRow label="Monthly HOA">
                  <NumInput value={shared.monthlyHoa} onChange={v => setShared(s => ({ ...s, monthlyHoa: v }))} prefix="$" step="10" />
                </InputRow>
              </div>
            </div>

            {/* Scenario inputs */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>Build a Scenario</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <InputRow label="Loan Type">
                  <select
                    value={draft.loanType}
                    onChange={e => set('loanType', e.target.value)}
                    style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.white, outline: 'none' }}
                  >
                    {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </InputRow>
                <InputRow label="Down Payment">
                  <NumInput value={draft.downPct} onChange={v => set('downPct', v)} suffix="%" step="0.5" />
                </InputRow>
                <InputRow label="Note Rate">
                  <NumInput value={draft.noteRate} onChange={v => set('noteRate', v)} suffix="%" step="0.125" />
                </InputRow>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                <InputRow label="Buydown Structure">
                  <select
                    value={draft.buydownType}
                    onChange={e => set('buydownType', e.target.value)}
                    style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.white, outline: 'none' }}
                  >
                    {BUYDOWN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </InputRow>
                {draft.buydownType === 'permanent' && (
                  <InputRow label="Permanent Rate" note="Bought-down note rate">
                    <NumInput value={draft.permanentRate} onChange={v => set('permanentRate', v)} suffix="%" step="0.125" />
                  </InputRow>
                )}
                <InputRow label="APR" note="Optional — overrides estimate">
                  <NumInput value={draft.apr} onChange={v => set('apr', v)} suffix="%" step="0.001" />
                </InputRow>
                <InputRow label="Scenario Label" note="Optional — auto-generated if blank">
                  <input
                    value={draft.label}
                    onChange={e => set('label', e.target.value)}
                    placeholder="e.g. FHA · 3.5% Down · 2-1 Buydown"
                    style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.white, outline: 'none' }}
                  />
                </InputRow>
              </div>

              {/* Manual override fields — mirrors the edit form */}
              <div style={{ marginTop: 16, padding: 14, background: 'rgba(91,203,245,0.06)', border: `1px solid rgba(91,203,245,0.2)`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Manual Override <span style={{ fontWeight: 400, color: C.muted, textTransform: 'none', letterSpacing: 0 }}>— enter values directly instead of auto-calculating</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <InputRow label="Initial (Buydown) Rate %" note="Overrides calculated rate">
                    <NumInput value={draft.buydownRate} onChange={v => set('buydownRate', v)} suffix="%" step="0.001" />
                  </InputRow>
                  <InputRow label="Market Rate %" note="Overrides note rate">
                    <NumInput value={draft.marketRate} onChange={v => set('marketRate', v)} suffix="%" step="0.001" />
                  </InputRow>
                  <InputRow label="Initial Payment /mo">
                    <NumInput value={draft.buydownPayment} onChange={v => set('buydownPayment', v)} prefix="$" step="1" />
                  </InputRow>
                  <InputRow label="Market Payment /mo">
                    <NumInput value={draft.marketPayment} onChange={v => set('marketPayment', v)} prefix="$" step="1" />
                  </InputRow>
                  <InputRow label="Buydown Cost $">
                    <NumInput value={draft.totalSubsidy} onChange={v => set('totalSubsidy', v)} prefix="$" step="100" />
                  </InputRow>
                </div>
              </div>
            </div>

            {/* Manual override add button — shown when overrides are present but no auto-preview */}
            {!preview && (draft.buydownRate || draft.marketRate || draft.buydownPayment || draft.marketPayment) && (
              <div style={{ background: C.navy, borderRadius: 14, padding: 18 }}>
                <div style={{ color: '#7EC8E3', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Manual Entry Ready</div>
                <div style={{ color: '#9EB4C8', fontSize: 12, marginBottom: 12 }}>
                  Using manually entered values. Fill in a purchase price above to also see the auto-calculated preview.
                </div>
                <button
                  onClick={addScenario}
                  style={{ padding: '10px 20px', background: C.accent, border: 'none', borderRadius: 9, color: C.navy, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                >
                  + Add this scenario
                </button>
              </div>
            )}

            {/* Live preview */}
            {preview && (
              <div style={{ background: C.navy, borderRadius: 14, padding: 18, color: C.white }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: '#7EC8E3' }}>Live Preview — {preview.label}</div>
                <div style={{ fontSize: 11.5, color: '#7E9AB5', marginBottom: 8 }}>
                  Loan: {fmt$(preview.loanAmount)} · Down: {preview.downPct}%
                  {preview.totalSubsidy > 0 && <> · Buydown cost: {fmt$(preview.totalSubsidy)}</>}
                </div>

                {/* Year-by-year table */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {preview.schedule.map((yr, i) => {
                    const isLast = i === preview.schedule.length - 1
                    const isBuydown = yr.rate < preview.noteRate
                    return (
                      <div key={i} style={{
                        flex: '1 1 140px', background: isBuydown ? 'rgba(91,203,245,0.15)' : 'rgba(255,255,255,0.07)',
                        borderRadius: 10, padding: '12px 14px',
                        border: isBuydown ? '1px solid rgba(91,203,245,0.3)' : '1px solid rgba(255,255,255,0.1)',
                      }}>
                        <div style={{ fontSize: 10.5, color: isBuydown ? C.accent : '#7E9AB5', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                          {isLast && !isBuydown ? `Year ${i + 1}+` : `Year ${i + 1}`}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: isBuydown ? C.accent : C.white }}>{fmtRate(yr.rate)}</div>
                        <div style={{ fontSize: 11, color: '#9EB4C8', marginTop: 4 }}>P&amp;I {fmt$(yr.pi)}/mo</div>
                        {(parseFloat(shared.monthlyTax) + parseFloat(shared.monthlyInsurance) + parseFloat(shared.monthlyHoa)) > 0 && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.white, marginTop: 3 }}>PITI {fmt$(yr.piti)}/mo</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {preview.schedule[0].piti > preview.schedule[0].pi && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: '#7E9AB5' }}>
                    Year 1 PITI: <span style={{ color: C.accent, fontWeight: 700 }}>{fmt$(preview.schedule[0].piti)}/mo</span>
                    {' · '}Final PITI: <span style={{ color: '#ccc', fontWeight: 700 }}>{fmt$(preview.finalPITI)}/mo</span>
                  </div>
                )}

                <button
                  onClick={addScenario}
                  style={{ marginTop: 14, padding: '10px 20px', background: C.accent, border: 'none', borderRadius: 9, color: C.navy, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                >
                  + Add this scenario
                </button>
              </div>
            )}

            {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}

            {/* Scenario list */}
            {scenarios.length > 0 && (
              <ScenarioList scenarios={scenarios} setScenarios={setScenarios} />
            )}

          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => { onSave(scenarios); onClose() }}
            disabled={scenarios.length === 0}
            style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: scenarios.length ? C.navy : C.border, color: scenarios.length ? C.white : C.muted, fontSize: 14, fontWeight: 700, cursor: scenarios.length ? 'pointer' : 'not-allowed' }}
          >
            Save {scenarios.length} Scenario{scenarios.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
