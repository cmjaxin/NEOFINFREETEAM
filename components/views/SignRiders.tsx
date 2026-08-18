// alter table open_house_pages add column if not exists loom_url text;
// alter table open_house_pages add column if not exists callout_text text;
'use client'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/appContext'
import { slugify } from '@/lib/openHouseMath'

interface MarketingPartner {
  id: string; name: string; title: string; company: string
  phone: string; email: string; headshot_url: string; logo_url: string
}

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a', red: '#dc2626',
}

interface SRPage {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  beds: number; baths: number; sqft: number; list_price: number
  status: string; created_at: string; advisor_name: string
  photos: string[]; lot_size: string; year_built: number; description: string
  advisor_title: string; advisor_email: string; advisor_phone: string
  advisor_photo: string; advisor_nmls: string
  partner_name: string; partner_title: string; partner_email: string
  partner_phone: string; partner_photo: string; partner_nmls: string; partner_logo: string
  tca_url: string
  tca_screenshot: string
  loom_url: string
  callout_text: string
}

function fmtPrice(n: number) { return '$' + Math.round(n).toLocaleString() }

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
        type="text"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        placeholder={placeholder} value={value}
        onChange={e => onChange(name, e.target.value)}
        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white }}
      />
      {note && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  )
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function CreateModal({ editing, onClose, onSaved }: { editing: SRPage | null; onClose: () => void; onSaved: () => void }) {
  const { supabase, profile } = useApp()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [tcaUploading, setTcaUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const tcaRef = useRef<HTMLInputElement>(null)
  const [marketingPartners, setMarketingPartners] = useState<MarketingPartner[]>([])

  useEffect(() => {
    if (!profile?.email) return
    supabase.from('marketing_partners').select('*').eq('owner_email', profile.email).order('name')
      .then(({ data }) => {
        const partners = data ?? []
        setMarketingPartners(partners)
        setForm(f => {
          if (f.partner_name && !f.partner_logo) {
            const match = partners.find(p => p.name === f.partner_name)
            if (match?.logo_url) {
              if ((init as SRPage).id) {
                supabase.from('open_house_pages')
                  .update({ partner_logo: match.logo_url })
                  .eq('id', (init as SRPage).id)
                  .then(() => {})
              }
              return { ...f, partner_logo: match.logo_url }
            }
          }
          return f
        })
      })
  }, [profile?.email])

  const init = editing ?? {} as Partial<SRPage>
  const [form, setForm] = useState({
    address: init.address ?? '',
    city: init.city ?? '',
    state: init.state ?? 'UT',
    zip: init.zip ?? '',
    beds: String(init.beds ?? ''),
    baths: String(init.baths ?? ''),
    sqft: String(init.sqft ?? ''),
    lot_size: init.lot_size ?? '',
    year_built: String(init.year_built ?? ''),
    description: init.description ?? '',
    photos: init.photos ?? [] as string[],
    list_price: init.list_price ? String(init.list_price) : '',
    tca_url: (init as SRPage).tca_url ?? '',
    tca_screenshot: (init as SRPage).tca_screenshot ?? '',
    loom_url: (init as SRPage).loom_url ?? '',
    callout_text: (init as SRPage).callout_text ?? '',
    interest_rate: (() => {
      const ct = (init as SRPage).callout_text ?? ''
      const m = ct.match(/See how a ([\d.]+)%/)
      return m ? m[1] : '4.875'
    })(),
    advisor_name: init.advisor_name || profile?.full_name || '',
    advisor_title: init.advisor_title || profile?.title || '',
    advisor_email: init.advisor_email || profile?.email || '',
    advisor_phone: init.advisor_phone || profile?.phone || '',
    advisor_nmls: init.advisor_nmls || profile?.nmls || '',
    advisor_photo: init.advisor_photo || profile?.headshot_url || '',
    partner_name: (init as SRPage).partner_name ?? '',
    partner_title: (init as SRPage).partner_title ?? '',
    partner_email: (init as SRPage).partner_email ?? '',
    partner_phone: (init as SRPage).partner_phone ?? '',
    partner_nmls: (init as SRPage).partner_nmls ?? '',
    partner_photo: (init as SRPage).partner_photo ?? '',
    partner_logo: (init as SRPage).partner_logo ?? '',
  })
  const [showPartner, setShowPartner] = useState(!!(init as SRPage).partner_name)
  const [partnerSearch, setPartnerSearch] = useState('')
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm(f => ({
      ...f,
      advisor_name: f.advisor_name || profile.full_name || '',
      advisor_title: f.advisor_title || profile.title || '',
      advisor_email: f.advisor_email || profile.email || '',
      advisor_phone: f.advisor_phone || profile.phone || '',
      advisor_nmls: f.advisor_nmls || profile.nmls || '',
      advisor_photo: f.advisor_photo || profile.headshot_url || '',
    }))
  }, [profile?.id])

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  function applyPartner(p: MarketingPartner) {
    setForm(f => ({
      ...f,
      partner_name: p.name,
      partner_title: p.title || 'Listing Agent',
      partner_email: p.email || '',
      partner_phone: p.phone || '',
      partner_nmls: '',
      partner_photo: p.headshot_url || '',
      partner_logo: p.logo_url || '',
    }))
    setPartnerSearch(p.name)
    setShowPartnerDropdown(false)
  }

  const filteredPartners = partnerSearch.length > 0
    ? marketingPartners.filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase())).slice(0, 6)
    : marketingPartners.slice(0, 6)

  const slotUploadIndex = useRef<number>(-1)

  async function resizeImage(file: File, maxPx = 1800, quality = 0.82): Promise<Blob> {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => resolve(b ?? file), 'image/jpeg', quality)
      }
      img.src = url
    })
  }

  async function uploadPhotos(files: File[]) {
    setPhotoUploading(true)
    const urls: string[] = []
    for (const file of files) {
      const resized = await resizeImage(file)
      const path = `open-house/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const { error } = await supabase.storage.from('splice-clips').upload(path, resized, { upsert: true, contentType: 'image/jpeg' })
      if (!error) {
        const { data } = supabase.storage.from('splice-clips').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    const slot = slotUploadIndex.current
    if (slot >= 0 && urls.length > 0) {
      setForm(f => {
        const p = [...(f.photos as string[])]
        while (p.length <= slot) p.push('')
        p[slot] = urls[0]
        return { ...f, photos: p }
      })
    } else {
      set('photos', [...(form.photos as string[]), ...urls])
    }
    slotUploadIndex.current = -1
    setPhotoUploading(false)
  }

  async function uploadTcaScreenshot(file: File) {
    setTcaUploading(true)
    const resized = await resizeImage(file, 2400, 0.9)
    const path = `open-house/tca-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error } = await supabase.storage.from('splice-clips').upload(path, resized, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data } = supabase.storage.from('splice-clips').getPublicUrl(path)
      set('tca_screenshot', data.publicUrl)
    }
    setTcaUploading(false)
  }

  function triggerSlotUpload(i: number) {
    slotUploadIndex.current = i
    photoRef.current?.click()
  }

  async function save() {
    if (!form.address) {
      setMsg('Address is required.')
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
      list_price: Number(String(form.list_price).replace(/,/g, '')) || 0,
      tca_url: form.tca_url || null,
      tca_screenshot: form.tca_screenshot || null,
      loom_url: form.loom_url || null,
      callout_text: form.callout_text || null,
      advisor_name: form.advisor_name,
      advisor_title: form.advisor_title,
      advisor_email: form.advisor_email,
      advisor_phone: form.advisor_phone,
      advisor_nmls: form.advisor_nmls,
      advisor_photo: form.advisor_photo,
      partner_name: showPartner ? form.partner_name : '',
      partner_title: showPartner ? form.partner_title : '',
      partner_email: showPartner ? form.partner_email : '',
      partner_phone: showPartner ? form.partner_phone : '',
      partner_nmls: showPartner ? form.partner_nmls : '',
      partner_photo: showPartner ? form.partner_photo : '',
      partner_logo: showPartner ? form.partner_logo : '',
      page_type: 'sign_rider',
      updated_at: new Date().toISOString(),
    }

    async function attempt(p: Record<string, unknown>) {
      if (editing) {
        // Never change the slug on edit
        const res = await supabase.from('open_house_pages').update(p).eq('id', editing.id).select('id')
        return res
      } else {
        const slug = slugify(form.address + ' ' + form.city)
        return supabase.from('open_house_pages').insert({ ...p, slug, status: 'active', created_by: profile!.id })
      }
    }
    let res = await attempt(payload as Record<string, unknown>)
    if (res.error?.code === '42703' || res.error?.code === 'PGRST204') {
      const { tca_url: _a, tca_screenshot: _b, loom_url: _c, callout_text: _d, ...corePayload } = payload
      res = await attempt(corePayload as Record<string, unknown>)
    }
    if (res.error) { setMsg(`Save failed: ${res.error.message} (${res.error.code})`); setSaving(false); return }
    if (editing && res.data && res.data.length === 0) {
      setMsg('Save failed: no row updated. Check that you own this sign rider.')
      setSaving(false)
      return
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.bg, borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: C.navy, flexShrink: 0 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{editing ? 'Edit Sign Rider' : 'New Sign Rider'}</div>
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
              <div style={{ flex: '0 0 calc(50% - 6px)', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>List Price</label>
                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, overflow: 'hidden' }}>
                  <span style={{ padding: '9px 10px 9px 12px', fontSize: 14, color: C.muted, fontWeight: 600, userSelect: 'none' }}>$</span>
                  <input type="text" inputMode="decimal" placeholder="750,000" value={String(form.list_price ?? '')}
                    onChange={e => set('list_price', e.target.value)}
                    style={{ flex: 1, padding: '9px 12px 9px 0', border: 'none', outline: 'none', fontSize: 14, color: C.text, background: 'transparent' }} />
                </div>
              </div>
              <Field label="Beds" name="beds" type="number" placeholder="4" half value={String(form.beds ?? '')} onChange={set} />
              <Field label="Baths" name="baths" type="number" placeholder="2.5" half value={String(form.baths ?? '')} onChange={set} />
              <Field label="Sq Ft" name="sqft" type="number" placeholder="2400" half value={String(form.sqft ?? '')} onChange={set} />
              <Field label="Lot Size" name="lot_size" placeholder="0.25 acres" half value={form.lot_size} onChange={set} />
              <Field label="Year Built" name="year_built" type="number" placeholder="2005" half value={String(form.year_built ?? '')} onChange={set} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: C.dim, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Description</label>
                <span style={{ fontSize: 11, color: form.description.length > 900 ? C.red : C.muted }}>{form.description.length} / 900</span>
              </div>
              <textarea
                placeholder="Describe the property…"
                value={form.description}
                onChange={e => set('description', e.target.value.slice(0, 900))}
                rows={3}
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${form.description.length >= 900 ? C.red : C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white, resize: 'vertical' }}
              />
            </div>
          </section>

          {/* Photos */}
          <section>
            <SectionHead title="Photos" sub="Photo 1 is the hero shown at the top of the sign rider page." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[0, 1, 2, 3].map(i => {
                const photos = form.photos as string[]
                const url = photos[i] ?? ''
                const labels = [
                  'Photo 1 — Hero (main banner)',
                  'Photo 2 — Gallery',
                  'Photo 3 — Gallery',
                  'Photo 4 — Gallery',
                ]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 80, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `2px solid ${i === 0 ? C.accent : C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {url ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 20, opacity: 0.3 }}>🏠</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? C.navy : C.muted, marginBottom: 4 }}>{labels[i]}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => triggerSlotUpload(i)} disabled={photoUploading}
                          style={{ padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, color: C.dim, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                          {photoUploading ? '…' : url ? 'Replace' : 'Upload'}
                        </button>
                        {url && <button onClick={() => { const p = [...(form.photos as string[])]; p[i] = ''; set('photos', p) }} style={{ padding: '5px 10px', border: 'none', borderRadius: 6, background: '#FEF2F2', color: '#DC2626', fontSize: 12, cursor: 'pointer' }}>Remove</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Additional Gallery Photos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(form.photos as string[]).slice(4).map((url, i) => (
                <div key={i + 4} style={{ position: 'relative' }}>
                  <img src={url} style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 7, border: `1px solid ${C.border}` }} alt="" />
                  <button onClick={() => { const p = [...(form.photos as string[])]; p.splice(4 + i, 1); set('photos', p) }}
                    style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, background: C.red, border: 'none', borderRadius: '50%', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
              <button onClick={() => { slotUploadIndex.current = -1; photoRef.current?.click() }} disabled={photoUploading}
                style={{ width: 72, height: 52, border: `2px dashed ${C.border}`, borderRadius: 7, background: C.white, color: C.muted, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                {photoUploading ? '…' : <><span style={{ fontSize: 16 }}>+</span><span>Photo</span></>}
              </button>
            </div>
            <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && uploadPhotos(Array.from(e.target.files))} />
          </section>

          {/* TCA + Loom */}
          <section>
            <SectionHead title="Loan Details" sub="Loom video and MortgageCoach TCA shown to buyers on the Loan Details tab." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Callout Banner */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Callout Banner</label>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Shown as a bold banner at the top of the sign rider page and in the lead popup. Customize below or use the rate quick-fill.</div>
                {/* Rate quick-fill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Rate quick-fill:</span>
                  <input
                    type="text" inputMode="decimal" placeholder="4.875"
                    value={form.interest_rate}
                    onChange={e => {
                      const rate = e.target.value
                      set('interest_rate', rate)
                      if (rate) set('callout_text', `See how a ${rate}% interest rate impacts your payment`)
                      else set('callout_text', '')
                    }}
                    style={{ width: 80, padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white }}
                  />
                  <span style={{ fontSize: 13, color: C.muted }}>%</span>
                </div>
                {/* Editable callout text */}
                <textarea
                  placeholder="e.g. See how a 4.875% interest rate impacts your payment"
                  value={form.callout_text}
                  onChange={e => set('callout_text', e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white, resize: 'vertical', marginBottom: 10 }}
                />
                {form.callout_text && (
                  <div style={{ background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)', borderRadius: 10, padding: '20px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>📣</div>
                    <div style={{ fontSize: 16, color: '#fff', fontWeight: 900, lineHeight: 1.3 }}>{form.callout_text}</div>
                  </div>
                )}
              </div>
              <Field
                label="Loom Video URL"
                name="loom_url"
                placeholder="https://www.loom.com/share/abc123…"
                note="Paste the Loom share URL — the video will embed automatically on the public page."
                value={form.loom_url}
                onChange={set}
              />
              <Field label="TCA URL (MortgageCoach)" name="tca_url" placeholder="https://report.mortgagecoach.com/v2/classic/#…" value={form.tca_url} onChange={set} />
              {/* TCA Screenshot */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>TCA Screenshot</label>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Upload a screenshot of your MortgageCoach report to display below the video.</div>
                {form.tca_screenshot ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={form.tca_screenshot} alt="TCA Screenshot" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', objectPosition: 'top left', borderRadius: 8, border: `1px solid ${C.border}`, display: 'block' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => tcaRef.current?.click()} disabled={tcaUploading}
                        style={{ padding: '6px 14px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, color: C.dim, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                        {tcaUploading ? 'Uploading…' : 'Replace'}
                      </button>
                      <button onClick={() => set('tca_screenshot', '')}
                        style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: '#FEF2F2', color: C.red, fontSize: 12, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => tcaRef.current?.click()} disabled={tcaUploading}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, width: '100%', height: 100, border: `2px dashed ${C.border}`, borderRadius: 10, background: C.white, color: C.muted, cursor: 'pointer', fontSize: 13 }}>
                    {tcaUploading ? <span>Uploading…</span> : <><span style={{ fontSize: 28 }}>📊</span><span>Upload TCA Screenshot</span></>}
                  </button>
                )}
                <input ref={tcaRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) uploadTcaScreenshot(e.target.files[0]) }} />
              </div>
            </div>
          </section>

          {/* Advisor */}
          <section>
            <SectionHead title="Your Contact Info" sub="Auto-filled from your profile — edit here to override for this sign rider" />
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ flexShrink: 0 }}>
                {form.advisor_photo ? (
                  <img src={form.advisor_photo} alt="Headshot" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.accent}` }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', border: `2px dashed ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: C.accent }}>
                    {form.advisor_name?.[0] ?? '?'}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{form.advisor_name || 'Your Name'}</div>
                <div style={{ fontSize: 13, color: C.dim }}>{form.advisor_title || 'Your Title'}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{form.advisor_email}</div>
                {form.advisor_nmls && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>NMLS# {form.advisor_nmls}</div>}
                <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontWeight: 600 }}>✓ Auto-filled from your profile</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Field label="Name" name="advisor_name" placeholder="Your Name" half value={form.advisor_name} onChange={set} />
              <Field label="Title" name="advisor_title" placeholder="Mortgage Advisor" half value={form.advisor_title} onChange={set} />
              <Field label="Email" name="advisor_email" placeholder="you@neohomeloans.com" half value={form.advisor_email} onChange={set} />
              <Field label="Phone" name="advisor_phone" placeholder="(801) 555-0100" half value={form.advisor_phone} onChange={set} />
              <Field label="NMLS#" name="advisor_nmls" placeholder="123456" half value={form.advisor_nmls} onChange={set} />
              <Field label="Headshot URL" name="advisor_photo" placeholder="https://…" half value={form.advisor_photo} onChange={set} />
            </div>
          </section>

          {/* Partner / Realtor */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPartner ? 14 : 0, paddingBottom: showPartner ? 8 : 0, borderBottom: showPartner ? `1px solid ${C.border}` : 'none' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>Listing Agent / Partner</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Optionally add a realtor or co-advisor to the contact page</div>
              </div>
              <button onClick={() => { setShowPartner(v => !v); if (showPartner) setPartnerSearch('') }}
                style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: showPartner ? C.red : C.navy, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {showPartner ? 'Remove Partner' : '+ Add Partner'}
              </button>
            </div>
            {showPartner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Select from your Marketing Partners</label>
                  <input
                    placeholder={marketingPartners.length === 0 ? 'No partners saved yet' : 'Search partners…'}
                    value={partnerSearch}
                    onChange={e => { setPartnerSearch(e.target.value); setShowPartnerDropdown(true) }}
                    onFocus={() => setShowPartnerDropdown(true)}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white }}
                  />
                  {showPartnerDropdown && filteredPartners.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden', marginTop: 4 }}>
                      {filteredPartners.map(p => (
                        <button key={p.id} onMouseDown={() => applyPartner(p)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                          {p.headshot_url ? (
                            <img src={p.headshot_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                              {p.name[0]}
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{p.title}{p.company ? ` · ${p.company}` : ''}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.partner_name && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: C.bg, borderRadius: 8 }}>
                    {form.partner_photo ? (
                      <img src={form.partner_photo} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                        {form.partner_name[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{form.partner_name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{form.partner_title}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <Field label="Partner Name" name="partner_name" placeholder="Jane Smith" half value={form.partner_name} onChange={set} />
                  <Field label="Partner Title" name="partner_title" placeholder="Listing Agent" half value={form.partner_title} onChange={set} />
                  <Field label="Partner Email" name="partner_email" placeholder="jane@realty.com" half value={form.partner_email} onChange={set} />
                  <Field label="Partner Phone" name="partner_phone" placeholder="(801) 555-0200" half value={form.partner_phone} onChange={set} />
                  <Field label="Partner NMLS# (if applicable)" name="partner_nmls" placeholder="Optional" half value={form.partner_nmls} onChange={set} />
                  <Field label="Partner Headshot URL" name="partner_photo" placeholder="https://…" half value={form.partner_photo} onChange={set} />
                  <Field label="Partner Logo URL" name="partner_logo" placeholder="https://… (brokerage logo)" half value={form.partner_logo} onChange={set} />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, background: C.white, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {msg && <div style={{ flex: 1, fontSize: 13, color: C.red }}>{msg}</div>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, color: C.dim, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: C.navy, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Sign Rider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page Card ────────────────────────────────────────────────────────────────
function PageCard({ page, onEdit, slotNum, onClear }: { page: SRPage; onEdit: () => void; slotNum: number; onClear: () => void }) {
  const url = `/sign-rider/${page.slug}`
  const [copied, setCopied] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(window.location.origin + url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {page.photos && page.photos.length > 0 ? (
        <div style={{ position: 'relative' }}>
          <img src={page.photos[0]} alt={page.address} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(10,37,64,0.85)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99 }}>Sign Rider {slotNum}</div>
        </div>
      ) : (
        <div style={{ height: 100, background: 'linear-gradient(135deg, #0A2540, #1a4a7c)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Sign Rider {slotNum}</div>
          <span style={{ fontSize: 30 }}>🪧</span>
        </div>
      )}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: C.navy }}>{page.list_price ? fmtPrice(page.list_price) : 'Price TBD'}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dim, marginTop: 2 }}>{page.address}</div>
        <div style={{ fontSize: 12, color: C.muted }}>{page.city}{page.city && page.state ? ', ' : ''}{page.state}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: C.muted }}>
          {page.beds ? <span>{page.beds} bd</span> : null}
          {page.baths ? <span>{page.baths} ba</span> : null}
          {page.sqft ? <span>{page.sqft.toLocaleString()} sqft</span> : null}
        </div>
        {/* Public URL for QR code */}
        <div style={{ marginTop: 10, padding: '8px 10px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>QR Code URL</div>
          <div style={{ fontSize: 12, color: C.navy, fontFamily: 'monospace', wordBreak: 'break-all' }}>{typeof window !== 'undefined' ? window.location.origin : ''}{url}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {page.loom_url && (
            <div style={{ fontSize: 11, background: 'rgba(91,203,245,0.1)', borderRadius: 6, padding: '3px 8px', color: C.navy, fontWeight: 600 }}>
              ✓ Loom video
            </div>
          )}
          {page.tca_url && (
            <div style={{ fontSize: 11, background: 'rgba(91,203,245,0.1)', borderRadius: 6, padding: '3px 8px', color: C.navy, fontWeight: 600 }}>
              ✓ TCA linked
            </div>
          )}
          {page.tca_screenshot && (
            <div style={{ fontSize: 11, background: 'rgba(22,163,74,0.1)', borderRadius: 6, padding: '3px 8px', color: C.green, fontWeight: 600 }}>
              ✓ TCA screenshot
            </div>
          )}
        </div>

        {confirmClear ? (
          <div style={{ marginTop: 'auto', paddingTop: 14, background: '#FEF2F2', borderRadius: 10, padding: 12, border: '1px solid #FECACA' }}>
            <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 600, marginBottom: 10 }}>Clear all property info from this slot?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { onClear(); setConfirmClear(false) }}
                style={{ flex: 1, padding: '8px 0', background: '#EF4444', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Yes, Clear
              </button>
              <button onClick={() => setConfirmClear(false)}
                style={{ flex: 1, padding: '8px 0', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.dim, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, padding: '8px 0', background: C.navy, borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
              View Page
            </a>
            <button onClick={copyLink}
              style={{ padding: '8px 12px', background: copied ? 'rgba(22,163,74,0.1)' : C.bg, border: `1px solid ${copied ? C.green : C.border}`, borderRadius: 8, fontSize: 12, color: copied ? C.green : C.dim, cursor: 'pointer', fontWeight: 600 }}>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={onEdit}
              style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.dim, cursor: 'pointer', fontWeight: 600 }}>
              Edit
            </button>
            <button onClick={() => setConfirmClear(true)}
              style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: C.red, cursor: 'pointer', fontWeight: 700 }}>
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function SignRidersView() {
  const { supabase, profile } = useApp()
  const [slots, setSlots] = useState<(SRPage | null)[]>([null, null, null, null, null, null, null, null, null, null])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState<SRPage | null>(null)

  function getSlugPrefix(uid: string) {
    return uid.replace(/-/g, '').slice(0, 8)
  }

  async function ensureSlots() {
    if (!profile?.id) return
    const prefix = getSlugPrefix(profile.id)
    const expectedSlugs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `sr-${prefix}-${n}`)

    const { data: existing } = await supabase
      .from('open_house_pages')
      .select('*')
      .in('slug', expectedSlugs)
      .eq('page_type', 'sign_rider')

    const bySlug: Record<string, SRPage> = {}
    for (const row of existing ?? []) bySlug[row.slug] = row as SRPage

    // Create any missing slots
    const toCreate = expectedSlugs
      .filter(slug => !bySlug[slug])
      .map((slug) => {
        const n = Number(slug.slice(-1))
        return {
          slug,
          address: `Sign Rider ${n}`,
          city: '', state: 'UT', zip: '',
          page_type: 'sign_rider',
          status: 'active',
          created_by: profile.id,
          photos: [],
          advisor_name: profile.full_name || '',
          advisor_title: profile.title || '',
          advisor_email: profile.email || '',
          advisor_phone: profile.phone || '',
          advisor_nmls: profile.nmls || '',
          advisor_photo: profile.headshot_url || '',
        }
      })

    if (toCreate.length > 0) {
      const { data: created } = await supabase.from('open_house_pages').insert(toCreate).select('*')
      for (const row of created ?? []) bySlug[(row as SRPage).slug] = row as SRPage
    }

    setSlots(expectedSlugs.map(slug => bySlug[slug] ?? null))
    setLoading(false)
  }

  useEffect(() => { ensureSlots() }, [profile?.id])

  async function reload() {
    if (!profile?.id) return
    const prefix = getSlugPrefix(profile.id)
    const expectedSlugs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `sr-${prefix}-${n}`)
    const { data } = await supabase.from('open_house_pages').select('*').in('slug', expectedSlugs).eq('page_type', 'sign_rider')
    const bySlug: Record<string, SRPage> = {}
    for (const row of data ?? []) bySlug[(row as SRPage).slug] = row as SRPage
    setSlots(expectedSlugs.map(slug => bySlug[slug] ?? null))
  }

  return (
    <div style={{ padding: '28px 36px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Sign Riders</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>5 permanent QR code pages for your yard signs — edit anytime without changing the URL</div>
      </div>

      {loading ? (
        <div style={{ color: C.muted, padding: 32, textAlign: 'center' }}>Setting up your sign rider slots…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {slots.map((p, i) => p ? (
            <PageCard key={p.id} page={p} slotNum={i + 1} onEdit={() => setEditingPage(p)} onClear={async () => {
              await supabase.from('open_house_pages').update({
                address: `Sign Rider ${i + 1}`, city: '', state: 'UT', zip: '',
                beds: null, baths: null, sqft: null, list_price: null,
                description: null, photos: [], lot_size: null, year_built: null,
                tca_url: null, tca_screenshot: null, loom_url: null, callout_text: null,
                partner_name: null, partner_title: null, partner_email: null,
                partner_phone: null, partner_photo: null, partner_nmls: null, partner_logo: null,
              }).eq('id', p.id)
              reload()
            }} />
          ) : (
            <div key={i} style={{ background: C.white, borderRadius: 14, border: `2px dashed ${C.border}`, padding: 32, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🪧</div>
              <div style={{ fontWeight: 600 }}>Sign Rider {i + 1}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Setting up…</div>
            </div>
          ))}
        </div>
      )}

      {editingPage && (
        <CreateModal
          editing={editingPage}
          onClose={() => setEditingPage(null)}
          onSaved={() => { setEditingPage(null); reload() }}
        />
      )}
    </div>
  )
}
