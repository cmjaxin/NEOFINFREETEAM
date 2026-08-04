'use client'
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { useApp } from '@/lib/appContext'
import { Employee } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_SIZES: Record<string, { label: string; w: number; h: number; category: Category }> = {
  flyer_letter:     { label: '8.5" × 11" Flyer',           w: 1275, h: 1650, category: 'flyer'  },
  social_square:    { label: 'Social Square (1080×1080)',   w: 1080, h: 1080, category: 'social' },
  social_story:     { label: 'Story / Reel (1080×1920)',    w: 1080, h: 1920, category: 'social' },
  social_landscape: { label: 'Social Landscape (1200×628)', w: 1200, h: 628,  category: 'social' },
  social_linkedin:  { label: 'LinkedIn Post (1200×627)',    w: 1200, h: 627,  category: 'social' },
  custom:           { label: 'Custom',                      w: 1080, h: 1080, category: 'other'  },
}

type Category = 'flyer' | 'social' | 'other'

const CATEGORY_LABELS: Record<Category, string> = {
  flyer:  '📄 Flyers',
  social: '📱 Social Posts',
  other:  '📁 Other',
}

type FieldType = 'name' | 'title' | 'nmls' | 'email' | 'phone' | 'headshot'

const FIELD_META: Record<FieldType, { label: string; color: string; placeholder: string }> = {
  name:     { label: 'Full Name',  color: '#3B82F6', placeholder: 'Jane Smith' },
  title:    { label: 'Job Title',  color: '#8B5CF6', placeholder: 'Mortgage Advisor' },
  nmls:     { label: 'NMLS #',    color: '#F59E0B', placeholder: 'NMLS# 123456' },
  email:    { label: 'Email',     color: '#10B981', placeholder: 'jane@neohomeloans.com' },
  phone:    { label: 'Phone',     color: '#EF4444', placeholder: '(801) 555-0100' },
  headshot: { label: 'Headshot',  color: '#EC4899', placeholder: '' },
}

const FIELD_TYPES = Object.keys(FIELD_META) as FieldType[]

// ─── Types ────────────────────────────────────────────────────────────────────

interface TplField {
  id: string
  type: FieldType
  x: number
  y: number
  fontSize: number  // fraction of canvas height
  fontColor: string
  bold: boolean
}

interface TplPage { bg_url: string; fields: TplField[] }

interface MktTemplate {
  id: string
  name: string
  category: Category
  canvas_size: string
  pages: TplPage[]
  created_at: string
}

type FieldValues = Record<FieldType, string>

// ─── Shared render logic ──────────────────────────────────────────────────────

const bgCache = new Map<string, string>()  // url → blob object URL

async function getBlobUrl(url: string): Promise<string> {
  if (bgCache.has(url)) return bgCache.get(url)!
  const resp = await fetch(url)
  const blob = await resp.blob()
  const obj = URL.createObjectURL(blob)
  bgCache.set(url, obj)
  return obj
}

async function renderPageToCanvas(
  canvas: HTMLCanvasElement,
  page: TplPage,
  values: FieldValues,
  w: number,
  h: number,
) {
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  if (page.bg_url) {
    const objUrl = await getBlobUrl(page.bg_url)
    await new Promise<void>((res, rej) => {
      const img = new Image()
      img.onload = () => { ctx.drawImage(img, 0, 0, w, h); res() }
      img.onerror = rej
      img.src = objUrl
    })
  } else {
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, w, h)
  }

  for (const f of page.fields) {
    const px = f.x * w
    const py = f.y * h
    const fs = Math.max(8, Math.round(f.fontSize * h))

    if (f.type === 'headshot') {
      const url = values.headshot
      if (url) {
        await new Promise<void>(res => {
          const hi = new Image()
          hi.crossOrigin = 'anonymous'
          hi.onload = () => {
            const r = fs * 3
            ctx.save()
            ctx.beginPath()
            ctx.arc(px, py, r / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(hi, px - r / 2, py - r / 2, r, r)
            ctx.restore()
            res()
          }
          hi.onerror = () => res()
          hi.src = url
        })
      }
    } else {
      ctx.font = `${f.bold ? 'bold ' : ''}${fs}px Inter, Arial, sans-serif`
      ctx.fillStyle = f.fontColor
      ctx.fillText(values[f.type] ?? '', px, py)
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function initValues(emp: Employee | undefined, headshot: string): FieldValues {
  return {
    name:     emp?.name ?? '',
    title:    emp?.title ?? '',
    nmls:     emp?.nmls_number ? `NMLS# ${emp.nmls_number}` : '',
    email:    emp?.work_email ?? '',
    phone:    emp?.phone ?? '',
    headshot: headshot || emp?.headshot_url || '',
  }
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ onFile, label = 'Drop image here or click to browse', small = false }: {
  onFile: (f: File) => void; label?: string; small?: boolean
}) {
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${drag ? '#3B82F6' : '#D1D5DB'}`,
        borderRadius: small ? 10 : 14, padding: small ? '18px 14px' : '48px 32px',
        textAlign: 'center', cursor: 'pointer', background: drag ? '#EFF6FF' : '#F9FAFB', transition: 'all 0.15s',
      }}
    >
      {!small && <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>}
      <div style={{ fontSize: small ? 12 : 14, fontWeight: 600, color: '#374151', marginBottom: small ? 0 : 4 }}>{label}</div>
      {!small && <div style={{ fontSize: 12, color: '#9CA3AF' }}>JPEG or PNG</div>}
      <input ref={ref} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

// ─── Personalization Modal (MAXA-style) ───────────────────────────────────────

function PersonalizationModal({ template, emp, initialHeadshot, supabase, onClose }: {
  template: MktTemplate
  emp: Employee | undefined
  initialHeadshot: string
  supabase: any
  onClose: () => void
}) {
  const size = CANVAS_SIZES[template.canvas_size] ?? CANVAS_SIZES.custom
  const [values, setValues] = useState<FieldValues>(() => initValues(emp, initialHeadshot))
  const [pageIdx, setPageIdx] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [headshotUploading, setHeadshotUploading] = useState(false)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Collect which field types are actually used across all pages
  const usedFields = new Set<FieldType>()
  template.pages.forEach(p => p.fields.forEach(f => usedFields.add(f.type)))

  // Re-render preview whenever values or page changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => renderPreview(), 180)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [values, pageIdx])

  async function renderPreview() {
    const canvas = previewRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    setRendering(true)
    const maxW = Math.min(container.clientWidth, 580)
    const previewH = Math.round(maxW * (size.h / size.w))
    try {
      await renderPageToCanvas(canvas, template.pages[pageIdx], values, maxW, previewH)
    } catch {}
    setRendering(false)
  }

  async function downloadPNG() {
    setDownloading(true)
    try {
      for (let i = 0; i < template.pages.length; i++) {
        const c = document.createElement('canvas')
        await renderPageToCanvas(c, template.pages[i], values, size.w, size.h)
        const a = document.createElement('a')
        const suffix = template.pages.length > 1 ? `_p${i + 1}` : ''
        a.href = c.toDataURL('image/png')
        a.download = `${template.name.replace(/\s+/g, '_')}${suffix}.png`
        a.click()
      }
    } catch {}
    setDownloading(false)
  }

  async function downloadPDF() {
    setDownloading(true)
    try {
      const images: string[] = []
      for (let i = 0; i < template.pages.length; i++) {
        const c = document.createElement('canvas')
        await renderPageToCanvas(c, template.pages[i], values, size.w, size.h)
        images.push(c.toDataURL('image/png'))
      }
      const isLetter = template.canvas_size === 'flyer_letter'
      const pw = isLetter ? '8.5in' : `${size.w}px`
      const ph = isLetter ? '11in' : `${size.h}px`
      const win = window.open('', '_blank')!
      win.document.write(`<!DOCTYPE html><html><head><style>
        @page { size: ${pw} ${ph}; margin: 0; }
        body { margin: 0; padding: 0; }
        img { width: 100vw; height: 100vh; object-fit: fill; display: block; page-break-after: always; }
      </style></head><body>
        ${images.map(src => `<img src="${src}" />`).join('')}
      </body></html>`)
      win.document.close()
      setTimeout(() => { win.print() }, 400)
    } catch {}
    setDownloading(false)
  }

  async function handleHeadshotFile(f: File) {
    setHeadshotUploading(true)
    try {
      const path = `headshots/${uid()}.${f.name.split('.').pop()}`
      const { error } = await supabase.storage.from('marketing-assets').upload(path, f, { contentType: f.type, upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('marketing-assets').getPublicUrl(path)
      if (emp) await supabase.from('employees').update({ headshot_url: data.publicUrl }).eq('id', emp.id)
      setValues(v => ({ ...v, headshot: data.publicUrl }))
    } catch {}
    setHeadshotUploading(false)
  }

  const isFlyer = template.canvas_size === 'flyer_letter'
  const canvasAspect = size.h / size.w

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        style={{ background: '#0A2540', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>✕</button>
          <div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{template.name}</span>
            <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, marginLeft: 10 }}>{size.label}</span>
          </div>
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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Left: canvas preview */}
        <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', background: '#1a1a2e', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 32 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 580 }}>
            <canvas
              ref={previewRef}
              style={{ width: '100%', aspectRatio: `${size.w} / ${size.h}`, display: 'block', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,.6)', opacity: rendering ? 0.6 : 1, transition: 'opacity .15s' }}
            />
            {rendering && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'rgba(0,0,0,.5)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>Updating…</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: fields + download */}
        <div style={{ width: 320, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: 24, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Your Info</div>

            {(FIELD_TYPES.filter(ft => ft !== 'headshot' && usedFields.has(ft)) as FieldType[]).map(ft => (
              <div key={ft} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: FIELD_META[ft].color, display: 'inline-block', flexShrink: 0 }} />
                  {FIELD_META[ft].label}
                </label>
                <input
                  value={values[ft]}
                  onChange={e => setValues(v => ({ ...v, [ft]: e.target.value }))}
                  placeholder={FIELD_META[ft].placeholder}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none', color: '#111827' }}
                />
              </div>
            ))}

            {usedFields.has('headshot') && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: FIELD_META.headshot.color, display: 'inline-block' }} />
                  Photo
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {values.headshot
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={values.headshot} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB', flexShrink: 0 }} />
                    : <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
                  }
                  <label style={{ flex: 1 }}>
                    <div style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', textAlign: 'center' }}>
                      {headshotUploading ? 'Uploading…' : values.headshot ? 'Change Photo' : 'Upload Photo'}
                    </div>
                    <input type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleHeadshotFile(f) }} />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Download actions */}
          <div style={{ padding: '16px 24px 24px', borderTop: '1px solid #E5E7EB' }}>
            <button onClick={downloadPNG} disabled={downloading}
              style={{ width: '100%', background: downloading ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: downloading ? 'default' : 'pointer', marginBottom: 10 }}>
              ⬇ {template.pages.length > 1 ? `Download All Pages (PNG)` : 'Download PNG'}
            </button>
            {(isFlyer || template.pages.length > 1) && (
              <button onClick={downloadPDF} disabled={downloading}
                style={{ width: '100%', background: downloading ? '#D1D5DB' : '#F3F4F6', color: downloading ? '#fff' : '#374151', border: '1px solid #E5E7EB', borderRadius: 10, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: downloading ? 'default' : 'pointer' }}>
                🖨 {isFlyer ? 'Print / Save as PDF' : 'Download PDF'}
              </button>
            )}
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
              {isFlyer ? 'PDF opens print dialog — choose "Save as PDF" in your printer settings.' : 'PNG is ready to post directly to any platform.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Library card grid ────────────────────────────────────────────────────────

function LibraryView({ templates, loading, myEmployee, headshot, supabase, onRefresh, isAdmin }: {
  templates: MktTemplate[]
  loading: boolean
  myEmployee: Employee | undefined
  headshot: string
  supabase: any
  onRefresh: () => void
  isAdmin: boolean
}) {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<MktTemplate | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const categories: (Category | 'all')[] = ['all', 'flyer', 'social', 'other']
  const counts: Record<string, number> = { all: templates.length }
  for (const t of templates) counts[t.category] = (counts[t.category] ?? 0) + 1

  const visible = templates
    .filter(t => activeCategory === 'all' || t.category === activeCategory)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))

  async function moveCategory(id: string, cat: Category) {
    await supabase.from('marketing_templates').update({ category: cat }).eq('id', id)
    onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Delete this template from the library?')) return
    await supabase.from('marketing_templates').delete().eq('id', id)
    onRefresh()
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: '#9CA3AF' }}>Loading templates…</div>

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {categories.map(cat => {
            const active = cat === activeCategory
            const label = cat === 'all' ? '🗂 All' : CATEGORY_LABELS[cat]
            const count = counts[cat] ?? 0
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', background: active ? '#0A2540' : '#F3F4F6', color: active ? '#fff' : '#6B7280' }}>
                {label}{count > 0 ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search templates…"
          style={{ marginLeft: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 14px', fontSize: 13, outline: 'none', minWidth: 200 }}
        />
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
            {search ? 'No templates match your search' : 'No templates here yet'}
          </div>
          {!search && isAdmin && <div style={{ fontSize: 13, color: '#9CA3AF' }}>Upload templates in the "Upload & Edit" tab.</div>}
          {!search && !isAdmin && <div style={{ fontSize: 13, color: '#9CA3AF' }}>Templates will appear once your admin uploads them.</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {visible.map(t => {
            const thumb = t.pages?.[0]?.bg_url ?? ''
            const hovered = hoverId === t.id
            const pageCount = t.pages?.length ?? 1
            return (
              <div key={t.id}
                style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: hovered ? '0 8px 32px rgba(0,0,0,.14)' : '0 2px 8px rgba(0,0,0,.06)', transition: 'box-shadow .2s, transform .2s', transform: hovered ? 'translateY(-3px)' : 'none', cursor: 'pointer' }}
                onMouseEnter={() => setHoverId(t.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => setOpen(t)}
              >
                {/* Thumbnail with hover overlay */}
                <div style={{ position: 'relative', background: '#F3F4F6', aspectRatio: '4/3', overflow: 'hidden' }}>
                  {thumb
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={thumb} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .25s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>No preview</div>
                  }
                  {/* Hover overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(10,37,64,.62)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: hovered ? 1 : 0, transition: 'opacity .2s',
                  }}>
                    <div style={{ background: '#fff', color: '#0A2540', fontWeight: 800, fontSize: 14, borderRadius: 10, padding: '11px 28px', boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>
                      Open Template
                    </div>
                  </div>
                  {/* Badges */}
                  <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5 }}>
                    <span style={{ background: 'rgba(10,37,64,.75)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '3px 8px', backdropFilter: 'blur(4px)' }}>
                      {CANVAS_SIZES[t.canvas_size]?.label.split(' (')[0] ?? t.canvas_size}
                    </span>
                    {pageCount > 1 && (
                      <span style={{ background: 'rgba(91,203,245,.85)', color: '#0A2540', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '3px 8px' }}>
                        {pageCount}pp
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0A2540', marginBottom: 10 }}>{t.name}</div>

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <select value={t.category} onChange={e => moveCategory(t.id, e.target.value as Category)}
                        style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 8px', fontSize: 11, color: '#374151', background: '#F9FAFB', cursor: 'pointer' }}>
                        <option value="flyer">📄 Flyer</option>
                        <option value="social">📱 Social</option>
                        <option value="other">📁 Other</option>
                      </select>
                      <button onClick={() => del(t.id)}
                        style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                    </div>
                  )}
                  {!isAdmin && (
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <PersonalizationModal
          template={open}
          emp={myEmployee}
          initialHeadshot={headshot}
          supabase={supabase}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}

// ─── Admin: Upload + Multi-Page Editor ───────────────────────────────────────

interface EditorPage { bgFile: File | null; bgUrl: string; fields: TplField[] }

function AdminTab({ supabase, onDone }: { supabase: any; onDone: () => void }) {
  const [canvasSize, setCanvasSize] = useState('flyer_letter')
  const [category, setCategory] = useState<Category>('flyer')
  const [tplName, setTplName] = useState('')
  const [pages, setPages] = useState<EditorPage[]>([{ bgFile: null, bgUrl: '', fields: [] }])
  const [pageIdx, setPageIdx] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  const size = CANVAS_SIZES[canvasSize]
  const page = pages[pageIdx]

  useEffect(() => { setCategory(CANVAS_SIZES[canvasSize]?.category ?? 'other') }, [canvasSize])

  function dispDims() {
    const box = boxRef.current
    const maxW = box ? Math.min(box.clientWidth, 640) : 640
    return { w: maxW, h: Math.round(maxW * (size.h / size.w)) }
  }

  function updatePage(idx: number, patch: Partial<EditorPage>) {
    setPages(ps => ps.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const { w, h } = dispDims()
    const rect = e.currentTarget.getBoundingClientRect()
    const rx = (e.clientX - rect.left) / w
    const ry = (e.clientY - rect.top) / h
    for (const f of page.fields) {
      if (Math.abs(e.clientX - rect.left - f.x * w) < 50 && Math.abs(e.clientY - rect.top - f.y * h) < 22) {
        setSelectedId(f.id === selectedId ? null : f.id)
        setPendingPos(null)
        return
      }
    }
    setSelectedId(null)
    setPendingPos({ x: rx, y: ry })
  }

  function addField(type: string) {
    if (!pendingPos || !type) { setPendingPos(null); return }
    const f: TplField = { id: uid(), type: type as FieldType, x: pendingPos.x, y: pendingPos.y, fontSize: 0.04, fontColor: '#FFFFFF', bold: true }
    updatePage(pageIdx, { fields: [...page.fields, f] })
    setPendingPos(null)
    setSelectedId(f.id)
  }

  function updateField(id: string, patch: Partial<TplField>) {
    updatePage(pageIdx, { fields: page.fields.map(f => f.id === id ? { ...f, ...patch } : f) })
  }

  function removeField(id: string) {
    updatePage(pageIdx, { fields: page.fields.filter(f => f.id !== id) })
    if (selectedId === id) setSelectedId(null)
  }

  async function handleSave() {
    if (!tplName.trim()) { setMsg('Enter a template name.'); return }
    setSaving(true); setMsg('')
    try {
      const savedPages: TplPage[] = []
      for (const p of pages) {
        let bgUrl = p.bgUrl
        if (p.bgFile) {
          const ext = p.bgFile.name.split('.').pop() ?? 'jpg'
          const path = `templates/${uid()}.${ext}`
          const { error } = await supabase.storage.from('marketing-assets').upload(path, p.bgFile, { contentType: p.bgFile.type })
          if (error) throw error
          const { data } = supabase.storage.from('marketing-assets').getPublicUrl(path)
          bgUrl = data.publicUrl
        }
        savedPages.push({ bg_url: bgUrl, fields: p.fields })
      }
      const { error } = await supabase.from('marketing_templates').insert({ name: tplName.trim(), category, canvas_size: canvasSize, pages: savedPages })
      if (error) throw error
      setMsg('✓ Template saved to library!')
      setTimeout(onDone, 700)
    } catch (e: any) {
      setMsg(`Error: ${e.message}`)
    }
    setSaving(false)
  }

  const { w: dw, h: dh } = dispDims()
  const selected = page.fields.find(f => f.id === selectedId)

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Settings + pages column */}
      <div style={{ width: 192, flexShrink: 0 }}>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.08em' }}>Canvas Size</label>
          <select value={canvasSize} onChange={e => setCanvasSize(e.target.value)}
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 7, padding: '6px 8px', fontSize: 12, marginBottom: 12, background: '#fff' }}>
            {Object.entries(CANVAS_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.08em' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 7, padding: '6px 8px', fontSize: 12, background: '#fff' }}>
            <option value="flyer">📄 Flyer</option>
            <option value="social">📱 Social Media</option>
            <option value="other">📁 Other</option>
          </select>
        </div>

        {/* Pages */}
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pages</div>
          {pages.map((p, i) => (
            <div key={i} onClick={() => { setPageIdx(i); setSelectedId(null); setPendingPos(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: i === pageIdx ? '#0A2540' : '#fff', border: `1px solid ${i === pageIdx ? '#0A2540' : '#E5E7EB'}` }}>
              {p.bgUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.bgUrl} alt="" style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                : <div style={{ width: 26, height: 26, borderRadius: 4, background: i === pageIdx ? 'rgba(255,255,255,.2)' : '#F3F4F6', flexShrink: 0 }} />
              }
              <span style={{ fontSize: 12, fontWeight: 600, color: i === pageIdx ? '#fff' : '#374151', flex: 1 }}>Page {i + 1}</span>
              {pages.length > 1 && (
                <button onClick={e => { e.stopPropagation(); if (pages.length === 1) return; const next = pages.filter((_, j) => j !== i); setPages(next); setPageIdx(Math.min(pageIdx, next.length - 1)) }}
                  style={{ background: 'none', border: 'none', color: i === pageIdx ? 'rgba(255,255,255,.5)' : '#9CA3AF', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={() => { setPages(ps => [...ps, { bgFile: null, bgUrl: '', fields: [] }]); setPageIdx(pages.length) }}
            style={{ width: '100%', background: 'transparent', border: '1px dashed #D1D5DB', borderRadius: 8, padding: '7px 0', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
            + Add Page
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minWidth: 0 }} ref={boxRef}>
        {!page.bgUrl ? (
          <DropZone onFile={f => updatePage(pageIdx, { bgFile: f, bgUrl: URL.createObjectURL(f) })} label={`Upload background for Page ${pageIdx + 1}`} />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
              <button onClick={() => updatePage(pageIdx, { bgFile: null, bgUrl: '' })}
                style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ Replace background</button>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Click image to place fields · click a chip to select it</span>
            </div>
            <div
              style={{ position: 'relative', width: dw, height: dh, cursor: 'crosshair', userSelect: 'none', borderRadius: 10, overflow: 'hidden', border: '2px solid #E5E7EB', background: '#F3F4F6' }}
              onClick={handleCanvasClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.bgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />
              {page.fields.map(f => (
                <div key={f.id} style={{ position: 'absolute', left: f.x * dw, top: f.y * dh, transform: 'translate(-50%,-50%)', pointerEvents: 'none', background: FIELD_META[f.type].color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, border: f.id === selectedId ? '2px solid #fff' : '2px solid transparent', boxShadow: '0 2px 8px rgba(0,0,0,.4)', whiteSpace: 'nowrap' }}>
                  {FIELD_META[f.type].label}
                </div>
              ))}
              {pendingPos && (
                <div style={{ position: 'absolute', left: Math.min(pendingPos.x * dw, dw - 210), top: Math.max(pendingPos.y * dh - 168, 4), background: '#0A2540', borderRadius: 12, padding: 12, boxShadow: '0 6px 24px rgba(0,0,0,.55)', zIndex: 10, width: 200 }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 11, color: '#9FB0C4', fontWeight: 600, marginBottom: 8 }}>Choose field type</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {FIELD_TYPES.map(t => (
                      <button key={t} onClick={() => addField(t)} style={{ background: FIELD_META[t].color, color: '#fff', border: 'none', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {FIELD_META[t].label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPendingPos(null)} style={{ width: '100%', background: 'rgba(255,255,255,.1)', color: '#9FB0C4', border: 'none', borderRadius: 8, padding: '6px 0', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls panel */}
      <div style={{ width: 232, flexShrink: 0 }}>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Template Name</label>
          <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="e.g. Purchase Flyer 2026"
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 18 }} />

          {selected && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: FIELD_META[selected.type].color }} />
                {FIELD_META[selected.type].label}
              </div>
              <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Size — <strong>{Math.round(selected.fontSize * 100)}%</strong></label>
              <input type="range" min={1} max={15} step={0.5} value={Math.round(selected.fontSize * 100)}
                onChange={e => updateField(selected.id, { fontSize: Number(e.target.value) / 100 })}
                style={{ width: '100%', marginBottom: 12 }} />
              <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 5 }}>Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <input type="color" value={selected.fontColor} onChange={e => updateField(selected.id, { fontColor: e.target.value })}
                  style={{ width: 36, height: 30, border: '1px solid #D1D5DB', cursor: 'pointer', borderRadius: 5, padding: 2 }} />
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{selected.fontColor}</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', marginBottom: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.bold} onChange={e => updateField(selected.id, { bold: e.target.checked })} /> Bold
              </label>
              <button onClick={() => removeField(selected.id)}
                style={{ width: '100%', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Remove Field
              </button>
            </div>
          )}

          {page.fields.length > 0 && !selected && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Page {pageIdx + 1} Fields</div>
              {page.fields.map(f => (
                <div key={f.id} onClick={() => setSelectedId(f.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', borderRadius: 7, cursor: 'pointer', marginBottom: 4, background: '#fff', border: '1px solid #E5E7EB' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: FIELD_META[f.type].color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#374151' }}>{FIELD_META[f.type].label}</span>
                </div>
              ))}
            </div>
          )}

          {msg && <div style={{ fontSize: 12, color: msg.startsWith('Error') ? '#EF4444' : '#10B981', marginBottom: 10 }}>{msg}</div>}

          <button onClick={handleSave} disabled={saving || !tplName.trim()}
            style={{ width: '100%', background: (saving || !tplName.trim()) ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 13, cursor: (saving || !tplName.trim()) ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : 'Publish to Library'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Marketing() {
  const { profile, employees, supabase } = useApp()
  const isColin = profile?.email?.toLowerCase() === 'colin.jenson@neohomeloans.com'
  const isAdmin = profile?.role === 'admin' || isColin
  const [tab, setTab] = useState<'library' | 'admin'>('library')
  const [templates, setTemplates] = useState<MktTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [headshot, setHeadshot] = useState('')

  const myEmployee = employees.find(e => e.work_email?.toLowerCase() === profile?.email?.toLowerCase())

  useEffect(() => { if (myEmployee?.headshot_url) setHeadshot(myEmployee.headshot_url) }, [myEmployee?.headshot_url])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('marketing_templates').select('*').order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', margin: '0 0 6px' }}>Marketing Templates</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Click any template to personalize and download</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('library')} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: tab === 'library' ? '#0A2540' : '#F3F4F6', color: tab === 'library' ? '#fff' : '#6B7280' }}>📚 Library</button>
          {isAdmin && <button onClick={() => setTab('admin')} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: tab === 'admin' ? '#0A2540' : '#F3F4F6', color: tab === 'admin' ? '#fff' : '#6B7280' }}>⬆ Upload & Edit</button>}
        </div>
      </div>

      {tab === 'library' && (
        <LibraryView templates={templates} loading={loading} myEmployee={myEmployee} headshot={headshot}
          supabase={supabase} onRefresh={load} isAdmin={isAdmin} />
      )}
      {tab === 'admin' && isAdmin && (
        <AdminTab supabase={supabase} onDone={() => { load(); setTab('library') }} />
      )}
    </div>
  )
}
