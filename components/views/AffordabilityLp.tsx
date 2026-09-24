// SQL: create table if not exists affordability_pages (id uuid primary key default gen_random_uuid(), created_by uuid references auth.users(id), slug text unique not null, sales_price numeric, quote_date date, seller_advantage_subheading text, image_urls text[] default '{}', ai_headline text, ai_explainer text, ai_talking_point text, scenarios jsonb, updated_at timestamptz default now());
// SQL (migration): alter table affordability_pages add column if not exists sales_price numeric; alter table affordability_pages add column if not exists quote_date date; alter table affordability_pages add column if not exists seller_advantage_subheading text;
// SQL: alter table affordability_pages enable row level security;
// SQL: create policy "owner full access" on affordability_pages for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
// SQL: create policy "public read" on affordability_pages for select using (true);
'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/appContext'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a', red: '#dc2626',
}

interface AFScenario { header: string; rate: number; apr: number; payment: number }

interface AFPage {
  id: string; slug: string; created_by: string
  sales_price: number; quote_date: string; seller_advantage_subheading: string | null
  image_urls: string[]
  ai_headline: string | null; ai_explainer: string | null; ai_talking_point: string | null
  scenarios: AFScenario[]
  updated_at: string
}

const DEFAULT_SCENARIOS: AFScenario[] = [
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
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white, boxSizing: 'border-box' }} />
      {note && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  )
}

const IMAGE_LABELS = [
  'Chart 1 — Top Left',
  'Chart 2 — Top Center',
  'Chart 3 — Top Right',
  'Chart 4 — Bottom Left',
  'Chart 5 — Bottom Right',
]

export default function AffordabilityLp() {
  const { supabase, profile } = useApp()
  const [page, setPage] = useState<AFPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  const [salesPrice, setSalesPrice] = useState('545000')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10))
  const [saSubheading, setSaSubheading] = useState('A seller-paid rate buydown could reduce your monthly payment by hundreds of dollars — without waiting for market rates to fall.')
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([null, null, null, null, null])
  const [scenarios, setScenarios] = useState<AFScenario[]>(DEFAULT_SCENARIOS)
  const [aiHeadline, setAiHeadline] = useState('')
  const [aiExplainer, setAiExplainer] = useState('')
  const [aiTalkingPoint, setAiTalkingPoint] = useState('')

  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('affordability_pages')
      .select('*').eq('created_by', profile.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as AFPage
          setPage(d)
          setSalesPrice(String(d.sales_price ?? 545000))
          setQuoteDate(d.quote_date ?? new Date().toISOString().slice(0, 10))
          setSaSubheading(d.seller_advantage_subheading ?? 'A seller-paid rate buydown could reduce your monthly payment by hundreds of dollars — without waiting for market rates to fall.')
          const urls = Array.isArray(d.image_urls) ? d.image_urls : []
          setImageUrls([0,1,2,3,4].map(i => urls[i] ?? null))
          setScenarios((d.scenarios as AFScenario[]) ?? DEFAULT_SCENARIOS)
          setAiHeadline(d.ai_headline ?? '')
          setAiExplainer(d.ai_explainer ?? '')
          setAiTalkingPoint(d.ai_talking_point ?? '')
        }
        setLoading(false)
      })
  }, [profile?.id, supabase])

  async function uploadImage(idx: number, file: File) {
    if (!profile?.id) return
    setUploadingIdx(idx)
    setMsg('')
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `affordability/${profile.id}/chart-${idx + 1}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('marketing-assets').upload(path, file, { upsert: true })
    if (error) {
      setMsg('Upload failed: ' + error.message)
      setUploadingIdx(null)
      return
    }
    const { data: urlData } = supabase.storage.from('marketing-assets').getPublicUrl(path)
    const url = urlData.publicUrl
    setImageUrls(prev => {
      const next = [...prev]
      next[idx] = url
      return next
    })
    setUploadingIdx(null)
  }

  async function analyze() {
    const urls = imageUrls.filter(Boolean) as string[]
    if (!urls.length) { setMsg('Upload at least one chart image first.'); return }
    setAnalyzing(true)
    setMsg('')
    try {
      const res = await fetch('/api/analyze-affordability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_urls: urls }),
      })
      const data = await res.json()
      if (data.error) { setMsg('Analysis failed: ' + data.error); return }
      setAiHeadline(data.headline ?? '')
      setAiExplainer(data.explainer ?? '')
      setAiTalkingPoint(data.talking_point ?? '')
      setMsg('Analysis complete! Review and edit below, then save.')
    } catch (e) {
      setMsg('Analysis error: ' + String(e))
    } finally {
      setAnalyzing(false)
    }
  }

  function updateScenario(i: number, field: keyof AFScenario, value: string) {
    setScenarios(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: field === 'header' ? value : parseFloat(value) || 0 } : s))
  }

  async function save() {
    if (!profile) return
    setSaving(true); setMsg('')
    const slug = page?.slug ?? 'af-' + slugify(profile.full_name || profile.email || profile.id)
    const payload = {
      created_by: profile.id, slug,
      sales_price: parseFloat(salesPrice.replace(/,/g, '')) || 0,
      quote_date: quoteDate,
      seller_advantage_subheading: saSubheading,
      image_urls: imageUrls.filter(Boolean),
      ai_headline: aiHeadline, ai_explainer: aiExplainer, ai_talking_point: aiTalkingPoint,
      scenarios, updated_at: new Date().toISOString(),
    }
    let res
    if (page?.id) {
      res = await supabase.from('affordability_pages').update(payload).eq('id', page.id).select().single()
    } else {
      res = await supabase.from('affordability_pages').insert(payload).select().single()
    }
    if (res.error) { setMsg('Save failed: ' + res.error.message) }
    else { setPage(res.data as AFPage); setMsg('Saved!'); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, color: C.muted }}>Loading…</div>

  const liveUrl = page?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://www.neofinfree.com'}/affordability/${page.slug}`
    : null

  const uploadedCount = imageUrls.filter(Boolean).length

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: C.navy }}>Affordability LP</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          Your public market affordability page — upload 5 market charts, generate AI copy, and share with Realtors.
        </div>
        {liveUrl && (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, background: C.navy, color: '#fff', fontWeight: 700, fontSize: 15, padding: '11px 22px', borderRadius: 10, textDecoration: 'none' }}>
            🔗 View Live Page →
          </a>
        )}
      </div>

      {/* Image Upload */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 6, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
          Market Charts ({uploadedCount}/5 uploaded)
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          Upload PNG/JPG market data graphics. Layout: 3 on top, 2 on bottom.
        </div>

        {/* 2x2 + 1 layout: two columns of 2 stacked, then one full-width */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {[0, 1, 2, 3].map(idx => <ImageSlot key={idx} idx={idx} url={imageUrls[idx]} label={IMAGE_LABELS[idx]} uploading={uploadingIdx === idx} onFile={f => uploadImage(idx, f)} onClear={() => setImageUrls(prev => prev.map((u, i) => i === idx ? null : u))} fileRefs={fileRefs} />)}
        </div>
        {/* Chart 5: full width */}
        <ImageSlot idx={4} url={imageUrls[4]} label={IMAGE_LABELS[4]} uploading={uploadingIdx === 4} onFile={f => uploadImage(4, f)} onClear={() => setImageUrls(prev => prev.map((u, i) => i === 4 ? null : u))} fileRefs={fileRefs} />
      </div>

      {/* AI Analysis */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
          AI Market Explainer
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Upload charts above, then click Analyze to generate Realtor-focused copy. You can edit the results before saving.
        </div>
        <button onClick={analyze} disabled={analyzing || uploadedCount === 0}
          style={{ background: C.accent, color: C.navy, border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 800, cursor: analyzing || uploadedCount === 0 ? 'default' : 'pointer', opacity: analyzing || uploadedCount === 0 ? 0.6 : 1, marginBottom: 16 }}>
          {analyzing ? '⏳ Analyzing…' : '✨ Analyze Charts with AI'}
        </button>

        {(aiHeadline || aiExplainer || aiTalkingPoint) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextArea label="Headline" value={aiHeadline} onChange={setAiHeadline} rows={2} />
            <TextArea label="Explainer Paragraph" value={aiExplainer} onChange={setAiExplainer} rows={5} />
            <TextArea label="Client Talking Point" value={aiTalkingPoint} onChange={setAiTalkingPoint} rows={2} />
          </div>
        )}
      </div>

      {/* Rate Scenarios */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>Rate Scenario Settings</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Example Home Price" value={salesPrice} onChange={setSalesPrice} half placeholder="545000" note="Shown above rate scenarios" />
          <Field label="Quote Date" value={quoteDate} onChange={setQuoteDate} half type="date" note="Displayed as 'Rates As Of'" />
        </div>
      </div>

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
        {msg && <div style={{ fontSize: 14, color: msg.startsWith('Save failed') || msg.startsWith('Upload') || msg.startsWith('Analysis') ? C.red : C.green, fontWeight: 600 }}>{msg}</div>}
      </div>
    </div>
  )
}

function ImageSlot({ idx, url, label, uploading, onFile, onClear, fileRefs }: {
  idx: number; url: string | null; label: string; uploading: boolean
  onFile: (f: File) => void; onClear: () => void
  fileRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#5C6570', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <input ref={el => { fileRefs.current[idx] = el }} type="file" accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      {url ? (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #E4E8EC' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} style={{ width: '100%', display: 'block', objectFit: 'contain', minHeight: 320 }} />
          <button onClick={onClear}
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(10,37,64,0.75)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            ✕ Remove
          </button>
        </div>
      ) : (
        <button onClick={() => fileRefs.current[idx]?.click()} disabled={uploading}
          style={{ width: '100%', minHeight: 320, border: '2px dashed #C5CDD6', borderRadius: 10, background: uploading ? '#F4F6F8' : '#FAFBFC', cursor: uploading ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#858889', fontSize: 12, fontWeight: 600 }}>
          {uploading ? (
            <><span style={{ fontSize: 22 }}>⏳</span> Uploading…</>
          ) : (
            <><span style={{ fontSize: 22 }}>📊</span> Upload Chart</>
          )}
        </button>
      )}
    </div>
  )
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#5C6570', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E4E8EC', borderRadius: 8, fontSize: 14, color: '#26303B', outline: 'none', background: '#fff', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
    </div>
  )
}
