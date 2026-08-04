'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/appContext'
import { Employee } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_SIZES: Record<string, { label: string; w: number; h: number; category: Category }> = {
  flyer_letter:       { label: '8.5" × 11" Flyer',          w: 1275, h: 1650,  category: 'flyer' },
  social_square:      { label: 'Social Square (1080×1080)',  w: 1080, h: 1080,  category: 'social' },
  social_story:       { label: 'Social Story (1080×1920)',   w: 1080, h: 1920,  category: 'social' },
  social_landscape:   { label: 'Social Landscape (1200×628)',w: 1200, h: 628,   category: 'social' },
  social_linkedin:    { label: 'LinkedIn Post (1200×627)',   w: 1200, h: 627,   category: 'social' },
  custom:             { label: 'Custom Upload Size',         w: 1080, h: 1080,  category: 'other'  },
}

type Category = 'flyer' | 'social' | 'other'

const CATEGORY_LABELS: Record<Category, string> = {
  flyer:  '📄 Flyers',
  social: '📱 Social Media',
  other:  '📁 Other',
}

type FieldType = 'name' | 'title' | 'nmls' | 'email' | 'phone' | 'headshot'

const FIELD_META: Record<FieldType, { label: string; color: string }> = {
  name:     { label: 'Full Name', color: '#3B82F6' },
  title:    { label: 'Job Title', color: '#8B5CF6' },
  nmls:     { label: 'NMLS #',   color: '#F59E0B' },
  email:    { label: 'Email',    color: '#10B981' },
  phone:    { label: 'Phone',    color: '#EF4444' },
  headshot: { label: 'Headshot', color: '#EC4899' },
}

const FIELD_TYPES = Object.keys(FIELD_META) as FieldType[]

// ─── Types ────────────────────────────────────────────────────────────────────

interface TplField {
  id: string
  type: FieldType
  x: number         // 0–1 fraction of canvas width
  y: number         // 0–1 fraction of canvas height
  fontSize: number  // 0–1 fraction of canvas height
  fontColor: string
  bold: boolean
}

interface TplPage {
  bg_url: string    // background image URL (stored in Supabase)
  fields: TplField[]
}

interface MktTemplate {
  id: string
  name: string
  category: Category
  canvas_size: string
  pages: TplPage[]
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function empValue(emp: Employee | undefined, headshot: string, type: FieldType): string {
  switch (type) {
    case 'name':     return emp?.name ?? '[Full Name]'
    case 'title':    return emp?.title ?? '[Job Title]'
    case 'nmls':     return emp?.nmls_number ? `NMLS# ${emp.nmls_number}` : '[NMLS#]'
    case 'email':    return emp?.work_email ?? '[Email]'
    case 'phone':    return emp?.phone ?? '[Phone]'
    case 'headshot': return headshot || emp?.headshot_url || ''
  }
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ onFile, label = 'Drop image here or click to browse', small = false }: {
  onFile: (f: File) => void
  label?: string
  small?: boolean
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
        borderRadius: small ? 10 : 14, padding: small ? '20px 16px' : '48px 32px',
        textAlign: 'center', cursor: 'pointer',
        background: drag ? '#EFF6FF' : '#F9FAFB', transition: 'all 0.15s',
      }}
    >
      {!small && <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>}
      <div style={{ fontSize: small ? 12 : 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
      {!small && <div style={{ fontSize: 12, color: '#9CA3AF' }}>JPEG or PNG</div>}
      <input ref={ref} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

// ─── Headshot Upload (for advisors) ──────────────────────────────────────────

function HeadshotUpload({ emp, supabase, onUpdated }: {
  emp: Employee | undefined
  supabase: any
  onUpdated: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setUploading(true); setMsg('')
    try {
      const path = `headshots/${uid()}.${f.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('marketing-assets').upload(path, f, { contentType: f.type, upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('marketing-assets').getPublicUrl(path)
      if (emp) {
        await supabase.from('employees').update({ headshot_url: data.publicUrl }).eq('id', emp.id)
      }
      onUpdated(data.publicUrl)
      setMsg('✓ Headshot updated!')
    } catch (e: any) {
      setMsg(`Error: ${e.message}`)
    }
    setUploading(false)
  }

  return (
    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#0A2540', marginBottom: 4 }}>My Headshot</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Upload your photo to use in personalized marketing materials.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {emp?.headshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={emp.headshot_url} alt="headshot" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #E5E7EB' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>👤</div>
        )}
        <div>
          <button
            onClick={() => ref.current?.click()}
            disabled={uploading}
            style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 6, display: 'block' }}
          >
            {uploading ? 'Uploading…' : 'Upload Photo'}
          </button>
          {msg && <div style={{ fontSize: 12, color: msg.startsWith('Error') ? '#EF4444' : '#10B981' }}>{msg}</div>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

// ─── Generate Modal ───────────────────────────────────────────────────────────

function GenerateModal({ template, emp, headshot, onClose }: {
  template: MktTemplate
  emp: Employee | undefined
  headshot: string
  onClose: () => void
}) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [rendered, setRendered] = useState(false)
  const [generating, setGenerating] = useState(true)
  const [err, setErr] = useState('')

  const size = CANVAS_SIZES[template.canvas_size] ?? CANVAS_SIZES.custom

  useEffect(() => { renderAll() }, [])

  async function renderAll() {
    setGenerating(true)
    try {
      for (let i = 0; i < template.pages.length; i++) {
        await renderPage(i)
      }
      setRendered(true)
    } catch (e: any) {
      setErr(e.message)
    }
    setGenerating(false)
  }

  async function renderPage(idx: number) {
    const page = template.pages[idx]
    const canvas = canvasRefs.current[idx]
    if (!canvas) return
    canvas.width = size.w
    canvas.height = size.h
    const ctx = canvas.getContext('2d')!

    if (page.bg_url) {
      const resp = await fetch(page.bg_url)
      const blob = await resp.blob()
      const objUrl = URL.createObjectURL(blob)
      await new Promise<void>((res, rej) => {
        const img = new Image()
        img.onload = () => { ctx.drawImage(img, 0, 0, size.w, size.h); URL.revokeObjectURL(objUrl); res() }
        img.onerror = rej
        img.src = objUrl
      })
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size.w, size.h)
    }

    for (const f of page.fields) {
      const px = f.x * size.w
      const py = f.y * size.h
      const fs = Math.max(10, Math.round(f.fontSize * size.h))

      if (f.type === 'headshot') {
        const url = empValue(emp, headshot, 'headshot')
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
        const val = empValue(emp, headshot, f.type)
        ctx.font = `${f.bold ? 'bold ' : ''}${fs}px Inter, Arial, sans-serif`
        ctx.fillStyle = f.fontColor
        ctx.fillText(val, px, py)
      }
    }
  }

  function downloadPage(idx: number) {
    const canvas = canvasRefs.current[idx]
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    const suffix = template.pages.length > 1 ? `_page${idx + 1}` : ''
    a.download = `${template.name.replace(/\s+/g, '_')}${suffix}_${(emp?.name ?? 'personalized').replace(/\s+/g, '_')}.png`
    a.click()
  }

  function downloadAll() {
    template.pages.forEach((_, i) => downloadPage(i))
  }

  // Preview display size
  const maxW = 600
  const dispW = Math.min(maxW, size.w)
  const dispH = dispW * (size.h / size.w)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 680, width: '100%', maxHeight: '92vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0A2540' }}>{template.name}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
              {emp ? `For ${emp.name}` : 'Preview'} · {CANVAS_SIZES[template.canvas_size]?.label ?? template.canvas_size}
              {template.pages.length > 1 && ` · ${template.pages.length} pages`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>

        {/* Page canvases */}
        {template.pages.map((_, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            {template.pages.length > 1 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>Page {i + 1}</div>
            )}
            <div style={{ position: 'relative' }}>
              <canvas
                ref={el => { canvasRefs.current[i] = el }}
                style={{ width: dispW, height: dispH, borderRadius: 10, border: '1px solid #E5E7EB', display: 'block', opacity: generating ? 0.4 : 1 }}
              />
              {!generating && rendered && template.pages.length > 1 && (
                <button
                  onClick={() => downloadPage(i)}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(10,37,64,.8)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  ⬇ Page {i + 1}
                </button>
              )}
            </div>
          </div>
        ))}

        {generating && <div style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 8 }}>Rendering…</div>}
        {err && <div style={{ marginTop: 8, color: '#EF4444', fontSize: 13 }}>⚠ {err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={downloadAll}
            disabled={!rendered}
            style={{ flex: 1, background: rendered ? '#0A2540' : '#D1D5DB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: rendered ? 'pointer' : 'default' }}
          >
            ⬇ {template.pages.length > 1 ? `Download All ${template.pages.length} Pages` : 'Download PNG'}
          </button>
          <button onClick={onClose} style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Close
          </button>
        </div>
        {template.pages.length > 1 && <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>Each page downloads as a separate PNG. Use your PDF tool to combine them into a single document.</p>}
      </div>
    </div>
  )
}

// ─── Single-Page Editor ───────────────────────────────────────────────────────

interface EditorPage {
  bgFile: File | null
  bgUrl: string
  fields: TplField[]
}

function PageCanvas({ page, dispW, dispH, selectedId, pendingPos, onCanvasClick, onFieldSelect }: {
  page: EditorPage
  dispW: number
  dispH: number
  selectedId: string | null
  pendingPos: { x: number; y: number } | null
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onFieldSelect: (id: string) => void
}) {
  return (
    <div
      style={{ position: 'relative', width: dispW, height: dispH, cursor: 'crosshair', userSelect: 'none', borderRadius: 12, overflow: 'hidden', border: '2px solid #E5E7EB', background: '#F3F4F6', flexShrink: 0 }}
      onClick={onCanvasClick}
    >
      {page.bgUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={page.bgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>No background — click to place fields on blank canvas</div>
      }

      {/* Field chips */}
      {page.fields.map(f => (
        <div key={f.id}
          style={{
            position: 'absolute', left: f.x * dispW, top: f.y * dispH, transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', background: FIELD_META[f.type].color, color: '#fff',
            fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
            border: f.id === selectedId ? '2px solid #fff' : '2px solid transparent',
            boxShadow: '0 2px 8px rgba(0,0,0,.4)', whiteSpace: 'nowrap',
          }}
        >
          {FIELD_META[f.type].label}
        </div>
      ))}

      {/* Field picker popup */}
      {pendingPos && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(pendingPos.x * dispW, dispW - 216),
            top: Math.max(pendingPos.y * dispH - 170, 4),
            background: '#0A2540', borderRadius: 12, padding: 12,
            boxShadow: '0 6px 24px rgba(0,0,0,.6)', zIndex: 10, width: 206,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 11, color: '#9FB0C4', fontWeight: 600, marginBottom: 8 }}>Choose field type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {FIELD_TYPES.map(t => (
              <button key={t}
                onClick={() => onFieldSelect(t)}
                style={{ background: FIELD_META[t].color, color: '#fff', border: 'none', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                {FIELD_META[t].label}
              </button>
            ))}
          </div>
          <button onClick={() => onFieldSelect('')} style={{ width: '100%', background: 'rgba(255,255,255,.1)', color: '#9FB0C4', border: 'none', borderRadius: 8, padding: '6px 0', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

// ─── Admin Upload + Multi-Page Editor ────────────────────────────────────────

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

  // Sync category with canvas size default
  useEffect(() => {
    setCategory(CANVAS_SIZES[canvasSize]?.category ?? 'other')
  }, [canvasSize])

  function dispDims() {
    const box = boxRef.current
    const maxW = box ? Math.min(box.clientWidth, 640) : 640
    const h = maxW * (size.h / size.w)
    return { w: maxW, h }
  }

  function updatePage(idx: number, patch: Partial<EditorPage>) {
    setPages(ps => ps.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  function handleBgFile(f: File) {
    updatePage(pageIdx, { bgFile: f, bgUrl: URL.createObjectURL(f) })
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const { w, h } = dispDims()
    const rect = e.currentTarget.getBoundingClientRect()
    const rx = (e.clientX - rect.left) / w
    const ry = (e.clientY - rect.top) / h

    // Check click on existing chip
    for (const f of page.fields) {
      const fx = f.x * w, fy = f.y * h
      if (Math.abs(e.clientX - rect.left - fx) < 50 && Math.abs(e.clientY - rect.top - fy) < 22) {
        setSelectedId(f.id === selectedId ? null : f.id)
        setPendingPos(null)
        return
      }
    }
    setSelectedId(null)
    setPendingPos({ x: rx, y: ry })
  }

  function handleFieldSelect(type: string) {
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

  function addPage() {
    setPages(ps => [...ps, { bgFile: null, bgUrl: '', fields: [] }])
    setPageIdx(pages.length)
    setSelectedId(null)
    setPendingPos(null)
  }

  function removePage(idx: number) {
    if (pages.length === 1) return
    const next = pages.filter((_, i) => i !== idx)
    setPages(next)
    setPageIdx(Math.min(pageIdx, next.length - 1))
    setSelectedId(null)
  }

  async function handleSave() {
    if (!tplName.trim()) { setMsg('Enter a template name.'); return }
    if (pages.every(p => !p.bgFile && !p.bgUrl)) { setMsg('Upload at least one background image.'); return }
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
      const { error } = await supabase.from('marketing_templates').insert({
        name: tplName.trim(),
        category,
        canvas_size: canvasSize,
        pages: savedPages,
      })
      if (error) throw error
      setMsg('✓ Template saved!')
      setTimeout(onDone, 700)
    } catch (e: any) {
      setMsg(`Error: ${e.message}`)
    }
    setSaving(false)
  }

  const { w: dw, h: dh } = dispDims()
  const selected = page.fields.find(f => f.id === selectedId)

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Left: settings + page list */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Canvas Size</label>
          <select value={canvasSize} onChange={e => setCanvasSize(e.target.value)}
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '7px 10px', fontSize: 12, marginBottom: 12, background: '#fff' }}>
            {Object.entries(CANVAS_SIZES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '7px 10px', fontSize: 12, background: '#fff' }}>
            <option value="flyer">📄 Flyer</option>
            <option value="social">📱 Social Media</option>
            <option value="other">📁 Other</option>
          </select>
        </div>

        {/* Pages */}
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Pages</div>
          {pages.map((p, i) => (
            <div key={i}
              onClick={() => { setPageIdx(i); setSelectedId(null); setPendingPos(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                background: i === pageIdx ? '#0A2540' : '#fff',
                border: `1px solid ${i === pageIdx ? '#0A2540' : '#E5E7EB'}`,
              }}
            >
              {p.bgUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.bgUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                : <div style={{ width: 28, height: 28, borderRadius: 4, background: i === pageIdx ? 'rgba(255,255,255,.2)' : '#F3F4F6', flexShrink: 0 }} />
              }
              <span style={{ fontSize: 12, fontWeight: 600, color: i === pageIdx ? '#fff' : '#374151', flex: 1 }}>Page {i + 1}</span>
              {pages.length > 1 && (
                <button onClick={e => { e.stopPropagation(); removePage(i) }}
                  style={{ background: 'none', border: 'none', color: i === pageIdx ? 'rgba(255,255,255,.6)' : '#9CA3AF', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={addPage}
            style={{ width: '100%', background: 'transparent', border: '1px dashed #D1D5DB', borderRadius: 8, padding: '7px 0', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
            + Add Page
          </button>
        </div>
      </div>

      {/* Center: canvas */}
      <div style={{ flex: 1, minWidth: 0 }} ref={boxRef}>
        {/* Background upload for current page */}
        {!page.bgUrl ? (
          <div style={{ marginBottom: 12 }}>
            <DropZone onFile={handleBgFile} label={`Upload background for Page ${pageIdx + 1}`} />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <button onClick={() => updatePage(pageIdx, { bgFile: null, bgUrl: '' })}
              style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ✕ Replace background
            </button>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Click on image to place fields</span>
          </div>
        )}

        <PageCanvas
          page={page} dispW={dw} dispH={dh}
          selectedId={selectedId} pendingPos={pendingPos}
          onCanvasClick={handleCanvasClick}
          onFieldSelect={handleFieldSelect}
        />
      </div>

      {/* Right: controls */}
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Template Name</label>
          <input
            value={tplName} onChange={e => setTplName(e.target.value)}
            placeholder="e.g. Purchase Flyer 2026"
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 18 }}
          />

          {/* Selected field controls */}
          {selected && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: FIELD_META[selected.type].color }} />
                {FIELD_META[selected.type].label}
              </div>
              <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Font size — <strong>{Math.round(selected.fontSize * 100)}%</strong>
              </label>
              <input type="range" min={1} max={15} step={0.5}
                value={Math.round(selected.fontSize * 100)}
                onChange={e => updateField(selected.id, { fontSize: Number(e.target.value) / 100 })}
                style={{ width: '100%', marginBottom: 12 }} />
              <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 5 }}>Font color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input type="color" value={selected.fontColor}
                  onChange={e => updateField(selected.id, { fontColor: e.target.value })}
                  style={{ width: 36, height: 30, border: '1px solid #D1D5DB', cursor: 'pointer', borderRadius: 5, padding: 2 }} />
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{selected.fontColor}</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', marginBottom: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.bold} onChange={e => updateField(selected.id, { bold: e.target.checked })} />
                Bold
              </label>
              <button onClick={() => removeField(selected.id)}
                style={{ width: '100%', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Remove Field
              </button>
            </div>
          )}

          {/* Fields list */}
          {page.fields.length > 0 && !selected && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Page {pageIdx + 1} Fields</div>
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

          <button
            onClick={handleSave}
            disabled={saving || !tplName.trim()}
            style={{ width: '100%', background: (saving || !tplName.trim()) ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 13, cursor: (saving || !tplName.trim()) ? 'default' : 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save to Library'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Library View ─────────────────────────────────────────────────────────────

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
  const [generating, setGenerating] = useState<MktTemplate | null>(null)

  const categories: (Category | 'all')[] = ['all', 'flyer', 'social', 'other']
  const counts: Record<string, number> = { all: templates.length }
  for (const t of templates) { counts[t.category] = (counts[t.category] ?? 0) + 1 }

  const visible = activeCategory === 'all' ? templates : templates.filter(t => t.category === activeCategory)

  async function moveCategory(id: string, cat: Category) {
    await supabase.from('marketing_templates').update({ category: cat }).eq('id', id)
    onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Delete this template?')) return
    await supabase.from('marketing_templates').delete().eq('id', id)
    onRefresh()
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading templates…</div>

  return (
    <div>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {categories.map(cat => {
          const count = counts[cat] ?? 0
          const label = cat === 'all' ? '🗂 All' : CATEGORY_LABELS[cat]
          const active = cat === activeCategory
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 16px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                background: active ? '#0A2540' : '#F3F4F6',
                color: active ? '#fff' : '#6B7280',
              }}>
              {label}
              {count > 0 && <span style={{ marginLeft: 6, fontSize: 11, opacity: .75 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No templates here yet</div>
          {isAdmin && <div style={{ fontSize: 13, color: '#9CA3AF' }}>Upload templates using the "Upload & Edit" tab.</div>}
          {!isAdmin && <div style={{ fontSize: 13, color: '#9CA3AF' }}>Templates will appear once your admin uploads them.</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {visible.map(t => {
            const thumb = t.pages?.[0]?.bg_url ?? ''
            const sizeLabel = CANVAS_SIZES[t.canvas_size]?.label ?? t.canvas_size
            const pageCount = t.pages?.length ?? 1
            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                {/* Thumbnail */}
                <div style={{ position: 'relative', background: '#F3F4F6' }}>
                  {thumb
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={thumb} alt={t.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>No preview</div>
                  }
                  {pageCount > 1 && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(10,37,64,.75)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 8px' }}>
                      {pageCount} pages
                    </div>
                  )}
                </div>

                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0A2540', marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>{sizeLabel} · {new Date(t.created_at).toLocaleDateString()}</div>

                  {/* Admin: category selector */}
                  {isAdmin && (
                    <div style={{ marginBottom: 10 }}>
                      <select
                        value={t.category}
                        onChange={e => moveCategory(t.id, e.target.value as Category)}
                        style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 8px', fontSize: 12, color: '#374151', background: '#F9FAFB', cursor: 'pointer' }}
                      >
                        <option value="flyer">📄 Flyer</option>
                        <option value="social">📱 Social Media</option>
                        <option value="other">📁 Other</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setGenerating(t)}
                      style={{ flex: 1, background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >
                      Generate Mine
                    </button>
                    {isAdmin && (
                      <button onClick={() => del(t.id)}
                        style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '9px 13px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {generating && (
        <GenerateModal template={generating} emp={myEmployee} headshot={headshot} onClose={() => setGenerating(null)} />
      )}
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

  const myEmployee = employees.find(e =>
    e.work_email?.toLowerCase() === profile?.email?.toLowerCase()
  )

  // Sync headshot state when employee record loads
  useEffect(() => {
    if (myEmployee?.headshot_url) setHeadshot(myEmployee.headshot_url)
  }, [myEmployee?.headshot_url])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('marketing_templates')
      .select('*')
      .order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function tabBtn(active: boolean): React.CSSProperties {
    return {
      padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      background: active ? '#0A2540' : '#F3F4F6',
      color: active ? '#fff' : '#6B7280',
      transition: 'background .15s',
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1320, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', margin: '0 0 6px' }}>Marketing Templates</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Personalized marketing materials for every advisor</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('library')} style={tabBtn(tab === 'library')}>📚 Library</button>
          {isAdmin && <button onClick={() => setTab('admin')} style={tabBtn(tab === 'admin')}>⬆ Upload & Edit</button>}
        </div>
      </div>

      {tab === 'library' && (
        <>
          <HeadshotUpload emp={myEmployee} supabase={supabase} onUpdated={setHeadshot} />
          <LibraryView
            templates={templates} loading={loading} myEmployee={myEmployee}
            headshot={headshot} supabase={supabase} onRefresh={load} isAdmin={isAdmin}
          />
        </>
      )}
      {tab === 'admin' && isAdmin && (
        <AdminTab supabase={supabase} onDone={() => { load(); setTab('library') }} />
      )}
    </div>
  )
}
