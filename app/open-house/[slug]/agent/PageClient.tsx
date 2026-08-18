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
const DISCLAIMER = 'Special financing incentive available! This home qualifies for a reduced interest rate or closing cost credit when financed through NEO Home Loans, the preferred lender. Participation is optional; buyers may use any lender of their choice. Contact listing agent or lender for details. | © 2026 Better Home & Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License # 02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Better BMC operates under the name Better Mortgage Corporation in New York. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, 80th Floor, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access | Better Real Estate, LLC dba BRE, Better Home Services, BRE Services, LLC and Better Real Estate, and operating in the State of California through its wholly owned subsidiary Better Real Estate California Inc., is a licensed real estate brokerage and maintains its corporate headquarters at 325-41 Chestnut Street, Suite 826, Philadelphia, PA 19106. Equal Housing Opportunity. All rights reserved. | Better Settlement Services, LLC. 325-41 Chestnut Street, Suite 803, Philadelphia, PA 19106. | Homeowners insurance policies are offered through Better Cover, LLC, a Pennsylvania Resident Producer Agency. License #881593. 325-41 Chestnut Street, Suite 807, Philadelphia, PA 19106. | Better Inspect, LLC maintains its corporate headquarters at 325-41 Chestnut Street, Suite 846, Philadelphia, PA 19106. | Better Mortgage Corporation, Better Real Estate, LLC, Better Settlement Services, LLC, Better Cover, LLC, Better Connect, and Better Inspect, LLC are separate operating subsidiaries of Better Home & Finance Holding Company. Each company is a separate legal entity operated and managed through its own management and governance structure as required by its state of incorporation, and applicable legal and regulatory requirements. Products not available in all states. | Licensed by the Department of Financial Protection and Innovation under the California Residential Mortgage Lending Act.'

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
  const desc = p.description ?? ''
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
.hero-logo{display:flex;flex-direction:row;align-items:center;gap:10px;background:rgba(255,255,255,0.92);padding:8px 14px;border-radius:8px}
.hero-logo .partner-logo{max-height:40px;max-width:160px;object-fit:contain}
.hero-logo .logo-sep{width:1px;height:32px;background:#D1D5DB;flex-shrink:0}
.hero-logo .neo-logo{max-height:22px;max-width:88px;object-fit:contain;opacity:0.7}
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
.qr-card{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;padding:16px 12px;border-top:1px solid #E4E8EC}
.qr-card img{width:150px;height:150px;display:block;border-radius:6px;box-shadow:0 2px 10px rgba(10,37,64,0.12)}
.qr-label{margin-top:10px;font-size:9.5px;font-weight:800;color:${NEO};text-transform:uppercase;letter-spacing:0.1em;text-align:center;line-height:1.5}
.qr-sub{margin-top:4px;font-size:7.5px;color:#64748B;text-align:center;line-height:1.5}
.qr-bullets{margin-top:10px;display:flex;flex-direction:column;gap:5px;align-self:stretch}
.qr-bullet{display:flex;align-items:center;gap:7px;font-size:8px;color:#374151;font-weight:600}
.qr-dot{width:6px;height:6px;border-radius:50%;background:${CYAN};flex-shrink:0}
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
.footer{background:#F8FAFC;border-top:2px solid ${CYAN};display:flex;align-items:flex-start;justify-content:space-between;padding:4px 20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer-disc{font-size:4px;color:#9CA3AF;line-height:1.25}
</style></head><body>
<div class="hero">
  ${hero ? `<img src="${hero}" alt="${p.address}" />` : `<div class="hero-fallback">🏡</div>`}
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-address"><div class="hero-street">${p.address}</div>${location ? `<div class="hero-city">${location}</div>` : ''}</div>
    <div class="hero-logo">
      ${p.partner_logo ? `<img class="partner-logo" src="${p.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" /><div class="logo-sep"></div>` : ''}
      <img class="neo-logo" src="${NEO_BIG_LOGO}" alt="NEO Home Loans" />
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
    <div class="qr-card">
      <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)}&size=300x300&margin=2&color=0A2540" alt="QR Code" />
      <div class="qr-label">Scan for Special Financing Options</div>
      <div class="qr-sub">Exclusive rates &amp; programs for this home.</div>
      <div class="qr-bullets">
        <div class="qr-bullet"><div class="qr-dot"></div>Payment breakdowns &amp; monthly estimates</div>
        <div class="qr-bullet"><div class="qr-dot"></div>Loan scenarios tailored to this property</div>
        <div class="qr-bullet"><div class="qr-dot"></div>Connect directly with your mortgage advisor</div>
      </div>
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

// ─── FLYER 2: Split Panel (hero photo left, content + TCA right) ──────────────
function flyerShowcase(p: PageData) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''
  const ph2 = photos[1] ?? ''; const ph3 = photos[2] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state, p.zip].filter(Boolean).join(', ')
  const advisorNmls = p.advisor_nmls ? `NMLS# ${p.advisor_nmls}` : ''
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const desc = p.description ?? ''
  const stats = [p.beds?`${p.beds} Beds`:'',p.baths?`${p.baths} Baths`:'',p.sqft?`${p.sqft.toLocaleString()} Sq Ft`:'',p.lot_size?p.lot_size+' Lot`':'',p.year_built?`Built ${p.year_built}`:''].filter(Boolean)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flyer — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:letter portrait;margin:0}
html,body{width:8.5in;height:11in;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:#fff}
.wrap{display:flex;flex-direction:column;height:11in}
.main{display:flex;flex:1;min-height:0}
.photo-col{flex:0 0 4.2in;position:relative;overflow:hidden;background:#0A2540}
.photo-col img{width:100%;height:100%;object-fit:cover;display:block}
.photo-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,37,64,0.55) 0%,transparent 35%,transparent 70%,rgba(10,37,64,0.7) 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.photo-top{position:absolute;top:0;left:0;right:0;padding:18px 20px;display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.oh-badge{background:${CYAN};color:${NEO};font-size:9px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:5px 12px;border-radius:99px}
.photo-logos{display:flex;flex-direction:row;align-items:center;gap:10px;margin-top:4px;background:rgba(255,255,255,0.92);padding:7px 12px;border-radius:7px}
.photo-logos .partner-logo{max-height:34px;max-width:140px;object-fit:contain}
.photo-logos .logo-sep{width:1px;height:26px;background:#D1D5DB;flex-shrink:0}
.photo-logos .neo-logo{max-height:20px;max-width:82px;object-fit:contain;opacity:0.7}
.photo-bottom{position:absolute;bottom:0;left:0;right:0;padding:16px 20px}
.pb-price{color:${CYAN};font-size:28px;font-weight:900;letter-spacing:-0.01em;margin-bottom:3px}
.pb-addr{color:#fff;font-size:14px;font-weight:800;line-height:1.2;margin-bottom:2px;text-shadow:0 1px 4px rgba(0,0,0,0.4)}
.pb-city{color:rgba(255,255,255,0.7);font-size:11px}
.right-col{flex:1;display:flex;flex-direction:column;background:#fff;border-left:3px solid ${CYAN}}
.right-header{background:${NEO};padding:14px 20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rh-label{font-size:8px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${CYAN};margin-bottom:6px}
.stats-row{display:flex;flex-wrap:wrap;gap:0}
.stat-pill{font-size:9.5px;font-weight:700;color:rgba(255,255,255,0.85);padding:0 10px 0 0;margin-right:10px;border-right:1px solid rgba(91,203,245,0.2);white-space:nowrap}
.stat-pill:last-child{border-right:none}
.right-body{flex:1;padding:14px 20px 10px;display:flex;flex-direction:column;gap:10px;overflow:hidden;min-height:0}
.section-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:${CYAN};margin-bottom:5px}
.desc-text{font-size:9.5px;line-height:1.75;color:#374151}
.qr-card2{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-height:0;padding:14px 10px;border-top:1px solid #E4E8EC}
.qr-card2 img{width:140px;height:140px;display:block;border-radius:6px;box-shadow:0 2px 10px rgba(10,37,64,0.12)}
.qr-label2{margin-top:9px;font-size:8.5px;font-weight:800;color:${NEO};text-transform:uppercase;letter-spacing:0.1em;text-align:center;line-height:1.5}
.qr-sub2{margin-top:3px;font-size:7px;color:#64748B;text-align:center;line-height:1.5}
.qr-bullets2{margin-top:9px;display:flex;flex-direction:column;gap:5px;align-self:stretch}
.qr-bullet2{display:flex;align-items:center;gap:6px;font-size:7.5px;color:#374151;font-weight:600}
.qr-dot2{width:5px;height:5px;border-radius:50%;background:${CYAN};flex-shrink:0}
.photo-strip{display:flex;gap:4px;height:1.1in;flex-shrink:0}
.strip-photo{flex:1;overflow:hidden;border-radius:6px;background:#E4E8EC}
.strip-photo img{width:100%;height:100%;object-fit:cover;display:block}
.strip-empty{width:100%;height:100%;background:linear-gradient(135deg,#E4E8EC,#D0D5DD)}
.contact-bar{height:0.95in;background:${NEO};display:flex;align-items:stretch;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.contact-cell{flex:1;display:flex;align-items:center;gap:12px;padding:0 18px}
.contact-sep{width:1px;background:rgba(91,203,245,0.18);margin:12px 0;flex-shrink:0}
.c-photo{width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${CYAN}}
.c-init{width:42px;height:42px;border-radius:50%;background:rgba(91,203,245,0.12);border:2px solid rgba(91,203,245,0.35);display:flex;align-items:center;justify-content:center;color:${CYAN};font-size:16px;font-weight:900;flex-shrink:0}
.c-info{color:#fff}.c-role{font-size:7.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${CYAN};margin-bottom:2px}
.c-name{font-size:13px;font-weight:800;line-height:1.15}.c-detail{font-size:8.5px;color:rgba(255,255,255,0.55);margin-top:4px;line-height:1.6}
.footer{background:#F8FAFC;border-top:2px solid ${CYAN};display:flex;align-items:flex-start;justify-content:space-between;padding:4px 18px;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer-disc{font-size:4px;color:#9CA3AF;line-height:1.25}
</style></head><body>
<div class="wrap">
  <div class="main">
    <div class="photo-col">
      ${hero ? `<img src="${hero}" alt="${p.address}" />` : ''}
      <div class="photo-overlay"></div>
      <div class="photo-top">
        <div class="oh-badge">Open House</div>
        <div class="photo-logos">
          ${p.partner_logo ? `<img class="partner-logo" src="${p.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" /><div class="logo-sep"></div>` : ''}
          <img class="neo-logo" src="${NEO_BIG_LOGO}" alt="NEO Home Loans" />
        </div>
      </div>
      <div class="photo-bottom">
        ${price ? `<div class="pb-price">${price}</div>` : ''}
        <div class="pb-addr">${p.address}</div>
        ${location ? `<div class="pb-city">${location}</div>` : ''}
      </div>
    </div>
    <div class="right-col">
      <div class="right-header">
        <div class="rh-label">Property Details</div>
        ${stats.length ? `<div class="stats-row">${stats.map(s=>`<span class="stat-pill">${s}</span>`).join('')}</div>` : ''}
      </div>
      <div class="right-body">
        ${desc ? `<div><div class="section-label">About This Property</div><p class="desc-text">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></div>` : ''}
        <div class="qr-card2">
          <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)}&size=280x280&margin=2&color=0A2540" alt="QR Code" />
          <div class="qr-label2">Scan for Special Financing Options</div>
          <div class="qr-sub2">Exclusive rates &amp; programs for this home.</div>
          <div class="qr-bullets2">
            <div class="qr-bullet2"><div class="qr-dot2"></div>Payment breakdowns &amp; monthly estimates</div>
            <div class="qr-bullet2"><div class="qr-dot2"></div>Loan scenarios tailored to this property</div>
            <div class="qr-bullet2"><div class="qr-dot2"></div>Connect directly with your mortgage advisor</div>
          </div>
        </div>
        <div class="photo-strip">
          <div class="strip-photo">${ph2 ? `<img src="${ph2}" alt="Photo 2" />` : `<div class="strip-empty"></div>`}</div>
          <div class="strip-photo">${ph3 ? `<img src="${ph3}" alt="Photo 3" />` : `<div class="strip-empty"></div>`}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="contact-bar">
    ${p.partner_name ? `<div class="contact-cell">${p.partner_photo ? `<img class="c-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="c-init">${(p.partner_name[0]??'?').toUpperCase()}</div>`}<div class="c-info"><div class="c-role">${p.partner_title||'Listing Agent'}</div><div class="c-name">${p.partner_name}</div><div class="c-detail">${[p.partner_phone,p.partner_email,partnerNmls].filter(Boolean).join('<br>')}</div></div></div><div class="contact-sep"></div>` : ''}
    ${p.advisor_name ? `<div class="contact-sep"></div><div class="contact-cell" style="justify-content:flex-end"><div class="c-info" style="text-align:right"><div class="c-role">${p.advisor_title||'Mortgage Advisor'} · NEO Home Loans</div><div class="c-name">${p.advisor_name}</div><div class="c-detail">${[p.advisor_phone,p.advisor_email,advisorNmls].filter(Boolean).join('<br>')}</div></div>${p.advisor_photo ? `<img class="c-photo" src="${p.advisor_photo}" alt="${p.advisor_name}" />` : `<div class="c-init">${(p.advisor_name[0]??'?').toUpperCase()}</div>`}</div>` : ''}
  </div>
  <div class="footer">
    <span class="footer-disc">${DISCLAIMER}</span>
    <img src="${EHL_LOGO}" alt="Equal Housing Lender" style="height:20px;width:auto;object-fit:contain;flex-shrink:0;margin-left:10px;" />
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── FLYER 3: Magazine (full-bleed hero, accent stripe, 3-col content) ─────────
function flyerModern(p: PageData) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''; const ph2 = photos[1] ?? ''; const ph3 = photos[2] ?? ''; const ph4 = photos[3] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state, p.zip].filter(Boolean).join(', ')
  const advisorNmls = p.advisor_nmls ? `NMLS# ${p.advisor_nmls}` : ''
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const desc = p.description ?? ''
  const features = [
    p.beds ? `${p.beds} Bedrooms` : null,
    p.baths ? `${p.baths} Bathrooms` : null,
    p.sqft ? `${p.sqft.toLocaleString()} Sq Ft` : null,
    p.lot_size ? `${p.lot_size} Lot` : null,
    p.year_built ? `Built ${p.year_built}` : null,
    p.hoa_monthly ? `HOA $${p.hoa_monthly}/mo` : null,
  ].filter(Boolean)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flyer — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:letter portrait;margin:0}
html,body{width:8.5in;height:11in;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{display:flex;flex-direction:column;height:11in}
/* Hero */
.hero{height:3.6in;position:relative;overflow:hidden;flex-shrink:0;background:${NEO}}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,37,64,0.18) 0%,transparent 40%,rgba(10,37,64,0.82) 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hero-top{position:absolute;top:0;left:0;right:0;padding:16px 22px;display:flex;align-items:flex-start;justify-content:space-between}
.oh-badge{background:${CYAN};color:${NEO};font-size:9px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;padding:5px 14px;border-radius:99px}
.hero-logos{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.92);padding:8px 14px;border-radius:8px}
.hero-logos .partner-logo{max-height:36px;max-width:150px;object-fit:contain}
.hero-logos .sep{width:1px;height:28px;background:#D1D5DB}
.hero-logos .neo-logo{max-height:22px;max-width:90px;object-fit:contain;opacity:0.7}
.hero-bottom{position:absolute;bottom:0;left:0;right:0;padding:16px 22px 18px}
.hb-price{color:${CYAN};font-size:34px;font-weight:900;letter-spacing:-0.02em;line-height:1;margin-bottom:5px}
.hb-addr{color:#fff;font-size:16px;font-weight:800;line-height:1.2;text-shadow:0 1px 6px rgba(0,0,0,0.5);margin-bottom:2px}
.hb-city{color:rgba(255,255,255,0.7);font-size:10.5px}
/* Accent stripe */
.stripe{background:${NEO};padding:7px 22px;display:flex;align-items:center;gap:0;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.stripe-stat{font-size:10px;font-weight:700;color:#fff;padding-right:14px;margin-right:14px;border-right:1px solid rgba(91,203,245,0.25);white-space:nowrap}
.stripe-stat:last-child{border-right:none;padding-right:0;margin-right:0}
.stripe-stat span{color:${CYAN}}
/* Main content: 3 columns */
.body{flex:1;display:flex;min-height:0;gap:0}
/* Left: description + QR */
.col-desc{flex:0 0 2.75in;padding:14px 14px 12px 22px;display:flex;flex-direction:column;gap:0;overflow:hidden;border-right:1px solid #E4E8EC}
.sec-label{font-size:7.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${CYAN};margin-bottom:5px}
.desc-text{font-size:9.5px;line-height:1.85;color:#374151}
.qr-card3{margin-top:10px;border-top:1px solid #E4E8EC;display:flex;flex-direction:row;align-items:center;gap:10px;padding:10px 0 0;flex-shrink:0}
.qr-card3 img{width:64px;height:64px;display:block;border-radius:4px;flex-shrink:0;box-shadow:0 2px 8px rgba(10,37,64,0.15)}
.qr-text3{display:flex;flex-direction:column;gap:3px}
.qr-label3{font-size:9px;font-weight:900;color:${NEO};line-height:1.3}
.qr-sub3{font-size:7px;color:#475569;line-height:1.5}
/* Mid: vertical photo */
.col-tca{flex:1;overflow:hidden;border-right:1px solid #E4E8EC;min-width:0;background:#E4E8EC}
.col-tca img{width:100%;height:100%;object-fit:cover;display:block}
/* Right: features + photos */
.col-right{flex:0 0 1.85in;padding:14px 18px 12px 14px;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.feat-item{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #F0F0F0}
.feat-dot{width:6px;height:6px;border-radius:50%;background:${CYAN};flex-shrink:0}
.feat-lbl{font-size:9.5px;font-weight:700;color:#1F2937}
.mini-photos{display:flex;flex-direction:column;gap:5px;flex:1;min-height:0}
.mini-photo{flex:1;overflow:hidden;border-radius:5px;background:#E4E8EC;min-height:0}
.mini-photo img{width:100%;height:100%;object-fit:cover;display:block}
/* Contact + footer */
.contact-bar{height:0.95in;background:${NEO};display:flex;align-items:stretch;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.contact-cell{flex:1;display:flex;align-items:center;gap:12px;padding:0 18px}
.contact-sep{width:1px;background:rgba(91,203,245,0.18);margin:12px 0;flex-shrink:0}
.c-photo{width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${CYAN}}
.c-init{width:42px;height:42px;border-radius:50%;background:rgba(91,203,245,0.12);border:2px solid rgba(91,203,245,0.35);display:flex;align-items:center;justify-content:center;color:${CYAN};font-size:16px;font-weight:900;flex-shrink:0}
.c-info{color:#fff}.c-role{font-size:7.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${CYAN};margin-bottom:2px}
.c-name{font-size:13px;font-weight:800;line-height:1.15}.c-detail{font-size:8.5px;color:rgba(255,255,255,0.55);margin-top:4px;line-height:1.6}
.footer{background:#F8FAFC;border-top:2px solid ${CYAN};display:flex;align-items:flex-start;justify-content:space-between;padding:4px 18px;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer-disc{font-size:4px;color:#9CA3AF;line-height:1.25}
</style></head><body>
<div class="page">
  <div class="hero">
    ${hero ? `<img src="${hero}" alt="${p.address}" />` : ''}
    <div class="hero-overlay"></div>
    <div class="hero-top">
      <div class="oh-badge">Open House</div>
      <div class="hero-logos">
        ${p.partner_logo ? `<img class="partner-logo" src="${p.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" />` : ''}
        ${p.partner_logo ? `<div class="sep"></div>` : ''}
        <img class="neo-logo" src="${NEO_BIG_LOGO}" alt="NEO Home Loans" />
      </div>
    </div>
    <div class="hero-bottom">
      ${price ? `<div class="hb-price">${price}</div>` : ''}
      <div class="hb-addr">${p.address}</div>
      ${location ? `<div class="hb-city">${location}</div>` : ''}
    </div>
  </div>
  ${features.length ? `<div class="stripe">${features.map(f=>`<div class="stripe-stat">${f}</div>`).join('')}</div>` : ''}
  <div class="body">
    <div class="col-desc">
      ${desc ? `<div><div class="sec-label">About This Home</div><p class="desc-text">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></div>` : ''}
      <div class="qr-card3">
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)}&size=200x200&margin=2&color=0A2540" alt="QR Code" />
        <div class="qr-text3">
          <div class="qr-label3">Scan for Special<br>Financing Options</div>
          <div class="qr-sub3">Payment breakdowns, loan scenarios<br>&amp; connect with your mortgage advisor.</div>
        </div>
      </div>
    </div>
    <div class="col-tca">
      ${ph2 ? `<img src="${ph2}" alt="Interior" />` : ''}
    </div>
    <div class="col-right">
      ${features.length ? `<div><div class="sec-label">Features</div>${features.map(f=>`<div class="feat-item"><div class="feat-dot"></div><div class="feat-lbl">${f}</div></div>`).join('')}</div>` : ''}
      <div class="mini-photos">
        ${ph3 ? `<div class="mini-photo"><img src="${ph3}" alt="Photo 3" /></div>` : ''}
        ${ph4 ? `<div class="mini-photo"><img src="${ph4}" alt="Photo 4" /></div>` : ''}
      </div>
    </div>
  </div>
  <div class="contact-bar">
    ${p.partner_name ? `<div class="contact-cell">${p.partner_photo ? `<img class="c-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="c-init">${(p.partner_name[0]??'?').toUpperCase()}</div>`}<div class="c-info"><div class="c-role">${p.partner_title||'Listing Agent'}</div><div class="c-name">${p.partner_name}</div><div class="c-detail">${[p.partner_phone,p.partner_email,partnerNmls].filter(Boolean).join('<br>')}</div></div></div><div class="contact-sep"></div>` : ''}
    ${p.advisor_name ? `<div class="contact-sep"></div><div class="contact-cell" style="justify-content:flex-end"><div class="c-info" style="text-align:right"><div class="c-role">${p.advisor_title||'Mortgage Advisor'} · NEO Home Loans</div><div class="c-name">${p.advisor_name}</div><div class="c-detail">${[p.advisor_phone,p.advisor_email,advisorNmls].filter(Boolean).join('<br>')}</div></div>${p.advisor_photo ? `<img class="c-photo" src="${p.advisor_photo}" alt="${p.advisor_name}" />` : `<div class="c-init">${(p.advisor_name[0]??'?').toUpperCase()}</div>`}</div>` : ''}
  </div>
  <div class="footer">
    <span class="footer-disc">${DISCLAIMER}</span>
    <img src="${EHL_LOGO}" alt="Equal Housing Lender" style="height:20px;width:auto;object-fit:contain;flex-shrink:0;margin-left:10px;" />
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── FLYER 4: Classic Open House (matches reference layout) ──────────────────
function flyerBold(p: PageData) {
  const NEO = C.navy; const CYAN = C.accent; const CHARCOAL = '#2A2A2A'
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''
  const strip = [photos[1]??'', photos[2]??'', photos[3]??'']
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')
  const advisorNmls = p.advisor_nmls ? `NMLS# ${p.advisor_nmls}` : ''
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const desc = (p.description ?? '')
  const features = [
    p.sqft ? `${p.sqft.toLocaleString()} Sq. Ft.` : null,
    p.beds ? `${p.beds} Bedroom${p.beds !== 1 ? 's' : ''}` : null,
    p.baths ? `${p.baths} Bathroom${p.baths !== 1 ? 's' : ''}` : null,
    p.lot_size ? `${p.lot_size} Lot` : null,
    p.year_built ? `Built ${p.year_built}` : null,
    p.hoa_monthly ? `HOA $${p.hoa_monthly}/mo` : null,
  ].filter(Boolean)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flyer — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:letter portrait;margin:0}
html,body{width:8.5in;height:11in;overflow:hidden;font-family:'Arial',Helvetica,sans-serif;background:#fff}
.page{display:flex;flex-direction:column;height:11in}
.top-header{background:${CHARCOAL};padding:12px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.th-oh{font-size:36px;font-weight:900;color:${CYAN};letter-spacing:-0.01em;line-height:1;text-transform:uppercase}
.th-logo{display:flex;flex-direction:row;align-items:center;gap:14px}
.th-logo-sep{width:1px;height:36px;background:rgba(255,255,255,0.2)}
.th-logo .partner-img{max-height:48px;max-width:170px;object-fit:contain}
.th-logo .neo-img{max-height:28px;max-width:110px;object-fit:contain}
.hero{height:2.3in;overflow:hidden;flex-shrink:0;background:#CBD5E1}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.addr-bar{background:${CHARCOAL};padding:10px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.addr-text{color:#fff;font-size:14px;font-weight:700}
.addr-price{color:${CYAN};font-size:28px;font-weight:900;letter-spacing:-0.02em}
.photo-strip{display:flex;height:1.35in;gap:3px;flex-shrink:0;background:#E4E8EC}
.strip-photo{flex:1;overflow:hidden;background:#CBD5E1}
.strip-photo img{width:100%;height:100%;object-fit:cover;display:block}
.strip-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#CBD5E1;background:#F1F5F9}
.content{flex:1;display:flex;min-height:0;padding:14px 22px 10px;gap:18px;background:#F9FAFB}
.desc-col{flex:1;overflow:hidden;display:flex;flex-direction:column;gap:10px}
.desc-text{font-size:9.5px;line-height:1.78;color:#222}
.qr-bold{margin-top:auto;border-top:1px solid #D1D5DB;display:flex;flex-direction:row;align-items:center;gap:12px;padding:10px 0 0;flex-shrink:0}
.qr-bold img{width:62px;height:62px;border-radius:4px;flex-shrink:0;box-shadow:0 2px 8px rgba(10,37,64,0.15)}
.qr-bold-label{font-size:9px;font-weight:900;color:${CHARCOAL};line-height:1.35}
.qr-bold-sub{font-size:7px;color:#555;line-height:1.55;margin-top:3px}
.features-col{flex:0 0 2.5in;display:flex;flex-direction:column;gap:0}
.feat-title{font-size:13px;font-weight:900;color:#111;margin-bottom:10px}
.feat-item{display:flex;align-items:center;gap:9px;padding:5px 0;border-bottom:1px solid #E4E8EC}
.feat-check{width:18px;height:18px;border-radius:50%;background:${CYAN};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.feat-check svg{width:10px;height:10px}
.feat-label{font-size:11px;font-weight:700;color:#222}
.contact-bar{background:${CHARCOAL};padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cb-person{display:flex;align-items:center;gap:10px;flex:1}
.cb-photo{width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${CYAN}}
.cb-init{width:52px;height:52px;border-radius:50%;background:rgba(91,203,245,0.15);border:2px solid rgba(91,203,245,0.4);display:flex;align-items:center;justify-content:center;color:${CYAN};font-size:20px;font-weight:900;flex-shrink:0}
.cb-info{}
.cb-name{color:${CYAN};font-size:13px;font-weight:900;line-height:1.2}
.cb-role{color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px}
.cb-detail{color:rgba(255,255,255,0.6);font-size:8px;line-height:1.6}
.cb-center{display:flex;flex-direction:row;align-items:center;gap:12px;flex-shrink:0;padding:0 16px}
.cb-center .neo-logo{max-height:28px;max-width:100px;object-fit:contain}
.cb-center .partner-logo{max-height:40px;max-width:140px;object-fit:contain}
.cb-center-sep{width:1px;background:rgba(91,203,245,0.2);height:36px;flex-shrink:0}
.cb-sep{width:1px;background:rgba(91,203,245,0.2);height:44px;flex-shrink:0;margin:0 2px}
.cb-person-right{display:flex;align-items:center;gap:10px;flex:1;justify-content:flex-end}
.cb-info-right{text-align:right}
.footer{background:#F8FAFC;border-top:1.5px solid ${CYAN};padding:4px 18px;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer-disc{font-size:4.5px;color:#9CA3AF;line-height:1.45;flex:1}
</style></head><body>
<div class="page">
  <div class="top-header">
    <div class="th-oh">Open House</div>
    <div class="th-logo">
      ${p.partner_logo ? `<img class="partner-img" src="${p.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" /><div class="th-logo-sep"></div>` : ''}
      <img class="neo-img" src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" />
    </div>
  </div>
  <div class="hero">
    ${hero ? `<img src="${hero}" alt="${p.address}" />` : ''}
  </div>
  <div class="addr-bar">
    <div class="addr-text">${location}</div>
    ${price ? `<div class="addr-price">${price}</div>` : ''}
  </div>
  <div class="photo-strip">
    ${strip.map((url,i) => `<div class="strip-photo">${url ? `<img src="${url}" alt="Photo ${i+2}" />` : `<div class="strip-empty">🏠</div>`}</div>`).join('')}
  </div>
  <div class="content">
    <div class="desc-col">
      ${desc ? `<p class="desc-text">${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}
      <div class="qr-bold">
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)}&size=200x200&margin=2&color=0A2540" alt="QR Code" />
        <div>
          <div class="qr-bold-label">Scan for Special<br>Financing Options</div>
          <div class="qr-bold-sub">Payment breakdowns, loan scenarios<br>&amp; connect with your mortgage advisor.</div>
        </div>
      </div>
    </div>
    ${features.length ? `<div class="features-col"><div class="feat-title">House Features:</div>${features.map(f=>`<div class="feat-item"><div class="feat-check"><svg viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#0A2540" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="feat-label">${f}</span></div>`).join('')}</div>` : ''}
  </div>
  <div class="contact-bar">
    ${p.advisor_name ? `<div class="cb-person">${p.advisor_photo ? `<img class="cb-photo" src="${p.advisor_photo}" alt="${p.advisor_name}" />` : `<div class="cb-init">${(p.advisor_name[0]??'?').toUpperCase()}</div>`}<div class="cb-info"><div class="cb-name">${p.advisor_name}</div><div class="cb-role">${p.advisor_title||'Mortgage Advisor'}</div><div class="cb-detail">${[advisorNmls, p.advisor_email, p.advisor_phone].filter(Boolean).join('<br>')}</div></div></div>` : ''}
    ${(p.advisor_name && p.partner_name) ? '<div class="cb-sep"></div>' : ''}
    <div class="cb-center">
      ${p.partner_logo ? `<img class="partner-logo" src="${p.partner_logo}" alt="Partner" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" /><div class="cb-center-sep"></div>` : ''}
      <img class="neo-logo" src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" />
    </div>
    ${(p.advisor_name && p.partner_name) ? '<div class="cb-sep"></div>' : ''}
    ${p.partner_name ? `<div class="cb-person-right"><div class="cb-info-right"><div class="cb-name">${p.partner_name}</div><div class="cb-role">${p.partner_title||'Listing Agent'}</div><div class="cb-detail">${[partnerNmls, p.partner_email, p.partner_phone].filter(Boolean).join('<br>')}</div></div>${p.partner_photo ? `<img class="cb-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="cb-init">${(p.partner_name[0]??'?').toUpperCase()}</div>`}</div>` : ''}
  </div>
  <div class="footer">
    <span class="footer-disc">${DISCLAIMER}</span>
    <img src="${EHL_LOGO}" alt="Equal Housing Lender" style="height:20px;width:auto;object-fit:contain;flex-shrink:0;margin-left:10px;" />
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// Shared Google Fonts link for social templates (blob URLs load external resources freely)
const SOCIAL_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,900;1,400&family=Dancing+Script:wght@600;700&family=Montserrat:wght@400;600;700;800&display=swap">`

// ─── SOCIAL: Instagram Square ─────────────────────────────────────────────────
// Split collage left / warm editorial right — editable message + when/where
function socialInstagram(p: PageData, edits: Record<string,string>) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const ph1 = photos[0] ?? ''; const ph2 = photos[1] ?? ''; const ph3 = photos[2] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state].filter(Boolean).join(', ')
  const headline = edits.headline || 'Open House'
  const message = edits.message || "I can't wait to give you a tour of this incredible home!"
  const when = edits.when || ''
  const where = edits.where || [p.address, p.city, p.state].filter(Boolean).join(', ')
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const BG = edits.bg_color || '#FAF0E8'
  const DARK = edits.text_color || '#2A2520'

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${SOCIAL_FONTS}<title>Instagram — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1080px 1080px;margin:0}
html,body{width:1080px;height:1080px;overflow:hidden;background:${BG};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1080px;height:1080px;display:flex}
.left{flex:0 0 480px;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:4px;background:#E8E0D8}
.ph{flex:1;overflow:hidden;background:#D8D0C8}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.ph-empty{width:100%;height:100%;background:linear-gradient(135deg,#D8D0C8,#BEB0A8)}
.logo-circle{position:absolute;left:50%;bottom:300px;transform:translateX(-50%);width:190px;height:190px;border-radius:50%;background:${BG};display:flex;align-items:center;justify-content:center;padding:28px;box-shadow:0 8px 32px rgba(0,0,0,0.18)}
.logo-circle img{max-width:130px;max-height:100px;object-fit:contain}
.logo-circle-fallback{font-size:48px;font-weight:900;color:#999;font-family:'Playfair Display',serif;font-style:italic}
.right{flex:1;background:${BG};display:flex;flex-direction:column;padding:52px 48px 36px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.r-top{flex:1}
.r-eyebrow{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin-bottom:10px}
.r-script{font-family:'Dancing Script',cursive;font-size:88px;font-weight:700;color:${DARK};line-height:0.9;margin-bottom:2px}
.r-serif{font-family:'Playfair Display',serif;font-size:76px;font-weight:900;color:${DARK};letter-spacing:-0.02em;line-height:1;margin-bottom:36px}
.agent-row{display:flex;align-items:flex-start;gap:20px;margin-bottom:28px}
.agent-photo{width:140px;height:140px;object-fit:cover;flex-shrink:0;border-radius:4px;background:#D8D0C8}
.agent-photo-empty{width:140px;height:140px;flex-shrink:0;border-radius:4px;background:#E8E0D8;display:flex;align-items:center;justify-content:center;font-size:40px;color:#BEB0A8}
.agent-text{}
.agent-hello{font-family:'Dancing Script',cursive;font-size:44px;font-weight:600;color:${DARK};line-height:1.1;margin-bottom:8px}
.agent-message{font-family:'Montserrat',sans-serif;font-size:16px;color:#5A504A;line-height:1.65;font-weight:500}
.when-where{border-top:1px solid rgba(0,0,0,0.1);padding-top:22px;display:flex;flex-direction:column;gap:10px}
.ww-row{display:flex;gap:16px;align-items:baseline}
.ww-label{font-family:'Playfair Display',serif;font-size:16px;font-weight:900;color:${DARK};letter-spacing:0.08em;text-transform:uppercase;flex-shrink:0;width:80px}
.ww-value{font-family:'Montserrat',sans-serif;font-size:15px;color:#5A504A;font-weight:500;line-height:1.5}
.qr-insta{display:flex;align-items:center;gap:20px;margin-top:14px;padding:16px 18px;background:rgba(0,0,0,0.05);border-radius:14px}
.qr-insta img{width:90px;height:90px;border-radius:8px;flex-shrink:0}
.qr-insta-label{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:${DARK};line-height:1.25;margin-bottom:6px}
.qr-insta-sub{font-family:'Montserrat',sans-serif;font-size:13px;color:#5A504A;line-height:1.55}
.r-bottom{margin-top:16px;display:flex;align-items:center;justify-content:flex-end;border-top:1px solid rgba(0,0,0,0.1);padding-top:14px}
.rb-neo img{max-height:22px;max-width:90px;object-fit:contain;opacity:0.4}
.rb-name{font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;color:#9A9290;text-align:right}
</style></head><body>
<div class="page">
  <div class="left">
    <div class="ph">${ph1 ? `<img src="${ph1}" alt="" />` : `<div class="ph-empty"></div>`}</div>
    <div class="ph">${ph2 ? `<img src="${ph2}" alt="" />` : (ph3 ? `<img src="${ph3}" alt="" />` : `<div class="ph-empty"></div>`)}</div>
    <div class="logo-circle">
      ${p.partner_logo ? `<img src="${p.partner_logo}" alt="${p.partner_name}" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" />` : `<div class="logo-circle-fallback">${(p.partner_name||'NEO')[0]}</div>`}
    </div>
  </div>
  <div class="right">
    <div class="r-top">
      <div class="r-eyebrow">You're Invited</div>
      <div class="r-script">Open</div>
      <div class="r-serif">HOUSE</div>
      <div class="agent-row">
        ${p.partner_photo ? `<img class="agent-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="agent-photo-empty">👤</div>`}
        <div class="agent-text">
          <div class="agent-hello">Hello!</div>
          <div class="agent-message">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        </div>
      </div>
      <div class="when-where">
        ${when ? `<div class="ww-row"><div class="ww-label">WHEN:</div><div class="ww-value">${when.replace(/&/g,'&amp;')}</div></div>` : ''}
        ${where ? `<div class="ww-row"><div class="ww-label">WHERE:</div><div class="ww-value">${where.replace(/&/g,'&amp;')}</div></div>` : ''}
        ${price ? `<div class="ww-row"><div class="ww-label">PRICE:</div><div class="ww-value" style="font-weight:800;color:${DARK};font-size:18px">${price}</div></div>` : ''}
        <div class="qr-insta">
          <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)}&size=240x240&margin=2&color=0A2540" alt="QR Code" />
          <div>
            <div class="qr-insta-label">Scan for Special<br>Financing Options</div>
            <div class="qr-insta-sub">Payment breakdowns, loan scenarios &amp; connect with your mortgage advisor.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="r-bottom">
      <div class="rb-name">${p.partner_name||''}<br>${p.partner_phone||''}</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── SOCIAL: Facebook / LinkedIn ──────────────────────────────────────────────
// Hero photo top, wave divider, editorial headline, 3 rounded photo strip
function socialFacebook(p: PageData, edits: Record<string,string>) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const location = [p.city, p.state].filter(Boolean).join(', ')
  const headline = edits.headline || 'Open House'
  const tagline = edits.tagline || (price ? `${price} · ${p.address}` : p.address)
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const ph2 = photos[1]??''; const ph3 = photos[2]??''; const ph4 = photos[3]??''

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${SOCIAL_FONTS}<title>Facebook — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1200px 630px landscape;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1200px;height:630px;display:flex;flex-direction:column;position:relative}
.hero-band{height:310px;position:relative;overflow:hidden;flex-shrink:0;background:#D8D0C8}
.hero-band img{width:100%;height:100%;object-fit:cover;display:block}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(255,255,255,0.15) 100%)}
.wave{position:absolute;bottom:-1px;left:0;right:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.content{flex:1;background:#fff;display:flex;align-items:stretch;padding:0 60px;gap:40px;min-height:0}
.content-left{display:flex;flex-direction:column;justify-content:center;flex:1;min-width:0;padding:18px 0}
.cl-script{font-family:'Dancing Script',cursive;font-size:52px;font-weight:700;color:#2A2520;line-height:1;margin-bottom:-4px}
.cl-serif{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;color:#2A2520;letter-spacing:-0.02em;line-height:1;margin-bottom:12px}
.cl-tagline{font-family:'Montserrat',sans-serif;font-size:15px;color:#6A6058;font-weight:500;line-height:1.5;margin-bottom:14px}
.cl-logos{display:flex;align-items:center;gap:14px}
.cl-logos img{max-height:28px;max-width:110px;object-fit:contain;opacity:0.6}
.content-right{display:flex;align-items:center;gap:8px;padding:16px 0;flex-shrink:0}
.strip-photo{width:184px;height:190px;border-radius:16px;overflow:hidden;background:#E8E0D8;flex-shrink:0}
.strip-photo img{width:100%;height:100%;object-fit:cover;display:block}
.strip-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;color:#BEB0A8}
.agent-strip{flex-shrink:0;display:flex;flex-direction:column;justify-content:center;gap:6px;padding-left:8px;border-left:2px solid #E8E0D8}
.as-name{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#2A2520}
.as-title{font-family:'Montserrat',sans-serif;font-size:11px;color:#9A9290;margin-bottom:4px}
.as-contact{font-family:'Montserrat',sans-serif;font-size:12px;color:#6A6058;line-height:1.6}
.as-neo img{max-height:18px;max-width:80px;object-fit:contain;margin-top:6px;opacity:0.4}
</style></head><body>
<div class="page">
  <div class="hero-band">
    ${hero ? `<img src="${hero}" alt="${p.address}" />` : ''}
    <div class="hero-overlay"></div>
    <div class="wave">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 60" preserveAspectRatio="none" style="width:1200px;height:60px;display:block">
        <path d="M0,60 C200,0 400,60 600,30 C800,0 1000,60 1200,20 L1200,60 Z" fill="#5BCBF5" opacity="0.5"/>
        <path d="M0,60 C300,20 500,55 700,35 C900,15 1100,55 1200,40 L1200,60 Z" fill="#fff"/>
      </svg>
    </div>
  </div>
  <div class="content">
    <div class="content-left">
      <div class="cl-script">${headline.split(' ')[0]||'Open'}</div>
      <div class="cl-serif">${(headline.split(' ').slice(1).join(' ')||'HOUSE').toUpperCase()}</div>
      <div class="cl-tagline">${tagline.replace(/&/g,'&amp;')}</div>
      <div class="cl-logos">
        ${p.partner_logo ? `<img src="${p.partner_logo}" alt="${p.partner_name}" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;opacity:1;" />` : ''}
        <img src="${NEO_BIG_LOGO}" alt="NEO Home Loans" />
      </div>
    </div>
    <div class="content-right">
      ${[ph2,ph3,ph4].map((url,i)=>`<div class="strip-photo">${url?`<img src="${url}" alt="Photo ${i+2}" />`:`<div class="strip-empty">🏡</div>`}</div>`).join('')}
      <div class="agent-strip">
        <div class="as-name">${p.partner_name||''}</div>
        <div class="as-title">${p.partner_title||'Listing Agent'}</div>
        <div class="as-contact">${[p.partner_phone,p.partner_email].filter(Boolean).join('<br>')}</div>
        <div class="as-neo"><img src="${NEO_WHITE_LOGO}" alt="NEO" style="filter:invert(1) brightness(0.5);" /></div>
      </div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── SOCIAL: Story / Reel Cover ───────────────────────────────────────────────
// Tall editorial: photo collage left, warm right panel with editable content
function socialStory(p: PageData, edits: Record<string,string>) {
  const NEO = C.navy
  const photos = p.photos ?? []
  const ph1 = photos[0]??''; const ph2 = photos[1]??''; const ph3 = photos[2]??''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const headline = edits.headline || 'Open House'
  const message = edits.message || "Join us for a private showing of this stunning home."
  const when = edits.when || ''
  const where = edits.where || [p.address, p.city, p.state].filter(Boolean).join(', ')
  const partnerNmls = p.partner_nmls ? `NMLS# ${p.partner_nmls}` : ''
  const stats = [p.beds?`${p.beds} BD`:'',p.baths?`${p.baths} BA`:'',p.sqft?`${p.sqft.toLocaleString()} SF`:''].filter(Boolean)
  const BG = edits.bg_color || '#FAF0E8'
  const DARK = edits.text_color || '#2A2520'
  const qrUrl = encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${SOCIAL_FONTS}<title>Story — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1080px 1920px portrait;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:${BG};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1080px;height:1920px;display:flex;flex-direction:column}
.top-bar{background:${BG};padding:44px 50px 36px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tb-logos{display:flex;align-items:center;gap:20px}
.tb-logos img{max-height:44px;max-width:160px;object-fit:contain}
.tb-script{font-family:'Dancing Script',cursive;font-size:56px;font-weight:700;color:${DARK};line-height:1}
.middle{flex:1;display:flex;min-height:0}
.photo-col{flex:0 0 500px;display:flex;flex-direction:column;gap:4px;overflow:hidden}
.ph{flex:1;overflow:hidden;background:#D8D0C8}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.ph-empty{width:100%;height:100%;background:linear-gradient(160deg,#D8D0C8,#C0B8B0)}
.info-col{flex:1;background:${BG};display:flex;flex-direction:column;justify-content:center;padding:50px 48px 40px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ic-serif{font-family:'Playfair Display',serif;font-size:78px;font-weight:900;color:${DARK};line-height:1;letter-spacing:-0.02em;margin-bottom:20px}
.ic-message{font-family:'Montserrat',sans-serif;font-size:20px;color:#5A504A;line-height:1.7;font-weight:500;margin-bottom:32px}
.ic-divider{width:50px;height:3px;background:${DARK};margin-bottom:32px;border-radius:2px}
.ww-section{display:flex;flex-direction:column;gap:16px;margin-bottom:36px}
.ww-row{display:flex;gap:14px;align-items:baseline}
.ww-label{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:${DARK};text-transform:uppercase;letter-spacing:0.08em;flex-shrink:0;width:90px}
.ww-value{font-family:'Montserrat',sans-serif;font-size:16px;color:#5A504A;font-weight:500;line-height:1.5}
.ic-stats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:36px}
.ic-stat{background:rgba(0,0,0,0.07);border-radius:99px;padding:6px 16px;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:${DARK}}
.ic-agent{display:flex;align-items:center;gap:14px;padding:20px;background:rgba(0,0,0,0.05);border-radius:12px;margin-bottom:28px}
.ic-agent-photo{width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#D8D0C8}
.ic-agent-init{width:72px;height:72px;border-radius:50%;background:#D8D0C8;display:flex;align-items:center;justify-content:center;font-size:26px;color:#9A9290;flex-shrink:0}
.ic-agent-info{}
.ic-agent-name{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:${DARK};margin-bottom:3px}
.ic-agent-detail{font-family:'Montserrat',sans-serif;font-size:14px;color:#7A706A;line-height:1.6}
.qr-strip{display:flex;align-items:center;gap:20px;background:rgba(0,0,0,0.06);border-radius:12px;padding:16px 20px}
.qr-strip img{width:72px;height:72px;border-radius:6px;flex-shrink:0}
.qr-strip-text{}
.qr-strip-label{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:900;color:${DARK};line-height:1.3}
.qr-strip-sub{font-family:'Montserrat',sans-serif;font-size:12px;color:#7A706A;line-height:1.5;margin-top:4px}
.bottom-bar{background:${DARK};padding:32px 50px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bb-text{font-family:'Montserrat',sans-serif;font-size:16px;color:rgba(255,255,255,0.5);font-weight:600}
.bb-neo img{max-height:28px;max-width:110px;object-fit:contain}
</style></head><body>
<div class="page">
  <div class="top-bar">
    <div class="tb-logos">
      ${p.partner_logo ? `<img src="${p.partner_logo}" alt="${p.partner_name}" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" />` : ''}
    </div>
    <div class="tb-script">Open House</div>
  </div>
  <div class="middle">
    <div class="photo-col">
      <div class="ph">${ph1?`<img src="${ph1}" alt="" />`:`<div class="ph-empty"></div>`}</div>
      <div class="ph">${ph2?`<img src="${ph2}" alt="" />`:`<div class="ph-empty"></div>`}</div>
      <div class="ph">${ph3?`<img src="${ph3}" alt="" />`:`<div class="ph-empty"></div>`}</div>
    </div>
    <div class="info-col">
      <div class="ic-serif">${headline.toUpperCase()}</div>
      <div class="ic-message">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div class="ic-divider"></div>
      <div class="ww-section">
        ${when ? `<div class="ww-row"><div class="ww-label">WHEN</div><div class="ww-value">${when.replace(/&/g,'&amp;')}</div></div>` : ''}
        ${where ? `<div class="ww-row"><div class="ww-label">WHERE</div><div class="ww-value">${where.replace(/&/g,'&amp;')}</div></div>` : ''}
        ${price ? `<div class="ww-row"><div class="ww-label">PRICE</div><div class="ww-value" style="font-weight:800;font-size:20px;color:#2A2520">${price}</div></div>` : ''}
      </div>
      ${stats.length ? `<div class="ic-stats">${stats.map(s=>`<div class="ic-stat">${s}</div>`).join('')}</div>` : ''}
      <div class="ic-agent">
        ${p.partner_photo ? `<img class="ic-agent-photo" src="${p.partner_photo}" alt="${p.partner_name}" />` : `<div class="ic-agent-init">👤</div>`}
        <div class="ic-agent-info">
          <div class="ic-agent-name">${p.partner_name||'Your Agent'}</div>
          <div class="ic-agent-detail">${p.partner_title||'Listing Agent'}<br>${[p.partner_phone,p.partner_email].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div class="qr-strip">
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${qrUrl}&size=200x200&margin=2&color=0A2540" alt="QR Code" />
        <div class="qr-strip-text">
          <div class="qr-strip-label">Scan for Special<br>Financing Options</div>
          <div class="qr-strip-sub">Payment breakdowns &amp; loan scenarios<br>for this property.</div>
        </div>
      </div>
    </div>
  </div>
  <div class="bottom-bar">
    <div class="bb-text">Backed by NEO Home Loans</div>
    <div class="bb-neo"><img src="${NEO_WHITE_LOGO}" alt="NEO Home Loans" /></div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── SOCIAL: Square Bold Dark ─────────────────────────────────────────────────
// Full-bleed photo, dark gradient, large price/address hero, agent strip bottom
function socialSquareBold(p: PageData, edits: Record<string,string>) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const headline = edits.headline || 'Open House'
  const when = edits.when || ''
  const where = edits.where || [p.address, p.city, p.state].filter(Boolean).join(', ')
  const BADGE = edits.accent_color || CYAN
  const stats = [p.beds?`${p.beds} BD`:'',p.baths?`${p.baths} BA`:'',p.sqft?`${p.sqft.toLocaleString()} SF`:''].filter(Boolean)

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${SOCIAL_FONTS}<title>Square Bold — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1080px 1080px;margin:0}
html,body{width:1080px;height:1080px;overflow:hidden;background:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1080px;height:1080px;position:relative}
.bg{position:absolute;inset:0}
.bg img{width:100%;height:100%;object-fit:cover;display:block}
.bg-fallback{width:100%;height:100%;background:linear-gradient(135deg,${NEO},#0d3060)}
.overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.05) 30%,rgba(0,0,0,0.75) 65%,rgba(0,0,0,0.97) 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.top{position:absolute;top:0;left:0;right:0;padding:50px 54px;display:flex;align-items:center;justify-content:space-between}
.top-badge{background:${BADGE};color:#000;font-family:'Montserrat',sans-serif;font-size:17px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;padding:11px 28px;border-radius:99px}
.top-logo{background:rgba(255,255,255,0.9);padding:10px 18px;border-radius:10px;display:flex;align-items:center;gap:14px}
.top-logo .partner-img{max-height:42px;max-width:160px;object-fit:contain}
.top-logo .sep{width:1px;height:32px;background:#D1D5DB}
.top-logo .neo-img{max-height:24px;max-width:90px;object-fit:contain;opacity:0.6}
.bottom{position:absolute;bottom:0;left:0;right:0;padding:0 54px 54px}
.b-headline{font-family:'Playfair Display',serif;font-size:38px;font-style:italic;color:rgba(255,255,255,0.55);letter-spacing:0.04em;margin-bottom:6px}
.b-price{font-family:'Montserrat',sans-serif;font-size:88px;font-weight:900;color:#fff;letter-spacing:-0.04em;line-height:1;margin-bottom:12px}
.b-addr{font-family:'Montserrat',sans-serif;font-size:28px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:6px}
.b-city{font-family:'Montserrat',sans-serif;font-size:20px;color:rgba(255,255,255,0.5);margin-bottom:28px}
.b-stats{display:flex;gap:0;margin-bottom:40px}
.b-stat{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;color:rgba(255,255,255,0.8);padding-right:22px;margin-right:22px;border-right:1px solid rgba(91,203,245,0.4)}
.b-stat:last-child{border:none}
.b-row{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid rgba(255,255,255,0.12);padding-top:28px}
.b-when{font-family:'Montserrat',sans-serif;font-size:17px;color:rgba(255,255,255,0.6);font-weight:600;line-height:1.5}
.b-agent{text-align:right}
.b-agent-name{font-family:'Montserrat',sans-serif;font-size:22px;font-weight:800;color:#fff}
.b-agent-detail{font-family:'Montserrat',sans-serif;font-size:15px;color:rgba(255,255,255,0.5);margin-top:3px}
</style></head><body>
<div class="page">
  <div class="bg">${hero?`<img src="${hero}" alt="" />`:`<div class="bg-fallback"></div>`}</div>
  <div class="overlay"></div>
  <div class="top">
    <div class="top-badge">${headline}</div>
    <div class="top-logo">
      ${p.partner_logo?`<img class="partner-img" src="${p.partner_logo}" alt="" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" /><div class="sep"></div>`:''}
      <img class="neo-img" src="${NEO_BIG_LOGO}" alt="NEO Home Loans" />
    </div>
  </div>
  <div class="bottom">
    <div class="b-headline">For Sale</div>
    ${price?`<div class="b-price">${price}</div>`:''}
    <div class="b-addr">${p.address}</div>
    ${p.city||p.state?`<div class="b-city">${[p.city,p.state].filter(Boolean).join(', ')}</div>`:''}
    ${stats.length?`<div class="b-stats">${stats.map(s=>`<div class="b-stat">${s}</div>`).join('')}</div>`:''}
    <div class="b-row">
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="b-when">${when?`📅 ${when}`:where}</div>
        <div style="display:flex;align-items:center;gap:18px;background:rgba(255,255,255,0.08);border-radius:14px;padding:16px 20px">
          <div style="background:#fff;border-radius:8px;padding:5px;flex-shrink:0"><img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)}&size=240x240&margin=2&color=0A2540" alt="QR" style="width:80px;height:80px;display:block;border-radius:3px" /></div>
          <div>
            <div style="font-family:'Montserrat',sans-serif;font-size:20px;font-weight:900;color:#fff;line-height:1.25;margin-bottom:6px">Scan for Special<br>Financing Options</div>
            <div style="font-family:'Montserrat',sans-serif;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.5">Payment breakdowns &amp; loan scenarios<br>for this property.</div>
          </div>
        </div>
      </div>
      <div class="b-agent">
        <div class="b-agent-name">${p.partner_name||''}</div>
        <div class="b-agent-detail">${p.partner_phone||''}</div>
      </div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── SOCIAL: Square Minimal ───────────────────────────────────────────────────
// Clean white card: photo top 55%, white bottom with editorial headline + agent
function socialSquareMinimal(p: PageData, edits: Record<string,string>) {
  const NEO = C.navy; const CYAN = C.accent
  const photos = p.photos ?? []
  const hero = photos[0] ?? ''; const ph2 = photos[1] ?? ''
  const price = Number(p.list_price) > 0 ? fmtPrice(p.list_price) : ''
  const headline = edits.headline || 'Open House'
  const message = edits.message || "This stunning home is ready for you. Come see it in person."
  const when = edits.when || ''
  const ACCENT = edits.accent_color || NEO
  const stats = [p.beds?`${p.beds} Bed`:'',p.baths?`${p.baths} Bath`:'',p.sqft?`${p.sqft.toLocaleString()} ft²`:''].filter(Boolean)

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${SOCIAL_FONTS}<title>Square Minimal — ${p.address}</title><style>
*{box-sizing:border-box;margin:0;padding:0}@page{size:1080px 1080px;margin:0}
html,body{width:1080px;height:1080px;overflow:hidden;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1080px;height:1080px;display:flex;flex-direction:column}
.photos{height:520px;display:flex;gap:4px;flex-shrink:0}
.ph-main{flex:0 0 680px;overflow:hidden;background:#E4E8EC}
.ph-main img{width:100%;height:100%;object-fit:cover;display:block}
.ph-side{flex:1;overflow:hidden;background:#D0D5DD}
.ph-side img{width:100%;height:100%;object-fit:cover;display:block}
.ph-empty{width:100%;height:100%;background:#E4E8EC}
.content{flex:1;background:#fff;display:flex;flex-direction:column;padding:0}
.top-stripe{background:${ACCENT};height:5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.inner{flex:1;padding:38px 50px 32px;display:flex;flex-direction:column}
.headline-row{display:flex;align-items:baseline;gap:16px;margin-bottom:18px}
.h-script{font-family:'Dancing Script',cursive;font-size:64px;font-weight:700;color:${CYAN};line-height:1}
.h-serif{font-family:'Playfair Display',serif;font-size:64px;font-weight:900;color:${ACCENT};line-height:1;letter-spacing:-0.02em}
.price-row{display:flex;align-items:center;gap:28px;margin-bottom:14px}
.price{font-family:'Montserrat',sans-serif;font-size:46px;font-weight:900;color:${NEO};letter-spacing:-0.02em}
.stats{display:flex;gap:0}
.stat{font-family:'Montserrat',sans-serif;font-size:18px;font-weight:700;color:#6B7280;padding-right:16px;margin-right:16px;border-right:1px solid #E4E8EC}
.stat:last-child{border:none}
.message{font-family:'Montserrat',sans-serif;font-size:19px;color:#4B5563;line-height:1.65;font-weight:500;flex:1}
.bottom-row{display:flex;align-items:center;justify-content:space-between;margin-top:24px;padding-top:20px;border-top:1px solid #E4E8EC}
.agent-info{display:flex;align-items:center;gap:16px}
.agent-photo{width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#E4E8EC}
.agent-init{width:60px;height:60px;border-radius:50%;background:${NEO};display:flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;font-size:22px;font-weight:900;color:${CYAN};flex-shrink:0}
.agent-name{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:800;color:${NEO}}
.agent-detail{font-family:'Montserrat',sans-serif;font-size:14px;color:#9CA3AF;margin-top:2px}
.logos{display:flex;align-items:center;gap:14px}
.logos img{object-fit:contain}
.logos .partner-img{max-height:40px;max-width:150px}
.logos .logo-sep{width:1px;height:30px;background:#E4E8EC}
.logos .neo-img{max-height:22px;max-width:86px;opacity:0.4}
.when-tag{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:${CYAN};background:rgba(91,203,245,0.1);padding:8px 18px;border-radius:99px;margin-bottom:14px;display:inline-block}
</style></head><body>
<div class="page">
  <div class="photos">
    <div class="ph-main">${hero?`<img src="${hero}" alt="" />`:`<div class="ph-empty"></div>`}</div>
    <div class="ph-side">${ph2?`<img src="${ph2}" alt="" />`:`<div class="ph-empty"></div>`}</div>
  </div>
  <div class="top-stripe"></div>
  <div class="content">
    <div class="inner">
      <div class="headline-row"><span class="h-script">Open</span><span class="h-serif">HOUSE</span></div>
      ${when?`<div class="when-tag">📅 ${when}</div>`:''}
      ${price?`<div class="price-row"><div class="price">${price}</div>${stats.length?`<div class="stats">${stats.map(s=>`<div class="stat">${s}</div>`).join('')}</div>`:''}</div>`:''}
      <div class="message">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div class="bottom-row">
        <div class="agent-info">
          ${p.partner_photo?`<img class="agent-photo" src="${p.partner_photo}" alt="" />`:`<div class="agent-init">${(p.partner_name||'A')[0].toUpperCase()}</div>`}
          <div><div class="agent-name">${p.partner_name||'Your Agent'}</div><div class="agent-detail">${p.partner_phone||p.partner_email||''}</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)}&size=160x160&margin=2&color=0A2540" alt="QR" style="width:50px;height:50px;border-radius:4px" />
          <div style="font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;color:${ACCENT};line-height:1.35">Scan for<br>Financing Options</div>
        </div>
        <div class="logos">
          ${p.partner_logo?`<img class="partner-img" src="${p.partner_logo}" alt="" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;" /><div class="logo-sep"></div>`:''}
          <img class="neo-img" src="${NEO_BIG_LOGO}" alt="NEO" />
        </div>
      </div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ─── Standalone QR Sheet ─────────────────────────────────────────────────────
function qrSheet(p: PageData) {
  const NEO = '#0A2540', CYAN = '#5BCBF5'
  const qrUrl = encodeURIComponent(`https://neofinfree.com/open-house/${p.slug}`)
  const price = p.list_price ? '$' + Math.round(p.list_price).toLocaleString() : ''
  const location = [p.city, p.state].filter(Boolean).join(', ')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Code — ${p.address}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{width:8.5in;height:11in;font-family:'Montserrat',sans-serif;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.card{width:5in;border:2px solid #E4E8EC;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(10,37,64,0.08)}
.top-bar{background:${NEO};padding:20px 28px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.top-bar-label{font-size:10px;font-weight:800;color:${CYAN};text-transform:uppercase;letter-spacing:0.16em;margin-bottom:4px}
.top-bar-addr{font-size:15px;font-weight:800;color:#fff;line-height:1.2}
.top-bar-city{font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px}
.body{padding:36px 28px 32px;display:flex;flex-direction:column;align-items:center;gap:0}
.eyebrow{font-size:9px;font-weight:800;color:${CYAN};text-transform:uppercase;letter-spacing:0.18em;margin-bottom:14px}
.qr-img{width:240px;height:240px;display:block;border-radius:10px;box-shadow:0 4px 18px rgba(10,37,64,0.15)}
.subline{margin-top:16px;font-size:12px;color:#64748B;text-align:center;line-height:1.65;max-width:3.2in}
.price-row{margin-top:20px;padding-top:18px;border-top:1px solid #E4E8EC;align-self:stretch}
.price-val{font-size:26px;font-weight:900;color:${NEO};letter-spacing:-0.01em}
.price-label{font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px}
</style></head><body>
<div class="card">
  <div class="top-bar">
    <div class="top-bar-label">Open House</div>
    <div class="top-bar-addr">${p.address}</div>
    ${location ? `<div class="top-bar-city">${location}</div>` : ''}
  </div>
  <div class="body">
    <div class="eyebrow">Scan for Special Financing</div>
    <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?data=${qrUrl}&size=480x480&margin=3&color=0A2540" alt="QR Code" />
    <div class="subline">See payment breakdowns, loan scenarios, and exclusive financing options for this home.</div>
    ${price ? `<div class="price-row"><div class="price-label">List Price</div><div class="price-val">${price}</div></div>` : ''}
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
  { key: 'qrsheet', label: 'QR Code Sheet', sub: 'Standalone printable QR card — cut out and place at the open house', icon: '⬛', color: '#0e7490', gen: qrSheet },
  { key: 'bold', label: 'Bold Dark', sub: 'All-dark design with framed hero photo and cyan accents', icon: '🌙', color: '#080F1A', gen: flyerBold },
]

const SOCIALS = [
  { key: 'instagram', label: 'Editorial Split', sub: '1080 × 1080 · Warm photos left, message right', icon: '◻', size: '1080 × 1080', srcW: 1080, srcH: 1080, gen: socialInstagram,
    fields: [
      { key: 'message', label: 'Personal message', placeholder: "I can't wait to give you a tour of this incredible home!", multiline: true },
      { key: 'when', label: 'Date & time', placeholder: 'Saturday, Aug 17 · 12pm – 3pm' },
      { key: 'where', label: 'Location (auto-filled)', placeholder: '' },
      { key: 'bg_color', label: 'Background color', type: 'color', default: '#FAF0E8' },
      { key: 'text_color', label: 'Text & headline color', type: 'color', default: '#2A2520' },
    ]
  },
  { key: 'bold', label: 'Bold Dark', sub: '1080 × 1080 · Full-bleed photo, dramatic price overlay', icon: '◼', size: '1080 × 1080', srcW: 1080, srcH: 1080, gen: socialSquareBold,
    fields: [
      { key: 'headline', label: 'Badge text', placeholder: 'Open House' },
      { key: 'when', label: 'Date & time', placeholder: 'Saturday, Aug 17 · 12pm – 3pm' },
      { key: 'accent_color', label: 'Badge color', type: 'color', default: '#5BCBF5' },
    ]
  },
  { key: 'minimal', label: 'Clean Minimal', sub: '1080 × 1080 · White card, photo top, editorial bottom', icon: '▭', size: '1080 × 1080', srcW: 1080, srcH: 1080, gen: socialSquareMinimal,
    fields: [
      { key: 'message', label: 'Personal message', placeholder: 'This stunning home is ready for you. Come see it in person.', multiline: true },
      { key: 'when', label: 'Date & time', placeholder: 'Saturday, Aug 17 · 12pm – 3pm' },
      { key: 'accent_color', label: 'Accent color', type: 'color', default: '#0A2540' },
    ]
  },
  { key: 'story', label: 'Story / Reel', sub: '1080 × 1920 · Instagram & Facebook Stories, TikTok', icon: '▯', size: '1080 × 1920', srcW: 1080, srcH: 1920, gen: socialStory,
    fields: [
      { key: 'headline', label: 'Headline', placeholder: 'Open House' },
      { key: 'message', label: 'Tagline message', placeholder: 'Join us for a private showing of this stunning home.' },
      { key: 'when', label: 'Date & time', placeholder: 'Saturday, Aug 17 · 12pm – 3pm' },
      { key: 'where', label: 'Location (auto-filled)', placeholder: '' },
      { key: 'bg_color', label: 'Background color', type: 'color', default: '#FAF0E8' },
      { key: 'text_color', label: 'Text & headline color', type: 'color', default: '#2A2520' },
    ]
  },
]

// Wraps social HTML in a download-as-PNG page using html2canvas from CDN (blob tabs have no CSP)
function openSocialBlob(html: string, filename: string) {
  const wrapper = `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#1a1a1a;display:flex;flex-direction:column;align-items:center;padding:32px 24px;gap:20px;font-family:system-ui,sans-serif}
.dl-btn{background:#5BCBF5;color:#0A2540;font-size:15px;font-weight:800;padding:12px 32px;border-radius:8px;border:none;cursor:pointer;letter-spacing:0.04em}
.dl-btn:hover{background:#7ad8f7}.hint{color:rgba(255,255,255,0.4);font-size:12px;margin-top:-8px}
#wrap{display:inline-block;}</style></head><body>
<button class="dl-btn" onclick="dl()">⬇ Download PNG</button>
<div class="hint">Or right-click the image below → Save Image As</div>
<div id="wrap">${html.replace(/<script>window\.onload=function\(\)\{window\.print\(\)\}<\/script>/g,'')}</div>
<script>
function dl(){
  html2canvas(document.getElementById('wrap'),{scale:1,useCORS:true,allowTaint:true,logging:false}).then(c=>{
    const a=document.createElement('a');a.download='${filename}.png';a.href=c.toDataURL('image/png');a.click()
  })
}
<\/script></body></html>`
  const blob = new Blob([wrapper], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 120000)
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AgentPageClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [socialEditing, setSocialEditing] = useState<string | null>(null)
  const [socialEdits, setSocialEdits] = useState<Record<string, Record<string,string>>>({})

  useEffect(() => { setMounted(true) }, [])
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

  if (!mounted || loading) return (
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
                previewHtml={f.gen(page).replace('<script>window.onload=function(){window.print()}</script>', '')}
              />
            ))}
          </div>
        </Section>

        {/* Social section */}
        <Section title="Social Media Templates" sub="Edit copy and preview live, then download as a PNG image ready to post." icon="📲">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {SOCIALS.map(s => {
              const edits = socialEdits[s.key] ?? {}
              const defaultWhere = [page.address, page.city, page.state].filter(Boolean).join(', ')
              const defaultTagline = Number(page.list_price) > 0 ? `${fmtPrice(page.list_price)} · ${page.address}` : page.address
              const finalEdits: Record<string,string> = { where: defaultWhere, tagline: defaultTagline, ...edits }
              const previewHtml = s.gen(page, finalEdits).replace('<script>window.onload=function(){window.print()}</script>', '')
              const previewW = 320
              const previewH = Math.round(previewW * s.srcH / s.srcW)
              const scale = previewW / s.srcW
              return (
                <div key={s.key} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '16px 22px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{s.label}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{s.sub}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: C.bg, padding: '3px 10px', borderRadius: 6 }}>{s.size}</span>
                  </div>
                  {/* Editor + Preview side by side */}
                  <div style={{ display: 'flex', gap: 0, minHeight: 0 }}>
                    {/* Left: fields */}
                    <div style={{ flex: '0 0 320px', padding: '18px 20px', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Edit Copy & Style</div>
                      {s.fields.map((f: { key: string; label: string; placeholder?: string; multiline?: boolean; type?: string; default?: string }) => {
                        const val = edits[f.key] ?? ''
                        const placeholder = f.key === 'where' ? defaultWhere : f.key === 'tagline' ? defaultTagline : (f.placeholder ?? '')
                        return (
                          <div key={f.key} style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{f.label}</label>
                            {f.type === 'color' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input type="color" value={val || f.default || '#000000'}
                                  onChange={e => setSocialEdits(prev => ({ ...prev, [s.key]: { ...(prev[s.key]??{}), [f.key]: e.target.value } }))}
                                  style={{ width: 44, height: 36, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', padding: 2, background: 'none' }} />
                                <span style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{val || f.default}</span>
                                {val && val !== f.default && (
                                  <button onClick={() => setSocialEdits(prev => { const n = { ...(prev[s.key]??{}) }; delete n[f.key]; return { ...prev, [s.key]: n } })}
                                    style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Reset</button>
                                )}
                              </div>
                            ) : f.multiline ? (
                              <textarea value={val} placeholder={placeholder} rows={3}
                                onChange={e => setSocialEdits(prev => ({ ...prev, [s.key]: { ...(prev[s.key]??{}), [f.key]: e.target.value } }))}
                                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.dim, outline: 'none', boxSizing: 'border-box' }} />
                            ) : (
                              <input type="text" value={val} placeholder={placeholder}
                                onChange={e => setSocialEdits(prev => ({ ...prev, [s.key]: { ...(prev[s.key]??{}), [f.key]: e.target.value } }))}
                                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', color: C.dim, outline: 'none', boxSizing: 'border-box' }} />
                            )}
                          </div>
                        )
                      })}
                      <button
                        onClick={() => {
                          const address = [page.address, page.city].filter(Boolean).join('-').replace(/[^a-zA-Z0-9-]/g,'').toLowerCase()
                          openSocialBlob(s.gen(page, finalEdits), `${s.key}-${address}`)
                        }}
                        style={{ marginTop: 'auto', width: '100%', padding: '11px 0', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                        ⬇ Download PNG
                      </button>
                    </div>
                    {/* Right: live preview */}
                    <div style={{ flex: 1, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: previewH + 48 }}>
                      <div style={{ position: 'relative', width: previewW, height: previewH, borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                        <iframe
                          srcDoc={previewHtml}
                          style={{ width: s.srcW, height: s.srcH, transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none', display: 'block', pointerEvents: 'none' }}
                          title={`${s.label} preview`}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
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

function TemplateCard({ icon, label, sub, accentColor, onOpen, badge, previewHtml }: {
  icon: string; label: string; sub: string; accentColor: string; onOpen: () => void; badge: string; previewHtml?: string
}) {
  const [hover, setHover] = useState(false)
  // Letter page: 816×1056px at 96dpi. Scale to fit 210px wide card preview.
  const FLYER_W = 816
  const PREVIEW_W = 210
  const PREVIEW_H = 190
  const scale = PREVIEW_W / FLYER_W
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
      <div style={{ height: PREVIEW_H, position: 'relative', overflow: 'hidden', background: accentColor }}>
        {previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            title={`${label} preview`}
            style={{
              width: FLYER_W, height: Math.round(PREVIEW_H / scale),
              border: 'none', pointerEvents: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              display: 'block',
            }}
            sandbox="allow-same-origin"
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 40, opacity: 0.9 }}>{icon}</span>
          </div>
        )}
        {hover && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
          }}>
            <div style={{ background: C.accent, color: C.navy, fontWeight: 800, fontSize: 13, padding: '8px 20px', borderRadius: 8 }}>
              Open &amp; Print
            </div>
          </div>
        )}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
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
