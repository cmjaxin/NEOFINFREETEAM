'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  dim: '#374151', text: '#1F2937',
}
const NEO_WHITE_LOGO = 'https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png'
const NEO_BIG_LOGO = 'https://8blocks.s3-us-west-1.amazonaws.com/neo/images/logo-big.jpg'
const EHL_LOGO = 'https://ourcpb.bank/wp-content/uploads/2024/03/equal-housing-lender-logo-png-transparent.png'
const DISCLAIMER = 'BETTER MORTGAGE RESERVES THE RIGHT TO MODIFY OR DISCONTINUE PRODUCTS, PROMOTIONS AND BENEFITS AT ANY TIME WITHOUT NOTICE. Rates and Terms are subject to change at any time without notice and are subject to state restrictions. © 2025 Better Home & Finance Holding Company and/or its affiliates. Better Mortgage Corporation. NMLS #330511. 1 World Trade Center, Floor 80, New York, NY 10007. Equal Housing Lender.'

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
  schedule_url: string | null
}

function fmtPrice(n: number) { return '$' + Math.round(n).toLocaleString() }

function openBlob(html: string) {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// ─── FLYER 1: Standard ────────────────────────────────────────────────────────
function flyerStandard(p: PageData) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''; const small = [photos[1] ?? '', photos[2] ?? '', photos[3] ?? '']
  const desc = (p.description ?? '').slice(0, 900)
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state, p.zip].filter(Boolean).join(', ')
  const advisorNmls = p.advisor_nmls ? `NMLS# ${p.advisor_nmls}` : ''
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const stats = [p.beds ? `${p.beds} Beds` : '', p.baths ? `${p.baths} Baths` : '', p.sqft ? `${p.sqft.toLocaleString()} Sq Ft` : '', p.lot_size ? `${p.lot_size} Lot` : '', p.year_built ? `Built ${p.year_built}` : ''].filter(Boolean)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flyer — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:letter portrait;margin:0}
html,body{width:8.5in;height:11in;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:#fff}
.hero{position:relative;width:100%;height:3.1in;overflow:hidden;background:#CBD5E1}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero-fallback{width:100%;height:100%;background:linear-gradient(135deg,${NEO} 0%,#1a4a7c 100%);display:flex;align-items:center;justify-content:center;font-size:72px}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,37,64,0.88) 0%,rgba(10,37,64,0.1) 55%,transparent 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hero-content{position:absolute;bottom:0;left:0;right:0;padding:18px 24px 16px;display:flex;align-items:flex-end;justify-content:space-between}
.hero-address{color:#fff}.hero-street{font-size:22px;font-weight:900;line-height:1.1;text-shadow:0 1px 4px rgba(0,0,0,0.4)}
.hero-city{font-size:13px;font-weight:500;opacity:0.85;margin-top:3px}
.hero-logo{display:flex;flex-direction:column;align-items:flex-end;gap:14px}
.hero-logo .neo-logo{max-height:30px;max-width:110px;object-fit:contain}
.hero-logo .partner-logo{max-height:56px;max-width:180px;object-fit:contain}
.price-bar{height:0.55in;background:${NEO};display:flex;align-items:center;padding:0 24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.price-tag{font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.12em;margin-right:10px}
.price-value{font-size:30px;font-weight:900;color:${CYAN};letter-spacing:-0.01em}
.price-divider{width:1px;height:28px;background:rgba(91,203,245,0.25);margin:0 20px;flex-shrink:0}
.stats-row{display:flex;flex-wrap:nowrap;overflow:hidden}
.stat-chip{font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);padding:0 12px;white-space:nowrap;border-right:1px solid rgba(91,203,245,0.2)}
.stat-chip:last-child{border-right:none}
.main{display:flex;height:5.97in}
.left{flex:0 0 58%;padding:16px 18px 12px 24px;display:flex;flex-direction:column;gap:14px;border-right:1px solid #E4E8EC;overflow:hidden}
.section-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:${CYAN};margin-bottom:5px}
.desc-text{font-size:10px;line-height:1.75;color:#374151}
.tca-card{flex:1;border:1px solid #E4E8EC;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.tca-header{background:${NEO};padding:7px 12px;display:flex;align-items:center;gap:8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tca-dot{width:6px;height:6px;border-radius:50%;background:${CYAN};flex-shrink:0}
.tca-label{font-size:9px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.1em}
.tca-img{flex:1;overflow:hidden;min-height:0}.tca-img img{width:100%;height:100%;object-fit:contain;object-position:top;display:block}
.tca-empty{flex:1;display:flex;align-items:center;justify-content:center;background:#F8FAFC;color:#94A3B8;font-size:11px;text-align:center;padding:20px}
.right{flex:0 0 42%;padding:16px 20px 12px 14px;display:flex;flex-direction:column;gap:10px}
.photo-slot{flex:1;min-height:0;overflow:hidden;border-radius:8px;border:1px solid #E4E8EC;background:#F1F5F9}
.photo-slot img{width:100%;height:100%;object-fit:cover;display:block;border-radius:8px}
.photo-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#CBD5E1;font-size:28px}
.contact-bar{height:0.95in;background:${NEO};display:flex;align-items:stretch;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.contact-cell{flex:1;display:flex;align-items:center;gap:14px;padding:0 22px}
.contact-sep{width:1px;background:rgba(91,203,245,0.18);margin:14px 0;flex-shrink:0}
.c-photo{width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${CYAN}}
.c-init{width:44px;height:44px;border-radius:50%;background:rgba(91,203,245,0.12);border:2px solid rgba(91,203,245,0.35);display:flex;align-items:center;justify-content:center;color:${CYAN};font-size:18px;font-weight:900;flex-shrink:0}
.c-info{color:#fff}.c-role{font-size:8px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${CYAN};margin-bottom:3px}
.c-name{font-size:14px;font-weight:800;line-height:1.15}.c-detail{font-size:9px;color:rgba(255,255,255,0.55);margin-top:5px;line-height:1.6}
.footer{height:0.43in;background:#F8FAFC;border-top:2px solid ${CYAN};display:flex;align-items:center;justify-content:space-between;padding:0 20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer-disc{font-size:5px;color:#9CA3AF;line-height:1.4}
</style></head><body>
<div class="hero">
  ${hero ? `<img src="${hero}" alt="${p.address}" />` : `<div class="hero-fallback">🏡</div>`}
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-address"><div class="hero-street">${p.address}</div>${location ? `<div class="hero-city">${location}</div>` : ''}</div>
    <div class="hero-logo">
      ${p.partner_logo ? `<img class="partner-logo" src="${p.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" />` : ''}
      <img class="neo-logo" src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" />
    </div>
  </div>
</div>
<div class="price-bar">
  ${price ? `<span class="price-tag">List Price</span><span class="price-value">${price}</span>` : ''}
  ${price && stats.length ? `<div class="price-divider"></div>` : ''}
  ${stats.length ? `<div class="stats-row">${stats.map(s => `<span class="stat-chip">${s}</span>`).join('')}</div>` : ''}
</div>
<div class="main">
  <div class="left">
    ${desc ? `<div><div class="section-label">About This Property</div><p class="desc-text">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></div>` : ''}
    <div class="tca-card">
      <div class="tca-header"><div class="tca-dot"></div><span class="tca-label">Total Cost Analysis</span></div>
      ${p.tca_screenshot ? `<div class="tca-img"><img src="${p.tca_screenshot}" alt="TCA" /></div>` : `<div class="tca-empty">Upload a TCA screenshot in the editor</div>`}
    </div>
  </div>
  <div class="right">
    ${small.map((url, i) => `<div class="photo-slot">${url ? `<img src="${url}" alt="Photo ${i+2}" />` : `<div class="photo-empty">🏠</div>`}</div>`).join('')}
  </div>
</div>
<div class="contact-bar">
  ${p.partner_name ? `<div class="contact-cell">${p.partner_photo ? `<img class="c-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="c-init">${(p.partner_name[0]??'?').toUpperCase()}</div>`}<div class="c-info"><div class="c-role">${p.partner_title||'Listing Agent'}</div><div class="c-name">${p.partner_name}</div><div class="c-detail">${[p.partner_phone,p.partner_email,partnerNmls].filter(Boolean).join('<br>')}</div></div></div><div class="contact-sep"></div>` : ''}
  ${p.advisor_name ? `<div class="contact-sep"></div><div class="contact-cell" style="justify-content:flex-end"><div class="c-info" style="text-align:right"><div class="c-role">${p.advisor_title||'Mortgage Advisor'} · NEO Home Loans</div><div class="c-name">${p.advisor_name}</div><div class="c-detail">${[p.advisor_phone,p.advisor_email,advisorNmls].filter(Boolean).join('<br>')}</div></div>${p.advisor_photo ? `<img class="c-photo" src="${p.advisor_photo}" alt="${p.advisor_name}" />` : `<div class="c-init">${(p.advisor_name[0]??'?').toUpperCase()}</div>`}</div>` : ''}
</div>
<div class="footer">
  <span class="footer-disc">${DISCLAIMER}</span>
  <img src="${EHL_LOGO}" alt="Equal Housing Lender" style="height:22px;width:auto;object-fit:contain;flex-shrink:0;margin-left:10px;" />
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── FLYER 2: Showcase (photo-dominant, minimal text) ─────────────────────────
function flyerShowcase(p: PageData) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state].filter(Boolean).join(', ')
  const advisorNmls = p.advisor_nmls ? `NMLS# ${p.advisor_nmls}` : ''
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const stats = [p.beds ? `${p.beds} BD` : '', p.baths ? `${p.baths} BA` : '', p.sqft ? `${p.sqft.toLocaleString()} SF` : '', p.year_built ? `${p.year_built}` : ''].filter(Boolean)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flyer — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:letter portrait;margin:0}
html,body{width:8.5in;height:11in;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:#fff}
.hero{position:relative;width:100%;height:5.5in;overflow:hidden;background:#1a1a2e}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(10,37,64,0.95) 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hero-top{position:absolute;top:0;left:0;right:0;padding:20px 28px;display:flex;align-items:center;justify-content:space-between}
.hero-bottom{position:absolute;bottom:0;left:0;right:0;padding:28px 32px 32px}
.oh-badge{background:${CYAN};color:${NEO};font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:5px 14px;border-radius:99px;display:inline-block;margin-bottom:12px}
.hero-street{color:#fff;font-size:28px;font-weight:900;line-height:1.1;text-shadow:0 2px 8px rgba(0,0,0,0.4);margin-bottom:4px}
.hero-city{color:rgba(255,255,255,0.75);font-size:14px;font-weight:500;margin-bottom:16px}
.stats-row{display:flex;gap:0;margin-bottom:20px}
.stat-pill{color:#fff;font-size:13px;font-weight:700;padding-right:16px;margin-right:16px;border-right:1px solid rgba(255,255,255,0.2)}
.stat-pill:last-child{border-right:none}
.price-tag{color:${CYAN};font-size:36px;font-weight:900;letter-spacing:-0.02em}
.lower{height:5.5in;padding:0;display:flex;flex-direction:column}
.photo-strip{display:flex;height:2.1in;gap:0}
.strip-photo{flex:1;overflow:hidden;background:#E4E8EC}
.strip-photo img{width:100%;height:100%;object-fit:cover;display:block}
.strip-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#CBD5E1;font-size:24px}
.contact-bar{flex:1;background:${NEO};display:flex;align-items:center;padding:0 32px;gap:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.c-block{flex:1;display:flex;align-items:center;gap:14px}
.c-sep{width:1px;background:rgba(91,203,245,0.2);margin:12px 0;flex-shrink:0}
.c-photo{width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${CYAN}}
.c-init{width:52px;height:52px;border-radius:50%;background:rgba(91,203,245,0.12);border:2px solid rgba(91,203,245,0.35);display:flex;align-items:center;justify-content:center;color:${CYAN};font-size:20px;font-weight:900;flex-shrink:0}
.c-info{color:#fff}.c-role{font-size:8px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${CYAN};margin-bottom:3px}
.c-name{font-size:14px;font-weight:800}.c-detail{font-size:9px;color:rgba(255,255,255,0.55);margin-top:4px;line-height:1.6}
.footer{height:0.43in;background:#F8FAFC;border-top:2px solid ${CYAN};display:flex;align-items:center;justify-content:space-between;padding:0 20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer-disc{font-size:5px;color:#9CA3AF;line-height:1.4}
</style></head><body>
<div class="hero">
  ${hero ? `<img src="${hero}" alt="${p.address}" />` : ''}
  <div class="hero-overlay"></div>
  <div class="hero-top">
    ${p.partner_logo ? `<img src="${p.partner_logo}" alt="Partner" style="max-height:48px;max-width:160px;object-fit:contain;-webkit-print-color-adjust:exact;print-color-adjust:exact;" />` : '<div></div>'}
    <img src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" style="max-height:28px;max-width:110px;object-fit:contain;" />
  </div>
  <div class="hero-bottom">
    <div class="oh-badge">Open House</div>
    <div class="hero-street">${p.address}</div>
    ${location ? `<div class="hero-city">${location}</div>` : ''}
    ${stats.length ? `<div class="stats-row">${stats.map(s=>`<div class="stat-pill">${s}</div>`).join('')}</div>` : ''}
    ${price ? `<div class="price-tag">${price}</div>` : ''}
  </div>
</div>
<div class="lower">
  <div class="photo-strip">
    ${[photos[1]||'', photos[2]||'', photos[3]||''].map((url,i) => `<div class="strip-photo">${url ? `<img src="${url}" alt="Photo ${i+2}" />` : `<div class="strip-empty">🏠</div>`}</div>`).join('')}
  </div>
  <div class="contact-bar">
    ${p.partner_name ? `<div class="c-block">${p.partner_photo ? `<img class="c-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="c-init">${(p.partner_name[0]??'?').toUpperCase()}</div>`}<div class="c-info"><div class="c-role">${p.partner_title||'Listing Agent'}</div><div class="c-name">${p.partner_name}</div><div class="c-detail">${[p.partner_phone,p.partner_email,partnerNmls].filter(Boolean).join('<br>')}</div></div></div><div class="c-sep"></div>` : ''}
    ${p.advisor_name ? `<div class="c-sep"></div><div class="c-block" style="justify-content:flex-end">${p.advisor_photo ? `<img class="c-photo" src="${p.advisor_photo}" alt="${p.advisor_name}" />` : `<div class="c-init">${(p.advisor_name[0]??'?').toUpperCase()}</div>`}<div class="c-info" style="text-align:right"><div class="c-role">${p.advisor_title||'Mortgage Advisor'} · NEO</div><div class="c-name">${p.advisor_name}</div><div class="c-detail">${[p.advisor_phone,p.advisor_email,advisorNmls].filter(Boolean).join('<br>')}</div></div></div>` : ''}
  </div>
</div>
<div class="footer">
  <span class="footer-disc">${DISCLAIMER}</span>
  <img src="${EHL_LOGO}" alt="EHL" style="height:22px;width:auto;flex-shrink:0;margin-left:10px;" />
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── FLYER 3: Modern Split (content left, big photo right) ───────────────────
function flyerModern(p: PageData) {
  const NEO = C.navy; const CYAN = C.accent
  const hero = (p.photos ?? [])[0] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state, p.zip].filter(Boolean).join(', ')
  const advisorNmls = p.advisor_nmls ? `NMLS# ${p.advisor_nmls}` : ''
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const desc = (p.description ?? '').slice(0, 500)
  const stats = [{l:'Bedrooms',v:p.beds},{l:'Bathrooms',v:p.baths},{l:'Sq Ft',v:p.sqft?p.sqft.toLocaleString():null},{l:'Year Built',v:p.year_built||null},{l:'Lot Size',v:p.lot_size||null}].filter(s=>s.v)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flyer — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:letter portrait;margin:0}
html,body{width:8.5in;height:11in;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:#fff}
.wrap{display:flex;height:11in}
.left{flex:0 0 4.25in;background:#fff;display:flex;flex-direction:column;padding:0}
.left-top{background:${NEO};padding:28px 28px 22px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.oh-label{font-size:9px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${CYAN};margin-bottom:10px}
.address{color:#fff;font-size:20px;font-weight:900;line-height:1.2;margin-bottom:4px}
.city{color:rgba(255,255,255,0.65);font-size:12px;margin-bottom:16px}
.price{color:${CYAN};font-size:32px;font-weight:900;letter-spacing:-0.01em}
.logo-row{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding-top:16px;border-top:1px solid rgba(91,203,245,0.2)}
.logo-row img{max-height:32px;max-width:110px;object-fit:contain}
.left-body{flex:1;padding:22px 28px;display:flex;flex-direction:column;gap:18px;overflow:hidden}
.section-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:${CYAN};margin-bottom:8px}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
.stat-item{border-bottom:1px solid #E4E8EC;padding-bottom:6px}
.stat-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9CA3AF;margin-bottom:2px}
.stat-value{font-size:14px;font-weight:800;color:${NEO}}
.desc-text{font-size:9.5px;line-height:1.75;color:#374151}
.contact-block{margin-top:auto;padding-top:16px;border-top:1px solid #E4E8EC;display:flex;flex-direction:column;gap:12px}
.contact-person{display:flex;align-items:center;gap:12px}
.c-photo{width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${CYAN}}
.c-init{width:42px;height:42px;border-radius:50%;background:${NEO};display:flex;align-items:center;justify-content:center;color:${CYAN};font-size:16px;font-weight:900;flex-shrink:0}
.c-role{font-size:7.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${CYAN};margin-bottom:2px}
.c-name{font-size:12px;font-weight:800;color:${NEO};line-height:1.2}
.c-detail{font-size:8.5px;color:#6B7280;margin-top:3px;line-height:1.5}
.right{flex:1;position:relative;background:#1a1a2e;overflow:hidden}
.right img{width:100%;height:100%;object-fit:cover;display:block}
.right-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:64px;background:linear-gradient(135deg,${NEO} 0%,#1a4a7c 100%)}
.footer-strip{position:absolute;bottom:0;left:0;right:0;background:rgba(10,37,64,0.88);padding:8px 16px;-webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;align-items:center;gap:8px}
.footer-disc{font-size:5px;color:rgba(255,255,255,0.5);line-height:1.4;flex:1}
</style></head><body>
<div class="wrap">
  <div class="left">
    <div class="left-top">
      <div class="oh-label">Open House</div>
      <div class="address">${p.address}</div>
      ${location ? `<div class="city">${location}</div>` : ''}
      ${price ? `<div class="price">${price}</div>` : ''}
      <div class="logo-row">
        ${p.partner_logo ? `<img src="${p.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" />` : '<div></div>'}
        <img src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" />
      </div>
    </div>
    <div class="left-body">
      ${stats.length ? `<div><div class="section-label">Property Details</div><div class="stats-grid">${stats.map(s=>`<div class="stat-item"><div class="stat-label">${s.l}</div><div class="stat-value">${s.v}</div></div>`).join('')}</div></div>` : ''}
      ${desc ? `<div><div class="section-label">About This Property</div><p class="desc-text">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></div>` : ''}
      <div class="contact-block">
        ${p.partner_name ? `<div class="contact-person">${p.partner_photo ? `<img class="c-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="c-init">${(p.partner_name[0]??'?').toUpperCase()}</div>`}<div><div class="c-role">${p.partner_title||'Listing Agent'}</div><div class="c-name">${p.partner_name}</div><div class="c-detail">${[p.partner_phone,p.partner_email,partnerNmls].filter(Boolean).join(' · ')}</div></div></div>` : ''}
        ${p.advisor_name ? `<div class="contact-person">${p.advisor_photo ? `<img class="c-photo" src="${p.advisor_photo}" alt="${p.advisor_name}" />` : `<div class="c-init">${(p.advisor_name[0]??'?').toUpperCase()}</div>`}<div><div class="c-role">${p.advisor_title||'Mortgage Advisor'} · NEO Home Loans</div><div class="c-name">${p.advisor_name}</div><div class="c-detail">${[p.advisor_phone,p.advisor_email,advisorNmls].filter(Boolean).join(' · ')}</div></div></div>` : ''}
      </div>
    </div>
  </div>
  <div class="right">
    ${hero ? `<img src="${hero}" alt="${p.address}" />` : `<div class="right-empty">🏡</div>`}
    <div class="footer-strip">
      <span class="footer-disc">${DISCLAIMER}</span>
      <img src="${EHL_LOGO}" alt="EHL" style="height:18px;width:auto;flex-shrink:0;" />
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── FLYER 4: Bold Dark ───────────────────────────────────────────────────────
function flyerBold(p: PageData) {
  const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state].filter(Boolean).join(', ')
  const advisorNmls = p.advisor_nmls ? `NMLS# ${p.advisor_nmls}` : ''
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const stats = [p.beds?`${p.beds} Beds`:'', p.baths?`${p.baths} Baths`:'', p.sqft?`${p.sqft.toLocaleString()} Sq Ft`:'', p.lot_size?`${p.lot_size} Lot`:'', p.year_built?`Built ${p.year_built}`:''].filter(Boolean)
  const desc = (p.description??'').slice(0,400)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flyer — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:letter portrait;margin:0}
html,body{width:8.5in;height:11in;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:#080F1A}
.page{width:8.5in;height:11in;background:#080F1A;display:flex;flex-direction:column;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.top-bar{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;flex-shrink:0}
.top-logos{display:flex;align-items:center;gap:20px}
.top-logos img{max-height:36px;max-width:130px;object-fit:contain}
.oh-badge{background:${CYAN};color:#080F1A;font-size:9px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;padding:6px 16px;border-radius:99px}
.photo-frame{margin:0 28px;border-radius:12px;overflow:hidden;flex:1;min-height:0;position:relative;border:1px solid rgba(91,203,245,0.15)}
.photo-frame img{width:100%;height:100%;object-fit:cover;display:block}
.photo-fallback{width:100%;height:100%;background:linear-gradient(135deg,#0A2540 0%,#1a4a7c 100%);display:flex;align-items:center;justify-content:center;font-size:64px}
.photo-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,15,26,0.9) 0%,transparent 50%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.photo-info{position:absolute;bottom:0;left:0;right:0;padding:20px 24px}
.price{color:${CYAN};font-size:34px;font-weight:900;letter-spacing:-0.02em;margin-bottom:4px}
.address{color:#fff;font-size:20px;font-weight:800;margin-bottom:3px}
.city{color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:14px}
.stats-row{display:flex;gap:0;flex-wrap:nowrap}
.stat-chip{color:rgba(255,255,255,0.85);font-size:10px;font-weight:700;padding-right:12px;margin-right:12px;border-right:1px solid rgba(91,203,245,0.25)}
.stat-chip:last-child{border-right:none}
.bottom{flex-shrink:0;padding:18px 28px 0;display:flex;flex-direction:column;gap:14px}
.desc-text{font-size:9px;line-height:1.7;color:rgba(255,255,255,0.55)}
.contact-row{display:flex;align-items:center;gap:0;border-top:1px solid rgba(91,203,245,0.15);padding-top:14px}
.contact-person{flex:1;display:flex;align-items:center;gap:12px}
.contact-divider{width:1px;background:rgba(91,203,245,0.15);margin:0 20px;height:44px;flex-shrink:0}
.c-photo{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid ${CYAN};flex-shrink:0}
.c-init{width:44px;height:44px;border-radius:50%;background:rgba(91,203,245,0.1);border:2px solid rgba(91,203,245,0.35);display:flex;align-items:center;justify-content:center;color:${CYAN};font-size:16px;font-weight:900;flex-shrink:0}
.c-role{font-size:7.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${CYAN};margin-bottom:2px}
.c-name{font-size:12.5px;font-weight:800;color:#fff;line-height:1.2}
.c-detail{font-size:8.5px;color:rgba(255,255,255,0.45);margin-top:3px;line-height:1.5}
.footer{padding:10px 28px 14px;display:flex;align-items:center;gap:8px}
.footer-disc{font-size:5px;color:rgba(255,255,255,0.25);line-height:1.4;flex:1}
</style></head><body>
<div class="page">
  <div class="top-bar">
    <div class="top-logos">
      ${p.partner_logo ? `<img src="${p.partner_logo}" alt="Partner" />` : ''}
      <img src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" />
    </div>
    <div class="oh-badge">Open House</div>
  </div>
  <div class="photo-frame">
    ${hero ? `<img src="${hero}" alt="${p.address}" />` : `<div class="photo-fallback">🏡</div>`}
    <div class="photo-overlay"></div>
    <div class="photo-info">
      ${price ? `<div class="price">${price}</div>` : ''}
      <div class="address">${p.address}</div>
      ${location ? `<div class="city">${location}</div>` : ''}
      ${stats.length ? `<div class="stats-row">${stats.map(s=>`<span class="stat-chip">${s}</span>`).join('')}</div>` : ''}
    </div>
  </div>
  <div class="bottom">
    ${desc ? `<p class="desc-text">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}
    <div class="contact-row">
      ${p.partner_name ? `<div class="contact-person">${p.partner_photo ? `<img class="c-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="c-init">${(p.partner_name[0]??'?').toUpperCase()}</div>`}<div><div class="c-role">${p.partner_title||'Listing Agent'}</div><div class="c-name">${p.partner_name}</div><div class="c-detail">${[p.partner_phone,p.partner_email,partnerNmls].filter(Boolean).join('<br>')}</div></div></div>` : ''}
      ${p.partner_name && p.advisor_name ? `<div class="contact-divider"></div>` : ''}
      ${p.advisor_name ? `<div class="contact-person">${p.advisor_photo ? `<img class="c-photo" src="${p.advisor_photo}" alt="${p.advisor_name}" />` : `<div class="c-init">${(p.advisor_name[0]??'?').toUpperCase()}</div>`}<div><div class="c-role">${p.advisor_title||'Mortgage Advisor'} · NEO</div><div class="c-name">${p.advisor_name}</div><div class="c-detail">${[p.advisor_phone,p.advisor_email,advisorNmls].filter(Boolean).join('<br>')}</div></div></div>` : ''}
    </div>
  </div>
  <div class="footer">
    <span class="footer-disc">${DISCLAIMER}</span>
    <img src="${EHL_LOGO}" alt="EHL" style="height:18px;width:auto;flex-shrink:0;opacity:0.5;" />
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── SOCIAL: Instagram Square ─────────────────────────────────────────────────
function socialInstagram(p: PageData) {
  const CYAN = C.accent; const NEO = C.navy
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Instagram — ${p.partner_name}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1080px 1080px;margin:0}
html,body{width:1080px;height:1080px;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:${NEO};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1080px;height:1080px;background:linear-gradient(145deg,#080F1A 0%,#0A2540 60%,#0d3060 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding:60px}
.glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(91,203,245,0.12) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
.neo-logo-top{position:absolute;top:40px;right:40px}
.neo-logo-top img{max-height:36px;max-width:140px;object-fit:contain}
.tag{font-size:14px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${CYAN};margin-bottom:24px}
.logo-wrap{margin-bottom:32px;padding:24px 36px;background:rgba(255,255,255,0.06);border:1px solid rgba(91,203,245,0.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;min-width:260px}
.logo-wrap img{max-height:80px;max-width:320px;object-fit:contain}
.name{color:#fff;font-size:44px;font-weight:900;text-align:center;line-height:1.1;margin-bottom:8px}
.title{color:rgba(255,255,255,0.55);font-size:20px;text-align:center;margin-bottom:36px}
.divider{width:60px;height:2px;background:${CYAN};border-radius:1px;margin:0 auto 36px}
.contact-row{display:flex;flex-direction:column;align-items:center;gap:12px}
.contact-item{color:rgba(255,255,255,0.75);font-size:20px;font-weight:600;display:flex;align-items:center;gap:10px}
.contact-icon{color:${CYAN};font-size:18px}
.nmls{color:rgba(255,255,255,0.3);font-size:14px;margin-top:8px;text-align:center}
.bottom-bar{position:absolute;bottom:0;left:0;right:0;background:${CYAN};padding:16px 40px;display:flex;align-items:center;justify-content:space-between;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bottom-text{font-size:16px;font-weight:800;color:${NEO}}
.bottom-logo img{max-height:28px;max-width:100px;object-fit:contain}
</style></head><body>
<div class="page">
  <div class="glow"></div>
  <div class="neo-logo-top"><img src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" /></div>
  <div class="tag">Open House · Home Financing</div>
  ${p.partner_logo ? `<div class="logo-wrap"><img src="${p.partner_logo}" alt="${p.partner_name}" /></div>` : ''}
  <div class="name">${p.partner_name || 'Your Realtor'}</div>
  ${p.partner_title ? `<div class="title">${p.partner_title}</div>` : ''}
  <div class="divider"></div>
  <div class="contact-row">
    ${p.partner_phone ? `<div class="contact-item"><span class="contact-icon">📞</span>${p.partner_phone}</div>` : ''}
    ${p.partner_email ? `<div class="contact-item"><span class="contact-icon">✉</span>${p.partner_email}</div>` : ''}
  </div>
  ${partnerNmls ? `<div class="nmls">${partnerNmls}</div>` : ''}
  <div class="bottom-bar">
    <div class="bottom-text">Backed by NEO Home Loans</div>
    <div class="bottom-logo"><img src="${NEO_WHITE_LOGO}" alt="NEO" /></div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── SOCIAL: Facebook Banner ──────────────────────────────────────────────────
function socialFacebook(p: PageData) {
  const CYAN = C.accent; const NEO = C.navy
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state].filter(Boolean).join(', ')
  const hero = (p.photos??[])[0] ?? ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facebook — ${p.partner_name}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1200px 630px landscape;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:${NEO};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1200px;height:630px;display:flex}
.left{flex:0 0 560px;position:relative;overflow:hidden;background:#0A2540}
.left img{width:100%;height:100%;object-fit:cover;display:block}
.left-overlay{position:absolute;inset:0;background:linear-gradient(to right,transparent 60%,${NEO} 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.left-badge{position:absolute;top:28px;left:28px;background:${CYAN};color:${NEO};font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:6px 16px;border-radius:99px}
.left-info{position:absolute;bottom:28px;left:28px;right:28px}
.left-price{color:${CYAN};font-size:28px;font-weight:900;margin-bottom:4px}
.left-addr{color:#fff;font-size:15px;font-weight:700;margin-bottom:2px}
.left-city{color:rgba(255,255,255,0.55);font-size:12px}
.right{flex:1;background:${NEO};display:flex;flex-direction:column;justify-content:center;padding:40px 44px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.neo-logo{margin-bottom:24px}.neo-logo img{max-height:28px;max-width:110px;object-fit:contain}
${p.partner_logo ? `.partner-logo{margin-bottom:20px;padding:16px 20px;background:rgba(255,255,255,0.05);border:1px solid rgba(91,203,245,0.15);border-radius:12px;display:inline-flex}.partner-logo img{max-height:60px;max-width:220px;object-fit:contain}` : ''}
.name{color:#fff;font-size:30px;font-weight:900;line-height:1.1;margin-bottom:4px}
.title{color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:20px}
.divider{width:40px;height:2px;background:${CYAN};border-radius:1px;margin-bottom:20px}
.contact{display:flex;flex-direction:column;gap:8px}
.contact-item{color:rgba(255,255,255,0.75);font-size:14px;font-weight:600}
.nmls{color:rgba(255,255,255,0.25);font-size:11px;margin-top:12px}
</style></head><body>
<div class="page">
  <div class="left">
    ${hero ? `<img src="${hero}" alt="${p.address}" />` : ''}
    <div class="left-overlay"></div>
    <div class="left-badge">Open House</div>
    <div class="left-info">
      ${price ? `<div class="left-price">${price}</div>` : ''}
      <div class="left-addr">${p.address}</div>
      ${location ? `<div class="left-city">${location}</div>` : ''}
    </div>
  </div>
  <div class="right">
    <div class="neo-logo"><img src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" /></div>
    ${p.partner_logo ? `<div class="partner-logo"><img src="${p.partner_logo}" alt="${p.partner_name}" /></div>` : ''}
    <div class="name">${p.partner_name || 'Your Agent'}</div>
    ${p.partner_title ? `<div class="title">${p.partner_title}</div>` : ''}
    <div class="divider"></div>
    <div class="contact">
      ${p.partner_phone ? `<div class="contact-item">📞 ${p.partner_phone}</div>` : ''}
      ${p.partner_email ? `<div class="contact-item">✉ ${p.partner_email}</div>` : ''}
    </div>
    ${partnerNmls ? `<div class="nmls">${partnerNmls}</div>` : ''}
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── SOCIAL: Story ────────────────────────────────────────────────────────────
function socialStory(p: PageData) {
  const CYAN = C.accent; const NEO = C.navy
  const hero = (p.photos??[])[0] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state].filter(Boolean).join(', ')
  const stats = [p.beds?`${p.beds} BD`:'', p.baths?`${p.baths} BA`:'', p.sqft?`${p.sqft.toLocaleString()} SF`:''].filter(Boolean)
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Story — ${p.partner_name}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1080px 1920px portrait;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1080px;height:1920px;position:relative;background:${NEO}}
.hero-half{position:absolute;top:0;left:0;right:0;height:960px;overflow:hidden}
.hero-half img{width:100%;height:100%;object-fit:cover;display:block}
.hero-fallback{width:100%;height:100%;background:linear-gradient(135deg,#0A2540 0%,#1a4a7c 100%)}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(10,37,64,0.98) 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.top-logos{position:absolute;top:50px;left:0;right:0;padding:0 50px;display:flex;align-items:center;justify-content:space-between}
.top-logos img{max-height:40px;max-width:150px;object-fit:contain}
.oh-badge{position:absolute;top:50px;left:50%;transform:translateX(-50%);background:${CYAN};color:${NEO};font-size:14px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;padding:8px 24px;border-radius:99px}
.property-info{position:absolute;bottom:60px;left:0;right:0;padding:0 50px;text-align:center}
${price?`.prop-price{color:${CYAN};font-size:56px;font-weight:900;letter-spacing:-0.02em;margin-bottom:8px}`:''}
.prop-addr{color:#fff;font-size:30px;font-weight:800;margin-bottom:6px;line-height:1.2}
.prop-city{color:rgba(255,255,255,0.6);font-size:18px;margin-bottom:20px}
.prop-stats{display:flex;justify-content:center;gap:0}
.prop-stat{color:rgba(255,255,255,0.8);font-size:18px;font-weight:700;padding:0 20px;border-right:1px solid rgba(91,203,245,0.3)}
.prop-stat:last-child{border-right:none}
.bottom-half{position:absolute;top:960px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 50px;background:${NEO};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bottom-label{font-size:14px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${CYAN};margin-bottom:28px}
${p.partner_logo?`.logo-card{padding:28px 44px;background:rgba(255,255,255,0.06);border:1px solid rgba(91,203,245,0.15);border-radius:20px;margin-bottom:32px;display:inline-flex}.logo-card img{max-height:90px;max-width:360px;object-fit:contain}`:''}
.agent-name{color:#fff;font-size:52px;font-weight:900;text-align:center;line-height:1.1;margin-bottom:8px}
.agent-title{color:rgba(255,255,255,0.45);font-size:20px;text-align:center;margin-bottom:40px}
.divider{width:60px;height:3px;background:${CYAN};border-radius:2px;margin:0 auto 40px}
.contact-list{display:flex;flex-direction:column;align-items:center;gap:16px}
.contact-item{color:rgba(255,255,255,0.75);font-size:24px;font-weight:600}
.nmls{color:rgba(255,255,255,0.25);font-size:16px;margin-top:16px;text-align:center}
.footer-bar{position:absolute;bottom:0;left:0;right:0;background:${CYAN};padding:20px 50px;display:flex;align-items:center;justify-content:space-between;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer-text{color:${NEO};font-size:18px;font-weight:800}
.footer-logo img{max-height:28px;max-width:120px;object-fit:contain}
</style></head><body>
<div class="page">
  <div class="hero-half">
    ${hero ? `<img src="${hero}" alt="${p.address}" />` : `<div class="hero-fallback"></div>`}
    <div class="hero-overlay"></div>
  </div>
  <div class="top-logos">
    ${p.partner_logo ? `<img src="${p.partner_logo}" alt="Partner" />` : '<div></div>'}
    <img src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" />
  </div>
  <div class="property-info">
    ${price ? `<div class="prop-price">${price}</div>` : ''}
    <div class="prop-addr">${p.address}</div>
    ${location ? `<div class="prop-city">${location}</div>` : ''}
    ${stats.length ? `<div class="prop-stats">${stats.map(s=>`<div class="prop-stat">${s}</div>`).join('')}</div>` : ''}
  </div>
  <div class="bottom-half">
    <div class="bottom-label">Your Listing Agent</div>
    ${p.partner_logo ? `<div class="logo-card"><img src="${p.partner_logo}" alt="${p.partner_name}" /></div>` : ''}
    <div class="agent-name">${p.partner_name || 'Your Agent'}</div>
    ${p.partner_title ? `<div class="agent-title">${p.partner_title}</div>` : ''}
    <div class="divider"></div>
    <div class="contact-list">
      ${p.partner_phone ? `<div class="contact-item">📞 ${p.partner_phone}</div>` : ''}
      ${p.partner_email ? `<div class="contact-item">✉ ${p.partner_email}</div>` : ''}
    </div>
    ${partnerNmls ? `<div class="nmls">${partnerNmls}</div>` : ''}
  </div>
  <div class="footer-bar">
    <div class="footer-text">Backed by NEO Home Loans</div>
    <div class="footer-logo"><img src="${NEO_WHITE_LOGO}" alt="NEO" /></div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── Template cards config ────────────────────────────────────────────────────
const FLYERS = [
  { key: 'standard', label: 'Standard', sub: 'Classic layout with property photos, TCA, and contact bar', icon: '📄', color: '#0A2540', gen: flyerStandard },
  { key: 'showcase', label: 'Showcase', sub: 'Photo-dominant with large hero, minimal text, bold impact', icon: '🖼', color: '#1a1a2e', gen: flyerShowcase },
  { key: 'modern', label: 'Modern Split', sub: 'Details left, full-bleed photo right — clean and editorial', icon: '◧', color: '#1a3a5c', gen: flyerModern },
  { key: 'bold', label: 'Bold Dark', sub: 'All-dark design with framed hero photo and cyan accents', icon: '🌙', color: '#080F1A', gen: flyerBold },
]

const SOCIALS = [
  { key: 'instagram', label: 'Instagram Post', sub: '1080 × 1080 · Square · Partner branding on navy', icon: '📸', size: '1080 × 1080', gen: socialInstagram },
  { key: 'facebook', label: 'Facebook / LinkedIn', sub: '1200 × 630 · Landscape · Photo + partner card', icon: '💼', size: '1200 × 630', gen: socialFacebook },
  { key: 'story', label: 'Story / Reel Cover', sub: '1080 × 1920 · Vertical · Property + agent spotlight', icon: '📱', size: '1080 × 1920', gen: socialStory },
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AgentPageClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.from('open_house_pages')
      .select('*')
      .eq('slug', slug)
      .eq('page_type', 'open_house')
      .eq('status', 'active')
      .limit(1)
      .then(({ data, error }) => {
        if (error) { setDbError(error.message); setLoading(false); return }
        if (!data || data.length === 0) { setDbError('Listing not found'); setLoading(false); return }
        const row = data[0]
        const pageData: PageData = {
          partner_name: '', partner_title: '', partner_email: '', partner_phone: '',
          partner_photo: '', partner_nmls: '', partner_logo: '',
          tca_url: null, tca_screenshot: null, schedule_url: null, loan_description: null,
          ...row,
        } as PageData

        const fetchExtras = async () => {
          const [profileRes, partnerRes] = await Promise.all([
            row.created_by
              ? sb.from('profiles').select('schedule_url').eq('id', row.created_by).single()
              : Promise.resolve({ data: null }),
            pageData.partner_name
              ? sb.from('marketing_partners').select('logo_url, name')
              : Promise.resolve({ data: null }),
          ])
          const scheduleUrl = (profileRes.data as { schedule_url?: string } | null)?.schedule_url ?? null
          let finalData = { ...pageData, schedule_url: scheduleUrl }
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
      })
  }, [slug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ color: C.muted, fontSize: 16 }}>Loading…</div>
    </div>
  )
  if (dbError || !page) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>Resource page not found</div>
        {dbError && <div style={{ marginTop: 8, fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{dbError}</div>}
      </div>
    </div>
  )

  const price = Number(page.list_price) > 0 ? fmtPrice(page.list_price) : null
  const location = [page.city, page.state].filter(Boolean).join(', ')

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Montserrat', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: C.navy, padding: '0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {page.partner_logo && (
              <img src={page.partner_logo} alt={page.partner_name} style={{ maxHeight: 40, maxWidth: 140, objectFit: 'contain' }} />
            )}
          </div>
          <img src={NEO_WHITE_LOGO} alt="NEO Home Loans" style={{ height: 30, width: 'auto' }} />
        </div>
        {/* Property banner */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 0' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Agent Resource Hub</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>{page.address}</div>
              {(location || price) && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>
                  {location}{location && price ? ' · ' : ''}{price || ''}
                </div>
              )}
            </div>
            <a
              href={`/open-house/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: C.accent, color: C.navy, fontWeight: 700, fontSize: 13, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              View Client Page ↗
            </a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 24px 64px' }}>

        {/* Flyers section */}
        <Section title="Property Flyers" sub="Print-ready 8.5 × 11 in. Each opens in a new tab and triggers the print dialog." icon="🖨">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
            {FLYERS.map(f => (
              <TemplateCard
                key={f.key}
                icon={f.icon}
                label={f.label}
                sub={f.sub}
                accentColor={f.color}
                onOpen={() => openBlob(f.gen(page))}
                badge="8.5 × 11 in"
              />
            ))}
          </div>
        </Section>

        {/* Social section */}
        <Section title="Social Media Templates" sub="Partner-branded graphics. Open in a new tab, then screenshot or print to PDF." icon="📲">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
            {SOCIALS.map(s => (
              <TemplateCard
                key={s.key}
                icon={s.icon}
                label={s.label}
                sub={s.sub}
                accentColor={C.navy}
                onOpen={() => openBlob(s.gen(page))}
                badge={s.size}
              />
            ))}
          </div>
        </Section>

        {/* Partner info summary */}
        {page.partner_name && (
          <Section title="Partner Info" sub="Confirm these details are correct before sharing templates." icon="👤">
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {page.partner_logo && (
                <img src={page.partner_logo} alt={page.partner_name} style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{page.partner_name}</div>
                {page.partner_title && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{page.partner_title}</div>}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
                  {page.partner_phone && <div style={{ fontSize: 13, color: C.dim, fontWeight: 600 }}>{page.partner_phone}</div>}
                  {page.partner_email && <div style={{ fontSize: 13, color: C.muted }}>{page.partner_email}</div>}
                  {page.partner_nmls && <div style={{ fontSize: 12, color: C.muted }}>NMLS# {page.partner_nmls}</div>}
                </div>
              </div>
            </div>
          </Section>
        )}

      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, sub, icon, children }: { title: string; sub: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{title}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div style={{ height: 2, background: C.border, margin: '14px 0 20px' }} />
      {children}
    </div>
  )
}

function TemplateCard({ icon, label, sub, accentColor, onOpen, badge }: {
  icon: string; label: string; sub: string; accentColor: string; onOpen: () => void; badge: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: C.white, borderRadius: 14,
        border: `1.5px solid ${hover ? C.accent : C.border}`,
        overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hover ? '0 4px 20px rgba(91,203,245,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
      {/* Preview area */}
      <div style={{
        height: 120, background: accentColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        transition: 'opacity 0.15s',
      }}>
        <span style={{ fontSize: 40, opacity: hover ? 0.6 : 0.9, transition: 'opacity 0.15s' }}>{icon}</span>
        {hover && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}>
            <div style={{ background: C.accent, color: C.navy, fontWeight: 800, fontSize: 13, padding: '8px 20px', borderRadius: 8 }}>
              Open &amp; Print
            </div>
          </div>
        )}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.4)', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
          letterSpacing: '0.05em',
        }}>
          {badge}
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{sub}</div>
      </div>
    </div>
  )
}
