'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/appContext'
import { Partner } from '@/lib/types'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  text: '#1F2937', dim: '#374151',
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const PORTAL_BASE = typeof window !== 'undefined' ? window.location.origin : ''

interface PartnerForm {
  name: string
  title: string
  brokerage: string
  email: string
  phone: string
  nmls: string
  photo_url: string
  logo_url: string
  bio: string
}

const EMPTY: PartnerForm = {
  name: '', title: '', brokerage: '', email: '', phone: '',
  nmls: '', photo_url: '', logo_url: '', bio: '',
}

export default function Partners() {
  const { profile } = useApp()
  const supabase = createClient()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [form, setForm] = useState<PartnerForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({})

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('partners')
      .select('*')
      .order('name')
    setPartners(data ?? [])

    // Get listing counts per partner
    if (data && data.length > 0) {
      const ids = data.map(p => p.id)
      const { data: pages } = await supabase
        .from('open_house_pages')
        .select('partner_id')
        .in('partner_id', ids)
        .eq('status', 'active')
      const counts: Record<string, number> = {}
      for (const p of pages ?? []) {
        if (p.partner_id) counts[p.partner_id] = (counts[p.partner_id] ?? 0) + 1
      }
      setListingCounts(counts)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setErr('')
    setShowModal(true)
  }

  function openEdit(p: Partner) {
    setEditing(p)
    setForm({
      name: p.name, title: p.title ?? '', brokerage: p.brokerage ?? '',
      email: p.email ?? '', phone: p.phone ?? '', nmls: p.nmls ?? '',
      photo_url: p.photo_url ?? '', logo_url: p.logo_url ?? '', bio: p.bio ?? '',
    })
    setErr('')
    setShowModal(true)
  }

  async function save() {
    if (!form.name.trim()) { setErr('Name is required.'); return }
    setSaving(true); setErr('')
    const slug = slugify(form.name + (form.brokerage ? '-' + form.brokerage : ''))
    const payload = { ...form, slug, created_by: profile!.id }
    let error
    if (editing) {
      ;({ error } = await supabase.from('partners').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id))
    } else {
      ;({ error } = await supabase.from('partners').insert(payload))
    }
    if (error) { setErr(error.message); setSaving(false); return }
    setShowModal(false)
    load()
    setSaving(false)
  }

  async function remove(p: Partner) {
    if (!confirm(`Delete partner "${p.name}"? This will unlink them from any listings.`)) return
    await supabase.from('partners').delete().eq('id', p.id)
    load()
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function set(k: keyof PartnerForm, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const portalUrl = (p: Partner) => `${PORTAL_BASE}/partner/${p.slug}`

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em' }}>Partners</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Real estate agents and teams — each gets their own portal page.</div>
        </div>
        <button onClick={openCreate} style={{ background: C.accent, color: C.navy, border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          + Add Partner
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Loading…</div>
      ) : partners.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '64px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 8 }}>No partners yet</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Add a real estate agent or team to get started.</div>
          <button onClick={openCreate} style={{ background: C.accent, color: C.navy, border: 'none', borderRadius: 9, padding: '12px 28px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            Add Your First Partner
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {partners.map(p => {
            const count = listingCounts[p.id] ?? 0
            const url = portalUrl(p)
            return (
              <div key={p.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {/* Avatar */}
                {p.photo_url
                  ? <img src={p.photo_url} alt={p.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.navy, color: C.accent, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(p.name)}</div>
                }

                {/* Info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {[p.title, p.brokerage].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontWeight: 600 }}>
                    {count} active listing{count !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Portal URL */}
                <div style={{ flex: 2, minWidth: 200, background: C.bg, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{url}</div>
                  <button
                    onClick={() => copy(url, p.id)}
                    style={{ background: copied === p.id ? '#16a34a' : C.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    {copied === p.id ? '✓ Copied' : 'Copy Link'}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: C.navy, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                    Preview ↗
                  </a>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(p)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: C.navy, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(p)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#DC2626', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.white, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.navy, marginBottom: 20 }}>
              {editing ? 'Edit Partner' : 'Add Partner'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Full Name *">
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sarah Johnson" style={inp} />
              </Field>
              <div style={{ display: 'flex', gap: 12 }}>
                <Field label="Title">
                  <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Realtor®" style={inp} />
                </Field>
                <Field label="Brokerage">
                  <input value={form.brokerage} onChange={e => set('brokerage', e.target.value)} placeholder="KW Utah" style={inp} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Field label="Email">
                  <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="sarah@kw.com" style={inp} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(801) 555-0100" style={inp} />
                </Field>
              </div>
              <Field label="License / NMLS#">
                <input value={form.nmls} onChange={e => set('nmls', e.target.value)} placeholder="UT RE License #" style={inp} />
              </Field>
              <Field label="Headshot URL">
                <input value={form.photo_url} onChange={e => set('photo_url', e.target.value)} placeholder="https://…" style={inp} />
              </Field>
              <Field label="Brokerage Logo URL">
                <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://…" style={inp} />
              </Field>
              <Field label="Bio (shown on portal)">
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Short bio for the partner portal…" rows={3} style={{ ...inp, resize: 'vertical' }} />
              </Field>
            </div>

            {err && <div style={{ color: '#DC2626', fontSize: 12, marginTop: 10 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 0', fontSize: 14, fontWeight: 700, color: C.navy, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving} style={{ flex: 2, background: C.accent, border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 14, fontWeight: 800, color: C.navy, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #E4E8EC',
  borderRadius: 8, fontSize: 14, color: '#1F2937', outline: 'none', boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
