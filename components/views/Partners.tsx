'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/appContext'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  text: '#1F2937', dim: '#374151',
}

export function partnerSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

interface Partner {
  id: string; owner_email: string; name: string; title: string
  company: string; phone: string; email: string; headshot_url: string; logo_url: string
}

const EMPTY: Omit<Partner, 'id' | 'owner_email'> = {
  name: '', title: '', company: '', phone: '', email: '', headshot_url: '', logo_url: '',
}

function PartnerModal({ partner, ownerEmail, onClose, onSaved }: {
  partner: Partner | null
  ownerEmail: string
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ ...EMPTY, ...(partner ?? {}) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    if (partner) {
      const { error: e } = await supabase.from('marketing_partners').update({
        name: form.name, title: form.title, company: form.company,
        phone: form.phone, email: form.email,
        headshot_url: form.headshot_url, logo_url: form.logo_url,
      }).eq('id', partner.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('marketing_partners').insert({
        owner_email: ownerEmail,
        name: form.name, title: form.title, company: form.company,
        phone: form.phone, email: form.email,
        headshot_url: form.headshot_url, logo_url: form.logo_url,
      })
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
  }

  const fields: Array<{ key: keyof typeof EMPTY; label: string; placeholder: string }> = [
    { key: 'name', label: 'Full Name *', placeholder: 'Jane Smith' },
    { key: 'title', label: 'Title', placeholder: 'REALTOR®' },
    { key: 'company', label: 'Company', placeholder: 'ABC Realty' },
    { key: 'phone', label: 'Phone', placeholder: '(801) 555-0200' },
    { key: 'email', label: 'Email', placeholder: 'jane@abc.com' },
    { key: 'headshot_url', label: 'Headshot URL', placeholder: 'https://…' },
    { key: 'logo_url', label: 'Logo URL', placeholder: 'https://…' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.navy, marginBottom: 20 }}>
          {partner ? 'Edit Partner' : 'Add Partner'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</div>
              <input
                value={(form as any)[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: C.text, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>
        {error && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: C.bg, color: C.text, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : partner ? 'Save Changes' : 'Add Partner'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Partners() {
  const { profile } = useApp()
  const supabase = createClient()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({})
  const [modal, setModal] = useState<Partner | null | 'new'>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  async function load() {
    if (!profile?.email) return
    setLoading(true)
    const { data } = await supabase
      .from('marketing_partners')
      .select('*')
      .eq('owner_email', profile.email)
      .order('name')
    const list = data ?? []
    setPartners(list)

    if (list.length > 0) {
      const { data: pages } = await supabase
        .from('open_house_pages')
        .select('partner_name')
        .eq('status', 'active')
      const counts: Record<string, number> = {}
      for (const p of pages ?? []) {
        if (p.partner_name) counts[p.partner_name] = (counts[p.partner_name] ?? 0) + 1
      }
      setListingCounts(counts)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.email])

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em' }}>Partners</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            Each partner gets a portal page showing all their active listings.
          </div>
        </div>
        <button onClick={() => setModal('new')}
          style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Add Partner
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Loading…</div>
      ) : partners.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '64px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 8 }}>No partners yet</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Add your first partner to get started.</div>
          <button onClick={() => setModal('new')}
            style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Add Partner
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {partners.map(p => {
            const slug = partnerSlug(p.name)
            const url = `${origin}/partner/${slug}`
            const count = listingCounts[p.name] ?? 0
            return (
              <div key={p.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {/* Avatar */}
                {p.headshot_url
                  ? <img src={p.headshot_url} alt={p.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.navy, color: C.accent, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(p.name)}</div>
                }

                {/* Info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {[p.title, p.company].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontWeight: 600 }}>
                    {count} active listing{count !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                  <div style={{ background: C.bg, borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: C.navy }}>Client: </span>{url}
                    </div>
                    <button onClick={() => copy(url, `c-${p.id}`)}
                      style={{ background: copied === `c-${p.id}` ? '#16a34a' : C.navy, color: '#fff', border: 'none', borderRadius: 5, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {copied === `c-${p.id}` ? '✓' : 'Copy'}
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: C.navy, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>↗</a>
                  </div>
                  <div style={{ background: 'rgba(91,203,245,0.08)', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: C.navy }}>Hub: </span>{url}/hub
                    </div>
                    <button onClick={() => copy(`${url}/hub`, `h-${p.id}`)}
                      style={{ background: copied === `h-${p.id}` ? '#16a34a' : C.navy, color: '#fff', border: 'none', borderRadius: 5, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {copied === `h-${p.id}` ? '✓' : 'Copy'}
                    </button>
                    <a href={`${url}/hub`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: C.navy, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>↗</a>
                  </div>
                </div>

                {/* Edit button */}
                <button onClick={() => setModal(p)}
                  style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  Edit
                </button>
              </div>
            )
          })}
        </div>
      )}

      {modal !== null && (
        <PartnerModal
          partner={modal === 'new' ? null : modal}
          ownerEmail={profile?.email ?? ''}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
