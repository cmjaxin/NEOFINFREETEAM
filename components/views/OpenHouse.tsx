'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/appContext'
import { slugify, buildScenarios, fmtDollars, fmtRate, TCAInputs } from '@/lib/openHouseMath'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a', red: '#dc2626',
}

function fmtPrice(n: number) { return '$' + Math.round(n).toLocaleString() }

interface OHPage {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  beds: number; baths: number; sqft: number; list_price: number; seller_contribution: number
  market_rate: number; sa_30yr_rate: number | null; sa_arm_rate: number | null; sa_arm_adjusted_rate: number | null
  down_pct: number; status: string; created_at: string; advisor_name: string
  photos: string[]; hoa_monthly: number; annual_taxes: number; annual_insurance: number
  sa_arm_years: number; lot_size: string; year_built: number; description: string
  advisor_title: string; advisor_email: string; advisor_phone: string
  advisor_photo: string; advisor_nmls: string
}

// ─── Stable form primitives (defined OUTSIDE modal to prevent focus loss) ────
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Field({ label, name, type = 'text', placeholder = '', half = false, note = '', value, onChange }: {
  label: string; name: string; type?: string; placeholder?: string; half?: boolean; note?: string
  value: string; onChange: (name: string, value: string) => void
}) {
  return (
    <div style={{ flex: half ? '0 0 calc(50% - 6px)' : '1 1 100%', minWidth: 0 }}>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(name, e.target.value)}
        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white }}
      />
      {note && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  )
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function CreateModal({ editing, onClose, onSaved }: { editing: OHPage | null; onClose: () => void; onSaved: () => void }) {
  const { supabase, profile } = useApp()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  const init = editing ?? {} as Partial<OHPage>
  const [form, setForm] = useState({
    address: init.address ?? '',
    city: init.city ?? '',
    state: init.state ?? 'UT',
    zip: init.zip ?? '',
    beds: init.beds ?? '',
    baths: init.baths ?? '',
    sqft: init.sqft ?? '',
    lot_size: init.lot_size ?? '',
    year_built: init.year_built ?? '',
    description: init.description ?? '',
    photos: init.photos ?? [] as string[],
    list_price: init.list_price ?? '',
    seller_contribution: init.seller_contribution ?? '',
    down_pct: init.down_pct ? String(Math.round(init.down_pct * 100)) : '3.5',
    market_rate: init.market_rate ? String((init.market_rate * 100).toFixed(3)) : '',
    sa_30yr_rate: init.sa_30yr_rate ? String((init.sa_30yr_rate * 100).toFixed(3)) : '',
    sa_arm_rate: init.sa_arm_rate ? String((init.sa_arm_rate * 100).toFixed(3)) : '',
    sa_arm_years: init.sa_arm_years ?? 5,
    sa_arm_adjusted_rate: (init as OHPage).sa_arm_adjusted_rate ? String(((init as OHPage).sa_arm_adjusted_rate! * 100).toFixed(3)) : '',
    hoa_monthly: init.hoa_monthly ?? '',
    annual_taxes: init.annual_taxes ?? '',
    annual_insurance: init.annual_insurance ?? '',
    advisor_name: init.advisor_name ?? profile?.full_name ?? '',
    advisor_title: init.advisor_title ?? profile?.title ?? '',
    advisor_email: init.advisor_email ?? profile?.email ?? '',
    advisor_phone: init.advisor_phone ?? profile?.phone ?? '',
    advisor_nmls: init.advisor_nmls ?? profile?.nmls ?? '',
    advisor_photo: init.advisor_photo ?? profile?.headshot_url ?? '',
  })

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function uploadPhotos(files: File[]) {
    setPhotoUploading(true)
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `open-house/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('splice-clips').upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('splice-clips').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    set('photos', [...(form.photos as string[]), ...urls])
    setPhotoUploading(false)
  }

  async function save() {
    if (!form.address || !form.list_price || !form.market_rate) {
      setMsg('Address, list price, and market rate are required.')
      return
    }
    setSaving(true)
    setMsg('')
    const payload = {
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      beds: form.beds ? Number(form.beds) : null,
      baths: form.baths ? Number(form.baths) : null,
      sqft: form.sqft ? Number(form.sqft) : null,
      lot_size: form.lot_size,
      year_built: form.year_built ? Number(form.year_built) : null,
      description: form.description,
      photos: form.photos,
      list_price: Number(form.list_price),
      seller_contribution: form.seller_contribution ? Number(form.seller_contribution) : 0,
      down_pct: Number(form.down_pct) / 100,
      market_rate: Number(form.market_rate) / 100,
      sa_30yr_rate: form.sa_30yr_rate ? Number(form.sa_30yr_rate) / 100 : null,
      sa_arm_rate: form.sa_arm_rate ? Number(form.sa_arm_rate) / 100 : null,
      sa_arm_years: Number(form.sa_arm_years),
      sa_arm_adjusted_rate: form.sa_arm_adjusted_rate ? Number(form.sa_arm_adjusted_rate) / 100 : null,
      hoa_monthly: form.hoa_monthly ? Number(form.hoa_monthly) : 0,
      annual_taxes: form.annual_taxes ? Number(form.annual_taxes) : 0,
      annual_insurance: form.annual_insurance ? Number(form.annual_insurance) : 0,
      advisor_name: form.advisor_name,
      advisor_title: form.advisor_title,
      advisor_email: form.advisor_email,
      advisor_phone: form.advisor_phone,
      advisor_nmls: form.advisor_nmls,
      advisor_photo: form.advisor_photo,
      updated_at: new Date().toISOString(),
    }

    if (editing) {
      const { error } = await supabase.from('open_house_pages').update(payload).eq('id', editing.id)
      if (error) { setMsg(error.message); setSaving(false); return }
    } else {
      const slug = slugify(form.address + ' ' + form.city)
      const { error } = await supabase.from('open_house_pages').insert({
        ...payload,
        slug,
        status: 'active',
        created_by: profile!.id,
      })
      if (error) { setMsg(error.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.bg, borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: C.navy, flexShrink: 0 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{editing ? 'Edit Listing' : 'New Open House Page'}</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Property Info */}
          <section>
            <SectionHead title="Property" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Street Address *" name="address" placeholder="123 Main St" value={form.address} onChange={set} />
              <Field label="City" name="city" placeholder="Salt Lake City" half value={form.city} onChange={set} />
              <Field label="State" name="state" placeholder="UT" half value={form.state} onChange={set} />
              <Field label="Zip" name="zip" placeholder="84101" half value={form.zip} onChange={set} />
              <Field label="Beds" name="beds" type="number" placeholder="4" half value={String(form.beds ?? '')} onChange={set} />
              <Field label="Baths" name="baths" type="number" placeholder="2.5" half value={String(form.baths ?? '')} onChange={set} />
              <Field label="Sq Ft" name="sqft" type="number" placeholder="2400" half value={String(form.sqft ?? '')} onChange={set} />
              <Field label="Lot Size" name="lot_size" placeholder="0.25 acres" half value={form.lot_size} onChange={set} />
              <Field label="Year Built" name="year_built" type="number" placeholder="2005" half value={String(form.year_built ?? '')} onChange={set} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Description</label>
              <textarea
                placeholder="Describe the property…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white, resize: 'vertical' }}
              />
            </div>
          </section>

          {/* Photos */}
          <section>
            <SectionHead title="Photos" sub="Upload property photos (shown in gallery on the landing page)" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(form.photos as string[]).map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} alt="" />
                  <button onClick={() => set('photos', (form.photos as string[]).filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, background: C.red, border: 'none', borderRadius: '50%', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                </div>
              ))}
              <button onClick={() => photoRef.current?.click()}
                disabled={photoUploading}
                style={{ width: 80, height: 60, border: `2px dashed ${C.border}`, borderRadius: 8, background: C.white, color: C.muted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                {photoUploading ? '…' : <><span style={{ fontSize: 18 }}>+</span><span>Photo</span></>}
              </button>
              <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && uploadPhotos(Array.from(e.target.files))} />
            </div>
          </section>

          {/* Pricing */}
          <section>
            <SectionHead title="Pricing & Costs" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label="List Price *" name="list_price" type="number" placeholder="500000" half value={String(form.list_price ?? '')} onChange={set} />
              <Field label="Seller Contribution ($)" name="seller_contribution" type="number" placeholder="15000" half note="Amount seller pays to buy down the rate. Adds to SA purchase price." value={String(form.seller_contribution ?? '')} onChange={set} />
              <Field label="HOA (monthly)" name="hoa_monthly" type="number" placeholder="0" half value={String(form.hoa_monthly ?? '')} onChange={set} />
              <Field label="Annual Taxes" name="annual_taxes" type="number" placeholder="3600" half value={String(form.annual_taxes ?? '')} onChange={set} />
              <Field label="Annual Insurance" name="annual_insurance" type="number" placeholder="1200" half value={String(form.annual_insurance ?? '')} onChange={set} />
            </div>
          </section>

          {/* Loan Scenarios */}
          <section>
            <SectionHead title="Loan Scenarios" sub="Enter rates as percentages (e.g. 7.125 for 7.125%). Leave SA fields blank to exclude from comparison." />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Down Payment %" name="down_pct" type="number" placeholder="3.5" half note="e.g. 3.5 for FHA, 5 for conventional" value={String(form.down_pct ?? '')} onChange={set} />
              <Field label="Market Rate %" name="market_rate" type="number" placeholder="7.125" half value={String(form.market_rate ?? '')} onChange={set} />
              <Field label="SA 30yr Fixed Rate %" name="sa_30yr_rate" type="number" placeholder="5.875" half value={String(form.sa_30yr_rate ?? '')} onChange={set} />
              <Field label="SA ARM Rate %" name="sa_arm_rate" type="number" placeholder="5.500" half value={String(form.sa_arm_rate ?? '')} onChange={set} />
              <Field label="ARM Fixed Period (years)" name="sa_arm_years" type="number" placeholder="5" half value={String(form.sa_arm_years ?? '')} onChange={set} />
              <Field label="ARM Adjusted Rate % (after fixed period)" name="sa_arm_adjusted_rate" type="number" placeholder="leave blank to use market rate" half note="Rate the ARM adjusts to when the fixed period ends. Defaults to Market Rate if blank." value={String(form.sa_arm_adjusted_rate ?? '')} onChange={set} />
            </div>

            {/* Live preview */}
            {form.list_price && form.market_rate && (
              <div style={{ marginTop: 16, padding: 14, background: C.white, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Preview</div>
                {(() => {
                  const inputs: TCAInputs = {
                    listPrice: Number(form.list_price),
                    sellerContribution: Number(form.seller_contribution) || 0,
                    downPct: Number(form.down_pct) / 100 || 0.035,
                    marketRate: Number(form.market_rate) / 100,
                    sa30yrRate: form.sa_30yr_rate ? Number(form.sa_30yr_rate) / 100 : null,
                    saArmRate: form.sa_arm_rate ? Number(form.sa_arm_rate) / 100 : null,
                    saArmYears: Number(form.sa_arm_years) || 5,
                    saArmAdjustedRate: form.sa_arm_adjusted_rate ? Number(form.sa_arm_adjusted_rate) / 100 : null,
                    hoaMonthly: Number(form.hoa_monthly) || 0,
                    annualTaxes: Number(form.annual_taxes) || 0,
                    annualInsurance: Number(form.annual_insurance) || 0,
                  }
                  const scenarios = buildScenarios(inputs)
                  return (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {scenarios.map(s => (
                        <div key={s.label} style={{ flex: 1, minWidth: 140, padding: '10px 14px', background: C.bg, borderRadius: 8, borderLeft: `3px solid ${s.color}` }}>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{fmtPrice(Math.round(s.monthlyTotal))}<span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>/mo</span></div>
                          <div style={{ fontSize: 11, color: C.muted }}>Rate: {fmtRate(s.rate)}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </section>

          {/* Advisor */}
          <section>
            <SectionHead title="Advisor Contact" sub="Shows on the contact tab of the landing page" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Name" name="advisor_name" placeholder="Josh Mettle" half value={form.advisor_name} onChange={set} />
              <Field label="Title" name="advisor_title" placeholder="Mortgage Advisor" half value={form.advisor_title} onChange={set} />
              <Field label="Email" name="advisor_email" placeholder="advisor@neohomeloans.com" half value={form.advisor_email} onChange={set} />
              <Field label="Phone" name="advisor_phone" placeholder="(801) 555-0100" half value={form.advisor_phone} onChange={set} />
              <Field label="NMLS#" name="advisor_nmls" placeholder="123456" half value={form.advisor_nmls} onChange={set} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, background: C.white, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {msg && <div style={{ flex: 1, fontSize: 13, color: C.red }}>{msg}</div>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, color: C.dim, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: C.navy, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Page'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page Card ────────────────────────────────────────────────────────────────
function PageCard({ page, onEdit, onArchive }: { page: OHPage; onEdit: () => void; onArchive: () => void }) {
  const url = `/open-house/${page.slug}`
  const fullAddress = [page.address, page.city, page.state].filter(Boolean).join(', ')
  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Photo or placeholder */}
      {page.photos && page.photos.length > 0 ? (
        <img src={page.photos[0]} alt={page.address} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
      ) : (
        <div style={{ height: 100, background: 'linear-gradient(135deg, #0A2540, #1a4a7c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🏡</div>
      )}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: C.navy }}>{fmtPrice(page.list_price)}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dim, marginTop: 2 }}>{page.address}</div>
        <div style={{ fontSize: 12, color: C.muted }}>{page.city}{page.city && page.state ? ', ' : ''}{page.state}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: C.muted }}>
          {page.beds ? <span>{page.beds} bd</span> : null}
          {page.baths ? <span>{page.baths} ba</span> : null}
          {page.sqft ? <span>{page.sqft.toLocaleString()} sqft</span> : null}
        </div>
        {page.sa_30yr_rate && (
          <div style={{ marginTop: 8, fontSize: 11, background: 'rgba(91,203,245,0.1)', borderRadius: 6, padding: '4px 8px', color: C.navy, display: 'inline-flex', gap: 6, alignSelf: 'flex-start' }}>
            <span style={{ fontWeight: 700 }}>SA Rate:</span>
            <span>{fmtRate(page.sa_30yr_rate)}</span>
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: '8px 0', background: C.navy, borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
            View Page
          </a>
          <button onClick={() => { navigator.clipboard.writeText(window.location.origin + url) }}
            style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.dim, cursor: 'pointer', fontWeight: 600 }}>
            Copy Link
          </button>
          <button onClick={onEdit}
            style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.dim, cursor: 'pointer', fontWeight: 600 }}>
            Edit
          </button>
          <button onClick={onArchive}
            style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.red, cursor: 'pointer', fontWeight: 600 }}>
            Archive
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function OpenHouseView() {
  const { supabase } = useApp()
  const [pages, setPages] = useState<OHPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPage, setEditingPage] = useState<OHPage | null>(null)

  async function load() {
    const { data } = await supabase.from('open_house_pages').select('*').eq('status', 'active').order('created_at', { ascending: false })
    setPages((data ?? []) as OHPage[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function archive(id: string) {
    if (!confirm('Archive this page? It will no longer be publicly accessible.')) return
    await supabase.from('open_house_pages').update({ status: 'archived' }).eq('id', id)
    load()
  }

  return (
    <div style={{ padding: '28px 36px', background: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Open House Pages</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Create public landing pages with Seller Advantage TCA comparison</div>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ padding: '10px 20px', background: C.navy, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>+</span> New Listing Page
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color: C.muted, padding: 32, textAlign: 'center' }}>Loading…</div>
      ) : pages.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No listing pages yet</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Create your first open house page with a built-in Seller Advantage TCA comparison.</div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '12px 28px', background: C.navy, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Create Your First Page
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {pages.map(p => (
            <PageCard key={p.id} page={p}
              onEdit={() => setEditingPage(p)}
              onArchive={() => archive(p.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showCreate || editingPage) && (
        <CreateModal
          editing={editingPage}
          onClose={() => { setShowCreate(false); setEditingPage(null) }}
          onSaved={() => { setShowCreate(false); setEditingPage(null); load() }}
        />
      )}
    </div>
  )
}
