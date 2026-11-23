'use client'
import { useState, useEffect, useRef } from 'react'
import LeadCaptureModal from '@/components/LeadCaptureModal'
import { createClient } from '@/lib/supabase/client'
import { BetterDisclaimer } from '@/lib/disclaimer'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  dim: '#374151', text: '#1F2937',
}

function fmtPrice(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

function loomIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
    return match?.[1] ?? null
  } catch { return null }
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
  id: string; slug: string; created_by?: string; address: string; city: string; state: string; zip: string
  beds: number; baths: number; sqft: number; lot_size: string; year_built: number
  description: string; photos: string[]; list_price: number; hoa_monthly: number
  loan_description: string | null
  advisor_name: string; advisor_title: string; advisor_email: string
  advisor_phone: string; advisor_photo: string; advisor_nmls: string
  partner_name: string; partner_title: string; partner_email: string
  partner_phone: string; partner_photo: string; partner_nmls: string; partner_logo: string
  tca_url: string | null; tca_screenshot: string | null
  loom_url: string | null
  seller_contribution: number | null
  seller_contribution_pct: number | null
  rate_scenarios: Array<{
    label: string; down_pct: number; market_rate: number; buydown_rate: number
    market_payment: number; buydown_payment: number; loan_type: string; term_years: number; apr: number
  }> | null
  callout_text: string | null
  schedule_url: string | null
  apply_url: string | null
  bntouch_user_id: string | null
}

export default function OpenHousePage({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [showLead, setShowLead] = useState(false)
  const leadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Inline lead form — must be declared here (before any conditional returns) per React rules
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadNote, setLeadNote] = useState('')
  const [leadDone, setLeadDone] = useState(false)
  const [leadErr, setLeadErr] = useState('')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const inlineIframeRef = useRef<HTMLIFrameElement>(null)
  const inlineFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1') return
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
          tca_url: null, tca_screenshot: null, loom_url: null, callout_text: null, schedule_url: null, apply_url: null, loan_description: null, bntouch_user_id: null,
          ...row,
        } as PageData

        const fetchExtras = async () => {
          const [profileRes, partnerRes] = await Promise.all([
            row.created_by
              ? sb.from('profiles').select('bntouch_user_id, schedule_url, apply_url').eq('id', row.created_by).single()
              : Promise.resolve({ data: null }),
            pageData.partner_name
              ? sb.from('marketing_partners').select('logo_url, name')
              : Promise.resolve({ data: null }),
          ])
          const profileData = profileRes.data as { bntouch_user_id?: string; schedule_url?: string; apply_url?: string } | null
          const bntouchUserId = profileData?.bntouch_user_id ?? pageData.bntouch_user_id ?? null
          const scheduleUrl = profileData?.schedule_url ?? pageData.schedule_url ?? null
          const applyUrl = profileData?.apply_url ?? pageData.apply_url ?? null
          let finalData = { ...pageData, bntouch_user_id: bntouchUserId, schedule_url: scheduleUrl, apply_url: applyUrl }
          if (partnerRes.data) {
            const match = (partnerRes.data as { name: string; logo_url: string }[]).find(p =>
              p.name.toLowerCase().trim() === pageData.partner_name.toLowerCase().trim()
            )
            if (match?.logo_url) finalData = { ...finalData, partner_logo: match.logo_url }
          }
          setPage(finalData)
        }
        fetchExtras().finally(() => setLoading(false))
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

  const loomId = page.loom_url ? loomIdFromUrl(page.loom_url) : null

  // ─── Derived financing data ────────────────────────────────────────────────
  type RawScenario = {
    label: string; down_pct: number; market_rate: number; buydown_rate: number
    market_payment: number; buydown_payment: number; loan_type: string; term_years: number; apr: number
    piti_schedule?: Array<{ year: number; rate: number; pi: number; piti: number }>
    final_piti?: number
    total_subsidy?: number
  }
  const scenarios: RawScenario[] = page.rate_scenarios ?? []
  // Pick the primary scenario: prefer one with a buydown, else first
  const primary: RawScenario | null = scenarios.find(s => s.buydown_rate !== s.market_rate) ?? scenarios[0] ?? null
  const hasPitiSchedule = !!(primary?.piti_schedule && primary.piti_schedule.length > 0)
  const yr1 = hasPitiSchedule ? primary!.piti_schedule![0] : null
  const yr2 = hasPitiSchedule ? primary!.piti_schedule![1] : null
  const yr3plus = hasPitiSchedule ? primary!.piti_schedule![3] ?? primary!.piti_schedule![2] : null
  const totalSubsidy = primary?.total_subsidy ?? 0
  const finalPiti = primary?.final_piti ?? 0
  const yr1Savings = (yr1 && yr3plus) ? Math.round(yr3plus.piti - yr1.piti) : 0
  const hasBuydown = !!(primary && primary.buydown_rate !== primary.market_rate)
  const effectiveDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const reviewDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  async function handleInlineLead(e: React.FormEvent) {
    e.preventDefault()
    if (!leadName.trim() || !leadEmail.includes('@') || leadPhone.replace(/\D/g, '').length < 10) {
      setLeadErr('Please fill in all fields correctly.')
      return
    }
    setLeadErr('')
    setLeadSubmitting(true)
    if (inlineFormRef.current) inlineFormRef.current.submit()
    try {
      const sb = createClient()
      await sb.from('page_leads').insert({
        page_id: page?.id, page_type: 'open_house',
        advisor_user_id: page?.created_by ?? null,
        name: leadName.trim(), email: leadEmail.trim().toLowerCase(),
        phone: leadPhone.trim(), address: page?.address ?? '',
        source: `Inline form — ${page?.address ?? ''}${leadNote ? ' — ' + leadNote : ''}`,
      })
    } catch { /* non-blocking */ }
    setTimeout(() => { setLeadDone(true); setLeadSubmitting(false) }, 1200)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {showLead && (
        <LeadCaptureModal
          address={page.address + (page.city ? ', ' + page.city : '')}
          advisorName={page.advisor_name}
          bntouchUserId={page.bntouch_user_id}
          onDismiss={() => setShowLead(false)}
          callout={page.callout_text}
          pageId={page.id}
          pageType="open_house"
          advisorUserId={(page as unknown as { created_by?: string }).created_by ?? null}
        />
      )}
      {/* ── Sticky nav ──────────────────────────────────────────────────── */}
      <header className="oh-sticky-nav">
        <a href="#next-step" className="oh-nav-homes">Homes with Special Financing →</a>
        <span className="oh-nav-date">
          <span className="oh-nav-dot" />
          Effective {effectiveDate}
        </span>
        <div className="oh-nav-advisor">
          {page.advisor_name && <span>Your Advisor · <strong>{page.advisor_name}</strong></span>}
          <div className="oh-nav-btns">
            {page.advisor_phone && <a href={`tel:${page.advisor_phone}`} className="oh-nav-btn">Call</a>}
            {page.advisor_phone && <a href={`sms:${page.advisor_phone}`} className="oh-nav-btn">Text</a>}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="oh-hero">
        {(page.photos ?? []).length > 0
          ? <img src={page.photos[0]} alt={page.address} className="oh-hero-img" />
          : <div className="oh-hero-placeholder" />
        }
        <div className="oh-hero-overlay" />
        <div className="oh-hero-content">
          <div className="oh-hero-badge">
            <span className="oh-hero-badge-line" />
            Special Financing for This Home
          </div>
          <div className="oh-hero-address">{page.address}</div>
          <div className="oh-hero-city">{[page.city, page.state, page.zip].filter(Boolean).join(', ')}</div>
          {Number(page.list_price) > 0 && (
            <div className="oh-hero-price">{fmtPrice(page.list_price)}</div>
          )}
        </div>
      </div>

      {/* ── Property stats strip ─────────────────────────────────────────── */}
      {(page.beds || page.baths || page.sqft || page.lot_size || page.year_built || Number(page.hoa_monthly) > 0) && (
        <div className="oh-stats-strip">
          {[
            { label: 'Beds', val: page.beds },
            { label: 'Baths', val: page.baths },
            { label: 'Sq Ft', val: page.sqft ? page.sqft.toLocaleString() : null },
            { label: 'Lot', val: page.lot_size || null },
            { label: 'Year Built', val: page.year_built || null },
            { label: 'HOA', val: Number(page.hoa_monthly) > 0 ? `${fmtPrice(page.hoa_monthly)}/mo` : null },
          ].filter(r => r.val).map(r => (
            <div key={r.label} className="oh-stat">
              <div className="oh-stat-label">{r.label}</div>
              <div className="oh-stat-val">{r.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Description ──────────────────────────────────────────────────── */}
      {page.description && (
        <div className="oh-section-wrap">
          <div className="oh-section-eyebrow">About This Property</div>
          <div className="oh-desc">{page.description}</div>
        </div>
      )}

      {/* ── Rate & Payment Cards (SA-style) ─────────────────────────────── */}
      {primary && (
        <div className="oh-rate-band" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* decorative rings */}
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 900, borderRadius: '50%', border: '1px solid rgba(91,203,245,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 580, height: 580, borderRadius: '50%', border: '1px solid rgba(91,203,245,0.07)', pointerEvents: 'none' }} />

          <div className="oh-rate-inner" style={{ position: 'relative', flexDirection: 'column', alignItems: 'flex-start' }}>
            {/* Headline */}
            <div style={{ marginBottom: 28 }}>
              <div className="oh-rate-eyebrow">
                {hasBuydown ? 'NEO Financing Incentive' : 'Financing Overview'}
              </div>
              <div style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 8, textWrap: 'balance' }}>
                {hasBuydown
                  ? <>Love the house. <span style={{ color: C.accent }}>Not the first-year payment.</span></>
                  : <>Smart financing <span style={{ color: C.accent }}>for this home.</span></>}
              </div>
            </div>

            {/* Rate cards grid */}
            <div className="oh-sa-cards">
              {/* Year 1 hero card */}
              <div className="oh-sa-card oh-sa-card--hero">
                <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: C.accent, opacity: 0.08, filter: 'blur(20px)' }} />
                <div className="oh-sa-card-eyebrow">Year 1 Payment-Equivalent*</div>
                <div className="oh-sa-rate-big">{(yr1?.rate ?? primary.buydown_rate).toFixed(1)}%</div>
                {yr1Savings > 0 && (
                  <div className="oh-sa-savings-badge">Save {fmtPrice(yr1Savings)}/mo</div>
                )}
                <div className="oh-sa-divider" />
                {hasPitiSchedule && yr1 ? (
                  <div>
                    <div className="oh-sa-piti-label">Estimated Monthly Housing</div>
                    <div className="oh-sa-piti-val">{fmtPrice(Math.round(yr1.piti))}<span className="oh-sa-mo">/mo</span></div>
                  </div>
                ) : primary.buydown_payment > 0 ? (
                  <div>
                    <div className="oh-sa-piti-label">Principal &amp; Interest</div>
                    <div className="oh-sa-piti-val">{fmtPrice(primary.buydown_payment)}<span className="oh-sa-mo">/mo</span></div>
                  </div>
                ) : null}
                <div className="oh-sa-footnote">*First 12 monthly payments · not the note rate</div>
              </div>

              {/* Year 2 card */}
              {yr2 && yr2.rate !== (yr3plus?.rate ?? primary.market_rate) && (
                <div className="oh-sa-card oh-sa-card--secondary">
                  <div className="oh-sa-card-eyebrow">Year 2 · 12 Payments</div>
                  <div className="oh-sa-rate-med">{yr2.rate.toFixed(1)}%</div>
                  {yr2.piti > 0 && (
                    <>
                      <div className="oh-sa-divider" />
                      <div className="oh-sa-piti-label">Estimated Monthly</div>
                      <div className="oh-sa-piti-sm">{fmtPrice(Math.round(yr2.piti))}/mo</div>
                    </>
                  )}
                </div>
              )}

              {/* Note rate / Year 3+ card */}
              <div className="oh-sa-card oh-sa-card--market">
                <div className="oh-sa-card-eyebrow">{hasBuydown ? 'Year 3+ · Permanent Rate' : 'Note Rate'}</div>
                <div className="oh-sa-rate-med">{primary.market_rate.toFixed(3)}%</div>
                {(yr3plus?.piti ?? 0) > 0 && (
                  <>
                    <div className="oh-sa-divider" />
                    <div className="oh-sa-piti-label">Estimated Monthly</div>
                    <div className="oh-sa-piti-sm">{fmtPrice(Math.round(yr3plus!.piti))}/mo</div>
                  </>
                )}
                {!hasPitiSchedule && primary.market_payment > 0 && (
                  <>
                    <div className="oh-sa-divider" />
                    <div className="oh-sa-piti-label">P&amp;I</div>
                    <div className="oh-sa-piti-sm">{fmtPrice(primary.market_payment)}/mo</div>
                  </>
                )}
                {primary.apr > 0 && (
                  <div className="oh-sa-apr">APR {primary.apr.toFixed(3)}%</div>
                )}
              </div>
            </div>

            {/* Footnotes */}
            <div className="oh-rate-disc" style={{ marginTop: 20 }}>
              {hasBuydown && <>Illustrative temporary buydown · First-year payment uses a subsidized rate · Subject to qualification. </>}
              Effective {effectiveDate} · Review by {reviewDate}.
              {totalSubsidy > 0 && <> · {fmtPrice(totalSubsidy)} modeled buydown deposit.</>}
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', marginTop: 28, width: '100%' }}>
              <a href="#next-step" className="oh-cta-btn">Show me if this payment fits →</a>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment progression ──────────────────────────────────────────── */}
      {hasPitiSchedule && primary?.piti_schedule && (
        <div className="oh-section-wrap">
          <div className="oh-section-eyebrow">Complete Payment Progression</div>
          <div className="oh-section-title">See how the payment changes by year.</div>
          <div className="oh-prog-grid">
            {primary.piti_schedule.slice(0, 4).map((yr, i) => {
              const isBuydown = yr.rate < primary.market_rate
              return (
                <div key={i} className={`oh-prog-card${isBuydown ? ' oh-prog-card--buydown' : ''}`}>
                  <div className="oh-prog-year">Year {i < 3 ? i + 1 : `${i + 1}+`}</div>
                  <div className="oh-prog-rate">{yr.rate.toFixed(2)}%</div>
                  <div className="oh-prog-piti">{fmtPrice(Math.round(yr.piti))}/mo</div>
                  <div className="oh-prog-pi">P&I {fmtPrice(Math.round(yr.pi))}</div>
                </div>
              )
            })}
          </div>
          <div className="oh-prog-explain">
            <strong>How it works:</strong> A temporary buydown is funded upfront at closing. For each year of the buydown period, the difference between the note-rate payment and the buydown-rate payment is covered by the deposit. When the buydown period ends, your payment steps up to the full note-rate payment where it stays for the life of the loan.
          </div>
        </div>
      )}

      {/* ── Full loan details ────────────────────────────────────────────── */}
      {primary && (
        <div className="oh-section-wrap oh-section-wrap--gray">
          <div className="oh-section-eyebrow">Full Loan Details</div>
          <div className="oh-section-title">Every number behind this scenario.</div>
          <div className="oh-details-table">
            {[
              ['Note Rate', `${primary.market_rate.toFixed(3)}%`],
              primary.apr > 0 ? ['APR', `${primary.apr.toFixed(3)}%`] : null,
              hasPitiSchedule && yr1 ? ['Year 1 PITI', `${fmtPrice(Math.round(yr1.piti))}/mo`] : null,
              ['Loan Program', `${primary.loan_type} ${primary.term_years}yr`],
              Number(page.list_price) > 0 ? ['Home Price', fmtPrice(page.list_price)] : null,
              [`Down Payment`, `${primary.down_pct}%`],
              Number(page.list_price) > 0 ? ['Base Loan Amount', fmtPrice(Math.round(page.list_price * (1 - primary.down_pct / 100)))] : null,
              totalSubsidy > 0 ? ['Modeled Buydown Subsidy', fmtPrice(totalSubsidy)] : null,
              hasPitiSchedule && yr3plus ? ['Full Note-Rate P+I', `${fmtPrice(Math.round(yr3plus.pi))}/mo`] : ['Full Note-Rate P+I', `${fmtPrice(primary.market_payment)}/mo`],
              ['Effective Date', effectiveDate],
              ['Review-by Date', reviewDate],
            ].filter(Boolean).map((row, i) => (
              <div key={i} className="oh-details-row">
                <span className="oh-details-label">{(row as string[])[0]}</span>
                <span className="oh-details-val">{(row as string[])[1]}</span>
              </div>
            ))}
          </div>
          {totalSubsidy > 0 && (
            <div className="oh-details-note">Payment Progression: Shown above for every scheduled buydown year.</div>
          )}
          <a href="#next-step" className="oh-piti-cta" style={{ marginTop: 20 }}>Check this option against my numbers →</a>
        </div>
      )}

      {/* ── Loom video ───────────────────────────────────────────────────── */}
      {loomId && (
        <div className="oh-section-wrap">
          <div className="oh-section-eyebrow">Video Walkthrough</div>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden' }}>
            <iframe src={`https://www.loom.com/embed/${loomId}`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              title="Video Walkthrough" allow="autoplay; fullscreen" allowFullScreen />
          </div>
        </div>
      )}

      {/* ── TCA embed ────────────────────────────────────────────────────── */}
      {page.tca_url && (
        <div className="oh-section-wrap">
          <div className="oh-section-eyebrow">Total Cost Analysis</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <a href={page.tca_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>
              Open Full Screen ↗
            </a>
          </div>
          <iframe src={page.tca_url} className="oh-iframe-tca"
            style={{ width: '100%', border: 'none', borderRadius: 10, display: 'block' }}
            title="Total Cost Analysis" allow="fullscreen" />
        </div>
      )}

      {/* ── Other scenarios ───────────────────────────────────────────────── */}
      {scenarios.length > 1 && (
        <div className="oh-section-wrap oh-section-wrap--gray">
          <div className="oh-section-eyebrow">All Financing Scenarios</div>
          <div className="oh-section-title">More options for this home.</div>
          <div className="oh-scenarios-grid">
            {scenarios.map((s, i) => {
              const hasBd = s.buydown_rate !== s.market_rate
              const savings = s.market_payment - s.buydown_payment
              return (
                <div key={i} className="oh-scen-card">
                  <div className="oh-scen-label">{s.label}</div>
                  <div className="oh-scen-rate">{s.buydown_rate.toFixed(3)}%</div>
                  {hasBd && <div className="oh-scen-note-rate">{s.market_rate.toFixed(3)}% note rate</div>}
                  <div className="oh-scen-payment">{fmtPrice(s.buydown_payment)}/mo</div>
                  {hasBd && savings > 0 && <div className="oh-scen-savings">{fmtPrice(savings)}/mo savings</div>}
                  {s.apr > 0 && <div className="oh-scen-apr">APR {s.apr.toFixed(3)}%</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Strategy team ─────────────────────────────────────────────────── */}
      <div className="oh-section-wrap">
        <div className="oh-section-eyebrow">Presented By</div>
        <div className="oh-section-title oh-team-title">Your property strategy team.</div>
        <div className="oh-section-sub">One team for the home, the financing, and the questions that connect them.</div>
        <div className="oh-team-grid">
          {page.partner_name && (
            <div className="oh-team-card">
              <div className="oh-team-role">Listing Agent</div>
              <div className="oh-team-person">
                {page.partner_photo
                  ? <img src={page.partner_photo} alt={page.partner_name} className="oh-team-photo" />
                  : <div className="oh-team-init">{page.partner_name[0]}</div>
                }
                <div>
                  <div className="oh-team-name">{page.partner_name}</div>
                  <div className="oh-team-title-role">{page.partner_title || 'Real Estate Professional'}</div>
                  {page.partner_nmls && <div className="oh-team-nmls">NMLS {page.partner_nmls}</div>}
                  <div className="oh-team-actions">
                    {page.partner_phone && <a href={`tel:${page.partner_phone}`} className="oh-team-action">Call</a>}
                    {page.partner_email && <a href={`mailto:${page.partner_email}`} className="oh-team-action">Email</a>}
                  </div>
                </div>
              </div>
              {page.partner_logo && <img src={page.partner_logo} alt="" className="oh-team-logo" />}
            </div>
          )}
          <div className="oh-team-card">
            <div className="oh-team-role">Mortgage Advisor</div>
            <div className="oh-team-person">
              {page.advisor_photo
                ? <img src={page.advisor_photo} alt={page.advisor_name} className="oh-team-photo" />
                : <div className="oh-team-init">{page.advisor_name?.[0] ?? 'M'}</div>
              }
              <div>
                <div className="oh-team-name">{page.advisor_name || 'Your Advisor'}</div>
                <div className="oh-team-title-role">{page.advisor_title || 'Mortgage Advisor'} at NEO Home Loans</div>
                {page.advisor_nmls && <div className="oh-team-nmls">NMLS {page.advisor_nmls}</div>}
                <div className="oh-team-actions">
                  {page.advisor_phone && <a href={`tel:${page.advisor_phone}`} className="oh-team-action">Call</a>}
                  {page.advisor_email && <a href={`mailto:${page.advisor_email}`} className="oh-team-action">Email</a>}
                </div>
              </div>
            </div>
            <img src="https://8blocks.s3-us-west-1.amazonaws.com/neo/images/logo-big.jpg" alt="NEO Home Loans" className="oh-team-logo" />
          </div>
        </div>
      </div>

      {/* ── Inline lead capture ───────────────────────────────────────────── */}
      <div className="oh-section-wrap oh-lead-wrap" id="next-step">
        <div className="oh-section-eyebrow">Next Step</div>
        <div className="oh-section-title">See whether this payment path fits your budget.</div>
        <div className="oh-lead-bullets">
          <div className="oh-lead-bullet">✓ Get a personalized payment comparison run for you</div>
          <div className="oh-lead-bullet">✓ Your advisor will reach out within 1 business day</div>
        </div>
        {!leadDone ? (
          <>
            <iframe ref={inlineIframeRef} name="bnt_inline_iframe" style={{ display: 'none' }} title="BNTouch Submit" />
            <form ref={inlineFormRef} method="post"
              action="https://www.bntouchmortgage.net/api/webform/"
              target="bnt_inline_iframe" style={{ display: 'none' }}>
              <input type="hidden" name="added_source" value={`Inline — ${page.address}`} />
              <input type="hidden" name="RETURNTIMEOUT" value="10" />
              <input type="hidden" name="USERID" value={page.bntouch_user_id || '10543'} />
              <input type="hidden" name="GROUPID" value="1" />
              <input type="hidden" name="SEQUENCEID" value="1" />
              <input type="hidden" name="WEBFORMID" value="5524" />
              <input type="hidden" name="PROCESSTYPE" value="mortgage" />
              <input type="hidden" name="name_1" value={leadName} />
              <input type="hidden" name="email" value={leadEmail} />
              <input type="hidden" name="phone_cell" value={leadPhone} />
            </form>
          <form onSubmit={handleInlineLead} className="oh-lead-form">
            <div className="oh-lead-row2">
              <input className="oh-lead-input" type="text" placeholder="First name" value={leadName.split(' ')[0]} onChange={e => setLeadName(e.target.value + (leadName.includes(' ') ? ' ' + leadName.split(' ').slice(1).join(' ') : ''))} required />
              <input className="oh-lead-input" type="text" placeholder="Last name" value={leadName.includes(' ') ? leadName.split(' ').slice(1).join(' ') : ''} onChange={e => setLeadName((leadName.split(' ')[0] ?? '') + (e.target.value ? ' ' + e.target.value : ''))} />
            </div>
            <input className="oh-lead-input" type="email" placeholder="Email address" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} required />
            <input className="oh-lead-input" type="tel" placeholder="Mobile number" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} required />
            <textarea className="oh-lead-input oh-lead-textarea" placeholder="Working with an agent? Any questions? (optional)" value={leadNote} onChange={e => setLeadNote(e.target.value)} rows={2} />
            {leadErr && <div className="oh-lead-err">{leadErr}</div>}
            <button type="submit" className="oh-lead-submit" disabled={leadSubmitting}>
              {leadSubmitting ? 'Sending…' : 'Request my comparison →'}
            </button>
            <div className="oh-lead-tcpa">
              By submitting you consent to be contacted by NEO Home Loans and their agents via phone, email, or text. Message &amp; data rates may apply. Participation is voluntary and you may opt out at any time.
            </div>
          </form>
          </>
        ) : (
          <div className="oh-lead-done">
            <div className="oh-lead-done-icon">✓</div>
            <div className="oh-lead-done-title">Request received!</div>
            <div className="oh-lead-done-sub">
              {page.schedule_url ? 'Pick a time below and your advisor will be ready for you.' : 'Your advisor will be in touch within 1 business day.'}
            </div>
            {page.schedule_url && (
              <iframe
                src={page.schedule_url.includes('?') ? page.schedule_url + '&noframe=true' : page.schedule_url + '?noframe=true'}
                style={{ width: '100%', minHeight: 580, border: 'none', marginTop: 16, borderRadius: 12, background: 'transparent' }}
                title="Schedule a time"
                allowTransparency={true}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Disclaimers ───────────────────────────────────────────────────── */}
      <div className="oh-disc-wrap">
        <div className="oh-disc-title">Planning assumptions and required disclosures</div>
        <p>Effective {effectiveDate}. Expires {reviewDate}.</p>
        <p>This is a planning illustration, not a commitment to lend. Rates, APR, costs, credits, payments, and program availability must be confirmed for the buyer and property.</p>
        <p>Property value and appreciation are assumptions, not guarantees. Taxes, insurance, mortgage insurance, HOA dues, and selling costs may change.</p>
        {primary?.buydown_rate !== primary?.market_rate && (
          <p>Temporary buydown payments are funded from a closing deposit. The note rate and qualifying payment do not change, and the payment increases on schedule until it reaches the full note-rate payment.</p>
        )}
        <p>Owner-occupied primary residence. Credit, income, assets, property, and program eligibility remain subject to review.</p>
        <p>Special financing incentive available. This property may qualify for a reduced interest rate or closing cost credit when financed through NEO Home Loans. Participation is optional; buyers may use any lender of their choice.</p>
        <BetterDisclaimer style={{ marginTop: 16 }} />
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Montserrat', system-ui, sans-serif; }
        a { color: inherit; }

        /* Sticky nav */
        .oh-sticky-nav {
          position: sticky; top: 0; z-index: 100;
          background: ${C.navy}; display: flex; align-items: center;
          gap: 16px; padding: 10px 24px; flex-wrap: wrap;
          border-bottom: 1px solid rgba(91,203,245,0.15);
        }
        .oh-nav-homes {
          font-size: 12px; font-weight: 700; color: ${C.accent};
          text-decoration: none; white-space: nowrap;
        }
        .oh-nav-date {
          font-size: 11px; color: rgba(255,255,255,0.65);
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
        }
        .oh-nav-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e; flex-shrink: 0;
        }
        .oh-nav-advisor {
          margin-left: auto; display: flex; align-items: center; gap: 12px;
          font-size: 11px; color: rgba(255,255,255,0.65);
        }
        .oh-nav-advisor strong { color: #fff; }
        .oh-nav-btns { display: flex; gap: 6px; }
        .oh-nav-btn {
          font-size: 11px; font-weight: 700; padding: 5px 12px;
          border: 1px solid rgba(91,203,245,0.4); border-radius: 6px;
          color: ${C.accent}; text-decoration: none; white-space: nowrap;
        }

        /* Hero */
        .oh-hero {
          position: relative; width: 100%; overflow: hidden;
          background: ${C.navy};
        }
        .oh-hero-img { width: 100%; height: 520px; object-fit: cover; display: block; }
        .oh-hero-placeholder { width: 100%; height: 520px; background: #1a3a5c; }
        .oh-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,37,64,0.92) 0%, rgba(10,37,64,0.3) 55%, transparent 100%);
        }
        .oh-hero-content {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 48px 36px 36px; max-width: 820px; margin: 0 auto;
        }
        .oh-hero-badge {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${C.accent}; margin-bottom: 14px;
        }
        .oh-hero-badge-line {
          display: inline-block; width: 28px; height: 2px; background: ${C.accent};
        }
        .oh-hero-address {
          font-size: clamp(28px, 5vw, 52px); font-weight: 900; color: #fff;
          line-height: 1.1; letter-spacing: -0.02em; text-wrap: balance;
        }
        .oh-hero-city { font-size: 16px; color: rgba(255,255,255,0.65); margin-top: 6px; }
        .oh-hero-price {
          margin-top: 12px; font-size: 22px; font-weight: 800; color: ${C.accent};
        }

        /* Rate band */
        .oh-rate-band {
          background: ${C.navy}; padding: 48px 36px 40px;
        }
        .oh-rate-inner {
          max-width: 820px; margin: 0 auto;
          display: flex; gap: 48px; align-items: flex-end; flex-wrap: wrap;
        }
        .oh-rate-eyebrow {
          font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
          text-transform: uppercase; color: ${C.accent};
          margin-bottom: 6px;
        }
        .oh-rate-disc {
          font-size: 9px; color: rgba(255,255,255,0.3); line-height: 1.6;
        }

        /* SA-style rate cards */
        .oh-sa-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 14px; width: 100%; margin-bottom: 4px;
        }
        .oh-sa-card {
          border-radius: 18px; padding: 24px 22px;
          position: relative; overflow: hidden;
        }
        .oh-sa-card--hero {
          background: linear-gradient(135deg, rgba(91,203,245,0.14) 0%, rgba(10,37,64,0) 100%);
          border: 1.5px solid rgba(91,203,245,0.5);
          box-shadow: 0 0 40px rgba(91,203,245,0.1);
        }
        .oh-sa-card--secondary {
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.12);
        }
        .oh-sa-card--market {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .oh-sa-card-eyebrow {
          font-size: 9px; font-weight: 800; letter-spacing: 0.14em;
          text-transform: uppercase; color: ${C.accent}; margin-bottom: 14px;
        }
        .oh-sa-card--secondary .oh-sa-card-eyebrow,
        .oh-sa-card--market .oh-sa-card-eyebrow {
          color: rgba(255,255,255,0.4);
        }
        .oh-sa-rate-big {
          font-size: clamp(52px, 10vw, 76px); font-weight: 900; color: #fff;
          line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums;
        }
        .oh-sa-rate-med {
          font-size: clamp(32px, 6vw, 46px); font-weight: 900; color: rgba(255,255,255,0.75);
          line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums;
        }
        .oh-sa-savings-badge {
          display: inline-flex; align-items: center;
          background: rgba(91,203,245,0.18); border: 1px solid rgba(91,203,245,0.4);
          border-radius: 20px; padding: 4px 12px; margin: 10px 0;
          font-size: 12px; font-weight: 800; color: ${C.accent};
        }
        .oh-sa-divider {
          height: 1px; background: rgba(91,203,245,0.15); margin: 14px 0;
        }
        .oh-sa-card--secondary .oh-sa-divider,
        .oh-sa-card--market .oh-sa-divider {
          background: rgba(255,255,255,0.08);
        }
        .oh-sa-piti-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 3px;
        }
        .oh-sa-piti-val {
          font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
        }
        .oh-sa-piti-sm {
          font-size: 18px; font-weight: 800; color: rgba(255,255,255,0.65);
          font-variant-numeric: tabular-nums;
        }
        .oh-sa-mo { font-size: 13px; font-weight: 500; }
        .oh-sa-apr {
          font-size: 10px; color: rgba(255,255,255,0.25); margin-top: 10px;
        }
        .oh-sa-footnote {
          font-size: 8.5px; color: rgba(255,255,255,0.25); margin-top: 10px; line-height: 1.5;
        }
        .oh-cta-btn {
          display: inline-block; background: ${C.accent}; color: ${C.navy};
          font-weight: 800; font-size: 15px; padding: 14px 36px; border-radius: 10px;
          text-decoration: none; letter-spacing: -0.01em;
          box-shadow: 0 4px 24px rgba(91,203,245,0.35);
        }
        /* Legacy piti-cta class (used in a few places below) */
        .oh-piti-cta {
          display: block; text-align: center; margin-top: 18px;
          background: ${C.accent}; color: ${C.navy}; font-weight: 800;
          font-size: 14px; padding: 14px 0; border-radius: 10px;
          text-decoration: none; font-family: inherit;
          border: none; cursor: pointer; width: 100%;
        }

        /* Payment progression */
        .oh-section-wrap {
          max-width: 820px; margin: 0 auto; padding: 48px 36px;
        }
        .oh-section-wrap--gray { background: ${C.bg}; max-width: 100%; }
        .oh-section-wrap--gray > * { max-width: 820px; margin-left: auto; margin-right: auto; }
        .oh-section-eyebrow {
          font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
          text-transform: uppercase; color: ${C.accent}; margin-bottom: 8px;
          text-align: center;
        }
        .oh-section-title {
          font-size: 24px; font-weight: 900; color: ${C.navy};
          line-height: 1.2; margin-bottom: 6px; text-wrap: balance;
          text-align: center;
        }
        .oh-section-sub { font-size: 14px; color: ${C.muted}; margin-bottom: 24px; text-align: center; }
        .oh-prog-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px; margin-bottom: 20px;
        }
        .oh-prog-card {
          background: #fff; border: 1.5px solid ${C.border}; border-radius: 12px;
          padding: 18px 16px; text-align: center;
        }
        .oh-prog-card--buydown { border-color: ${C.accent}; }
        .oh-prog-year {
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: ${C.muted}; margin-bottom: 8px;
        }
        .oh-prog-rate {
          font-size: 28px; font-weight: 900; color: ${C.navy}; line-height: 1;
        }
        .oh-prog-piti {
          font-size: 15px; font-weight: 800; color: ${C.navy}; margin-top: 6px;
        }
        .oh-prog-pi { font-size: 11px; color: ${C.muted}; margin-top: 3px; }
        .oh-prog-explain {
          font-size: 12px; color: ${C.dim}; line-height: 1.7;
          background: #F8FAFC; border-radius: 10px; padding: 16px 18px;
        }

        /* Loan details table */
        .oh-details-table {
          border: 1px solid ${C.border}; border-radius: 12px; overflow: hidden;
          margin: 16px 0;
        }
        .oh-details-row {
          display: flex; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid ${C.border};
          font-size: 13px;
        }
        .oh-details-row:last-child { border-bottom: none; }
        .oh-details-label { color: ${C.muted}; }
        .oh-details-val { font-weight: 700; color: ${C.navy}; font-variant-numeric: tabular-nums; }
        .oh-details-note {
          font-size: 10px; color: ${C.muted}; margin-top: 10px; line-height: 1.5;
        }

        /* Description */
        .oh-desc {
          font-size: 15px; color: ${C.dim}; line-height: 1.8;
          white-space: pre-wrap;
        }

        /* Stats strip */
        .oh-stats-strip {
          background: ${C.navy}; display: flex; gap: 0; flex-wrap: wrap;
          padding: 24px 36px; justify-content: center;
        }
        .oh-stat {
          text-align: center; padding: 0 24px;
          border-right: 1px solid rgba(91,203,245,0.15);
        }
        .oh-stat:last-child { border-right: none; }
        .oh-stat-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 4px;
        }
        .oh-stat-val { font-size: 18px; font-weight: 800; color: #fff; }

        /* Scenarios grid */
        .oh-scenarios-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px; margin-top: 20px;
        }
        .oh-scen-card {
          background: #fff; border: 1px solid ${C.border}; border-radius: 12px;
          padding: 18px 16px;
        }
        .oh-scen-label {
          font-size: 9px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: ${C.navy}; margin-bottom: 8px;
        }
        .oh-scen-rate {
          font-size: 26px; font-weight: 900; color: ${C.navy}; line-height: 1;
        }
        .oh-scen-note-rate { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
        .oh-scen-payment { font-size: 18px; font-weight: 800; color: ${C.navy}; margin-top: 6px; }
        .oh-scen-savings { font-size: 11px; color: #16A34A; font-weight: 700; margin-top: 4px; }
        .oh-scen-apr { font-size: 10px; color: ${C.muted}; margin-top: 4px; }

        /* Team */
        .oh-team-title { margin-bottom: 4px; }
        .oh-team-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px; margin-top: 24px;
        }
        .oh-team-card {
          background: #fff; border: 1px solid ${C.border}; border-radius: 16px;
          padding: 24px 22px; display: flex; flex-direction: column; gap: 16px;
        }
        .oh-team-role {
          font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: ${C.accent};
        }
        .oh-team-person { display: flex; gap: 14px; align-items: flex-start; }
        .oh-team-photo {
          width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
          flex-shrink: 0; border: 2px solid ${C.border};
        }
        .oh-team-init {
          width: 56px; height: 56px; border-radius: 50%; background: ${C.navy};
          color: ${C.accent}; font-size: 20px; font-weight: 900;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .oh-team-name { font-size: 16px; font-weight: 800; color: ${C.navy}; }
        .oh-team-title-role { font-size: 12px; color: ${C.muted}; margin-top: 2px; }
        .oh-team-nmls { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
        .oh-team-actions { display: flex; gap: 10px; margin-top: 10px; }
        .oh-team-action {
          font-size: 12px; font-weight: 700; color: ${C.navy};
          text-decoration: none; border-bottom: 1.5px solid ${C.accent};
          padding-bottom: 1px;
        }
        .oh-team-logo {
          max-height: 36px; max-width: 140px; object-fit: contain;
          align-self: flex-end;
        }

        /* Lead form */
        .oh-lead-wrap { background: ${C.bg}; max-width: 100%; }
        .oh-lead-wrap > * { max-width: 820px; margin-left: auto; margin-right: auto; }
        .oh-lead-bullets {
          display: flex; flex-direction: column; gap: 6px;
          margin: 12px auto 20px; font-size: 13px; color: ${C.dim};
        }
        .oh-lead-bullet::before { content: ''; }
        .oh-lead-form {
          background: #fff; border-radius: 16px; padding: 28px 28px;
          display: flex; flex-direction: column; gap: 12px;
          max-width: 540px;
        }
        .oh-lead-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .oh-lead-input {
          width: 100%; padding: 12px 14px; font-size: 14px; font-family: inherit;
          border: 1.5px solid ${C.border}; border-radius: 9px; color: ${C.text};
          outline: none; box-sizing: border-box; transition: border-color 0.15s;
        }
        .oh-lead-textarea { resize: none; }
        .oh-lead-input:focus { border-color: ${C.accent}; }
        .oh-lead-err {
          font-size: 12px; color: #B0504A; background: #FBF1F0;
          border: 1px solid #EAD6D1; border-radius: 8px; padding: 9px 12px;
        }
        .oh-lead-submit {
          background: ${C.accent}; color: ${C.navy}; border: none; border-radius: 10px;
          padding: 14px 0; font-size: 15px; font-weight: 800; cursor: pointer;
          font-family: inherit; width: 100%; transition: opacity 0.15s;
        }
        .oh-lead-submit:disabled { opacity: 0.6; cursor: default; }
        .oh-lead-tcpa {
          font-size: 9.5px; color: ${C.muted}; line-height: 1.6; text-align: center;
        }
        .oh-lead-done {
          background: #fff; border-radius: 16px; padding: 40px 28px;
          text-align: center; max-width: 400px;
        }
        .oh-lead-done-icon {
          width: 52px; height: 52px; border-radius: 50%; background: #DCFCE7;
          color: #16A34A; font-size: 24px; display: flex; align-items: center;
          justify-content: center; margin: 0 auto 16px; font-weight: 900;
        }
        .oh-lead-done-title { font-size: 20px; font-weight: 800; color: ${C.navy}; }
        .oh-lead-done-sub { font-size: 14px; color: ${C.muted}; margin-top: 8px; line-height: 1.6; }

        /* Disclaimers */
        .oh-disc-wrap {
          background: ${C.bg}; border-top: 1px solid ${C.border};
          padding: 28px 36px; max-width: 100%;
        }
        .oh-disc-title {
          font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 10px;
        }
        .oh-disc-wrap p {
          font-size: 9px; color: #94A3B8; line-height: 1.7; margin: 0 0 6px;
          max-width: 820px;
        }

        .oh-iframe-tca { height: 820px; }

        @media (max-width: 600px) {
          .oh-sticky-nav { flex-wrap: wrap; gap: 8px; padding: 10px 16px; }
          .oh-nav-advisor { margin-left: 0; }
          .oh-hero-img, .oh-hero-placeholder { height: 300px; }
          .oh-hero-content { padding: 24px 20px 24px; }
          .oh-rate-band { padding: 28px 20px 32px; }
          .oh-sa-cards { grid-template-columns: 1fr; gap: 10px; }
          .oh-sa-rate-big { font-size: 58px; }
          .oh-section-wrap { padding: 32px 20px; }
          .oh-stats-strip { padding: 20px; gap: 16px; }
          .oh-stat { padding: 0 12px; }
          .oh-lead-form { padding: 20px 18px; }
          .oh-lead-row2 { grid-template-columns: 1fr; }
          .oh-disc-wrap { padding: 20px; }
          .oh-iframe-tca { height: 500px; }
        }
      `}</style>
    </div>
  )
}
