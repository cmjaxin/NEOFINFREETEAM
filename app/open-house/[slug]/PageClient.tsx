'use client'
import { useState, useEffect, useRef } from 'react'
import LeadCaptureModal from '@/components/LeadCaptureModal'
import { createClient } from '@/lib/supabase/client'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  dim: '#374151', text: '#1F2937',
}

function fmtPrice(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

// ─── Photo Gallery ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos, address }: { photos: string[]; address: string }) {
  const [idx, setIdx] = useState(0)
  if (!photos || photos.length === 0) {
    return (
      <div style={{ width: '100%', height: 420, background: '#E4E8EC', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
        <div style={{ fontSize: 64, opacity: 0.3 }}>🏡</div>
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <img src={photos[idx]} alt={address} className="oh-gallery-img" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
      {photos.length > 1 && (
        <div>
          <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => setIdx(i => (i + 1) % photos.length)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 7 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 99, background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
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

// ─── Flyer Generator ──────────────────────────────────────────────────────────
function openFlyer(page: PageData) {
  const NEO = '#0A2540'
  const CYAN = '#5BCBF5'
  const photos = page.photos ?? []
  const hero = photos[0] ?? ''
  const small = [photos[1] ?? '', photos[2] ?? '', photos[3] ?? '']
  const desc = (page.description ?? '').slice(0, 900)
  const price = Number(page.list_price) > 0 ? '$' + Math.round(page.list_price).toLocaleString() : ''
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
.hero { position: relative; width: 100%; height: 3.1in; overflow: hidden; background: #CBD5E1; }
.hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero-fallback { width: 100%; height: 100%; background: linear-gradient(135deg, ${NEO} 0%, #1a4a7c 100%); display: flex; align-items: center; justify-content: center; font-size: 72px; }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,37,64,0.88) 0%, rgba(10,37,64,0.1) 55%, transparent 100%); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 18px 24px 16px; display: flex; align-items: flex-end; justify-content: space-between; }
.hero-address { color: #fff; }
.hero-street { font-size: 22px; font-weight: 900; line-height: 1.1; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
.hero-city { font-size: 13px; font-weight: 500; opacity: 0.85; margin-top: 3px; }
.hero-logo { display: flex; flex-direction: column; align-items: flex-end; gap: 14px; }
.hero-logo .neo-logo { max-height: 30px; max-width: 110px; object-fit: contain; }
.hero-logo .hero-partner-logo { max-height: 56px; max-width: 180px; object-fit: contain; }
.price-bar { height: 0.55in; background: ${NEO}; display: flex; align-items: center; padding: 0 24px; gap: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.price-tag { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.12em; margin-right: 10px; }
.price-value { font-size: 30px; font-weight: 900; color: ${CYAN}; letter-spacing: -0.01em; }
.price-divider { width: 1px; height: 28px; background: rgba(91,203,245,0.25); margin: 0 20px; flex-shrink: 0; }
.stats-row { display: flex; gap: 0; flex-wrap: nowrap; overflow: hidden; }
.stat-chip { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85); padding: 0 12px; white-space: nowrap; border-right: 1px solid rgba(91,203,245,0.2); }
.stat-chip:last-child { border-right: none; }
.main { display: flex; height: 5.97in; }
.left { flex: 0 0 58%; padding: 16px 18px 12px 24px; display: flex; flex-direction: column; gap: 14px; border-right: 1px solid #E4E8EC; overflow: hidden; }
.section-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: ${CYAN}; margin-bottom: 5px; }
.desc-text { font-size: 10px; line-height: 1.75; color: #374151; }
.qr-card { flex: 1; border: 2px solid ${CYAN}; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; padding: 18px 14px; background: linear-gradient(160deg, #EBF8FF 0%, #fff 60%); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.qr-card img { width: 130px; height: 130px; display: block; border-radius: 6px; border: 3px solid #fff; box-shadow: 0 3px 12px rgba(10,37,64,0.18); }
.qr-eyebrow { font-size: 7px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: ${CYAN}; margin-bottom: 12px; text-align: center; }
.qr-label { margin-top: 12px; font-size: 11px; font-weight: 900; color: ${NEO}; text-align: center; line-height: 1.4; }
.qr-sub { margin-top: 6px; font-size: 8px; color: #475569; text-align: center; line-height: 1.65; padding: 0 8px; }
.right { flex: 0 0 42%; padding: 16px 20px 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.photo-slot { flex: 1; min-height: 0; overflow: hidden; border-radius: 8px; border: 1px solid #E4E8EC; background: #F1F5F9; }
.photo-slot img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 8px; }
.photo-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #CBD5E1; font-size: 28px; }
.contact-bar { height: 0.95in; background: ${NEO}; display: flex; align-items: stretch; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.contact-cell { flex: 1; display: flex; align-items: center; gap: 14px; padding: 0 22px; }
.contact-sep { width: 1px; background: rgba(91,203,245,0.18); margin: 14px 0; flex-shrink: 0; }
.c-photo { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid ${CYAN}; }
.c-init { width: 44px; height: 44px; border-radius: 50%; background: rgba(91,203,245,0.12); border: 2px solid rgba(91,203,245,0.35); display: flex; align-items: center; justify-content: center; color: ${CYAN}; font-size: 18px; font-weight: 900; flex-shrink: 0; }
.c-info { color: #fff; }
.c-role { font-size: 8px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${CYAN}; margin-bottom: 3px; }
.c-name { font-size: 14px; font-weight: 800; line-height: 1.15; }
.c-detail { font-size: 9px; color: rgba(255,255,255,0.55); margin-top: 5px; line-height: 1.6; }
.footer { height: 0.43in; background: #F8FAFC; border-top: 2px solid ${CYAN}; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.footer-disc { font-size: 5px; color: #9CA3AF; line-height: 1.4; }
</style>
</head>
<body>
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
<div class="price-bar">
  ${price ? `<span class="price-tag">List Price</span><span class="price-value">${price}</span>` : ''}
  ${(price && stats.length > 0) ? `<div class="price-divider"></div>` : ''}
  ${stats.length > 0 ? `<div class="stats-row">${stats.map((s: string) => `<span class="stat-chip">${s}</span>`).join('')}</div>` : ''}
</div>
<div class="main">
  <div class="left">
    ${desc ? `<div><div class="section-label">About This Property</div><p class="desc-text">${desc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>` : ''}
    <div class="qr-card">
      <div class="qr-eyebrow">Financing Info</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${page.slug}`)}&size=280x280&margin=2&color=0A2540" alt="QR Code" />
      <div class="qr-label">Scan for Special<br>Financing Options</div>
      <div class="qr-sub">Payment breakdowns, loan scenarios &amp; connect with your mortgage advisor.</div>
    </div>
  </div>
  <div class="right">
    ${small.map((url: string, i: number) => `<div class="photo-slot">${url ? `<img src="${url}" alt="Photo ${i + 2}" />` : `<div class="photo-empty">🏠</div>`}</div>`).join('')}
  </div>
</div>
<div class="contact-bar">
  ${page.partner_name ? `<div class="contact-cell">${page.partner_photo ? `<img class="c-photo" src="${page.partner_photo}" alt="${page.partner_name}" />` : `<div class="c-init">${(page.partner_name[0] ?? '?').toUpperCase()}</div>`}<div class="c-info"><div class="c-role">${page.partner_title || 'Listing Agent'}</div><div class="c-name">${page.partner_name}</div><div class="c-detail">${[page.partner_phone, page.partner_email, partnerNmls].filter(Boolean).join('<br>')}</div></div></div><div class="contact-sep"></div>` : ''}
  ${page.advisor_name ? `<div class="contact-sep"></div><div class="contact-cell" style="justify-content:flex-end"><div class="c-info" style="text-align:right"><div class="c-role">${page.advisor_title || 'Mortgage Advisor'} · NEO Home Loans</div><div class="c-name">${page.advisor_name}</div><div class="c-detail">${[page.advisor_phone, page.advisor_email, advisorNmls].filter(Boolean).join('<br>')}</div></div>${page.advisor_photo ? `<img class="c-photo" src="${page.advisor_photo}" alt="${page.advisor_name}" />` : `<div class="c-init">${(page.advisor_name[0] ?? '?').toUpperCase()}</div>`}</div>` : ''}
</div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
interface PageData {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  beds: number; baths: number; sqft: number; lot_size: string; year_built: number
  description: string; photos: string[]; list_price: number; hoa_monthly: number
  loan_description: string | null
  advisor_name: string; advisor_title: string; advisor_email: string
  advisor_phone: string; advisor_photo: string; advisor_nmls: string
  partner_name: string; partner_title: string; partner_email: string
  partner_phone: string; partner_photo: string; partner_nmls: string; partner_logo: string
  tca_url: string | null; tca_screenshot: string | null
  callout_text: string | null
  schedule_url: string | null
  bntouch_user_id: string | null
}

export default function OpenHousePage({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'loan' | 'contact'>('loan')
  const [showLead, setShowLead] = useState(false)
  const leadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    try { if (sessionStorage.getItem('lp_lead_captured')) return } catch {}
    leadTimerRef.current = setTimeout(() => setShowLead(true), 10000)
    return () => { if (leadTimerRef.current) clearTimeout(leadTimerRef.current) }
  }, [])

  useEffect(() => {
    const sb = createClient()
    sb.from('open_house_pages')
      .select('*')
      .eq('slug', slug)
      .eq('page_type', 'open_house')
      .limit(1)
      .then(({ data, error }) => {
        if (error) { setDbError(`DB error: ${error.message}`); setLoading(false); return }
        if (!data || data.length === 0) { setDbError(`No page found for "${slug}"`); setLoading(false); return }
        if (data[0].status !== 'active') { setDbError('Page not active'); setLoading(false); return }
        const row = data[0]
        const pageData: PageData = {
          partner_name: '', partner_title: '', partner_email: '', partner_phone: '',
          partner_photo: '', partner_nmls: '', partner_logo: '',
          tca_url: null, tca_screenshot: null, callout_text: null, schedule_url: null, loan_description: null, bntouch_user_id: null,
          ...row,
        } as PageData

        const fetchExtras = async () => {
          const [profileRes, partnerRes] = await Promise.all([
            row.created_by
              ? sb.from('profiles').select('schedule_url, bntouch_user_id').eq('id', row.created_by).single()
              : Promise.resolve({ data: null }),
            pageData.partner_name
              ? sb.from('marketing_partners').select('logo_url, name')
              : Promise.resolve({ data: null }),
          ])
          const profileData = profileRes.data as { schedule_url?: string; bntouch_user_id?: string } | null
          const scheduleUrl = profileData?.schedule_url ?? null
          const bntouchUserId = profileData?.bntouch_user_id ?? null
          let finalData = { ...pageData, schedule_url: scheduleUrl, bntouch_user_id: bntouchUserId }
          if (partnerRes.data) {
            const match = (partnerRes.data as { name: string; logo_url: string }[]).find(p =>
              p.name.toLowerCase().trim() === pageData.partner_name.toLowerCase().trim()
            )
            if (match?.logo_url) finalData = { ...finalData, partner_logo: match.logo_url }
          }
          setPage(finalData)
        }
        fetchExtras()
        setLoading(false)
      }, (e: unknown) => { setDbError(`Fetch error: ${e}`); setLoading(false) })
  }, [slug])

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ color: C.muted, fontSize: 16 }}>Loading…</div>
    </div>
  )
  if (dbError || !page) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>Page not found</div>
        <div style={{ color: C.muted, marginTop: 8 }}>This open house page may have been removed.</div>
        {dbError && <div style={{ marginTop: 16, padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', textAlign: 'left', fontFamily: 'monospace', wordBreak: 'break-all' }}>{dbError}</div>}
      </div>
    </div>
  )

  const hasLoanContent = !!(page.loan_description || page.tca_url)
  const TABS: { id: 'overview' | 'loan' | 'contact'; label: string }[] = [
    { id: 'overview', label: 'Property Info' },
    ...(hasLoanContent ? [{ id: 'loan' as const, label: 'Loan Scenarios' }] : []),
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {showLead && (
        <LeadCaptureModal
          address={page.address + (page.city ? ', ' + page.city : '')}
          bntouchUserId={page.bntouch_user_id}
          onDismiss={() => setShowLead(false)}
          callout={page.callout_text}
        />
      )}
      {/* Header */}
      <header style={{ background: C.navy, padding: '14px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {page.partner_logo ? (
            <img src={page.partner_logo} alt={page.partner_name} style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain' }} />
          ) : <div />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png" alt="NEO Home Loans" style={{ height: 32, width: 'auto' }} />
            <button onClick={() => openFlyer(page)}
              style={{ background: C.accent, color: C.navy, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ↓ Download Flyer
            </button>
          </div>
        </div>
      </header>

      {page.callout_text && (
        <div style={{ background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)', padding: '28px 20px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📣</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{page.callout_text}</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Photos */}
        <PhotoGallery photos={page.photos ?? []} address={page.address} />

        {/* Price + Address + Stats */}
        <div style={{ marginTop: 20 }}>
          <div className="oh-price" style={{ fontWeight: 800, color: C.navy, lineHeight: 1 }}>
            {Number(page.list_price) > 0 ? fmtPrice(page.list_price) : 'Price Upon Request'}
          </div>
          <div style={{ fontSize: 16, color: C.dim, marginTop: 6, fontWeight: 600 }}>{page.address}</div>
          <div style={{ fontSize: 14, color: C.muted }}>{page.city}{page.city && page.state ? ', ' : ''}{page.state} {page.zip}</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, padding: '14px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
            {[
              { label: 'Beds', val: page.beds },
              { label: 'Baths', val: page.baths },
              { label: 'Sq Ft', val: page.sqft ? page.sqft.toLocaleString() : null },
              { label: 'Lot', val: page.lot_size || null },
              { label: 'Year Built', val: page.year_built || null },
              { label: 'HOA', val: Number(page.hoa_monthly) > 0 ? `${fmtPrice(page.hoa_monthly)}/mo` : null },
            ].filter(r => r.val).map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginTop: 2 }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact cards — partner first, then advisor */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '20px 0' }}>

          {/* Partner card */}
          {page.partner_name && (
            <div style={{ flex: '1 1 200px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Listing Agent</div>
                {page.partner_logo && <img src={page.partner_logo} alt={page.partner_name} style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain' }} />}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {page.partner_photo
                  ? <img src={page.partner_photo} alt={page.partner_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.navy, fontWeight: 800, flexShrink: 0 }}>{page.partner_name[0]}</div>
                }
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{page.partner_name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{page.partner_title || 'Listing Agent'}</div>
                  {page.partner_nmls && <div style={{ fontSize: 11, color: C.muted }}>NMLS# {page.partner_nmls}</div>}
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {page.partner_phone && <a href={`tel:${page.partner_phone}`} style={{ fontSize: 12, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>{page.partner_phone}</a>}
                    {page.partner_email && <a href={`mailto:${page.partner_email}`} style={{ fontSize: 11, color: C.muted, textDecoration: 'none', wordBreak: 'break-all' }}>{page.partner_email}</a>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advisor card */}
          <div style={{ flex: '1 1 200px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loan Advisor</div>
              <img src="https://8blocks.s3-us-west-1.amazonaws.com/neo/images/logo-big.jpg" alt="NEO Home Loans" style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {page.advisor_photo
                ? <img src={page.advisor_photo} alt={page.advisor_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.accent, fontWeight: 800, flexShrink: 0 }}>{page.advisor_name?.[0] ?? '?'}</div>
              }
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{page.advisor_name || 'Loan Advisor'}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{page.advisor_title || 'Mortgage Advisor'}</div>
                {page.advisor_nmls && <div style={{ fontSize: 11, color: C.muted }}>NMLS# {page.advisor_nmls}</div>}
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {page.advisor_phone && <a href={`tel:${page.advisor_phone}`} style={{ fontSize: 12, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>{page.advisor_phone}</a>}
                  {page.advisor_email && <a href={`mailto:${page.advisor_email}?subject=Open House — ${page.address}`} style={{ fontSize: 11, color: C.muted, textDecoration: 'none', wordBreak: 'break-all' }}>{page.advisor_email}</a>}
                </div>
              </div>
            </div>
            {page.schedule_url && (
              <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', marginTop: 14, textAlign: 'center', background: C.accent, color: C.navy, fontWeight: 700, fontSize: 13, padding: '10px 0', borderRadius: 9, textDecoration: 'none' }}>
                Schedule a Time to Talk →
              </a>
            )}
          </div>

        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="oh-tab-btn"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? C.navy : C.muted,
                borderBottom: `2px solid ${activeTab === t.id ? C.navy : 'transparent'}`, marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Property Info Tab */}
        {activeTab === 'overview' && (
          <div>
            {page.description ? (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 10 }}>About This Property</div>
                <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{page.description}</div>
              </div>
            ) : (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 32, textAlign: 'center', color: C.muted }}>
                No property description provided.
              </div>
            )}
          </div>
        )}

        {/* Loan Scenarios Tab */}
        {activeTab === 'loan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Loan Description */}
            {page.loan_description && (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 14 }}>Loan Scenario</div>
                <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.85, fontStyle: 'italic', whiteSpace: 'pre-wrap', borderLeft: `3px solid ${C.accent}`, paddingLeft: 16 }}>
                  {page.loan_description}
                </div>
              </div>
            )}

            {/* TCA Embed */}
            {page.tca_url ? (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: C.navy }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Total Cost Analysis</div>
                    <a href={page.tca_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: C.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      Open Full Screen ↗
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <svg width="14" height="16" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 20L20 7L35 20V40H26V29H14V40H5V20Z" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" fill="none"/><line x1="14" y1="25" x2="26" y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/><line x1="14" y1="30" x2="26" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/></svg>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>Special financing incentive available! This home qualifies for a reduced interest rate or closing cost credit when financed through NEO Home Loans, the preferred lender. Participation is optional; buyers may use any lender of their choice. Contact listing agent or lender for details.</div>
                  </div>
                </div>
                <iframe
                  src={page.tca_url}
                  className="oh-iframe-tca"
                  style={{ width: '100%', border: 'none', display: 'block' }}
                  title="Total Cost Analysis"
                  allow="fullscreen"
                />
              </div>
            ) : !page.loan_description ? (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 32, textAlign: 'center', color: C.muted }}>
                Loan scenario details coming soon.
              </div>
            ) : null}

          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: C.navy, borderRadius: 16, padding: '32px 28px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Ready to connect?</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 20 }}>
                Schedule a time to talk with {page.advisor_name?.split(' ')[0] || 'your advisor'}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 28, textAlign: 'left', flexWrap: 'wrap' }}>
                {[
                  { num: '01', text: 'Walk through the loan scenario and payment breakdown in detail' },
                  { num: '02', text: 'Help you secure below-market interest rates on your next home purchase' },
                ].map(r => (
                  <div key={r.num} style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: '0.06em', flexShrink: 0, marginTop: 1 }}>{r.num}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{r.text}</div>
                  </div>
                ))}
              </div>
              {page.schedule_url && (
                <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', background: C.accent, color: C.navy, fontWeight: 800, fontSize: 15, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
                  Schedule a Free Consultation →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legal Disclaimer Footer */}
      <div style={{ background: '#F1F5F9', borderTop: '1px solid #E4E8EC', padding: '20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', fontSize: 9, color: '#94A3B8', lineHeight: 1.7 }}>
          Special financing incentive available! This home qualifies for a reduced interest rate or closing cost credit when financed through NEO Home Loans, the preferred lender. Participation is optional; buyers may use any lender of their choice. Contact listing agent or lender for details. © 2026 Better Home &amp; Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License # 02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Better BMC operates under the name Better Mortgage Corporation in New York. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, 80th Floor, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access. Better Real Estate, LLC dba BRE, Better Home Services, BRE Services, LLC and Better Real Estate, and operating in the State of California through its wholly owned subsidiary Better Real Estate California Inc., is a licensed real estate brokerage and maintains its corporate headquarters at 325-41 Chestnut Street, Suite 826, Philadelphia, PA 19106. Better Real Estate, LLC provides access to real estate brokerage services via its nationwide network of partner brokerages and real estate agents. Equal Housing Opportunity. All rights reserved. New York State Housing and Anti-Discrimination Notice. New York Standard Operating Procedures. Texas Real Estate Commission: Information About Brokerage Services | Consumer Protection Notice. Better Settlement Services, LLC. 325-41 Chestnut Street, Suite 803, Philadelphia, PA 19106. Homeowners insurance policies are offered through Better Cover, LLC, a Pennsylvania Resident Producer Agency. License #881593. 325-41 Chestnut Street, Suite 807, Philadelphia, PA 19106. Better Inspect, LLC maintains its corporate headquarters at 325-41 Chestnut Street, Suite 846, Philadelphia, PA 19106. Better Mortgage Corporation, Better Real Estate, LLC, Better Settlement Services, LLC, Better Cover, LLC, Better Connect, and Better Inspect, LLC are separate operating subsidiaries of Better Home &amp; Finance Holding Company. Each company is a separate legal entity operated and managed through its own management and governance structure as required by its state of incorporation, and applicable and legal and regulatory requirements. Products not available in all states. Any unauthorized use of any proprietary or intellectual property is strictly prohibited. All trademarks, service marks, trade names, logos, icons, and domain names are proprietary to Better Home &amp; Finance Holding Company. Licensed by the Department of Financial Protection and Innovation under the California Residential Mortgage Lending Act.
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Montserrat', system-ui, sans-serif; }
        a { color: inherit; }
        .oh-gallery-img { width: 100%; height: 420px; object-fit: cover; display: block; }
        .oh-price { font-size: 30px; }
        .oh-tab-btn { padding: 10px 22px; font-size: 14px; }
        .oh-iframe-tca { height: 820px; }
        @media (max-width: 600px) {
          .oh-gallery-img { height: 240px; }
          .oh-price { font-size: 22px; }
          .oh-tab-btn { padding: 8px 12px; font-size: 12px; }
          .oh-iframe-tca { height: 500px; }
        }
      `}</style>
    </div>
  )
}
