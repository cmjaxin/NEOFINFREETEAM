'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/appContext'
import { Employee } from '@/lib/types'

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
}

const FIELD_GROUPS: Record<string, FieldType[]> = {
  'Advisor':  ['name', 'title', 'nmls', 'email', 'phone', 'headshot'],
  'Partner':  ['partner_name', 'partner_title', 'partner_company', 'partner_phone', 'partner_email', 'partner_headshot', 'partner_logo'],
  'Property': ['property_address', 'property_price', 'property_beds', 'property_baths', 'property_sqft', 'property_extras', 'property_header', 'property_description', 'property_image', 'property_image_2', 'property_image_3', 'property_image_4', 'open_house_date', 'open_house_time'],
  'Pre-Approval': ['pa_regarding', 'pa_date', 'pa_address', 'pa_loan_type', 'pa_purchase_price', 'pa_down_payment', 'pa_loan_amount', 'pa_occupancy'],
  'Testimonial': ['testimonial_review', 'testimonial_name'],
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

interface TplPage { bg_url: string; fields: TplField[] }

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

async function renderPageToCanvas(canvas: HTMLCanvasElement, page: TplPage, values: FieldValues, w: number, h: number) {
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!

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
        const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight)
        const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale
        const ox = (f.panX ?? 0.5) * Math.max(0, iw - dw)
        const oy = (f.panY ?? 0.5) * Math.max(0, ih - dh)
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
                ? <img src={p.logo_url} alt="" style={{ maxHeight: 44, maxWidth: '80%', objectFit: 'contain' }} />
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
  profile: { full_name: string; title: string; email: string; nmls?: string; phone?: string; headshot_url?: string } | null
  supabase: any; partners: Partner[]; onClose: () => void
}) {
  const size = CANVAS_SIZES[template.canvas_size] ?? CANVAS_SIZES.custom
  const [values, setValues] = useState<FieldValues>(() => initValues(profile, emp))
  const [selectedPartner, setSelectedPartner] = useState<string>('')
  const [pageIdx, setPageIdx] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [headshotUploading, setHeadshotUploading] = useState(false)
  const [mobileTab, setMobileTab] = useState<'preview' | 'fill'>('fill')
  const previewRef = useRef<HTMLCanvasElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const usedFields = new Set<FieldType>()
  template.pages.forEach(p => p.fields.forEach(f => usedFields.has(f.type) || usedFields.add(f.type)))

  const hasPartnerFields = ['partner_name','partner_title','partner_company','partner_phone','partner_email','partner_headshot','partner_logo'].some(t => usedFields.has(t as FieldType))
  const hasPropertyFields = ['property_address','property_price','property_beds','property_baths','property_sqft','property_extras','property_header','property_description','property_image','property_image_2','property_image_3','property_image_4','open_house_date','open_house_time'].some(t => usedFields.has(t as FieldType))
  const hasPreApprovalFields = ['pa_regarding','pa_date','pa_address','pa_loan_type','pa_purchase_price','pa_down_payment','pa_loan_amount','pa_occupancy'].some(t => usedFields.has(t as FieldType))
  const hasTestimonialFields = ['testimonial_review','testimonial_name'].some(t => usedFields.has(t as FieldType))

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(renderPreview, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [values, pageIdx])

  async function renderPreview() {
    const canvas = previewRef.current, container = containerRef.current
    if (!canvas || !container) return
    setRendering(true)
    const maxW = Math.min(container.clientWidth, 560)
    const previewH = Math.round(maxW * (size.h / size.w))
    try { await renderPageToCanvas(canvas, template.pages[pageIdx], values, maxW, previewH) } catch {}
    setRendering(false)
  }

  async function downloadPNG() {
    setDownloading(true)
    for (let i = 0; i < template.pages.length; i++) {
      const c = document.createElement('canvas')
      await renderPageToCanvas(c, template.pages[i], values, size.w, size.h)
      const a = document.createElement('a')
      const suffix = template.pages.length > 1 ? `_p${i + 1}` : ''
      a.href = c.toDataURL('image/png')
      a.download = `${template.name.replace(/\s+/g, '_')}${suffix}.png`
      a.click()
    }
    setDownloading(false)
  }

  async function downloadPDF() {
    setDownloading(true)
    const images: string[] = []
    for (let i = 0; i < template.pages.length; i++) {
      const c = document.createElement('canvas')
      await renderPageToCanvas(c, template.pages[i], values, size.w, size.h)
      images.push(c.toDataURL('image/png'))
    }
    const isLetter = template.canvas_size === 'flyer_letter'
    const pw = isLetter ? '8.5in' : `${size.w}px`, ph = isLetter ? '11in' : `${size.h}px`
    const win = window.open('', '_blank')!
    win.document.write(`<!DOCTYPE html><html><head><style>
      @page{size:${pw} ${ph};margin:0}body{margin:0;padding:0}img{width:100vw;height:100vh;object-fit:fill;display:block;page-break-after:always}
    </style></head><body>${images.map(src => `<img src="${src}"/>`).join('')}</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
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

  const fieldInput = (ft: FieldType) => {
    if (!usedFields.has(ft)) return null
    const meta = FIELD_META[ft]
    if (meta.isCircle || meta.isRect) return null // handled separately
    return (
      <div key={ft} style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.color, display: 'inline-block', flexShrink: 0 }} />
          {meta.label}
        </label>
        {ft === 'pa_date' ? (
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
          <label style={{ flex: 1, cursor: 'pointer' }}>
            <div style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'center' }}>
              {uploading ? 'Uploading…' : currentUrl ? 'Change' : 'Upload'}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
          </label>
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
          <button className={mobileTab === 'preview' ? 'active' : ''} onClick={() => setMobileTab('preview')}>👁 Preview</button>
        </div>

        {/* Canvas preview */}
        <div ref={containerRef} className="mkt-modal-canvas" data-hidden={mobileTab !== 'preview' ? 'true' : undefined}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
            <canvas ref={previewRef} style={{ width: '100%', aspectRatio: `${size.w} / ${size.h}`, display: 'block', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,.7)', opacity: rendering ? 0.5 : 1, transition: 'opacity .15s' }} />
            {rendering && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13 }}>Updating…</div>
              </div>
            )}
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
              style={{ width: '100%', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#374151', cursor: 'pointer', marginBottom: 6, textAlign: 'left' }}>
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
          <button onClick={handleSave} disabled={saving || !tplName.trim()}
            style={{ width: '100%', background: (saving || !tplName.trim()) ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 13, cursor: (saving || !tplName.trim()) ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : editTemplate ? 'Save Changes' : 'Publish to Library'}
          </button>
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

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('marketing_templates').select('*').order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
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
