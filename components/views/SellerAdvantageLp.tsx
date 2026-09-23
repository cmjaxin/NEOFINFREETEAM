// SQL: create table if not exists seller_advantage_pages (id uuid primary key default gen_random_uuid(), created_by uuid references auth.users(id), slug text unique not null, sales_price numeric, quote_date date, scenarios jsonb, updated_at timestamptz default now());
// SQL: alter table seller_advantage_pages enable row level security;
// SQL: create policy "owner full access" on seller_advantage_pages for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
// SQL: create policy "public read" on seller_advantage_pages for select using (true);
'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/appContext'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a',
}

interface SAScenario {
  header: string
  rate: number
  apr: number
  payment: number
}

interface SAPage {
  id: string
  slug: string
  created_by: string
  sales_price: number
  quote_date: string
  scenarios: SAScenario[]
  updated_at: string
}

const DEFAULT_SCENARIOS: SAScenario[] = [
  { header: 'FHA Market Price',   rate: 6.75, apr: 7.463, payment: 4103 },
  { header: 'Permanent Buydown', rate: 5.60,  apr: 6.544, payment: 3704 },
  { header: 'Temp. Buydown',     rate: 6.75,  apr: 7.463, payment: 3110 },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function Field({ label, value, onChange, half = false, type = 'text', placeholder = '', note = '' }: {
  label: string; value: string; onChange: (v: string) => void
  half?: boolean; type?: string; placeholder?: string; note?: string
}) {
  return (
    <div style={{ flex: half ? '0 0 calc(50% - 6px)' : '1 1 100%', minWidth: 0 }}>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white, boxSizing: 'border-box' }}
      />
      {note && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  )
}

export default function SellerAdvantageLp() {
  const { supabase, profile } = useApp()
  const [page, setPage] = useState<SAPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [salesPrice, setSalesPrice] = useState('545000')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10))
  const [scenarios, setScenarios] = useState<SAScenario[]>(DEFAULT_SCENARIOS)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('seller_advantage_pages')
      .select('*')
      .eq('created_by', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPage(data as SAPage)
          setSalesPrice(String(data.sales_price ?? 545000))
          setQuoteDate(data.quote_date ?? new Date().toISOString().slice(0, 10))
          setScenarios((data.scenarios as SAScenario[]) ?? DEFAULT_SCENARIOS)
        }
        setLoading(false)
      })
  }, [profile?.id, supabase])

  function updateScenario(i: number, field: keyof SAScenario, value: string) {
    setScenarios(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: field === 'header' ? value : parseFloat(value) || 0 } : s))
  }

  async function save() {
    if (!profile) return
    setSaving(true)
    setMsg('')

    const slug = page?.slug ?? 'sa-' + slugify(profile.full_name || profile.email || profile.id)
    const payload = {
      created_by: profile.id,
      slug,
      sales_price: parseFloat(salesPrice.replace(/,/g, '')) || 0,
      quote_date: quoteDate,
      scenarios,
      updated_at: new Date().toISOString(),
    }

    let res
    if (page?.id) {
      res = await supabase.from('seller_advantage_pages').update(payload).eq('id', page.id).select().single()
    } else {
      res = await supabase.from('seller_advantage_pages').insert(payload).select().single()
    }

    if (res.error) {
      setMsg('Save failed: ' + res.error.message)
    } else {
      setPage(res.data as SAPage)
      setMsg('Saved!')
      setTimeout(() => setMsg(''), 3000)
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, color: C.muted }}>Loading…</div>

  const liveUrl = page?.slug ? `${typeof window !== 'undefined' ? window.location.origin : 'https://www.neofinfree.com'}/seller-advantage/${page.slug}` : null

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: C.navy }}>Seller Advantage LP</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Your personal explainer page showing buyers how seller-paid rate reductions work.</div>
        {liveUrl && (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 10, fontSize: 13, color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
            🔗 View Live Page →
          </a>
        )}
      </div>

      {/* Page Details */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>Page Settings</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Sales Price" value={salesPrice} onChange={setSalesPrice} half placeholder="545000" note="Used in the page header and disclaimer" />
          <Field label="Quote Date" value={quoteDate} onChange={setQuoteDate} half type="date" note="Displayed as 'Rates quoted as of…'" />
        </div>
      </div>

      {/* Scenarios */}
      {scenarios.map((s, i) => (
        <div key={i} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
            Scenario {i + 1}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Column Header" value={s.header} onChange={v => updateScenario(i, 'header', v)} />
            <Field label="Interest Rate (%)" value={String(s.rate)} onChange={v => updateScenario(i, 'rate', v)} half placeholder="6.75" />
            <Field label="APR (%)" value={String(s.apr)} onChange={v => updateScenario(i, 'apr', v)} half placeholder="7.463" />
            <Field label="Total Monthly Payment ($)" value={String(s.payment)} onChange={v => updateScenario(i, 'payment', v)} half placeholder="4103" note="Full monthly payment (P&I + MI + taxes)" />
          </div>
        </div>
      ))}

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <button onClick={save} disabled={saving}
          style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {msg && <div style={{ fontSize: 14, color: msg.startsWith('Save failed') ? '#dc2626' : C.green, fontWeight: 600 }}>{msg}</div>}
      </div>
    </div>
  )
}
