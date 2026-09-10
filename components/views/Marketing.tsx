'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/appContext'
import { Employee } from '@/lib/types'
import QRCode from 'qrcode'

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_SIZES: Record<string, { label: string; w: number; h: number; category: Category }> = {
  pre_approval:     { label: 'Pre-Approval Letter (8.5×11)', w: 1275, h: 1650, category: 'pre_approval' },
  flyer_letter:     { label: '8.5" × 11" Flyer',            w: 1275, h: 1650, category: 'flyer'  },
  social_square:    { label: 'Social Square (1080×1080)',   w: 1080, h: 1080, category: 'social' },
  social_story:     { label: 'Story / Reel (1080×1920)',    w: 1080, h: 1920, category: 'social' },
  social_landscape: { label: 'Social Landscape (1200×628)', w: 1200, h: 628,  category: 'social' },
  social_linkedin:  { label: 'LinkedIn Post (1200×627)',    w: 1200, h: 627,  category: 'social' },
  custom:           { label: 'Custom',                      w: 1080, h: 1080, category: 'other'  },
}

type Category = 'pre_approval' | 'flyer' | 'social' | 'other'

const CATEGORY_LABELS: Record<Category, string> = {
  pre_approval: '📋 Pre-Approval',
  flyer:        '📄 Flyers',
  social:       '📱 Social Posts',
  other:        '📁 Other',
}

type FieldType =
  | 'name' | 'title' | 'nmls' | 'email' | 'phone' | 'headshot'
  | 'partner_name' | 'partner_title' | 'partner_company' | 'partner_phone' | 'partner_email' | 'partner_headshot' | 'partner_logo'
  | 'property_address' | 'property_price' | 'property_beds' | 'property_baths' | 'property_sqft' | 'property_extras' | 'property_header' | 'property_description'
  | 'property_image' | 'property_image_2' | 'property_image_3' | 'property_image_4'
  | 'open_house_date' | 'open_house_time'
  | 'pa_regarding' | 'pa_date' | 'pa_loan_type' | 'pa_purchase_price' | 'pa_down_payment' | 'pa_loan_amount' | 'pa_occupancy' | 'pa_address'
  | 'testimonial_review' | 'testimonial_name'
  | 'tca_image'
  | 'rate' | 'apr' | 'promo_payment' | 'promo_date'

interface FieldMeta { label: string; color: string; placeholder: string; isCircle?: boolean; isRect?: boolean; isMultiline?: boolean }

const FIELD_META: Record<FieldType, FieldMeta> = {
  name:                 { label: 'My Name',           color: '#3B82F6', placeholder: 'Jane Smith' },
  title:                { label: 'My Title',          color: '#8B5CF6', placeholder: 'Mortgage Advisor' },
  nmls:                 { label: 'My NMLS #',         color: '#F59E0B', placeholder: 'NMLS# 123456' },
  email:                { label: 'My Email',          color: '#10B981', placeholder: 'jane@neohomeloans.com' },
  phone:                { label: 'My Phone',          color: '#EF4444', placeholder: '(801) 555-0100' },
  headshot:             { label: 'My Headshot',       color: '#EC4899', placeholder: '', isCircle: true },
  partner_name:         { label: 'Partner Name',      color: '#0EA5E9', placeholder: 'John Doe' },
  partner_title:        { label: 'Partner Title',     color: '#7C3AED', placeholder: 'REALTOR®' },
  partner_company:      { label: 'Partner Company',   color: '#0D9488', placeholder: 'ABC Realty' },
  partner_phone:        { label: 'Partner Phone',     color: '#DC2626', placeholder: '(801) 555-0200' },
  partner_email:        { label: 'Partner Email',     color: '#059669', placeholder: 'john@abc.com' },
  partner_headshot:     { label: 'Partner Headshot',  color: '#DB2777', placeholder: '', isCircle: true },
  partner_logo:         { label: 'Partner Logo',      color: '#D97706', placeholder: '', isRect: true },
  property_address:     { label: 'Address',           color: '#6366F1', placeholder: '123 Main St, Salt Lake City, UT 84101' },
  property_price:       { label: 'List Price',        color: '#16A34A', placeholder: '$450,000' },
  property_beds:        { label: 'Bedrooms',          color: '#7C3AED', placeholder: '4 Beds' },
  property_baths:       { label: 'Bathrooms',         color: '#0891B2', placeholder: '3 Baths' },
  property_sqft:        { label: 'Sq Ft',             color: '#0D9488', placeholder: '2,100 Sq Ft' },
  property_extras:      { label: 'Extras',            color: '#B45309', placeholder: '3-Car Garage · Pool' },
  property_header:      { label: 'Headline',          color: '#DC2626', placeholder: 'Stunning Home in Prime Location!', isMultiline: true },
  property_description: { label: 'Description',       color: '#9333EA', placeholder: 'Welcome to this beautifully updated home featuring an open floor plan, gourmet kitchen, and spacious backyard perfect for entertaining.', isMultiline: true },
  property_image:       { label: 'Photo 1',           color: '#EA580C', placeholder: '', isRect: true },
  property_image_2:     { label: 'Photo 2',           color: '#C2410C', placeholder: '', isRect: true },
  property_image_3:     { label: 'Photo 3',           color: '#9A3412', placeholder: '', isRect: true },
  property_image_4:     { label: 'Photo 4',           color: '#7C2D12', placeholder: '', isRect: true },
  open_house_date:      { label: 'Open House Date',   color: '#0369A1', placeholder: 'Saturday, January 18' },
  open_house_time:      { label: 'Open House Time',   color: '#0284C7', placeholder: '1:00 PM – 4:00 PM' },
  pa_regarding:         { label: 'Regarding',         color: '#1D4ED8', placeholder: 'John & Jane Smith' },
  pa_date:              { label: 'Date',               color: '#0F766E', placeholder: 'January 18, 2026' },
  pa_address:           { label: 'Property Address',  color: '#6366F1', placeholder: '123 Main St, Austin, TX 78701' },
  pa_loan_type:         { label: 'Loan Type/Product', color: '#7C3AED', placeholder: 'Conventional 30-Year Fixed' },
  pa_purchase_price:    { label: 'Purchase Price',    color: '#15803D', placeholder: '$550,000' },
  pa_down_payment:      { label: 'Down Payment',      color: '#0891B2', placeholder: '$110,000' },
  pa_loan_amount:       { label: 'Loan Amount',       color: '#B45309', placeholder: '$440,000' },
  pa_occupancy:         { label: 'Occupancy Type',    color: '#BE185D', placeholder: 'Primary Residence' },
  testimonial_review:   { label: 'Review',            color: '#D97706', placeholder: '"Working with this team was an incredible experience. They made the entire process seamless and stress-free from start to finish."', isMultiline: true },
  testimonial_name:     { label: 'Client Name',       color: '#92400E', placeholder: '— John & Jane Smith, Austin TX' },
  tca_image:            { label: 'TCA Image',         color: '#0F766E', placeholder: '', isRect: true },
  rate:                 { label: 'Interest Rate',     color: '#059669', placeholder: '6.750%' },
  apr:                  { label: 'APR',               color: '#047857', placeholder: '7.124%' },
  promo_payment:        { label: 'Monthly Payment Amount', color: '#065F46', placeholder: '$2,345' },
  promo_date:           { label: 'Promotion Date',    color: '#6B7280', placeholder: 'August 2026' },
}

const FIELD_GROUPS: Record<string, FieldType[]> = {
  'Advisor':  ['name', 'title', 'nmls', 'email', 'phone', 'headshot'],
  'Partner':  ['partner_name', 'partner_title', 'partner_company', 'partner_phone', 'partner_email', 'partner_headshot', 'partner_logo'],
  'Property': ['property_address', 'property_price', 'property_beds', 'property_baths', 'property_sqft', 'property_extras', 'property_header', 'property_description', 'property_image', 'property_image_2', 'property_image_3', 'property_image_4', 'open_house_date', 'open_house_time'],
  'Pre-Approval': ['pa_regarding', 'pa_date', 'pa_address', 'pa_loan_type', 'pa_purchase_price', 'pa_down_payment', 'pa_loan_amount', 'pa_occupancy'],
  'Testimonial': ['testimonial_review', 'testimonial_name'],
  'TCA': ['tca_image'],
  'Rate Promo': ['property_image', 'rate', 'apr', 'promo_payment', 'promo_date'],
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TplField {
  id: string
  type: FieldType
  x: number
  y: number
  fontSize: number   // fraction of canvas height — text size; also legacy image size
  rectW: number      // fraction of canvas width  — rect/circle fields only
  rectH: number      // fraction of canvas height — rect/circle fields only
  panX: number       // 0–1 horizontal pan within box, 0.5 = centered
  panY: number       // 0–1 vertical pan within box, 0.5 = centered
  fontColor: string
  bold: boolean
  textAlign?: 'left' | 'center' | 'right'
}

interface TplPage { bg_url: string; fields: TplField[]; blur_bg?: boolean; overlay_opacity?: number }

interface MktTemplate {
  id: string
  name: string
  category: Category
  canvas_size: string
  pages: TplPage[]
  thumbnail_url: string | null
  created_at: string
}

interface Partner {
  id: string
  owner_email: string
  name: string
  title: string
  company: string
  phone: string
  email: string
  headshot_url: string
  logo_url: string
  created_at: string
}

type FieldValues = Record<FieldType, string>

// ─── Canvas renderer ──────────────────────────────────────────────────────────

const bgCache = new Map<string, string>()

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      img.src = url
    } else {
      const cached = bgCache.get(url)
      if (cached) { img.src = cached; return }
      fetch(url).then(r => r.blob()).then(b => {
        const obj = URL.createObjectURL(b)
        bgCache.set(url, obj)
        img.src = obj
      }).catch(rej)
    }
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, align: 'left'|'center'|'right' = 'left') {
  const words = text.split(' ')
  let line = '', cy = y
  const drawLine = (l: string) => {
    const tx = align === 'center' ? x + maxW / 2 : align === 'right' ? x + maxW : x
    ctx.textAlign = align; ctx.fillText(l, tx, cy); ctx.textAlign = 'left'
  }
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxW && line) {
      drawLine(line.trim()); line = word + ' '; cy += lineH
    } else { line = test }
  }
  if (line.trim()) drawLine(line.trim())
}

const EHL_LOGO_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF0AAABfCAYAAACKucvIAAAIUmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS41LWMwMTQgNzkuMTUxODA1LCAyMDEzLzA0LzA5LTEyOjA4OjIxICAgICAgICAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iCiAgICB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICB4bWxuczp4bXBETT0iaHR0cDovL25zLmFkb2JlLmNvbS94bXAvMS4wL0R5bmFtaWNNZWRpYS8iCiAgICB4bWxuczpzdERpbT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL0RpbWVuc2lvbnMjIgogICB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6MjQ5N0Y3NTgxMDMzRTExMUFBMjNCOTZEMzYzRTIzMEMiCiAgIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzQ4M0NDMTNBN0Q0MTFFNEEwQUNCRDUyM0JDNTQzNjIiCiAgIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OTUzYmRhMzctMmU0Mi1kODRhLTgxNzctNmIzMWI2YzVhMmE2IgogICB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIElsbHVzdHJhdG9yIENDIDIwMTQgKFdpbmRvd3MpIgogICB4bXA6TWV0YWRhdGFEYXRlPSIyMDE4LTAxLTA4VDA4OjAzOjQzLTA3OjAwIgogICB4bXA6TW9kaWZ5RGF0ZT0iMjAxOC0wMS0wOFQwODowMzo0Mi0wNzowMCIKICAgeG1wRE06dmlkZW9QaXhlbEFzcGVjdFJhdGlvPSIxMDAwMDAwLzEwMDAwMDAiCiAgIHhtcERNOnZpZGVvQWxwaGFNb2RlPSJzdHJhaWdodCIKICAgeG1wRE06dmlkZW9GcmFtZVJhdGU9IjAuMDAwMDAwIj4KICAgPHhtcE1NOkRlcml2ZWRGcm9tCiAgICBzdFJlZjppbnN0YW5jZUlEPSJ1dWlkOjI0NWRlZGYzLTcwYzQtNDk5ZC1iYTMwLTRjYmU3ZjRlMDU4YSIKICAgIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NmQ5MGIzZmQtZjg0ZC03ZjRjLTkzMjktZDQ1ZGZhMDM4M2RmIi8+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InNhdmVkIgogICAgICBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmNiMzE3MjgyLWQ0ODEtZjc0NS1hNjY5LWJiYmJhZDhjNjQ5OCIKICAgICAgc3RFdnQ6d2hlbj0iMjAxOC0wMS0wOFQwODowMzo0Mi0wNzowMCIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUHJlbWllcmUgUHJvIENDIChXaW5kb3dzKSIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIvPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo5NTNiZGEzNy0yZTQyLWQ4NGEtODE3Ny02YjMxYjZjNWEyYTYiCiAgICAgIHN0RXZ0OndoZW49IjIwMTgtMDEtMDhUMDg6MDM6NDMtMDc6MDAiCiAgICAgIHN0RXZ0OnNvZnR3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'
const NEO_LOGO_DATA = 'data:image/png;base64,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'

async function drawImageWhite(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, targetW: number, targetH: number) {
  try {
    const img = await loadImage(url)
    const ratio = img.naturalWidth / img.naturalHeight
    let dw = targetW, dh = targetH
    if (targetW / targetH > ratio) { dw = targetH * ratio } else { dh = targetW / ratio }
    const dx = x + (targetW - dw) / 2
    const dy = y + (targetH - dh) / 2
    // Draw to offscreen canvas then tint white via compositing
    const off = document.createElement('canvas')
    off.width = Math.round(dw); off.height = Math.round(dh)
    const octx = off.getContext('2d')!
    octx.drawImage(img, 0, 0, off.width, off.height)
    octx.globalCompositeOperation = 'source-in'
    octx.fillStyle = '#ffffff'
    octx.fillRect(0, 0, off.width, off.height)
    ctx.drawImage(off, dx, dy, dw, dh)
  } catch {}
}

async function renderPageToCanvas(canvas: HTMLCanvasElement, page: TplPage, values: FieldValues, w: number, h: number, opts: { qrUrl?: string } = {}) {
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Blurred background mode (Seller Advantage / rate promo templates)
  if (page.blur_bg) {
    const propImg = values.property_image
    if (propImg) {
      try {
        const img = await loadImage(propImg)
        // Scale to cover canvas
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
        const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale
        const ox = (iw - w) / 2, oy = (ih - h) / 2
        ctx.filter = 'blur(14px)'
        ctx.drawImage(img, -ox - 20, -oy - 20, iw + 40, ih + 40)
        ctx.filter = 'none'
      } catch {}
    } else {
      // Placeholder gradient when no photo uploaded
      const grad = ctx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, '#0A2540')
      grad.addColorStop(1, '#1e3a5f')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }
    // Dark overlay
    const opacity = page.overlay_opacity ?? 0.55
    ctx.fillStyle = `rgba(0,0,0,${opacity})`
    ctx.fillRect(0, 0, w, h)

    // ── Hardcoded layout for Seller Advantage / Rate Promo template ──

    const pad = w * 0.07

    // Top brand bar with NEO logo
    const topBarH = h * 0.1
    ctx.fillStyle = 'rgba(10,37,64,0.75)'
    ctx.fillRect(0, 0, w, topBarH)
    const topLogoH = topBarH * 0.5
    const topLogoW = topLogoH * 3.5
    await drawImageWhite(ctx, NEO_LOGO_DATA, w / 2 - topLogoW / 2, (topBarH - topLogoH) / 2, topLogoW, topLogoH)

    // "Special Financing Available" eyebrow label
    ctx.font = `700 ${Math.round(h * 0.019)}px Inter, Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.textAlign = 'center'
    ctx.fillText('SPECIAL FINANCING AVAILABLE', w / 2, h * 0.175)
    ctx.textAlign = 'left'

    // Divider line
    ctx.strokeStyle = 'rgba(91,203,245,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pad, h * 0.192); ctx.lineTo(w - pad, h * 0.192)
    ctx.stroke()

    // Big rate number
    const rateVal = values.rate || '—'
    ctx.font = `800 ${Math.round(h * 0.18)}px Inter, Arial, sans-serif`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText(rateVal, w / 2, h * 0.47)
    ctx.textAlign = 'left'

    // "Interest Rate" label under rate
    ctx.font = `600 ${Math.round(h * 0.026)}px Inter, Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'center'
    ctx.fillText('Interest Rate', w / 2, h * 0.518)
    ctx.textAlign = 'left'

    // APR pill
    const aprVal = values.apr ? `APR ${values.apr}` : 'APR —'
    ctx.font = `700 ${Math.round(h * 0.036)}px Inter, Arial, sans-serif`
    const aprMeasure = ctx.measureText(aprVal)
    const aprPillW = aprMeasure.width + h * 0.06
    const aprPillH = h * 0.062
    const aprPillX = w / 2 - aprPillW / 2
    const aprPillY = h * 0.548
    ctx.fillStyle = 'rgba(91,203,245,0.2)'
    ctx.beginPath()
    const aprR = aprPillH / 2
    ctx.moveTo(aprPillX + aprR, aprPillY)
    ctx.lineTo(aprPillX + aprPillW - aprR, aprPillY)
    ctx.arc(aprPillX + aprPillW - aprR, aprPillY + aprR, aprR, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(aprPillX + aprR, aprPillY + aprPillH)
    ctx.arc(aprPillX + aprR, aprPillY + aprR, aprR, Math.PI / 2, -Math.PI / 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#5BCBF5'
    ctx.textAlign = 'center'
    ctx.fillText(aprVal, w / 2, aprPillY + aprPillH * 0.72)
    ctx.textAlign = 'left'

    // Payment & date row — always centered
    const hasQr = !!opts.qrUrl
    const paymentVal = values.promo_payment ? `Est. ${values.promo_payment} Per Month` : 'Est. payment varies'
    const dateVal = values.promo_date || ''
    const infoFs = Math.round(h * 0.023)
    ctx.font = `400 ${infoFs}px Inter, Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'center'
    const infoLine = dateVal ? `${paymentVal}  ·  As of ${dateVal}` : paymentVal
    ctx.fillText(infoLine, w / 2, h * 0.663)
    ctx.textAlign = 'left'

    // Divider before disclaimer
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, h * 0.69); ctx.lineTo(w - pad, h * 0.69)
    ctx.stroke()

    // Bottom disclaimer strip
    ctx.fillStyle = 'rgba(0,0,0,0.38)'
    ctx.fillRect(0, h * 0.69, w, h * 0.31)

    // QR code — sits in the right side of the disclaimer strip
    const discStripH = h * 0.21  // 0.69 → 0.90
    const qrSize = Math.round(Math.min(discStripH * 0.82, w * 0.22))
    const qrColW = qrSize + pad * 2.5
    const discTextW = hasQr ? w - pad - qrColW - pad : w - pad * 2

    if (hasQr) {
      try {
        const qrOff = document.createElement('canvas')
        await QRCode.toCanvas(qrOff, opts.qrUrl!, {
          width: qrSize, margin: 1,
          color: { dark: '#0A2540', light: '#FFFFFF' },
        })
        const qrX = w - pad - qrSize
        const qrY = h * 0.69 + (discStripH - qrSize) / 2

        // White card behind QR
        const cardPad = Math.round(qrSize * 0.06)
        ctx.fillStyle = '#FFFFFF'
        const cardR = 8
        const cx = qrX - cardPad, cy = qrY - cardPad
        const cw = qrSize + cardPad * 2, ch = qrSize + cardPad * 2
        ctx.beginPath()
        ctx.moveTo(cx + cardR, cy)
        ctx.lineTo(cx + cw - cardR, cy); ctx.arc(cx + cw - cardR, cy + cardR, cardR, -Math.PI / 2, 0)
        ctx.lineTo(cx + cw, cy + ch - cardR); ctx.arc(cx + cw - cardR, cy + ch - cardR, cardR, 0, Math.PI / 2)
        ctx.lineTo(cx + cardR, cy + ch); ctx.arc(cx + cardR, cy + ch - cardR, cardR, Math.PI / 2, Math.PI)
        ctx.lineTo(cx, cy + cardR); ctx.arc(cx + cardR, cy + cardR, cardR, Math.PI, -Math.PI / 2)
        ctx.closePath(); ctx.fill()
        // "Scan to Learn More" above QR card
        const ctaFs = Math.round(h * 0.014)
        ctx.font = `700 ${ctaFs}px Inter, Arial, sans-serif`
        ctx.fillStyle = '#5BCBF5'
        ctx.textAlign = 'center'
        ctx.fillText('Scan to Learn More', qrX + qrSize / 2, qrY - cardPad - ctaFs * 0.3)
        ctx.textAlign = 'left'

        ctx.drawImage(qrOff, qrX, qrY, qrSize, qrSize)
      } catch (e) { console.warn('QR render failed', e) }
    }

    // Disclaimer text — left portion, narrower when QR is present
    const disclaimer = 'Example rate scenario for illustration purposes only. Actual rate, APR, monthly payment, and loan terms will vary based on creditworthiness, loan amount, down payment, property type, and other factors. A full loan scenario must be evaluated for each individual borrower. This is not a commitment to lend or an offer of credit. © 2026 Better Home & Finance Holding Company and/or its affiliates. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, Floor 80, New York, NY 10007. Not available in all states. Equal Housing Lender. NMLS Consumer Access'
    const discFs = Math.round(h * 0.0135)
    ctx.font = `400 ${discFs}px Inter, Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    wrapText(ctx, disclaimer, pad, h * 0.715, discTextW, discFs * 1.38, 'left')

    // Footer bar
    const footerY = h * 0.9
    const footerH = h * 0.1
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, footerY, w, footerH)

    // Advisor info — two lines: name + title | NMLS · phone
    const advisorName = values.name || ''
    const advisorTitle = values.title || ''
    const advisorNmls = values.nmls || ''
    const advisorPhone = values.phone || ''

    const nameFs = Math.round(h * 0.018)
    const subFs = Math.round(h * 0.014)
    const hasNameTitle = advisorName || advisorTitle
    const hasSub = advisorNmls || advisorPhone

    if (hasNameTitle && hasSub) {
      // Two lines
      ctx.font = `700 ${nameFs}px Inter, Arial, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.textAlign = 'center'
      ctx.fillText([advisorName, advisorTitle].filter(Boolean).join('  ·  '), w / 2, footerY + footerH * 0.4)
      ctx.font = `400 ${subFs}px Inter, Arial, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText([advisorNmls, advisorPhone].filter(Boolean).join('  ·  '), w / 2, footerY + footerH * 0.75)
      ctx.textAlign = 'left'
    } else {
      ctx.font = `700 ${nameFs}px Inter, Arial, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.textAlign = 'center'
      ctx.fillText([advisorName, advisorTitle, advisorNmls, advisorPhone].filter(Boolean).join('  ·  '), w / 2, footerY + footerH * 0.58)
      ctx.textAlign = 'left'
    }

    // Equal Housing logo (bottom-left, white tinted)
    const ehlH = footerH * 0.55
    const ehlW = ehlH * 1.1
    await drawImageWhite(ctx, EHL_LOGO_DATA, pad, footerY + (footerH - ehlH) / 2, ehlW, ehlH)

    return
  }

  if (page.bg_url) {
    try {
      const img = await loadImage(page.bg_url)
      ctx.drawImage(img, 0, 0, w, h)
    } catch {}
  } else {
    ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0, 0, w, h)
  }

  for (const f of page.fields) {
    const px = f.x * w, py = f.y * h
    const fs = Math.max(8, Math.round(f.fontSize * h))
    const meta = FIELD_META[f.type]
    const val = values[f.type] ?? ''

    if (meta.isCircle) {
      if (!val) continue
      try {
        const img = await loadImage(val)
        const r = (f.rectW || f.fontSize * 2.5) * Math.min(w, h)
        const bx = px - r / 2, by = py - r / 2
        const scale = Math.max(r / img.naturalWidth, r / img.naturalHeight)
        const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale
        const ox = (f.panX ?? 0.5) * Math.max(0, iw - r)
        const oy = (f.panY ?? 0.5) * Math.max(0, ih - r)
        ctx.save()
        ctx.beginPath(); ctx.arc(px, py, r / 2, 0, Math.PI * 2); ctx.clip()
        ctx.drawImage(img, bx - ox, by - oy, iw, ih)
        ctx.restore()
      } catch {}
    } else if (meta.isRect) {
      if (!val) continue
      try {
        const img = await loadImage(val)
        const dw = (f.rectW || 0.3) * w
        const dh = (f.rectH || 0.2) * h
        const bx = px - dw / 2, by = py - dh / 2
        const isLogo = f.type === 'partner_logo'
        const scale = isLogo
          ? Math.min(dw / img.naturalWidth, dh / img.naturalHeight)
          : Math.max(dw / img.naturalWidth, dh / img.naturalHeight)
        const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale
        const ox = isLogo ? -(dw - iw) / 2 : (f.panX ?? 0.5) * Math.max(0, iw - dw)
        const oy = isLogo ? -(dh - ih) / 2 : (f.panY ?? 0.5) * Math.max(0, ih - dh)
        ctx.save()
        ctx.beginPath(); ctx.rect(bx, by, dw, dh); ctx.clip()
        ctx.drawImage(img, bx - ox, by - oy, iw, ih)
        ctx.restore()
      } catch {}
    } else if (meta.isMultiline) {
      ctx.font = `${f.bold ? 'bold ' : ''}${fs}px Inter, Arial, sans-serif`
      ctx.fillStyle = f.fontColor
      wrapText(ctx, val, px, py, (f.rectW || 0.45) * w, fs * 1.45, f.textAlign ?? 'left')
    } else {
      ctx.font = `${f.bold ? 'bold ' : ''}${fs}px Inter, Arial, sans-serif`
      ctx.fillStyle = f.fontColor
      if (f.rectW) {
        wrapText(ctx, val, px, py, f.rectW * w, fs * 1.35, f.textAlign ?? 'left')
      } else {
        const align = f.textAlign ?? 'left'
        ctx.textAlign = align
        ctx.fillText(val, px, py)
        ctx.textAlign = 'left'
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function initValues(profile: { full_name: string; title: string; email: string; nmls?: string; phone?: string; headshot_url?: string } | null, emp: Employee | undefined): FieldValues {
  return {
    name: profile?.full_name || emp?.name || '',
    title: profile?.title || emp?.title || '',
    nmls: profile?.nmls ? `NMLS# ${profile.nmls}` : emp?.nmls_number ? `NMLS# ${emp.nmls_number}` : '',
    email: profile?.email || emp?.work_email || '',
    phone: profile?.phone || emp?.phone || '',
    headshot: profile?.headshot_url || emp?.headshot_url || '',
    partner_name: '', partner_title: '', partner_company: '',
    partner_phone: '', partner_email: '', partner_headshot: '', partner_logo: '',
    property_address: '', property_price: '', property_beds: '', property_baths: '', property_sqft: '', property_extras: '',
    property_header: '', property_description: '',
    property_image: '', property_image_2: '', property_image_3: '', property_image_4: '', open_house_date: '', open_house_time: '',
    pa_regarding: '', pa_date: '', pa_address: '', pa_loan_type: '', pa_purchase_price: '', pa_down_payment: '', pa_loan_amount: '', pa_occupancy: '',
    testimonial_review: '', testimonial_name: '',
    tca_image: '',
    rate: '', apr: '', promo_payment: '', promo_date: '',
  }
}

function applyPartner(values: FieldValues, p: Partner): FieldValues {
  return {
    ...values,
    partner_name: p.name, partner_title: p.title, partner_company: p.company,
    partner_phone: p.phone, partner_email: p.email,
    partner_headshot: p.headshot_url, partner_logo: p.logo_url,
  }
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ onFile, label = 'Drop image here or click to browse', small = false, accept = 'image/jpeg,image/png' }: {
  onFile: (f: File) => void; label?: string; small?: boolean; accept?: string
}) {
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      style={{ border: `2px dashed ${drag ? '#3B82F6' : '#D1D5DB'}`, borderRadius: small ? 10 : 14, padding: small ? '14px' : '44px 32px', textAlign: 'center', cursor: 'pointer', background: drag ? '#EFF6FF' : '#F9FAFB', transition: 'all .15s' }}
    >
      {!small && <div style={{ fontSize: 30, marginBottom: 8 }}>🖼️</div>}
      <div style={{ fontSize: small ? 12 : 14, fontWeight: 600, color: '#374151', marginBottom: small ? 0 : 4 }}>{label}</div>
      {!small && <div style={{ fontSize: 12, color: '#9CA3AF' }}>JPEG or PNG</div>}
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

// ─── Image upload helper ──────────────────────────────────────────────────────

async function uploadFile(supabase: any, file: File, folder: string): Promise<string> {
  const path = `${folder}/${uid()}.${file.name.split('.').pop()}`
  const { error } = await supabase.storage.from('marketing-assets').upload(path, file, { contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('marketing-assets').getPublicUrl(path)
  return data.publicUrl
}

// ─── Partner Form Modal ───────────────────────────────────────────────────────

function PartnerModal({ partner, supabase, ownerEmail, onSaved, onClose }: {
  partner: Partner | null
  supabase: any
  ownerEmail: string
  onSaved: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: partner?.name ?? '', title: partner?.title ?? '', company: partner?.company ?? '',
    phone: partner?.phone ?? '', email: partner?.email ?? '',
    headshot_url: partner?.headshot_url ?? '', logo_url: partner?.logo_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function handleImageUpload(field: 'headshot_url' | 'logo_url', file: File) {
    setUploading(field)
    try {
      const url = await uploadFile(supabase, file, field === 'headshot_url' ? 'partner-headshots' : 'partner-logos')
      setForm(f => ({ ...f, [field]: url }))
    } catch (e: any) { setMsg(`Upload error: ${e.message}`) }
    setUploading(null)
  }

  async function handleSave() {
    if (!form.name.trim()) { setMsg('Name is required.'); return }
    setSaving(true)
    try {
      if (partner) {
        const { error } = await supabase.from('marketing_partners').update({ ...form }).eq('id', partner.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('marketing_partners').insert({ ...form, owner_email: ownerEmail })
        if (error) throw error
      }
      onSaved()
    } catch (e: any) { setMsg(`Error: ${e.message}`) }
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 12 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A2540' }}>{partner ? 'Edit Partner' : 'Add Partner'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          {/* Headshot */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Headshot</div>
            <div style={{ width: '100%', height: 100, borderRadius: 10, overflow: 'hidden', background: '#F3F4F6', border: '2px dashed #D1D5DB', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {form.headshot_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.headshot_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 32 }}>👤</span>}
            </div>
            <label style={{ display: 'block', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: uploading === 'headshot_url' ? 'default' : 'pointer', textAlign: 'center', opacity: uploading === 'headshot_url' ? 0.6 : 1 }}>
              {uploading === 'headshot_url' ? 'Uploading…' : form.headshot_url ? 'Replace Photo' : '⬆ Upload Photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={!!uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload('headshot_url', f); e.currentTarget.value = '' }} />
            </label>
          </div>
          {/* Logo */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Company Logo</div>
            <div style={{ width: '100%', height: 100, borderRadius: 10, overflow: 'hidden', background: '#F3F4F6', border: '2px dashed #D1D5DB', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {form.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 8 }} />
                : <span style={{ fontSize: 13, color: '#9CA3AF' }}>No logo yet</span>}
            </div>
            <label style={{ display: 'block', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: uploading === 'logo_url' ? 'default' : 'pointer', textAlign: 'center', opacity: uploading === 'logo_url' ? 0.6 : 1 }}>
              {uploading === 'logo_url' ? 'Uploading…' : form.logo_url ? 'Replace Logo' : '⬆ Upload Logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style={{ display: 'none' }} disabled={!!uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload('logo_url', f); e.currentTarget.value = '' }} />
            </label>
          </div>
        </div>

        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full Name *" style={inputStyle} />
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (e.g. REALTOR®)" style={inputStyle} />
        <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company / Brokerage" style={inputStyle} />
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" style={inputStyle} />
        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" style={inputStyle} />

        {msg && <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: saving ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? 'Saving…' : partner ? 'Save Changes' : 'Add Partner'}
          </button>
          <button onClick={onClose} style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Partners Tab ─────────────────────────────────────────────────────────────

function PartnersTab({ supabase, ownerEmail }: { supabase: any; ownerEmail: string }) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partner | null | 'new'>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('marketing_partners').select('*').eq('owner_email', ownerEmail).order('name')
    setPartners(data ?? [])
    setLoading(false)
  }, [supabase, ownerEmail])

  useEffect(() => { load() }, [load])

  async function del(id: string) {
    if (!confirm('Remove this partner?')) return
    await supabase.from('marketing_partners').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A2540' }}>Co-Branding Partners</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Save partners once — select them when generating any template</div>
        </div>
        <button onClick={() => setEditing('new')} style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + Add Partner
        </button>
      </div>

      {loading && <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading…</div>}

      {!loading && partners.length === 0 && (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No partners yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Add a real estate agent, title rep, or anyone you co-brand with</div>
          <button onClick={() => setEditing('new')} style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Add Your First Partner</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {partners.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            {/* Logo bar */}
            <div style={{ background: '#F9FAFB', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #F3F4F6' }}>
              {p.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px 10px', boxSizing: 'border-box' }} />
                : <div style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 600 }}>No logo</div>
              }
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: '2px solid #E5E7EB' }}>
                  {p.headshot_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.headshot_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '👤'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0A2540', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}{p.company ? ` · ${p.company}` : ''}</div>
                </div>
              </div>
              {p.phone && <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>📞 {p.phone}</div>}
              {p.email && <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {p.email}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(p)} style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, padding: '7px 0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => del(p.id)} style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <PartnerModal
          partner={editing === 'new' ? null : editing}
          supabase={supabase}
          ownerEmail={ownerEmail}
          onSaved={() => { load(); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Personalization Modal ────────────────────────────────────────────────────

function PersonalizationModal({ template, emp, profile, supabase, partners, onClose }: {
  template: MktTemplate; emp: Employee | undefined
  profile: { id?: string; full_name: string; title: string; email: string; nmls?: string; phone?: string; headshot_url?: string } | null
  supabase: any; partners: Partner[]; onClose: () => void
}) {
  const size = CANVAS_SIZES[template.canvas_size] ?? CANVAS_SIZES.custom
  const [values, setValues] = useState<FieldValues>(() => initValues(profile, emp))
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [pageIdx, setPageIdx] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [headshotUploading, setHeadshotUploading] = useState(false)

  // Sign rider QR CTA (blur_bg templates only)
  type SROption = { id: string; slug: string; address: string; city: string; state: string }
  const [signRiders, setSignRiders] = useState<SROption[]>([])
  const [selectedRider, setSelectedRider] = useState<string>('') // slug
  const isBlurTpl = template.pages.some(p => p.blur_bg)
  const qrUrl = selectedRider ? `${typeof window !== 'undefined' ? window.location.origin : ''}/sign-rider/${selectedRider}` : undefined

  const sortRiders = (rows: SROption[]) =>
    [...rows].sort((a, b) => {
      const numA = parseInt(a.slug.match(/(\d+)$/)?.[1] ?? '0', 10)
      const numB = parseInt(b.slug.match(/(\d+)$/)?.[1] ?? '0', 10)
      return numA - numB
    })

  useEffect(() => {
    if (!isBlurTpl || !profile?.email) return
    supabase.from('open_house_pages')
      .select('id, slug, address, city, state')
      .eq('page_type', 'sign_rider')
      .eq('created_by', profile?.id ?? '')
      .then(({ data }: { data: SROption[] | null }) => {
        // Only show riders with a real address (not auto-placeholder "Sign Rider N")
        const active = (data ?? []).filter(r =>
          r.address && !/^Sign Rider \d+$/i.test(r.address.trim())
        )
        setSignRiders(sortRiders(active))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlurTpl, profile?.email])
  const [mobileTab, setMobileTab] = useState<'preview' | 'fill'>('fill')
  const [zoom, setZoom] = useState(1)
  function switchToPreview() {
    setMobileTab('preview')
    // Canvas was hidden (display:none), so containerRef.clientWidth was 0 — re-render after show
    requestAnimationFrame(() => renderPreview())
  }
  const [posOverrides, setPosOverrides] = useState<Record<string, {x: number; y: number}>>({})
  const [guides, setGuides] = useState<{ x?: number; y?: number }[]>([])
  const previewRef = useRef<HTMLCanvasElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{id: string; ox: number; oy: number; mx0: number; my0: number} | null>(null)
  const posOverridesRef = useRef<Record<string, {x: number; y: number}>>({})

  const SNAP_THRESHOLD = 0.015
  const SNAP_ANCHORS = [0, 0.25, 0.5, 0.75, 1]

  function getPageWithOverrides(page: TplPage, overrides = posOverridesRef.current): TplPage {
    if (Object.keys(overrides).length === 0) return page
    return { ...page, fields: page.fields.map(f => { const o = overrides[f.id]; return o ? { ...f, x: o.x, y: o.y } : f }) }
  }

  function canvasFraction(clientX: number, clientY: number) {
    const c = previewRef.current; if (!c) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height }
  }

  function hitTest(fx: number, fy: number): TplField | null {
    const page = template.pages[pageIdx]
    for (const f of page.fields) {
      const ox = posOverridesRef.current[f.id]?.x ?? f.x
      const oy = posOverridesRef.current[f.id]?.y ?? f.y
      if (Math.abs(fx - ox) < 0.06 && Math.abs(fy - oy) < 0.06) return f
    }
    return null
  }

  function handlePreviewMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = canvasFraction(e.clientX, e.clientY)
    const field = hitTest(x, y); if (!field) return
    e.preventDefault()
    const ox = posOverridesRef.current[field.id]?.x ?? field.x
    const oy = posOverridesRef.current[field.id]?.y ?? field.y
    dragRef.current = { id: field.id, ox, oy, mx0: x, my0: y }
  }

  function handlePreviewMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return
    e.preventDefault()
    const { x, y } = canvasFraction(e.clientX, e.clientY)
    const { id, ox, oy, mx0, my0 } = dragRef.current
    let nx = Math.max(0, Math.min(1, ox + x - mx0))
    let ny = Math.max(0, Math.min(1, oy + y - my0))

    // Collect snap targets: other fields + grid anchors
    const page = template.pages[pageIdx]
    const otherXs = page.fields.filter(f => f.id !== id).map(f => posOverridesRef.current[f.id]?.x ?? f.x)
    const otherYs = page.fields.filter(f => f.id !== id).map(f => posOverridesRef.current[f.id]?.y ?? f.y)
    const snapXs = [...SNAP_ANCHORS, ...otherXs]
    const snapYs = [...SNAP_ANCHORS, ...otherYs]

    const newGuides: { x?: number; y?: number }[] = []
    for (const sx of snapXs) {
      if (Math.abs(nx - sx) < SNAP_THRESHOLD) { nx = sx; newGuides.push({ x: sx }) }
    }
    for (const sy of snapYs) {
      if (Math.abs(ny - sy) < SNAP_THRESHOLD) { ny = sy; newGuides.push({ y: sy }) }
    }
    setGuides(newGuides)

    posOverridesRef.current = { ...posOverridesRef.current, [id]: { x: nx, y: ny } }
    setPosOverrides({ ...posOverridesRef.current })
    const canvas = previewRef.current
    if (!canvas) return
    const drawW = Math.round(560 * zoom)
    const drawH = Math.round(drawW * (size.h / size.w))
    renderPageToCanvas(canvas, getPageWithOverrides(template.pages[pageIdx]), values, drawW, drawH, { qrUrl }).catch(() => {})
  }

  function handlePreviewMouseUp() { dragRef.current = null; setGuides([]) }

  const usedFields = new Set<FieldType>()
  template.pages.forEach(p => p.fields.forEach(f => usedFields.has(f.type) || usedFields.add(f.type)))

  const hasPartnerFields = ['partner_name','partner_title','partner_company','partner_phone','partner_email','partner_headshot','partner_logo'].some(t => usedFields.has(t as FieldType))
  const hasPropertyFields = ['property_address','property_price','property_beds','property_baths','property_sqft','property_extras','property_header','property_description','property_image','property_image_2','property_image_3','property_image_4','open_house_date','open_house_time'].some(t => usedFields.has(t as FieldType))
  const hasPreApprovalFields = ['pa_regarding','pa_date','pa_address','pa_loan_type','pa_purchase_price','pa_down_payment','pa_loan_amount','pa_occupancy'].some(t => usedFields.has(t as FieldType))
  const hasTestimonialFields = ['testimonial_review','testimonial_name'].some(t => usedFields.has(t as FieldType))
  const hasRatePromoFields = ['rate','apr','promo_payment','promo_date'].some(t => usedFields.has(t as FieldType))
  const isBlurBgTemplate = template.pages.some(p => p.blur_bg)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(renderPreview, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [values, pageIdx, posOverrides, zoom, qrUrl])

  async function renderPreview() {
    const canvas = previewRef.current
    if (!canvas) return
    setRendering(true)
    const drawW = Math.round(560 * zoom)
    const drawH = Math.round(drawW * (size.h / size.w))
    try { await renderPageToCanvas(canvas, getPageWithOverrides(template.pages[pageIdx]), values, drawW, drawH, { qrUrl }) } catch {}
    setRendering(false)
  }

  async function downloadPNG() {
    setDownloading(true)
    try {
      const baseName = template.name.replace(/\s+/g, '_')
      const files: File[] = []
      for (let i = 0; i < template.pages.length; i++) {
        const c = document.createElement('canvas')
        await renderPageToCanvas(c, getPageWithOverrides(template.pages[i]), values, size.w, size.h, { qrUrl })
        const suffix = template.pages.length > 1 ? `_p${i + 1}` : ''
        const blob = await new Promise<Blob>(res => c.toBlob(b => res(b!), 'image/png'))
        files.push(new File([blob], `${baseName}${suffix}.png`, { type: 'image/png' }))
      }
      for (const file of files) {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url; a.download = file.name
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
        if (files.length > 1) await new Promise(r => setTimeout(r, 300))
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e)
    }
    setDownloading(false)
  }

  async function downloadPDF() {
    setDownloading(true)
    try {
      const images: string[] = []
      for (let i = 0; i < template.pages.length; i++) {
        const c = document.createElement('canvas')
        await renderPageToCanvas(c, getPageWithOverrides(template.pages[i]), values, size.w, size.h, { qrUrl })
        images.push(c.toDataURL('image/png'))
      }
      const isLetter = template.canvas_size === 'flyer_letter'
      const pw = isLetter ? '8.5in' : `${size.w}px`, ph = isLetter ? '11in' : `${size.h}px`
      // Only add page-break-after on images that aren't the last one
      const imgTags = images.map((src, i) =>
        `<img src="${src}" style="page-break-after:${i < images.length - 1 ? 'always' : 'avoid'}"/>`
      ).join('')
      const win = window.open('', '_blank')
      if (!win) { alert('Please allow pop-ups for this site to download the PDF.'); setDownloading(false); return }
      win.document.write(`<!DOCTYPE html><html><head><style>
        @page{size:${pw} ${ph};margin:0}
        body{margin:0;padding:0}
        img{width:100%;height:auto;display:block;object-fit:fill}
      </style></head><body>${imgTags}</body></html>`)
      win.document.close()
      setTimeout(() => { win.print() }, 600)
    } catch (e) { console.error(e) }
    setDownloading(false)
  }

  async function handleHeadshotFile(file: File) {
    setHeadshotUploading(true)
    try {
      const url = await uploadFile(supabase, file, 'headshots')
      if (emp) await supabase.from('employees').update({ headshot_url: url }).eq('id', emp.id)
      setValues(v => ({ ...v, headshot: url }))
    } catch {}
    setHeadshotUploading(false)
  }

  function handlePropertyImageFile(file: File, slot: 'property_image' | 'property_image_2' | 'property_image_3' | 'property_image_4' = 'property_image') {
    setValues(v => ({ ...v, [slot]: URL.createObjectURL(file) }))
  }

  function handleTcaImageFile(file: File) {
    setValues(v => ({ ...v, tca_image: URL.createObjectURL(file) }))
  }

  function handlePartnerSelect(id: string) {
    setSelectedPartner(id)
    if (!id) return
    const p = partners.find(p => p.id === id)
    if (p) setValues(v => applyPartner(v, p))
  }

  const isFlyer = template.canvas_size === 'flyer_letter'

  const sectionHead = (label: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12, marginTop: 4 }}>{label}</div>
  )

  const fieldInput = (ft: FieldType, force = false) => {
    if (!force && !usedFields.has(ft)) return null
    const meta = FIELD_META[ft]
    if (meta.isCircle || meta.isRect) return null // handled separately
    return (
      <div key={ft} style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.color, display: 'inline-block', flexShrink: 0 }} />
          {meta.label}
        </label>
        {ft === 'nmls' ? (
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', fontSize: 13 }}>
            <span style={{ padding: '9px 10px', background: '#F3F4F6', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid #E5E7EB' }}>NMLS#</span>
            <input
              value={values.nmls.replace(/^NMLS#\s*/i, '')}
              onChange={e => setValues(v => ({ ...v, nmls: `NMLS# ${e.target.value}` }))}
              placeholder="123456"
              style={{ flex: 1, border: 'none', padding: '9px 12px', fontSize: 13, outline: 'none', minWidth: 0 }}
            />
          </div>
        ) : ft === 'pa_date' ? (
          <input type="date" onChange={e => {
            if (!e.target.value) { setValues(v => ({ ...v, [ft]: '' })); return }
            const [y, m, d] = e.target.value.split('-').map(Number)
            const formatted = new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            setValues(v => ({ ...v, [ft]: formatted }))
          }}
            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
        ) : meta.isMultiline ? (
          <textarea value={values[ft]} onChange={e => setValues(v => ({ ...v, [ft]: e.target.value }))} placeholder={meta.placeholder} rows={3}
            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
        ) : (
          <input value={values[ft]} onChange={e => setValues(v => ({ ...v, [ft]: e.target.value }))} placeholder={meta.placeholder}
            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
        )}
      </div>
    )
  }

  const imageUploadRow = (ft: FieldType, currentUrl: string, onUpload: (f: File) => void, uploading = false, circle = false) => {
    if (!usedFields.has(ft)) return null
    const meta = FIELD_META[ft]
    const inputId = `img-upload-${ft}`
    return (
      <div key={ft} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.color, display: 'inline-block' }} />
          {meta.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {currentUrl
            ? circle
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={currentUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB', flexShrink: 0 }} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={currentUrl} alt="" style={{ height: 44, maxWidth: 100, objectFit: 'contain', borderRadius: 6, border: '1px solid #E5E7EB', flexShrink: 0 }} />
            : <div style={{ width: circle ? 48 : 80, height: 44, borderRadius: circle ? '50%' : 6, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{circle ? '👤' : '🖼️'}</div>
          }
          <div style={{ flex: 1 }}>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = '' }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={e => { e.stopPropagation(); document.getElementById(inputId)?.click() }}
              style={{ width: '100%', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'center', cursor: uploading ? 'default' : 'pointer' }}
            >
              {uploading ? 'Uploading…' : currentUrl ? 'Change' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 1000, display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      {/* Header */}
      <div className="mkt-modal-header" style={{ background: '#0A2540', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <div className="mkt-modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 20, padding: 0, flexShrink: 0 }}>✕</button>
          <span className="mkt-modal-header-title" style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{template.name}</span>
          <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>{size.label}</span>
        </div>
        {template.pages.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {template.pages.map((_, i) => (
              <button key={i} onClick={() => setPageIdx(i)}
                style={{ background: i === pageIdx ? '#5BCBF5' : 'rgba(255,255,255,.15)', border: 'none', color: i === pageIdx ? '#0A2540' : '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Page {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="mkt-modal-body" onClick={e => e.stopPropagation()}>
        {/* Mobile tab switcher */}
        <div className="mkt-modal-switcher">
          <button className={mobileTab === 'fill' ? 'active' : ''} onClick={() => setMobileTab('fill')}>✏ Fill In</button>
          <button className={mobileTab === 'preview' ? 'active' : ''} onClick={switchToPreview}>👁 Preview</button>
        </div>

        {/* Canvas preview */}
        <div ref={containerRef} className="mkt-modal-canvas" data-hidden={mobileTab !== 'preview' ? 'true' : undefined}>
          {/* Scrollable zoom container */}
          <div style={{ overflow: 'auto', width: '100%', maxHeight: 'calc(100vh - 160px)' }}>
            <div style={{ width: `${560 * zoom}px`, position: 'relative' }}>
              <canvas ref={previewRef} onMouseDown={handlePreviewMouseDown} onMouseMove={handlePreviewMouseMove} onMouseUp={handlePreviewMouseUp} onMouseLeave={handlePreviewMouseUp}
                style={{ width: `${560 * zoom}px`, aspectRatio: `${size.w} / ${size.h}`, display: 'block', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,.7)', opacity: rendering ? 0.5 : 1, transition: 'opacity .15s', cursor: dragRef.current ? 'grabbing' : 'grab' }} />
              {/* Alignment guide overlays */}
              {guides.length > 0 && (
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: 8 }} viewBox="0 0 1 1" preserveAspectRatio="none">
                  {guides.map((g, i) => g.x !== undefined
                    ? <line key={i} x1={g.x} y1={0} x2={g.x} y2={1} stroke="#5BCBF5" strokeWidth="0.004" strokeDasharray="0.02 0.01" />
                    : <line key={i} x1={0} y1={g.y!} x2={1} y2={g.y!} stroke="#5BCBF5" strokeWidth="0.004" strokeDasharray="0.02 0.01" />
                  )}
                </svg>
              )}
              {rendering && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13 }}>Updating…</div>
                </div>
              )}
            </div>
          </div>
          {/* Zoom controls — below the graphic */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, flexShrink: 0 }}>
            <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 600, minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            {zoom !== 1 && <button onClick={() => setZoom(1)} style={{ background: 'rgba(255,255,255,.08)', border: 'none', color: 'rgba(255,255,255,.5)', borderRadius: 6, padding: '0 8px', height: 28, fontSize: 11, cursor: 'pointer' }}>Reset</button>}
          </div>
        </div>

        {/* Fields panel */}
        <div className="mkt-modal-panel" data-hidden={mobileTab !== 'fill' ? 'true' : undefined}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>

            {/* Advisor */}
            {sectionHead('Your Info')}
            {(['name','title','nmls','email','phone'] as FieldType[]).map(ft => fieldInput(ft))}
            {imageUploadRow('headshot', values.headshot, handleHeadshotFile, headshotUploading, true)}

            {/* Partner */}
            {hasPartnerFields && (
              <>
                <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 4, marginBottom: 16 }} />
                {sectionHead('Co-Brand Partner')}
                {partners.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                    No saved partners yet — go to the Partners tab to add one, or fill in manually below.
                  </div>
                ) : (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Select a partner</label>
                    <select value={selectedPartner} onChange={e => handlePartnerSelect(e.target.value)}
                      style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 12px', fontSize: 13, background: '#fff', marginBottom: 10, fontWeight: selectedPartner ? 600 : 400 }}>
                      <option value="">— Choose a partner —</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}{p.company ? ` · ${p.company}` : ''}</option>)}
                    </select>
                    {selectedPartner && (() => {
                      const p = partners.find(x => x.id === selectedPartner)
                      if (!p) return null
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                          {p.headshot_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={p.headshot_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2540' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: '#6B7280' }}>{[p.title, p.company].filter(Boolean).join(' · ')}</div>
                          </div>
                          {p.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.logo_url} alt="" style={{ height: 28, maxWidth: 70, objectFit: 'contain', marginLeft: 'auto', flexShrink: 0 }} />
                          )}
                        </div>
                      )
                    })()}
                    <button onClick={() => handlePartnerSelect('')}
                      style={{ fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      Clear partner
                    </button>
                  </div>
                )}
                {(['partner_name','partner_title','partner_company','partner_phone','partner_email'] as FieldType[]).map(ft => fieldInput(ft))}
                {imageUploadRow('partner_headshot', values.partner_headshot, async (f) => {
                  const url = URL.createObjectURL(f); setValues(v => ({ ...v, partner_headshot: url }))
                }, false, true)}
                {imageUploadRow('partner_logo', values.partner_logo, async (f) => {
                  const url = URL.createObjectURL(f); setValues(v => ({ ...v, partner_logo: url }))
                }, false, false)}
              </>
            )}

            {/* Property */}
            {hasPropertyFields && (
              <>
                <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 4, marginBottom: 16 }} />
                {sectionHead('Property Info')}
                {(['property_address','property_price','property_header','property_beds','property_baths','property_sqft','property_extras','property_description','open_house_date','open_house_time'] as FieldType[]).filter(ft => usedFields.has(ft)).map(ft => fieldInput(ft))}
                {usedFields.has('property_image') && imageUploadRow('property_image', values.property_image, (f) => handlePropertyImageFile(f, 'property_image'), false, false)}
                {usedFields.has('property_image_2') && imageUploadRow('property_image_2', values.property_image_2, (f) => handlePropertyImageFile(f, 'property_image_2'), false, false)}
                {usedFields.has('property_image_3') && imageUploadRow('property_image_3', values.property_image_3, (f) => handlePropertyImageFile(f, 'property_image_3'), false, false)}
                {usedFields.has('property_image_4') && imageUploadRow('property_image_4', values.property_image_4, (f) => handlePropertyImageFile(f, 'property_image_4'), false, false)}
              </>
            )}

            {/* Pre-Approval */}
            {hasPreApprovalFields && (
              <>
                <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 4, marginBottom: 16 }} />
                {sectionHead('Pre-Approval')}
                {(['pa_regarding','pa_date','pa_address','pa_loan_type','pa_purchase_price','pa_down_payment','pa_loan_amount','pa_occupancy'] as FieldType[]).map(ft => fieldInput(ft))}
              </>
            )}
            {hasTestimonialFields && (
              <>
                <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 4, marginBottom: 16 }} />
                {sectionHead('Testimonial')}
                {(['testimonial_review','testimonial_name'] as FieldType[]).map(ft => fieldInput(ft))}
              </>
            )}
            {usedFields.has('tca_image') && (
              <>
                <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 4, marginBottom: 16 }} />
                {sectionHead('TCA')}
                {imageUploadRow('tca_image', values.tca_image, handleTcaImageFile, false, false)}
              </>
            )}
            {(hasRatePromoFields || isBlurBgTemplate) && (
              <>
                <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 4, marginBottom: 16 }} />
                {sectionHead('Listing Rate Details')}
                {imageUploadRow('property_image', values.property_image, (f) => handlePropertyImageFile(f, 'property_image'), false, false)}
                {fieldInput('rate')}
                {fieldInput('apr')}
                {fieldInput('promo_payment')}
                {fieldInput('promo_date')}
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#166534', marginTop: 4 }}>
                  <strong>Legal disclaimer</strong> and Equal Housing Lender logo are auto-generated on the graphic.
                </div>

                {/* Sign rider QR CTA */}
                <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 16, marginBottom: 16 }} />
                {sectionHead('Call to Action (Optional)')}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
                    Link to Sign Rider
                  </label>
                  <select
                    value={selectedRider}
                    onChange={e => setSelectedRider(e.target.value)}
                    style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 12px', fontSize: 13, background: '#fff', color: selectedRider ? '#111827' : '#9CA3AF' }}
                  >
                    <option value="">— No QR code —</option>
                    {signRiders.map(sr => (
                      <option key={sr.id} value={sr.slug}>
                        {sr.address}{sr.city ? `, ${sr.city}` : ''}{sr.state ? ` ${sr.state}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedRider && (
                    <div style={{ marginTop: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: '#1E40AF' }}>
                      QR will link to: <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{qrUrl}</span>
                    </div>
                  )}
                  {signRiders.length === 0 && isBlurTpl && (
                    <div style={{ marginTop: 6, fontSize: 11.5, color: '#9CA3AF' }}>
                      No sign riders found. Create one in the Sign Riders tab first.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Download */}
          <div style={{ padding: '16px 22px 22px', borderTop: '1px solid #E5E7EB' }}>
            <button onClick={downloadPNG} disabled={downloading}
              style={{ width: '100%', background: downloading ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: downloading ? 'default' : 'pointer', marginBottom: 10 }}>
              ⬇ {template.pages.length > 1 ? `Download All Pages (PNG)` : 'Download PNG'}
            </button>
            {(isFlyer || template.pages.length > 1) && (
              <button onClick={downloadPDF} disabled={downloading}
                style={{ width: '100%', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 10, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: downloading ? 'default' : 'pointer' }}>
                🖨 Print / Save as PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Auto-rendered thumbnail for blur_bg templates ────────────────────────────

function BlurBgThumb({ template, profile, emp }: { template: MktTemplate; profile: any; emp: Employee | undefined }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const sample = initValues(profile, emp)
    sample.rate = '4.99%'
    sample.apr = '5.99%'
    sample.promo_payment = '$2,800'
    sample.promo_date = '09/09/26'
    renderPageToCanvas(c, template.pages[0], sample, 480, 480).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
}

// ─── Library ──────────────────────────────────────────────────────────────────

function LibraryView({ templates, loading, myEmployee, profile, supabase, partners, onRefresh, onEdit, isAdmin }: {
  templates: MktTemplate[]; loading: boolean; myEmployee: Employee | undefined
  profile: any; supabase: any; partners: Partner[]; onRefresh: () => void; onEdit: (t: MktTemplate) => void; isAdmin: boolean
}) {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<MktTemplate | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const categories: (Category | 'all')[] = ['all', 'pre_approval', 'flyer', 'social', 'other']
  const counts: Record<string, number> = { all: templates.length }
  for (const t of templates) counts[t.category] = (counts[t.category] ?? 0) + 1

  const visible = templates
    .filter(t => activeCategory === 'all' || t.category === activeCategory)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.category === 'pre_approval' ? 0 : 1) - (b.category === 'pre_approval' ? 0 : 1))

  async function moveCategory(id: string, cat: Category) {
    await supabase.from('marketing_templates').update({ category: cat }).eq('id', id)
    onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Delete this template?')) return
    await supabase.from('marketing_templates').delete().eq('id', id)
    onRefresh()
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: '#9CA3AF' }}>Loading templates…</div>

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {categories.map(cat => {
            const active = cat === activeCategory
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', background: active ? '#0A2540' : '#F3F4F6', color: active ? '#fff' : '#6B7280' }}>
                {cat === 'all' ? '🗂 All' : CATEGORY_LABELS[cat]}{(counts[cat] ?? 0) > 0 ? ` (${counts[cat]})` : ''}
              </button>
            )
          })}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
          style={{ marginLeft: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 14px', fontSize: 13, outline: 'none', minWidth: 200 }} />
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{search ? 'No templates match' : 'No templates yet'}</div>
          {!search && isAdmin && <div style={{ fontSize: 13, color: '#9CA3AF' }}>Upload templates in the "Upload & Edit" tab.</div>}
        </div>
      ) : (
        <div className="mkt-grid">
          {visible.map(t => {
            const thumb = t.thumbnail_url ?? t.pages?.[0]?.bg_url ?? ''
            const hovered = hoverId === t.id
            return (
              <div key={t.id}
                style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: hovered ? '0 8px 32px rgba(0,0,0,.14)' : '0 2px 8px rgba(0,0,0,.06)', transition: 'box-shadow .2s, transform .2s', transform: hovered ? 'translateY(-3px)' : 'none', cursor: 'pointer' }}
                onMouseEnter={() => setHoverId(t.id)} onMouseLeave={() => setHoverId(null)}
                onClick={() => setOpen(t)}
              >
                <div style={{ position: 'relative', background: '#F3F4F6', aspectRatio: '4/3', overflow: 'hidden' }}>
                  {thumb
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={thumb} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .25s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
                    : t.pages?.[0]?.blur_bg
                      ? <BlurBgThumb template={t} profile={profile} emp={myEmployee} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>No preview</div>
                  }
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,37,64,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered ? 1 : 0, transition: 'opacity .2s' }}>
                    <div style={{ background: '#fff', color: '#0A2540', fontWeight: 800, fontSize: 14, borderRadius: 10, padding: '11px 28px', boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>Open Template</div>
                  </div>
                  <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(10,37,64,.75)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '3px 8px' }}>
                      {CANVAS_SIZES[t.canvas_size]?.label.split(' (')[0] ?? t.canvas_size}
                    </span>
                    {(t.pages?.length ?? 1) > 1 && <span style={{ background: 'rgba(91,203,245,.85)', color: '#0A2540', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '3px 8px' }}>{t.pages.length}pp</span>}
                  </div>
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0A2540', marginBottom: 10 }}>{t.name}</div>
                  {isAdmin && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => onEdit(t)}
                          style={{ flex: 1, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 7, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ✏ Edit Fields
                        </button>
                        <button onClick={() => del(t.id)} style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                      </div>
                      <select value={t.category} onChange={e => moveCategory(t.id, e.target.value as Category)}
                        style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 8px', fontSize: 11, background: '#F9FAFB', cursor: 'pointer' }}>
                        <option value="pre_approval">📋 Pre-Approval</option>
                        <option value="flyer">📄 Flyer</option>
                        <option value="social">📱 Social</option>
                        <option value="other">📁 Other</option>
                      </select>
                    </div>
                  )}
                  {!isAdmin && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(t.created_at).toLocaleDateString()}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && <PersonalizationModal template={open} emp={myEmployee} profile={profile} supabase={supabase} partners={partners} onClose={() => setOpen(null)} />}

    </>
  )
}

// ─── Admin Upload + Editor ────────────────────────────────────────────────────

interface EditorPage { bgFile: File | null; bgUrl: string; fields: TplField[] }

// ─── Canvas-based WYSIWYG editor ─────────────────────────────────────────────

type DragState =
  | { mode: 'move'; ids: string[]; sx: number; sy: number; initPos: { id: string; ox: number; oy: number }[] }
  | { mode: 'resize'; id: string; corner: 'tl'|'tr'|'bl'|'br'; cx: number; cy: number; origRW: number; origRH: number }

function EditorCanvas({ page, dispW, dispH, selectedIds, onSelect, onMove, onMoveMulti, onResize, onAddAtPos }: {
  page: EditorPage; dispW: number; dispH: number; selectedIds: string[]
  onSelect: (ids: string[]) => void
  onMove: (id: string, x: number, y: number) => void
  onMoveMulti: (moves: { id: string; x: number; y: number }[]) => void
  onResize: (id: string, rectW: number, rectH: number) => void
  onAddAtPos: (x: number, y: number, type: FieldType) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgRef = useRef<HTMLCanvasElement | null>(null)
  const fieldsRef = useRef(page.fields)
  const selectedIdsRef = useRef(selectedIds)
  const dragRef = useRef<DragState | null>(null)
  const boundsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map())
  const [picker, setPicker] = useState<{ px: number; py: number; rx: number; ry: number } | null>(null)

  useEffect(() => { fieldsRef.current = page.fields; draw() }, [page.fields, dispW, dispH])
  useEffect(() => { selectedIdsRef.current = selectedIds; draw() }, [selectedIds])
  useEffect(() => { initBg() }, [page.bgUrl, dispW, dispH])

  async function initBg() {
    const c = document.createElement('canvas')
    c.width = dispW; c.height = dispH
    const ctx = c.getContext('2d')!
    if (page.bgUrl) {
      try { const img = await loadImage(page.bgUrl); ctx.drawImage(img, 0, 0, dispW, dispH) } catch {}
    } else {
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(0, 0, dispW, dispH)
    }
    bgRef.current = c
    draw()
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== dispW) canvas.width = dispW
    if (canvas.height !== dispH) canvas.height = dispH
    const ctx = canvas.getContext('2d')!
    boundsRef.current.clear()

    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0)
    else { ctx.fillStyle = '#e5e7eb'; ctx.fillRect(0, 0, dispW, dispH) }

    if (!page.bgUrl && fieldsRef.current.length === 0) {
      ctx.fillStyle = '#9CA3AF'; ctx.font = '13px Inter,Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Upload a background, then click to place fields', dispW / 2, dispH / 2 - 10)
      ctx.fillText('Or use the "Add Field" buttons on the right →', dispW / 2, dispH / 2 + 14)
      ctx.textAlign = 'left'
    }

    for (const f of fieldsRef.current) {
      const px = f.x * dispW, py = f.y * dispH
      const fs = Math.max(8, Math.round(f.fontSize * dispH))
      const meta = FIELD_META[f.type]
      const isSel = selectedIdsRef.current.includes(f.id)
      const isPrimary = selectedIdsRef.current[0] === f.id

      if (meta.isCircle) {
        const r = Math.max(28, (f.rectW || f.fontSize * 2.5) * Math.min(dispW, dispH))
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = meta.color
        ctx.beginPath(); ctx.arc(px, py, r / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore()
        ctx.strokeStyle = meta.color; ctx.lineWidth = 2.5; ctx.setLineDash([])
        ctx.beginPath(); ctx.arc(px, py, r / 2, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(9, Math.round(r * 0.18))}px Inter,Arial`
        ctx.textAlign = 'center'; ctx.fillText(meta.label, px, py + 4); ctx.textAlign = 'left'
        boundsRef.current.set(f.id, { x: px - r / 2, y: py - r / 2, w: r, h: r })
      } else if (meta.isRect) {
        const rw = Math.max(40, (f.rectW || 0.3) * dispW)
        const rh = Math.max(20, (f.rectH || 0.2) * dispH)
        ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = meta.color
        ctx.fillRect(px - rw / 2, py - rh / 2, rw, rh); ctx.restore()
        ctx.strokeStyle = meta.color; ctx.lineWidth = 2; ctx.setLineDash([6, 3])
        ctx.strokeRect(px - rw / 2, py - rh / 2, rw, rh); ctx.setLineDash([])
        ctx.fillStyle = meta.color; ctx.font = `bold ${Math.max(9, Math.round(rh * 0.18))}px Inter,Arial`
        ctx.textAlign = 'center'; ctx.fillText(meta.label, px, py + 4); ctx.textAlign = 'left'
        boundsRef.current.set(f.id, { x: px - rw / 2, y: py - rh / 2, w: rw, h: rh })
      } else if (meta.isMultiline) {
        // Multiline text: show bounding box so it can be resized
        const rw = Math.max(40, (f.rectW || 0.45) * dispW)
        const rh = Math.max(20, (f.rectH || 0.18) * dispH)
        ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = meta.color
        ctx.fillRect(px, py - fs, rw, rh); ctx.restore()
        ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3])
        ctx.strokeRect(px, py - fs, rw, rh); ctx.setLineDash([])
        ctx.font = `${f.bold ? 'bold ' : ''}${fs}px Inter,Arial`
        ctx.fillStyle = f.fontColor
        wrapText(ctx, meta.placeholder || meta.label, px + 4, py, rw - 8, fs * 1.35, f.textAlign ?? 'left')
        // Bottom-right resize grip
        const gx = px + rw - 12, gy = py - fs + rh - 12
        ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = meta.color; ctx.lineWidth = 2; ctx.setLineDash([])
        for (const off of [3, 7, 11]) { ctx.beginPath(); ctx.moveTo(gx + off, gy + 12); ctx.lineTo(gx + 12, gy + off); ctx.stroke() }
        ctx.restore()
        boundsRef.current.set(f.id, { x: px, y: py - fs, w: rw, h: rh })
      } else {
        // Single-line (or width-wrapped) text
        ctx.font = `${f.bold ? 'bold ' : ''}${fs}px Inter,Arial`
        const text = meta.placeholder || meta.label
        const hasWidth = (f.rectW || 0) > 0
        const maxW = hasWidth ? f.rectW * dispW : dispW
        const tw = Math.min(ctx.measureText(text).width, maxW)
        // Dashed outline so field is visible without a background fill
        ctx.save(); ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3])
        ctx.strokeRect(px - 2, py - fs, tw + 4, fs + 5); ctx.restore()
        ctx.fillStyle = f.fontColor
        if (hasWidth) {
          wrapText(ctx, text, px, py, maxW, fs * 1.35, f.textAlign ?? 'left')
        } else {
          const align = f.textAlign ?? 'left'
          ctx.textAlign = align; ctx.fillText(text, px, py); ctx.textAlign = 'left'
        }
        boundsRef.current.set(f.id, { x: px - 2, y: py - fs - 2, w: tw + 4, h: fs + 8 })
      }

      if (isSel) {
        const b = boundsRef.current.get(f.id)!
        const pad = 5
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 3])
        ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2)
        ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; ctx.setLineDash([])
        ctx.strokeRect(b.x - pad - 1, b.y - pad - 1, b.w + pad * 2 + 2, b.h + pad * 2 + 2)
        // Only show resize handles on the primary selected field
        if (isPrimary) {
          for (const [hx, hy] of [[b.x - pad, b.y - pad], [b.x + b.w + pad, b.y - pad], [b.x - pad, b.y + b.h + pad], [b.x + b.w + pad, b.y + b.h + pad]]) {
            ctx.fillStyle = '#fff'; ctx.fillRect(hx - 4, hy - 4, 8, 8)
            ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; ctx.strokeRect(hx - 4, hy - 4, 8, 8)
          }
        }
      }
    }
  }

  function hitTest(mx: number, my: number): string | null {
    for (const f of [...fieldsRef.current].reverse()) {
      const b = boundsRef.current.get(f.id)
      if (b && mx >= b.x - 8 && mx <= b.x + b.w + 8 && my >= b.y - 8 && my <= b.y + b.h + 8) return f.id
    }
    return null
  }

  // Returns which resize corner the mouse is near, for the selected rect/circle field
  function cornerHitTest(mx: number, my: number): { id: string; corner: 'tl'|'tr'|'bl'|'br' } | null {
    if (!selectedIdsRef.current[0]) return null
    const f = fieldsRef.current.find(f => f.id === selectedIdsRef.current[0])
    if (!f) return null
    const meta = FIELD_META[f.type]
    if (!meta.isRect && !meta.isCircle && !meta.isMultiline) return null
    const b = boundsRef.current.get(f.id)
    if (!b) return null
    const pad = 5, hs = 10
    const corners: [number, number, 'tl'|'tr'|'bl'|'br'][] = [
      [b.x - pad, b.y - pad, 'tl'],
      [b.x + b.w + pad, b.y - pad, 'tr'],
      [b.x - pad, b.y + b.h + pad, 'bl'],
      [b.x + b.w + pad, b.y + b.h + pad, 'br'],
    ]
    for (const [hx, hy, corner] of corners) {
      if (Math.abs(mx - hx) <= hs && Math.abs(my - hy) <= hs) return { id: f.id, corner }
    }
    return null
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top

    // Corner resize — only on primary selected field
    const cornerHit = cornerHitTest(mx, my)
    if (cornerHit) {
      const f = fieldsRef.current.find(f => f.id === cornerHit.id)!
      const meta = FIELD_META[f.type]
      dragRef.current = {
        mode: 'resize', id: f.id, corner: cornerHit.corner,
        cx: f.x * dispW, cy: f.y * dispH,
        origRW: (f.rectW || (meta.isCircle ? 0.12 : meta.isMultiline ? 0.45 : 0.3)) * dispW,
        origRH: (f.rectH || (meta.isCircle ? 0.12 : meta.isMultiline ? 0.18 : 0.2)) * dispH,
      }
      setPicker(null); e.preventDefault(); return
    }

    const hit = hitTest(mx, my)
    if (hit) {
      setPicker(null)
      const curIds = selectedIdsRef.current
      if (e.shiftKey) {
        // Toggle this field in the selection
        const next = curIds.includes(hit) ? curIds.filter(id => id !== hit) : [hit, ...curIds]
        onSelect(next)
        if (!curIds.includes(hit)) {
          // Start moving the full new selection
          const initPos = [...next].map(id => {
            const ff = fieldsRef.current.find(f => f.id === id)!
            return { id, ox: ff.x, oy: ff.y }
          })
          dragRef.current = { mode: 'move', ids: next, sx: mx, sy: my, initPos }
        }
      } else {
        // Single click — if already in selection, start moving all; else select just this one
        const ids = curIds.includes(hit) ? curIds : [hit]
        if (!curIds.includes(hit)) onSelect([hit])
        const initPos = ids.map(id => {
          const ff = fieldsRef.current.find(f => f.id === id)!
          return { id, ox: ff.x, oy: ff.y }
        })
        dragRef.current = { mode: 'move', ids, sx: mx, sy: my, initPos }
      }
      e.preventDefault()
    } else {
      if (!e.shiftKey) onSelect([])
      setPicker({ px: Math.min(mx, dispW - 224), py: Math.max(my - 188, 0), rx: mx / dispW, ry: my / dispH })
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const d = dragRef.current

    if (d.mode === 'move') {
      const dx = (mx - d.sx) / dispW, dy = (my - d.sy) / dispH
      fieldsRef.current = fieldsRef.current.map(f => {
        const init = d.initPos.find(p => p.id === f.id)
        if (!init) return f
        return { ...f, x: Math.max(0.01, Math.min(0.99, init.ox + dx)), y: Math.max(0.01, Math.min(0.99, init.oy + dy)) }
      })
    } else {
      const newHalfW = Math.max(10, Math.abs(mx - d.cx))
      const newHalfH = Math.max(10, Math.abs(my - d.cy))
      const newRW = Math.min(1, (newHalfW * 2) / dispW)
      const newRH = Math.min(1, (newHalfH * 2) / dispH)
      const f = fieldsRef.current.find(f => f.id === d.id)
      if (f && FIELD_META[f.type].isCircle) {
        const s = Math.max(newRW, newRH)
        fieldsRef.current = fieldsRef.current.map(f => f.id === d.id ? { ...f, rectW: s, rectH: s } : f)
      } else {
        fieldsRef.current = fieldsRef.current.map(f => f.id === d.id ? { ...f, rectW: newRW, rectH: newRH } : f)
      }
    }
    draw()
  }

  function handleMouseUp() {
    const d = dragRef.current
    if (d) {
      if (d.mode === 'move') {
        const moves = d.ids.map(id => {
          const f = fieldsRef.current.find(f => f.id === id)!
          return { id, x: f.x, y: f.y }
        })
        if (moves.length === 1) onMove(moves[0].id, moves[0].x, moves[0].y)
        else onMoveMulti(moves)
      } else {
        const f = fieldsRef.current.find(f => f.id === d.id)
        if (f) onResize(f.id, f.rectW, f.rectH)
      }
    }
    dragRef.current = null
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      <canvas ref={canvasRef} width={dispW} height={dispH}
        style={{ display: 'block', borderRadius: 10, border: '2px solid #E5E7EB', cursor: 'crosshair', width: dispW, height: dispH, maxWidth: '100%', userSelect: 'none' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      />
      {picker && (
        <div style={{ position: 'absolute', left: picker.px, top: picker.py, background: '#0A2540', borderRadius: 12, padding: 14, boxShadow: '0 6px 24px rgba(0,0,0,.55)', zIndex: 10, width: 218 }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 10, color: '#9FB0C4', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>Add field here</div>
          {Object.entries(FIELD_GROUPS).map(([group, types]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.07em' }}>{group}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {types.map(t => (
                  <button key={t} onClick={() => { onAddAtPos(picker.rx, picker.ry, t); setPicker(null) }}
                    style={{ background: FIELD_META[t].color, color: '#fff', border: 'none', borderRadius: 99, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    {FIELD_META[t].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setPicker(null)} style={{ width: '100%', background: 'rgba(255,255,255,.1)', color: '#9FB0C4', border: 'none', borderRadius: 8, padding: '5px 0', fontSize: 10, cursor: 'pointer', marginTop: 6 }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

function AdminTab({ supabase, onDone, editTemplate }: { supabase: any; onDone: () => void; editTemplate?: MktTemplate }) {
  const [canvasSize, setCanvasSize] = useState(editTemplate?.canvas_size ?? 'flyer_letter')
  const [category, setCategory] = useState<Category>(editTemplate?.category ?? 'flyer')
  const [tplName, setTplName] = useState(editTemplate?.name ?? '')
  const [pages, setPages] = useState<EditorPage[]>(
    editTemplate?.pages?.length
      ? editTemplate.pages.map(p => ({ bgFile: null, bgUrl: p.bg_url, fields: p.fields }))
      : [{ bgFile: null, bgUrl: '', fields: [] }]
  )
  const [pageIdx, setPageIdx] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbUrl, setThumbUrl] = useState<string>(editTemplate?.thumbnail_url ?? '')
  const bgInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  async function handlePdfUpload(file: File) {
    setPdfLoading(true)
    setMsg('')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const newPages: EditorPage[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const pdfPage = await pdf.getPage(i)
        const viewport = pdfPage.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await pdfPage.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport, canvas }).promise
        const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'))
        newPages.push({ bgFile: new File([blob], `page_${i}.png`, { type: 'image/png' }), bgUrl: URL.createObjectURL(blob), fields: [] })
      }
      setPages(newPages)
      setPageIdx(0)
      setSelectedIds([])
      // Auto-set canvas size based on first page aspect ratio
      const firstPage = await pdf.getPage(1)
      const vp = firstPage.getViewport({ scale: 1 })
      const ratio = vp.height / vp.width
      if (Math.abs(ratio - 1650 / 1275) < 0.05) setCanvasSize('pre_approval')
      else if (Math.abs(ratio - 1) < 0.05) setCanvasSize('square')
      else if (ratio > 1.2) setCanvasSize('flyer_letter')
      setMsg(`✓ Loaded ${newPages.length} page${newPages.length > 1 ? 's' : ''} from PDF`)
    } catch (e: any) {
      setMsg(`Error reading PDF: ${e.message}`)
    }
    setPdfLoading(false)
  }

  const size = CANVAS_SIZES[canvasSize]
  const page = pages[pageIdx]
  const DISP_W = 580
  const DISP_H = Math.round(DISP_W * (size.h / size.w))

  useEffect(() => { setCategory(CANVAS_SIZES[canvasSize]?.category ?? 'other') }, [canvasSize])

  function updatePage(idx: number, patch: Partial<EditorPage>) {
    setPages(ps => ps.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  function addField(x: number, y: number, type: FieldType) {
    const meta = FIELD_META[type]
    const f: TplField = {
      id: uid(), type, x, y, fontSize: 0.04, fontColor: '#000000', bold: true,
      rectW: meta.isCircle ? 0.12 : meta.isMultiline ? 0.45 : 0.35,
      rectH: meta.isCircle ? 0.12 : meta.isMultiline ? 0.18 : 0.22,
      panX: 0.5, panY: 0.5,
    }
    updatePage(pageIdx, { fields: [...page.fields, f] })
    setSelectedIds([f.id])
  }

  function addPreset(preset: { type: FieldType; x: number; y: number; fontSize?: number; rectW?: number; rectH?: number }[]) {
    const newFields: TplField[] = preset.map(p => {
      const meta = FIELD_META[p.type]
      return {
        id: uid(), type: p.type,
        x: p.x, y: p.y,
        fontSize: p.fontSize ?? 0.04,
        fontColor: '#000000', bold: true,
        rectW: p.rectW ?? (meta.isCircle ? 0.12 : meta.isMultiline ? 0.45 : 0.35),
        rectH: p.rectH ?? (meta.isCircle ? 0.12 : meta.isMultiline ? 0.18 : 0.22),
        panX: 0.5, panY: 0.5,
      }
    })
    updatePage(pageIdx, { fields: [...page.fields, ...newFields] })
    setSelectedIds(newFields.map(f => f.id))
  }

  function updateField(id: string, patch: Partial<TplField>) {
    updatePage(pageIdx, { fields: page.fields.map(f => f.id === id ? { ...f, ...patch } : f) })
  }

  function removeField(id: string) {
    updatePage(pageIdx, { fields: page.fields.filter(f => f.id !== id) })
    setSelectedIds(ids => ids.filter(i => i !== id))
  }

  function moveField(id: string, x: number, y: number) {
    updatePage(pageIdx, { fields: page.fields.map(f => f.id === id ? { ...f, x, y } : f) })
  }

  function moveMultiField(moves: { id: string; x: number; y: number }[]) {
    const map = new Map(moves.map(m => [m.id, m]))
    updatePage(pageIdx, { fields: page.fields.map(f => map.has(f.id) ? { ...f, ...map.get(f.id) } : f) })
  }

  function resizeField(id: string, rectW: number, rectH: number) {
    updatePage(pageIdx, { fields: page.fields.map(f => f.id === id ? { ...f, rectW, rectH } : f) })
  }

  async function handleSave() {
    if (!tplName.trim()) { setMsg('Enter a template name.'); return }
    setSaving(true); setMsg('')
    try {
      const savedPages: TplPage[] = []
      for (const p of pages) {
        let bgUrl = p.bgUrl
        if (p.bgFile) { bgUrl = await uploadFile(supabase, p.bgFile, 'templates') }
        savedPages.push({ bg_url: bgUrl, fields: p.fields })
      }
      let savedThumbUrl = thumbUrl || null
      if (thumbFile) { savedThumbUrl = await uploadFile(supabase, thumbFile, 'thumbnails') }
      if (editTemplate) {
        const { error } = await supabase.from('marketing_templates').update({ name: tplName.trim(), category, canvas_size: canvasSize, pages: savedPages, thumbnail_url: savedThumbUrl }).eq('id', editTemplate.id)
        if (error) throw error
        setMsg('✓ Saved!')
      } else {
        const { error } = await supabase.from('marketing_templates').insert({ name: tplName.trim(), category, canvas_size: canvasSize, pages: savedPages, thumbnail_url: savedThumbUrl })
        if (error) throw error
        setMsg('✓ Published to library!')
      }
      setTimeout(onDone, 700)
    } catch (e: any) { setMsg(`Error: ${e.message}`) }
    setSaving(false)
  }

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const selected = selectedId ? page.fields.find(f => f.id === selectedId) : null
  const meta = selected ? FIELD_META[selected.type] : null

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Left sidebar */}
      <div style={{ width: 188, flexShrink: 0 }}>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.08em' }}>Canvas Size</label>
          <select value={canvasSize} onChange={e => setCanvasSize(e.target.value)}
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 7, padding: '6px 8px', fontSize: 12, marginBottom: 12, background: '#fff' }}>
            {Object.entries(CANVAS_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.08em' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 7, padding: '6px 8px', fontSize: 12, background: '#fff', marginBottom: 12 }}>
            <option value="pre_approval">📋 Pre-Approval</option><option value="flyer">📄 Flyer</option><option value="social">📱 Social</option><option value="other">📁 Other</option>
          </select>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.08em' }}>Thumbnail</label>
          <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { setThumbFile(f); setThumbUrl(URL.createObjectURL(f)) } e.target.value = '' }} />
          {thumbUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumbUrl} alt="thumbnail" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 7, border: '1px solid #E5E7EB', marginBottom: 6, display: 'block' }} />
            : <div style={{ width: '100%', aspectRatio: '4/3', background: '#F3F4F6', borderRadius: 7, border: '1px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>Uses page 1 bg</div>
          }
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => thumbInputRef.current?.click()}
              style={{ flex: 1, background: '#0A2540', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {thumbUrl ? '↺ Replace' : '⬆ Upload'}
            </button>
            {thumbUrl && (
              <button onClick={() => { setThumbFile(null); setThumbUrl('') }}
                style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✕</button>
            )}
          </div>
        </div>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Quick Add</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 8 }}>Drops a pre-built block — drag to reposition</div>
          {([
            {
              label: '👤 My Info Block',
              desc: 'Headshot + Name + Title + NMLS + Phone + Email',
              fields: [
                { type: 'headshot' as FieldType,  x: 0.13, y: 0.87, rectW: 0.10, rectH: 0.10 },
                { type: 'name'     as FieldType,  x: 0.26, y: 0.81, fontSize: 0.02 },
                { type: 'title'    as FieldType,  x: 0.26, y: 0.85, fontSize: 0.01 },
                { type: 'nmls'     as FieldType,  x: 0.26, y: 0.88, fontSize: 0.01 },
                { type: 'phone'    as FieldType,  x: 0.26, y: 0.91, fontSize: 0.01 },
                { type: 'email'    as FieldType,  x: 0.26, y: 0.94, fontSize: 0.01 },
              ],
            },
            {
              label: '🤝 Partner Block',
              desc: 'Headshot + Name + Title + Company + Phone + Email',
              fields: [
                { type: 'partner_headshot' as FieldType, x: 0.63, y: 0.87, rectW: 0.10, rectH: 0.10 },
                { type: 'partner_name'    as FieldType,  x: 0.76, y: 0.81, fontSize: 0.02 },
                { type: 'partner_title'   as FieldType,  x: 0.76, y: 0.85, fontSize: 0.01 },
                { type: 'partner_company' as FieldType,  x: 0.76, y: 0.88, fontSize: 0.01 },
                { type: 'partner_phone'   as FieldType,  x: 0.76, y: 0.91, fontSize: 0.01 },
                { type: 'partner_email'   as FieldType,  x: 0.76, y: 0.94, fontSize: 0.01 },
              ],
            },
            {
              label: '📋 My Info (No Photo)',
              desc: 'Name + Title + NMLS + Phone + Email stacked',
              fields: [
                { type: 'name'  as FieldType,  x: 0.08, y: 0.81, fontSize: 0.02 },
                { type: 'title' as FieldType,  x: 0.08, y: 0.85, fontSize: 0.01 },
                { type: 'nmls'  as FieldType,  x: 0.08, y: 0.88, fontSize: 0.01 },
                { type: 'phone' as FieldType,  x: 0.08, y: 0.91, fontSize: 0.01 },
                { type: 'email' as FieldType,  x: 0.08, y: 0.94, fontSize: 0.01 },
              ],
            },
          ] as { label: string; desc: string; fields: { type: FieldType; x: number; y: number; fontSize?: number; rectW?: number; rectH?: number }[] }[]).map(preset => (
            <button key={preset.label} onClick={() => addPreset(preset.fields)} title={preset.desc}
              style={{ width: '100%', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#374151', cursor: 'pointer', marginBottom: 3, textAlign: 'left' }}>
              {preset.label}
              <div style={{ fontSize: 9, fontWeight: 400, color: '#9CA3AF', marginTop: 2 }}>{preset.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pages</div>
          {pages.map((p, i) => (
            <div key={i} onClick={() => { setPageIdx(i); setSelectedIds([]) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: i === pageIdx ? '#0A2540' : '#fff', border: `1px solid ${i === pageIdx ? '#0A2540' : '#E5E7EB'}` }}>
              {p.bgUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.bgUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                : <div style={{ width: 24, height: 24, borderRadius: 3, background: i === pageIdx ? 'rgba(255,255,255,.2)' : '#F3F4F6', flexShrink: 0 }} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: i === pageIdx ? '#fff' : '#374151', flex: 1 }}>Page {i + 1}</span>
              {pages.length > 1 && <button onClick={e => { e.stopPropagation(); const next = pages.filter((_, j) => j !== i); setPages(next); setPageIdx(Math.min(pageIdx, next.length - 1)) }} style={{ background: 'none', border: 'none', color: i === pageIdx ? 'rgba(255,255,255,.5)' : '#9CA3AF', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>}
            </div>
          ))}
          <button onClick={() => { setPages(ps => [...ps, { bgFile: null, bgUrl: '', fields: [] }]); setPageIdx(pages.length) }}
            style={{ width: '100%', background: 'transparent', border: '1px dashed #D1D5DB', borderRadius: 8, padding: '7px 0', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
            + Add Page
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { updatePage(pageIdx, { bgFile: f, bgUrl: URL.createObjectURL(f) }) } e.target.value = '' }} />
          <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = '' }} />
          <button onClick={() => pdfInputRef.current?.click()} disabled={pdfLoading}
            style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: pdfLoading ? 'default' : 'pointer', opacity: pdfLoading ? 0.7 : 1 }}>
            {pdfLoading ? '⏳ Loading PDF…' : '📄 Upload PDF'}
          </button>
          <button onClick={() => bgInputRef.current?.click()}
            style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {page.bgUrl ? '🖼 Replace Page Background' : '⬆ Upload Background (Image)'}
          </button>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>
            {page.bgUrl ? 'Click canvas to place a field · drag to reposition' : 'Upload a PDF to auto-import all pages, or upload an image'}
          </span>
        </div>
        <EditorCanvas
          page={page}
          dispW={DISP_W}
          dispH={DISP_H}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onMove={moveField}
          onMoveMulti={moveMultiField}
          onResize={resizeField}
          onAddAtPos={addField}
        />
      </div>

      {/* Right controls */}
      <div style={{ width: 228, flexShrink: 0 }}>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Template Name</label>
          <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="e.g. Open House Flyer"
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 14 }} />

          {/* Add Field panel */}
          {!selected && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Add Field</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10 }}>Adds at center — drag to reposition</div>
              {Object.entries(FIELD_GROUPS).map(([group, types]) => (
                <div key={group} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.07em' }}>{group}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {types.map(t => (
                      <button key={t} onClick={() => addField(0.5, 0.5, t)}
                        style={{ background: FIELD_META[t].color, color: '#fff', border: 'none', borderRadius: 99, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        {FIELD_META[t].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected field controls */}
          {selected && meta && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: meta.color }} />{meta.label}
              </div>
              {(meta.isRect) && (<>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Width — <strong>{Math.round((selected.rectW || 0.3) * 100)}%</strong>
                </label>
                <input type="range" min={3} max={100} step={1} value={Math.round((selected.rectW || 0.3) * 100)}
                  onChange={e => updateField(selected.id, { rectW: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Height — <strong>{Math.round((selected.rectH || 0.2) * 100)}%</strong>
                </label>
                <input type="range" min={3} max={100} step={1} value={Math.round((selected.rectH || 0.2) * 100)}
                  onChange={e => updateField(selected.id, { rectH: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Pan X — <strong>{Math.round((selected.panX ?? 0.5) * 100)}%</strong>
                </label>
                <input type="range" min={0} max={100} step={1} value={Math.round((selected.panX ?? 0.5) * 100)}
                  onChange={e => updateField(selected.id, { panX: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Pan Y — <strong>{Math.round((selected.panY ?? 0.5) * 100)}%</strong>
                </label>
                <input type="range" min={0} max={100} step={1} value={Math.round((selected.panY ?? 0.5) * 100)}
                  onChange={e => updateField(selected.id, { panY: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 12 }} />
              </>)}
              {(meta.isCircle) && (<>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Size — <strong>{Math.round((selected.rectW || 0.12) * 100)}%</strong>
                </label>
                <input type="range" min={3} max={60} step={1} value={Math.round((selected.rectW || 0.12) * 100)}
                  onChange={e => updateField(selected.id, { rectW: Number(e.target.value) / 100, rectH: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Pan X — <strong>{Math.round((selected.panX ?? 0.5) * 100)}%</strong>
                </label>
                <input type="range" min={0} max={100} step={1} value={Math.round((selected.panX ?? 0.5) * 100)}
                  onChange={e => updateField(selected.id, { panX: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Pan Y — <strong>{Math.round((selected.panY ?? 0.5) * 100)}%</strong>
                </label>
                <input type="range" min={0} max={100} step={1} value={Math.round((selected.panY ?? 0.5) * 100)}
                  onChange={e => updateField(selected.id, { panY: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 12 }} />
              </>)}
              {(!meta.isCircle && !meta.isRect) && (<>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Font size — <strong>{Math.round(selected.fontSize * 100)}%</strong>
                </label>
                <input type="range" min={1} max={15} step={0.5} value={Math.round(selected.fontSize * 100)}
                  onChange={e => updateField(selected.id, { fontSize: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Wrap width — <strong>{selected.rectW ? `${Math.round(selected.rectW * 100)}%` : 'off'}</strong>
                </label>
                <input type="range" min={0} max={100} step={1} value={Math.round((selected.rectW || 0) * 100)}
                  onChange={e => updateField(selected.id, { rectW: Number(e.target.value) / 100 || 0 })}
                  style={{ width: '100%', marginBottom: 12 }} />
              </>)}
              {(meta.isMultiline) && (<>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Font size — <strong>{Math.round(selected.fontSize * 100)}%</strong>
                </label>
                <input type="range" min={1} max={15} step={0.5} value={Math.round(selected.fontSize * 100)}
                  onChange={e => updateField(selected.id, { fontSize: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Width — <strong>{Math.round((selected.rectW || 0.45) * 100)}%</strong>
                </label>
                <input type="range" min={10} max={100} step={1} value={Math.round((selected.rectW || 0.45) * 100)}
                  onChange={e => updateField(selected.id, { rectW: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 10 }} />
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                  Height — <strong>{Math.round((selected.rectH || 0.18) * 100)}%</strong>
                </label>
                <input type="range" min={5} max={100} step={1} value={Math.round((selected.rectH || 0.18) * 100)}
                  onChange={e => updateField(selected.id, { rectH: Number(e.target.value) / 100 })}
                  style={{ width: '100%', marginBottom: 12 }} />
              </>)}
              {!meta.isCircle && !meta.isRect && (
                <>
                  <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 5 }}>Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input type="color" value={selected.fontColor} onChange={e => updateField(selected.id, { fontColor: e.target.value })}
                      style={{ width: 34, height: 28, border: '1px solid #D1D5DB', cursor: 'pointer', borderRadius: 5, padding: 2 }} />
                    <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{selected.fontColor}</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selected.bold} onChange={e => updateField(selected.id, { bold: e.target.checked })} />Bold
                  </label>
                  <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 5 }}>Alignment</label>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {(['left','center','right'] as const).map(a => (
                      <button key={a} onClick={() => updateField(selected.id, { textAlign: a })}
                        style={{ flex: 1, padding: '6px 0', border: `1px solid ${(selected.textAlign ?? 'left') === a ? '#0A2540' : '#D1D5DB'}`, borderRadius: 7, background: (selected.textAlign ?? 'left') === a ? '#0A2540' : '#fff', color: (selected.textAlign ?? 'left') === a ? '#fff' : '#6B7280', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                        {a === 'left' ? 'Left' : a === 'center' ? 'Center' : 'Right'}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button onClick={() => removeField(selected.id)} style={{ width: '100%', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginBottom: 10 }}>Remove Field</button>
              <button onClick={() => setSelectedIds([])} style={{ width: '100%', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, padding: '7px 0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>← Back to Add Fields</button>
            </div>
          )}

          {/* Fields list */}
          {page.fields.length > 0 && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.08em' }}>Page {pageIdx + 1} Fields</div>
              {page.fields.map(f => (
                <div key={f.id} onClick={e => {
                    if (e.shiftKey) setSelectedIds(ids => ids.includes(f.id) ? ids.filter(i => i !== f.id) : [f.id, ...ids])
                    else setSelectedIds(ids => ids.includes(f.id) && ids.length === 1 ? [] : [f.id])
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', borderRadius: 7, cursor: 'pointer', marginBottom: 4, background: selectedIds.includes(f.id) ? '#EFF6FF' : '#fff', border: `1px solid ${selectedIds.includes(f.id) ? '#BFDBFE' : '#E5E7EB'}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: FIELD_META[f.type].color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{FIELD_META[f.type].label}</span>
                  <button onClick={e => { e.stopPropagation(); removeField(f.id) }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {msg && <div style={{ fontSize: 12, color: msg.startsWith('Error') ? '#EF4444' : '#10B981', marginBottom: 10 }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            {editTemplate && (
              <button onClick={async () => {
                if (!confirm('Delete this template? This cannot be undone.')) return
                await supabase.from('marketing_templates').delete().eq('id', editTemplate.id)
                onDone()
              }} style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 10, padding: '11px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                Delete
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !tplName.trim()}
              style={{ flex: 1, background: (saving || !tplName.trim()) ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 13, cursor: (saving || !tplName.trim()) ? 'default' : 'pointer' }}>
              {saving ? 'Saving…' : editTemplate ? 'Save Changes' : 'Publish to Library'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = 'library' | 'partners' | 'admin'

export default function Marketing() {
  const { profile, employees, supabase } = useApp()
  const isColin = profile?.email?.toLowerCase() === 'colin.jenson@neohomeloans.com'
  const isAdmin = profile?.role === 'admin' || isColin
  const [tab, setTab] = useState<Tab>('library')
  const [templates, setTemplates] = useState<MktTemplate[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<MktTemplate | undefined>(undefined)

  const myEmployee = employees.find(e => e.work_email?.toLowerCase() === profile?.email?.toLowerCase())

  const SELLER_ADVANTAGE_TEMPLATE: MktTemplate = {
    id: '__seller_advantage__',
    name: 'Seller Advantage MLS Listing Rate',
    category: 'social',
    canvas_size: 'social_square',
    thumbnail_url: null,
    created_at: '2026-01-01T00:00:00Z',
    pages: [{
      bg_url: '',
      blur_bg: true,
      overlay_opacity: 0.55,
      fields: [
        { id: 'sa-prop',    type: 'property_image', x: 0.5, y: 0.5, fontSize: 0.06, rectW: 1.0, rectH: 1.0, panX: 0.5, panY: 0.5, fontColor: '#fff', bold: false },
        { id: 'sa-rate',    type: 'rate',            x: 0.5, y: 0.42, fontSize: 0.10, rectW: 0,   rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#FFFFFF', bold: true,  textAlign: 'center' },
        { id: 'sa-apr',     type: 'apr',             x: 0.5, y: 0.56, fontSize: 0.035, rectW: 0,  rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#5BCBF5', bold: true,  textAlign: 'center' },
        { id: 'sa-pay',     type: 'promo_payment',   x: 0.5, y: 0.63, fontSize: 0.021, rectW: 0,  rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#D1D5DB', bold: false, textAlign: 'center' },
        { id: 'sa-date',    type: 'promo_date',      x: 0.5, y: 0.66, fontSize: 0.021, rectW: 0,  rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#D1D5DB', bold: false, textAlign: 'center' },
        { id: 'sa-name',    type: 'name',            x: 0.5, y: 0.965, fontSize: 0.018, rectW: 0, rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#fff', bold: true,  textAlign: 'center' },
        { id: 'sa-title',   type: 'title',           x: 0.5, y: 0.965, fontSize: 0.015, rectW: 0, rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#9CA3AF', bold: false, textAlign: 'center' },
        { id: 'sa-nmls',    type: 'nmls',            x: 0.5, y: 0.965, fontSize: 0.015, rectW: 0, rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#9CA3AF', bold: false, textAlign: 'center' },
        { id: 'sa-phone',   type: 'phone',           x: 0.5, y: 0.965, fontSize: 0.015, rectW: 0, rectH: 0,   panX: 0.5, panY: 0.5, fontColor: '#9CA3AF', bold: false, textAlign: 'center' },
      ],
    }],
  }

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('marketing_templates').select('*').order('created_at', { ascending: false })
    setTemplates([SELLER_ADVANTAGE_TEMPLATE, ...(data ?? [])])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const loadPartners = useCallback(async () => {
    const email = profile?.email ?? ''
    if (!email) return
    const { data } = await supabase.from('marketing_partners').select('*').eq('owner_email', email).order('name')
    setPartners(data ?? [])
  }, [supabase, profile?.email])

  useEffect(() => { loadTemplates(); loadPartners() }, [loadTemplates, loadPartners])

  function tabBtn(t: Tab, label: string): React.ReactElement {
    const active = tab === t
    return (
      <button onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: active ? '#0A2540' : '#F3F4F6', color: active ? '#fff' : '#6B7280' }}>
        {label}
      </button>
    )
  }

  return (
    <div className="mkt-page" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div className="mkt-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', margin: '0 0 6px' }}>Marketing Templates</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Tap any template to personalize and download</p>
        </div>
        <div className="mkt-tabs">
          {tabBtn('library', '📚 Library')}
          {tabBtn('partners', '🤝 Partners')}
          {isAdmin && <button onClick={() => { setEditingTemplate(undefined); setTab('admin') }} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: tab === 'admin' ? '#0A2540' : '#F3F4F6', color: tab === 'admin' ? '#fff' : '#6B7280' }}>⬆ Upload & Edit</button>}
        </div>
      </div>

      {tab === 'library' && (
        <LibraryView templates={templates} loading={loading} myEmployee={myEmployee} profile={profile}
          supabase={supabase} partners={partners} onRefresh={loadTemplates}
          onEdit={t => { setEditingTemplate(t); setTab('admin') }}
          isAdmin={isAdmin} />
      )}
      {tab === 'partners' && (
        <PartnersTab supabase={supabase} ownerEmail={profile?.email ?? ''} />
      )}
      {tab === 'admin' && isAdmin && (
        <AdminTab key={editingTemplate?.id ?? 'new'} supabase={supabase} editTemplate={editingTemplate}
          onDone={() => { setEditingTemplate(undefined); loadTemplates(); setTab('library') }} />
      )}
    </div>
  )
}
