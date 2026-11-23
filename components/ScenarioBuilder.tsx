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
}

const DEFAULT_DRAFT: ScenarioDraft = {
  loanType: 'Conventional',
  downPct: '5',
  noteRate: '7.375',
  buydownType: '1-0',
  permanentRate: '',
  apr: '',
  label: '',
}

interface Props {
  listPrice: number
  existingScenarios: any[]
  onSave: (scenarios: any[]) => void
  onClose: () => void
}

export default function ScenarioBuilder({ listPrice, existingScenarios, onSave, onClose }: Props) {
  const [shared, setShared] = useState<SharedCosts>({ monthlyTax: '', monthlyInsurance: '', monthlyHoa: '0' })
  const [price, setPrice] = useState(String(listPrice || ''))
  const [draft, setDraft] = useState<ScenarioDraft>(DEFAULT_DRAFT)
  const [scenarios, setScenarios] = useState<any[]>(existingScenarios ?? [])
  const [preview, setPreview] = useState<ReturnType<typeof calculateScenario> | null>(null)
  const [err, setErr] = useState('')

  function set(field: keyof ScenarioDraft, val: string) {
    setDraft(d => ({ ...d, [field]: val }))
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
              <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 4 }}>Shared Property Costs</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Set once — flows through every scenario</div>
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
            </div>

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
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>Scenarios ({scenarios.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scenarios.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                          {fmtRate(s.buydown_rate)} Y1
                          {s.piti_schedule && s.piti_schedule[0].piti > s.piti_schedule[0].pi
                            ? ` · PITI ${fmt$(s.piti_schedule[0].piti)}/mo`
                            : ` · P&I ${fmt$(s.buydown_payment)}/mo`}
                          {s.total_subsidy > 0 && ` · Subsidy ${fmt$(s.total_subsidy)}`}
                        </div>
                      </div>
                      <button
                        onClick={() => removeScenario(i)}
                        style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
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
