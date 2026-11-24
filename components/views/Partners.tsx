'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/appContext'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  text: '#1F2937', dim: '#374151',
}

export function partnerSlug(name: string, company?: string | null) {
  const base = [name, company].filter(Boolean).join(' ')
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

interface Partner {
  id: string; owner_email: string; name: string; title: string
  company: string; phone: string; email: string; headshot_url: string; logo_url: string
}

export default function Partners() {
  const { profile } = useApp()
  const supabase = createClient()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({})

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

    // Count active listings per partner (by partner_name match)
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, letterSpacing: '-0.02em' }}>Partners</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            Each partner gets a portal page showing all their active listings. Manage partners in the Marketing tab.
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(91,203,245,0.08)', border: '1px solid rgba(91,203,245,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: C.navy }}>
        💡 To add or edit partners, go to the <strong>Marketing</strong> tab. Your partners automatically appear here with their portal links.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Loading…</div>
      ) : partners.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '64px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 8 }}>No partners yet</div>
          <div style={{ fontSize: 14, color: C.muted }}>Add partners in the Marketing tab and they&apos;ll show up here with their portal links.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {partners.map(p => {
            const slug = partnerSlug(p.name, p.company)
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

                {/* Portal URL */}
                <div style={{ flex: 2, minWidth: 220, background: C.bg, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
