'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/appContext'
import { Employee } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface TplField {
  id: string
  type: FieldType
  x: number         // 0–1 fraction of image width
  y: number         // 0–1 fraction of image height
  fontSize: number  // 0–1 fraction of image height
  fontColor: string
  bold: boolean
}

interface MktTemplate {
  id: string
  name: string
  file_url: string
  fields: TplField[]
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

function empValue(emp: Employee | undefined, type: FieldType): string {
  if (!emp) return `[${FIELD_META[type].label}]`
  switch (type) {
    case 'name':     return emp.name ?? ''
    case 'title':    return emp.title ?? ''
    case 'nmls':     return emp.nmls_number ? `NMLS# ${emp.nmls_number}` : ''
    case 'email':    return emp.work_email ?? ''
    case 'phone':    return emp.phone ?? ''
    case 'headshot': return emp.headshot_url ?? ''
  }
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? '#3B82F6' : '#D1D5DB'}`,
        borderRadius: 14, padding: '60px 40px', textAlign: 'center',
        cursor: 'pointer', background: drag ? '#EFF6FF' : '#F9FAFB', transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Drop template here or click to browse</div>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>JPEG · PNG · PDF</div>
      <input
        ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
}

// ─── Generate Modal ───────────────────────────────────────────────────────────

function GenerateModal({ template, emp, onClose }: {
  template: MktTemplate
  emp: Employee | undefined
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [generating, setGenerating] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => { renderCanvas() }, [])

  async function renderCanvas() {
    setGenerating(true)
    try {
      const resp = await fetch(template.file_url)
      const blob = await resp.blob()
      const objUrl = URL.createObjectURL(blob)

      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = async () => {
          const canvas = canvasRef.current
          if (!canvas) { resolve(); return }
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)

          for (const f of template.fields) {
            const px = f.x * img.naturalWidth
            const py = f.y * img.naturalHeight
            const fs = Math.max(8, Math.round(f.fontSize * img.naturalHeight))

            if (f.type === 'headshot') {
              const url = empValue(emp, 'headshot')
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
              const val = empValue(emp, f.type)
              ctx.font = `${f.bold ? 'bold ' : ''}${fs}px Inter, Arial, sans-serif`
              ctx.fillStyle = f.fontColor
              ctx.fillText(val, px, py)
            }
          }

          URL.revokeObjectURL(objUrl)
          setReady(true)
          setGenerating(false)
          resolve()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = objUrl
      })
    } catch (e: any) {
      setErr(e.message ?? 'Render failed')
      setGenerating(false)
    }
  }

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${template.name.replace(/\s+/g, '_')}_${(emp?.name ?? 'personalized').replace(/\s+/g, '_')}.png`
    a.click()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 820, width: '100%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A2540' }}>{template.name}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
              {emp ? `Personalized for ${emp.name}` : 'Preview — no employee record found for your account'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 10, border: '1px solid #E5E7EB', display: 'block' }} />
          {generating && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.6)', borderRadius: 10 }}>
              <div style={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Rendering…</div>
            </div>
          )}
        </div>

        {err && <div style={{ marginTop: 12, color: '#EF4444', fontSize: 13 }}>⚠ {err}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={download}
            disabled={!ready}
            style={{ flex: 1, background: ready ? '#0A2540' : '#D1D5DB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: ready ? 'pointer' : 'default', transition: 'background .15s' }}
          >
            ⬇ Download PNG
          </button>
          <button onClick={onClose} style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Library View ─────────────────────────────────────────────────────────────

function LibraryView({ templates, loading, myEmployee, supabase, onRefresh, isAdmin }: {
  templates: MktTemplate[]
  loading: boolean
  myEmployee: Employee | undefined
  supabase: any
  onRefresh: () => void
  isAdmin: boolean
}) {
  const [generating, setGenerating] = useState<MktTemplate | null>(null)

  async function del(id: string) {
    if (!confirm('Delete this template from the library?')) return
    await supabase.from('marketing_templates').delete().eq('id', id)
    onRefresh()
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Loading templates…</div>

  if (templates.length === 0) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No templates yet</div>
      {isAdmin && <div style={{ fontSize: 13, color: '#9CA3AF' }}>Upload your first template using the "Upload & Edit" tab above.</div>}
      {!isAdmin && <div style={{ fontSize: 13, color: '#9CA3AF' }}>Templates will appear here once your admin uploads them.</div>}
    </div>
  )

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
        {templates.map(t => (
          <div key={t.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.file_url} alt={t.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', background: '#F3F4F6' }} />
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0A2540', marginBottom: 3 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                {t.fields.length} field{t.fields.length !== 1 ? 's' : ''} · {new Date(t.created_at).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setGenerating(t)}
                  style={{ flex: 1, background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Generate Mine
                </button>
                {isAdmin && (
                  <button
                    onClick={() => del(t.id)}
                    style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    title="Delete template"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {generating && <GenerateModal template={generating} emp={myEmployee} onClose={() => setGenerating(null)} />}
    </>
  )
}

// ─── Admin Upload + Editor ────────────────────────────────────────────────────

function AdminTab({ supabase, onDone }: { supabase: any; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [natW, setNatW] = useState(1)
  const [natH, setNatH] = useState(1)
  const [fields, setFields] = useState<TplField[]>([])
  const [tplName, setTplName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setFields([])
    setSelectedId(null)
    setPendingPos(null)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function onImgLoad() {
    const el = imgRef.current
    if (el) { setNatW(el.naturalWidth); setNatH(el.naturalHeight) }
  }

  function dispDims(): { w: number; h: number } {
    const box = boxRef.current
    const maxW = box ? Math.min(box.clientWidth, 720) : 720
    return { w: maxW, h: maxW * (natH / natW) }
  }

  function handleImgClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const { w, h } = dispDims()
    const rx = (e.clientX - rect.left) / w
    const ry = (e.clientY - rect.top) / h

    // Check if clicking near an existing field chip
    for (const f of fields) {
      const fx = f.x * w, fy = f.y * h
      if (Math.abs(e.clientX - rect.left - fx) < 50 && Math.abs(e.clientY - rect.top - fy) < 22) {
        setSelectedId(f.id === selectedId ? null : f.id)
        setPendingPos(null)
        return
      }
    }

    // Place new field
    setSelectedId(null)
    setPendingPos({ x: rx, y: ry })
  }

  function addField(type: FieldType) {
    if (!pendingPos) return
    const f: TplField = { id: uid(), type, x: pendingPos.x, y: pendingPos.y, fontSize: 0.04, fontColor: '#FFFFFF', bold: true }
    setFields(fs => [...fs, f])
    setPendingPos(null)
    setSelectedId(f.id)
  }

  function updateField(id: string, patch: Partial<TplField>) {
    setFields(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function removeField(id: string) {
    setFields(fs => fs.filter(f => f.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function handleSave() {
    if (!file) { setMsg('Please upload a template image.'); return }
    if (!tplName.trim()) { setMsg('Please enter a template name.'); return }
    setSaving(true); setMsg('')
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${uid()}.${ext}`
      const { error: upErr } = await supabase.storage.from('marketing-templates').upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('marketing-templates').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('marketing_templates').insert({ name: tplName.trim(), file_url: urlData.publicUrl, fields })
      if (dbErr) throw dbErr
      setMsg('✓ Template saved!')
      setTimeout(onDone, 800)
    } catch (e: any) {
      setMsg(`Error: ${e.message}`)
    }
    setSaving(false)
  }

  const { w: dw, h: dh } = dispDims()
  const selected = fields.find(f => f.id === selectedId)

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Canvas area */}
      <div style={{ flex: 1, minWidth: 0 }} ref={boxRef}>
        {!file ? (
          <DropZone onFile={handleFile} />
        ) : (
          <>
            <div
              style={{ position: 'relative', width: dw, height: dh, cursor: 'crosshair', userSelect: 'none', borderRadius: 12, overflow: 'hidden', border: '2px solid #E5E7EB' }}
              onClick={handleImgClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={previewUrl} alt="template" onLoad={onImgLoad} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />

              {/* Field chips */}
              {fields.map(f => (
                <div key={f.id} style={{
                  position: 'absolute', left: f.x * dw, top: f.y * dh,
                  transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                  background: FIELD_META[f.type].color, color: '#fff',
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                  border: f.id === selectedId ? '2px solid #fff' : '2px solid transparent',
                  boxShadow: '0 2px 8px rgba(0,0,0,.4)', whiteSpace: 'nowrap',
                }}>
                  {FIELD_META[f.type].label}
                </div>
              ))}

              {/* Field type picker popup */}
              {pendingPos && (
                <div
                  style={{
                    position: 'absolute',
                    left: Math.min(pendingPos.x * dw, dw - 210),
                    top: Math.max(pendingPos.y * dh - 160, 8),
                    background: '#0A2540', borderRadius: 12, padding: 12,
                    boxShadow: '0 6px 24px rgba(0,0,0,.5)', zIndex: 10, width: 200,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontSize: 11, color: '#9FB0C4', fontWeight: 600, marginBottom: 8 }}>Choose field type</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {FIELD_TYPES.map(t => (
                      <button key={t} onClick={() => addField(t)} style={{
                        background: FIELD_META[t].color, color: '#fff', border: 'none',
                        borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}>
                        {FIELD_META[t].label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPendingPos(null)} style={{ width: '100%', background: 'rgba(255,255,255,.1)', color: '#9FB0C4', border: 'none', borderRadius: 8, padding: '6px 0', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                Click anywhere on the image to place a field. Click a field chip to select it.
              </p>
              <button onClick={() => { setFile(null); setPreviewUrl(''); setFields([]) }} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                ✕ Remove & start over
              </button>
            </div>
          </>
        )}
      </div>

      {/* Controls panel */}
      <div style={{ width: 270, flexShrink: 0 }}>
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Template Name</label>
          <input
            value={tplName}
            onChange={e => setTplName(e.target.value)}
            placeholder="e.g. Purchase Flyer 2026"
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 20 }}
          />

          {/* Selected field controls */}
          {selected && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: FIELD_META[selected.type].color }} />
                {FIELD_META[selected.type].label}
              </div>

              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Font size — <strong>{Math.round(selected.fontSize * 100)}% of height</strong>
              </label>
              <input type="range" min={1} max={15} step={0.5}
                value={Math.round(selected.fontSize * 100)}
                onChange={e => updateField(selected.id, { fontSize: Number(e.target.value) / 100 })}
                style={{ width: '100%', marginBottom: 14 }}
              />

              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Font color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <input type="color" value={selected.fontColor}
                  onChange={e => updateField(selected.id, { fontColor: e.target.value })}
                  style={{ width: 40, height: 34, border: '1px solid #D1D5DB', cursor: 'pointer', borderRadius: 6, padding: 2 }}
                />
                <span style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{selected.fontColor}</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', marginBottom: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.bold} onChange={e => updateField(selected.id, { bold: e.target.checked })} />
                Bold text
              </label>

              <button onClick={() => removeField(selected.id)} style={{ width: '100%', background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Remove Field
              </button>
            </div>
          )}

          {/* Fields list when nothing selected */}
          {fields.length > 0 && !selected && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Placed fields ({fields.length})</div>
              {fields.map(f => (
                <div key={f.id} onClick={() => setSelectedId(f.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: '#fff', border: '1px solid #E5E7EB' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: FIELD_META[f.type].color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{FIELD_META[f.type].label}</span>
                </div>
              ))}
            </div>
          )}

          {msg && (
            <div style={{ fontSize: 13, color: msg.startsWith('Error') ? '#EF4444' : '#10B981', marginBottom: 12 }}>{msg}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !file || !tplName.trim()}
            style={{ width: '100%', background: (saving || !file || !tplName.trim()) ? '#D1D5DB' : '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: (saving || !file || !tplName.trim()) ? 'default' : 'pointer', transition: 'background .15s' }}
          >
            {saving ? 'Saving…' : 'Save to Library'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function Marketing() {
  const { profile, employees, supabase } = useApp()
  const isColin = profile?.email?.toLowerCase() === 'colin.jenson@neohomeloans.com'
  const isAdmin = profile?.role === 'admin' || isColin
  const [tab, setTab] = useState<'library' | 'admin'>('library')
  const [templates, setTemplates] = useState<MktTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const myEmployee = employees.find(e =>
    e.work_email?.toLowerCase() === profile?.email?.toLowerCase()
  )

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
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', margin: '0 0 6px' }}>Marketing Templates</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Personalized marketing materials for every advisor</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTab('library')} style={tabBtn(tab === 'library')}>📚 Library</button>
            <button onClick={() => setTab('admin')} style={tabBtn(tab === 'admin')}>⬆ Upload & Edit</button>
          </div>
        )}
      </div>

      {tab === 'library' && (
        <LibraryView
          templates={templates} loading={loading} myEmployee={myEmployee}
          supabase={supabase} onRefresh={load} isAdmin={isAdmin}
        />
      )}
      {tab === 'admin' && isAdmin && (
        <AdminTab supabase={supabase} onDone={() => { load(); setTab('library') }} />
      )}
    </div>
  )
}
