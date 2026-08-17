'use client'
// ─── DB MIGRATION (run in Supabase SQL editor before first use) ───────────────
// alter table open_house_pages add column if not exists page_type text default 'listing';
// alter table open_house_pages add column if not exists loan_description text;
// ─────────────────────────────────────────────────────────────────────────────

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

function fmtPrice(n: number) { return '$' + Math.round(n).toLocaleString() }

interface OHEPage {
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
  loan_description: string
  page_type: string
}

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

// ─── Flyer Generator ──────────────────────────────────────────────────────────
function openFlyer(page: OHEPage) {
  const NEO = '#0A2540'
  const CYAN = '#5BCBF5'
  const photos = page.photos ?? []
  const hero = photos[0] ?? ''
  const small = [photos[1] ?? '', photos[2] ?? '', photos[3] ?? '']
  const desc = (page.description ?? '').slice(0, 900)
  const price = page.list_price ? fmtPrice(page.list_price) : ''
  const location = [page.city, page.state, page.zip].filter(Boolean).join(', ')
  const advisorNmls = page.advisor_nmls ? `NMLS# ${page.advisor_nmls}` : ''
  const partnerNmls = page.partner_nmls ? `NMLS# ${page.partner_nmls}` : ''

  const stats = [
    page.beds ? `${page.beds} Beds` : '',
    page.baths ? `${page.baths} Baths` : '',
    page.sqft ? `${page.sqft.toLocaleString()} Sq Ft` : '',
    page.lot_size ? `${page.lot_size} Lot` : '',
    page.year_built ? `Built ${page.year_built}` : '',
  ].filter(Boolean)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Open House — ${page.address}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: letter portrait; margin: 0; }
html, body { width: 8.5in; height: 11in; overflow: hidden; font-family: 'Arial', Helvetica, sans-serif; background: #fff; }

/* ── HERO ── */
.hero {
  position: relative;
  width: 100%; height: 3.1in;
  overflow: hidden;
  background: #CBD5E1;
}
.hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero-fallback {
  width: 100%; height: 100%;
  background: linear-gradient(135deg, ${NEO} 0%, #1a4a7c 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 72px;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(10,37,64,0.88) 0%, rgba(10,37,64,0.1) 55%, transparent 100%);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.hero-content {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 18px 24px 16px;
  display: flex; align-items: flex-end; justify-content: space-between;
}
.hero-address { color: #fff; }
.hero-street { font-size: 22px; font-weight: 900; line-height: 1.1; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
.hero-city { font-size: 13px; font-weight: 500; opacity: 0.85; margin-top: 3px; }
.hero-logo { display: flex; flex-direction: column; align-items: flex-end; gap: 14px; }
.hero-logo .neo-logo { max-height: 30px; max-width: 110px; object-fit: contain; }
.hero-logo .hero-partner-logo { max-height: 56px; max-width: 180px; object-fit: contain; }

/* ── PRICE BAR ── */
.price-bar {
  height: 0.55in;
  background: ${NEO};
  display: flex; align-items: center;
  padding: 0 24px;
  gap: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.price-tag { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.12em; margin-right: 10px; }
.price-value { font-size: 30px; font-weight: 900; color: ${CYAN}; letter-spacing: -0.01em; }
.price-divider { width: 1px; height: 28px; background: rgba(91,203,245,0.25); margin: 0 20px; flex-shrink: 0; }
.stats-row { display: flex; gap: 0; flex-wrap: nowrap; overflow: hidden; }
.stat-chip {
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85);
  padding: 0 12px; white-space: nowrap;
  border-right: 1px solid rgba(91,203,245,0.2);
}
.stat-chip:last-child { border-right: none; }

/* ── MAIN ── */
.main { display: flex; height: 5.97in; }

/* LEFT COLUMN */
.left { flex: 0 0 58%; padding: 16px 18px 12px 24px; display: flex; flex-direction: column; gap: 14px; border-right: 1px solid #E4E8EC; overflow: hidden; }
.section-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: ${CYAN}; margin-bottom: 5px; }
.desc-text { font-size: 10px; line-height: 1.75; color: #374151; }
.qr-card {
  flex: 1;
  border: 2px solid ${CYAN};
  border-radius: 10px;
  overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 0;
  padding: 18px 16px;
  background: linear-gradient(160deg, #F0F9FF 0%, #fff 100%);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.qr-card img { width: 140px; height: 140px; display: block; border-radius: 6px; }
.qr-label {
  margin-top: 10px;
  font-size: 9.5px; font-weight: 800; color: ${NEO};
  text-transform: uppercase; letter-spacing: 0.1em;
  text-align: center; line-height: 1.5;
}
.qr-sub {
  margin-top: 4px;
  font-size: 8px; color: #64748B; text-align: center; line-height: 1.5;
}

/* RIGHT COLUMN */
.right { flex: 0 0 42%; padding: 16px 20px 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.photo-slot { flex: 1; min-height: 0; overflow: hidden; border-radius: 8px; border: 1px solid #E4E8EC; background: #F1F5F9; }
.photo-slot img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 8px; }
.photo-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #CBD5E1; font-size: 28px; }

/* ── CONTACT BAR ── */
.contact-bar {
  height: 0.95in;
  background: ${NEO};
  display: flex; align-items: stretch;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.contact-cell { flex: 1; display: flex; align-items: center; gap: 14px; padding: 0 22px; }
.contact-sep { width: 1px; background: rgba(91,203,245,0.18); margin: 14px 0; flex-shrink: 0; }
.contact-center { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0 18px; }
.contact-center img { max-height: 36px; max-width: 120px; object-fit: contain; }
.c-photo { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid ${CYAN}; }
.c-init { width: 44px; height: 44px; border-radius: 50%; background: rgba(91,203,245,0.12); border: 2px solid rgba(91,203,245,0.35); display: flex; align-items: center; justify-content: center; color: ${CYAN}; font-size: 18px; font-weight: 900; flex-shrink: 0; }
.c-info { color: #fff; }
.c-role { font-size: 8px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${CYAN}; margin-bottom: 3px; }
.c-name { font-size: 14px; font-weight: 800; line-height: 1.15; }
.c-detail { font-size: 9px; color: rgba(255,255,255,0.55); margin-top: 5px; line-height: 1.6; }

/* ── FOOTER ── */
.footer {
  height: 0.43in;
  background: #F8FAFC;
  border-top: 2px solid ${CYAN};
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.footer-disc { font-size: 5px; color: #9CA3AF; line-height: 1.4; }
.footer-ehl { font-size: 7px; font-weight: 700; color: #9CA3AF; letter-spacing: 0.05em; }
</style>
</head>
<body>

<!-- HERO -->
<div class="hero">
  ${hero ? `<img src="${hero}" alt="${page.address}" />` : `<div class="hero-fallback">🏡</div>`}
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-address">
      <div class="hero-street">${page.address}</div>
      ${location ? `<div class="hero-city">${location}</div>` : ''}
    </div>
    <div class="hero-logo">
      ${page.partner_logo ? `<img class="hero-partner-logo" src="${page.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" />` : ''}
      <img class="neo-logo" src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png" alt="NEO Home Loans" />
    </div>
  </div>
</div>

<!-- PRICE BAR -->
<div class="price-bar">
  ${price ? `<span class="price-tag">List Price</span><span class="price-value">${price}</span>` : ''}
  ${(price && stats.length > 0) ? `<div class="price-divider"></div>` : ''}
  ${stats.length > 0 ? `<div class="stats-row">${stats.map(s => `<span class="stat-chip">${s}</span>`).join('')}</div>` : ''}
</div>

<!-- MAIN CONTENT -->
<div class="main">

  <!-- LEFT -->
  <div class="left">
    ${desc ? `
    <div>
      <div class="section-label">About This Property</div>
      <p class="desc-text">${desc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>` : ''}

    <div class="qr-card">
      <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${page.slug}`)}&size=280x280&margin=2&color=0A2540" alt="QR Code" />
      <div class="qr-label">Scan to View Special<br>Financing Options</div>
      <div class="qr-sub">See payment breakdowns, loan scenarios,<br>and connect with your mortgage advisor.</div>
    </div>
  </div>

  <!-- RIGHT -->
  <div class="right">
    ${small.map((url, i) => `
    <div class="photo-slot">
      ${url ? `<img src="${url}" alt="Photo ${i + 2}" />` : `<div class="photo-empty">🏠</div>`}
    </div>`).join('')}
  </div>

</div>

<!-- CONTACT BAR -->
<div class="contact-bar">
  ${page.partner_name ? `
  <div class="contact-cell">
    ${page.partner_photo
      ? `<img class="c-photo" src="${page.partner_photo}" alt="${page.partner_name}" />`
      : `<div class="c-init">${(page.partner_name[0] ?? '?').toUpperCase()}</div>`}
    <div class="c-info">
      <div class="c-role">${page.partner_title || 'Listing Agent'}</div>
      <div class="c-name">${page.partner_name}</div>
      <div class="c-detail">${[page.partner_phone, page.partner_email, partnerNmls].filter(Boolean).join('<br>')}</div>
    </div>
  </div>
  <div class="contact-sep"></div>` : ''}

  ${page.advisor_name ? `
  <div class="contact-sep"></div>
  <div class="contact-cell" style="justify-content:flex-end">
    <div class="c-info" style="text-align:right">
      <div class="c-role">${page.advisor_title || 'Mortgage Advisor'} · NEO Home Loans</div>
      <div class="c-name">${page.advisor_name}</div>
      <div class="c-detail">${[page.advisor_phone, page.advisor_email, advisorNmls].filter(Boolean).join('<br>')}</div>
    </div>
    ${page.advisor_photo
      ? `<img class="c-photo" src="${page.advisor_photo}" alt="${page.advisor_name}" />`
      : `<div class="c-init">${(page.advisor_name[0] ?? '?').toUpperCase()}</div>`}
  </div>` : ''}
</div>

<!-- FOOTER -->
<div class="footer">
  <span class="footer-disc">BETTER MORTGAGE RESERVES THE RIGHT TO MODIFY OR DISCONTINUE PRODUCTS, PROMOTIONS AND BENEFITS AT ANY TIME WITHOUT NOTICE. Rates and Terms are subject to change at any time without notice and are subject to state restrictions. The Better Home Logo is Registered in the U.S. Patent and Trademark Office. © 2025 Better Home &amp; Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License #02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, Floor 80, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access.</span>
  <img src="https://ourcpb.bank/wp-content/uploads/2024/03/equal-housing-lender-logo-png-transparent.png" alt="Equal Housing Lender" style="height:22px;width:auto;object-fit:contain;flex-shrink:0;margin-left:10px;" />
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function CreateModal({ editing, onClose, onSaved }: { editing: OHEPage | null; onClose: () => void; onSaved: () => void }) {
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
              if ((init as OHEPage).id) {
                supabase.from('open_house_pages')
                  .update({ partner_logo: match.logo_url })
                  .eq('id', (init as OHEPage).id)
                  .then(() => {})
              }
              return { ...f, partner_logo: match.logo_url }
            }
          }
          return f
        })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.email])

  const init = editing ?? {} as Partial<OHEPage>
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
    loan_description: (init as OHEPage).loan_description ?? '',
    tca_url: (init as OHEPage).tca_url ?? '',
    tca_screenshot: (init as OHEPage).tca_screenshot ?? '',
    advisor_name: init.advisor_name || profile?.full_name || '',
    advisor_title: init.advisor_title || profile?.title || '',
    advisor_email: init.advisor_email || profile?.email || '',
    advisor_phone: init.advisor_phone || profile?.phone || '',
    advisor_nmls: init.advisor_nmls || profile?.nmls || '',
    advisor_photo: init.advisor_photo || profile?.headshot_url || '',
    partner_name: (init as OHEPage).partner_name ?? '',
    partner_title: (init as OHEPage).partner_title ?? '',
    partner_email: (init as OHEPage).partner_email ?? '',
    partner_phone: (init as OHEPage).partner_phone ?? '',
    partner_nmls: (init as OHEPage).partner_nmls ?? '',
    partner_photo: (init as OHEPage).partner_photo ?? '',
    partner_logo: (init as OHEPage).partner_logo ?? '',
  })
  const [showPartner, setShowPartner] = useState(!!(init as OHEPage).partner_name)
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
      loan_description: form.loan_description || null,
      tca_url: form.tca_url || null,
      tca_screenshot: form.tca_screenshot || null,
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
      page_type: 'open_house',
      updated_at: new Date().toISOString(),
    }

    async function attempt(p: Record<string, unknown>) {
      if (editing) {
        const res = await supabase.from('open_house_pages').update(p).eq('id', editing.id).select('id')
        return res
      } else {
        const slug = 'oh-' + slugify(form.address + ' ' + form.city)
        return supabase.from('open_house_pages').insert({ ...p, slug, status: 'active', created_by: profile!.id })
      }
    }
    let res = await attempt(payload as Record<string, unknown>)
    if (res.error?.code === '42703') {
      const { loan_description: _ld, tca_url: _a, tca_screenshot: _b, page_type: _pt, ...corePayload } = payload
      res = await attempt(corePayload as Record<string, unknown>)
    }
    if (res.error) { setMsg(`Save failed: ${res.error.message} (${res.error.code})`); setSaving(false); return }
    if (editing && res.data && res.data.length === 0) {
      setMsg('Save failed: no row updated. Check that you own this open house.')
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
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{editing ? 'Edit Open House' : 'New Open House'}</div>
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
            <SectionHead title="Photos" sub="Photo 1 is the hero. Photos 2–4 appear in the right column of the flyer." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[0, 1, 2, 3].map(i => {
                const photos = form.photos as string[]
                const url = photos[i] ?? ''
                const labels = [
                  'Photo 1 — Hero (full-width flyer banner)',
                  'Photo 2 — Flyer right column, top',
                  'Photo 3 — Flyer right column, middle',
                  'Photo 4 — Flyer right column, bottom',
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

          {/* Loan Scenario + TCA */}
          <section>
            <SectionHead title="Loan Scenario & TCA" sub="Describe the loan scenario for buyers. Add the TCA URL and/or screenshot for the flyer." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Loan Description */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Loan Scenario Description</label>
                <textarea
                  placeholder="Describe the loan scenario, rate buy-down, payment breakdown…"
                  value={form.loan_description}
                  onChange={e => set('loan_description', e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, outline: 'none', background: C.white, resize: 'vertical' }}
                />
              </div>
              {/* TCA URL */}
              <Field label="TCA Embed URL" name="tca_url" placeholder="https://report.mortgagecoach.com/v2/classic/#…" value={form.tca_url} onChange={set} />
              {/* TCA Screenshot */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: C.dim, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>TCA Screenshot</label>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Upload a screenshot of your MortgageCoach report — it prints on the left side of the flyer.</div>
                {form.tca_screenshot ? (
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
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
            <SectionHead title="Your Contact Info" sub="Auto-filled from your profile — edit here to override for this open house" />
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
                  <Field label="Partner Logo URL" name="partner_logo" placeholder="https://… (brokerage logo for flyer)" half value={form.partner_logo} onChange={set} />
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Page'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Push to Sign Rider Modal ─────────────────────────────────────────────────
function PushToSignRiderModal({ page, onClose }: { page: OHEPage; onClose: () => void }) {
  const { supabase, profile } = useApp()
  const [pushing, setPushing] = useState(false)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState('')

  function getSlugPrefix(uid: string) { return uid.replace(/-/g, '').slice(0, 8) }

  async function push(slotNum: number) {
    if (!profile?.id) return
    setPushing(true); setMsg('')
    const prefix = getSlugPrefix(profile.id)
    const slug = `sr-${prefix}-${slotNum}`
    const payload = {
      address: page.address,
      city: page.city,
      state: page.state,
      zip: page.zip,
      beds: page.beds,
      baths: page.baths,
      sqft: page.sqft,
      list_price: page.list_price,
      description: page.description,
      photos: page.photos,
      lot_size: page.lot_size,
      year_built: page.year_built,
      tca_url: page.tca_url,
      tca_screenshot: page.tca_screenshot,
      advisor_name: page.advisor_name,
      advisor_title: page.advisor_title,
      advisor_email: page.advisor_email,
      advisor_phone: page.advisor_phone,
      advisor_nmls: page.advisor_nmls,
      advisor_photo: page.advisor_photo,
      partner_name: page.partner_name,
      partner_title: page.partner_title,
      partner_email: page.partner_email,
      partner_phone: page.partner_phone,
      partner_photo: page.partner_photo,
      partner_nmls: page.partner_nmls,
      partner_logo: page.partner_logo,
    }
    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase.from('open_house_pages').select('id').eq('slug', slug).eq('page_type', 'sign_rider').single()
    if (existing?.id) {
      const { error } = await supabase.from('open_house_pages').update(payload).eq('id', existing.id)
      if (error) { setMsg('Failed: ' + error.message); setPushing(false); return }
    } else {
      const { error } = await supabase.from('open_house_pages').insert({
        ...payload, slug, page_type: 'sign_rider', status: 'active', created_by: profile.id,
      })
      if (error) { setMsg('Failed: ' + error.message); setPushing(false); return }
    }
    setDone(true); setPushing(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,37,64,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 18, width: '100%', maxWidth: 380, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.muted }}>×</button>
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Sign Rider Updated!</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Property info has been pushed to your sign rider page.</div>
            <button onClick={onClose} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, padding: '10px 24px', cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Push to Sign Rider</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.navy, marginBottom: 4 }}>Select a sign rider slot</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>
              Property info from <strong>{page.address}</strong> will be copied to the selected sign rider.
            </div>
            {msg && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#DC2626' }}>{msg}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button key={n} disabled={pushing} onClick={() => push(n)}
                  style={{ padding: '13px 18px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontWeight: 700, color: C.navy, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Sign Rider {n}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Push →</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page Card ────────────────────────────────────────────────────────────────
function PageCard({ page, onEdit, onDelete }: { page: OHEPage; onEdit: () => void; onDelete: () => void }) {
  const url = `/open-house/${page.slug}`
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPushToSR, setShowPushToSR] = useState(false)
  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {page.photos && page.photos.length > 0 ? (
        <img src={page.photos[0]} alt={page.address} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
      ) : (
        <div style={{ height: 100, background: 'linear-gradient(135deg, #0A2540, #1a4a7c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🏡</div>
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
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {page.loan_description && (
            <div style={{ fontSize: 11, background: 'rgba(91,203,245,0.1)', borderRadius: 6, padding: '3px 8px', color: C.navy, fontWeight: 600 }}>
              ✓ Loan scenario
            </div>
          )}
          {page.tca_url && (
            <div style={{ fontSize: 11, background: 'rgba(91,203,245,0.1)', borderRadius: 6, padding: '3px 8px', color: C.navy, fontWeight: 600 }}>
              ✓ TCA linked
            </div>
          )}
          {page.tca_screenshot && (
            <div style={{ fontSize: 11, background: 'rgba(22,163,74,0.1)', borderRadius: 6, padding: '3px 8px', color: C.green, fontWeight: 600 }}>
              ✓ Flyer screenshot
            </div>
          )}
        </div>

        {confirmDelete ? (
          <div style={{ marginTop: 'auto', paddingTop: 14, background: '#FEF2F2', borderRadius: 10, padding: 12, border: '1px solid #FECACA' }}>
            <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 600, marginBottom: 10 }}>Delete this open house?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onDelete}
                style={{ flex: 1, padding: '8px 0', background: '#EF4444', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Yes, Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
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
            <button onClick={() => openFlyer(page)}
              style={{ padding: '8px 12px', background: C.accent, border: 'none', borderRadius: 8, fontSize: 12, color: C.navy, cursor: 'pointer', fontWeight: 700 }}>
              Print Flyer
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.origin + url) }}
              style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.dim, cursor: 'pointer', fontWeight: 600 }}>
              Copy Link
            </button>
            <a href={`${url}/agent`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 12px', background: 'rgba(91,203,245,0.1)', border: `1px solid rgba(91,203,245,0.3)`, borderRadius: 8, fontSize: 12, color: C.navy, cursor: 'pointer', fontWeight: 700, textDecoration: 'none' }}>
              Agent Hub ↗
            </a>
            <button onClick={onEdit}
              style={{ padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.dim, cursor: 'pointer', fontWeight: 600 }}>
              Edit
            </button>
            <button onClick={() => setShowPushToSR(true)}
              style={{ padding: '8px 12px', background: 'rgba(91,203,245,0.08)', border: `1px solid rgba(91,203,245,0.35)`, borderRadius: 8, fontSize: 12, color: C.navy, cursor: 'pointer', fontWeight: 700 }}>
              → Sign Rider
            </button>
            <button onClick={() => setConfirmDelete(true)}
              style={{ padding: '8px 12px', background: '#FEF2F2', border: `1px solid #FECACA`, borderRadius: 8, fontSize: 12, color: C.red, cursor: 'pointer', fontWeight: 600 }}>
              Delete
            </button>
          </div>
        )}
      </div>
      {showPushToSR && <PushToSignRiderModal page={page} onClose={() => setShowPushToSR(false)} />}
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function OpenHouseEvents() {
  const { supabase, profile } = useApp()
  const [pages, setPages] = useState<OHEPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPage, setEditingPage] = useState<OHEPage | null>(null)

  async function load() {
    if (!profile?.id) return
    const { data } = await supabase
      .from('open_house_pages')
      .select('*')
      .eq('status', 'active')
      .eq('created_by', profile.id)
      .eq('page_type', 'open_house')
      .order('created_at', { ascending: false })
    setPages((data ?? []) as OHEPage[])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  async function deletePage(page: OHEPage) {
    setPages(prev => prev.filter(p => p.id !== page.id))
    const { error } = await supabase.from('open_house_pages').delete().eq('id', page.id)
    if (error) {
      setPages(prev => [...prev, page])
      load()
    }
  }

  return (
    <div style={{ padding: '28px 36px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Open Houses</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Create public open house pages with loan scenarios and TCA for buyers</div>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ padding: '10px 20px', background: C.navy, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>+</span> New Open House
        </button>
      </div>

      {loading ? (
        <div style={{ color: C.muted, padding: 32, textAlign: 'center' }}>Loading…</div>
      ) : pages.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No open house pages yet</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Create an open house page to share loan scenarios with buyers at your next event.</div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '12px 28px', background: C.navy, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Create Your First Open House
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {pages.map(p => (
            <PageCard key={p.id} page={p} onEdit={() => setEditingPage(p)} onDelete={() => deletePage(p)} />
          ))}
        </div>
      )}

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
