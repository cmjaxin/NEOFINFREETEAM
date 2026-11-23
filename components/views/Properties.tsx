'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/appContext'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a', red: '#dc2626', yellow: '#d97706',
}

interface OHPage {
  id: string
  slug: string
  address: string
  city: string
  state: string
  zip: string
  list_price: number
  beds: number
  baths: number
  sqft: number
  status: string
  page_type: string
  created_at: string
  photos: string[]
  advisor_name: string
  rate_scenarios: any[] | null
  callout_text: string | null
}

interface SAPage {
  id: string
  slug: string
  sales_price: number
  quote_date: string
  updated_at: string
  address: string | null
}

interface PropertyGroup {
  key: string
  address: string
  city: string
  state: string
  zip: string
  listing: OHPage | null
  openHouses: OHPage[]
  signRiders: OHPage[]
  photo: string | null
  list_price: number
}

function fmtPrice(n: number) {
  if (!n) return ''
  return '$' + Math.round(n).toLocaleString()
}

function addrKey(p: OHPage) {
  return [p.address, p.city, p.state].join('|').toLowerCase().trim()
}

function AssetBadge({ label, exists, color = C.green }: { label: string; exists: boolean; color?: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: exists ? (color + '18') : '#F1F5F9',
      border: `1px solid ${exists ? color + '44' : C.border}`,
      fontSize: 11.5, fontWeight: 700,
      color: exists ? color : C.muted,
    }}>
      <span style={{ fontSize: 10 }}>{exists ? '●' : '○'}</span>
      {label}
    </div>
  )
}

function PropertyCard({
  group,
  saPages,
  onEditListing,
  onEditOH,
  onNewOH,
  onEditSR,
  onEditSA,
  onNewSA,
}: {
  group: PropertyGroup
  saPages: SAPage[]
  onEditListing: () => void
  onEditOH: (p: OHPage) => void
  onNewOH: () => void
  onEditSR: () => void
  onEditSA: (p: SAPage) => void
  onNewSA: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasOH = group.openHouses.length > 0
  const hasSR = group.signRiders.length > 0
  const hasSA = saPages.length > 0

  const btnBase: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5,
  }

  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Photo + address header */}
      <div style={{ position: 'relative', height: 140, background: '#DCE7F2', overflow: 'hidden' }}>
        {group.photo ? (
          <img src={group.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 40, opacity: 0.3 }}>🏡</span>
          </div>
        )}
        {group.list_price > 0 && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(10,37,64,0.85)', color: '#fff',
            borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 800,
          }}>
            {fmtPrice(group.list_price)}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        {/* Address */}
        <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 2, lineHeight: 1.3 }}>
          {group.address}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          {[group.city, group.state, group.zip].filter(Boolean).join(', ')}
        </div>

        {/* Asset badges row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          <AssetBadge label="Listing" exists={!!group.listing} />
          <AssetBadge label="Open House" exists={hasOH} color={C.accent} />
          <AssetBadge label="Sign Rider" exists={hasSR} color={C.yellow} />
          <AssetBadge label="Seller Adv." exists={hasSA} color="#7C3AED" />
        </div>

        {/* Toggle expand */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ ...btnBase, background: C.bg, color: C.navy, width: '100%', justifyContent: 'center' }}
        >
          {expanded ? 'Hide details ↑' : 'Manage assets ↓'}
        </button>

        {expanded && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Listing page */}
            <AssetRow
              label="Listing Page"
              dot={C.green}
              exists={!!group.listing}
              slug={group.listing?.slug}
              route="open-house"
              onEdit={onEditListing}
              editLabel={group.listing ? 'Edit' : 'Create'}
            />

            {/* Open Houses */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Open Houses</div>
              {group.openHouses.map(p => (
                <AssetRow
                  key={p.id}
                  label={p.address || 'Open House'}
                  dot={C.accent}
                  exists
                  slug={p.slug}
                  route="open-house"
                  onEdit={() => onEditOH(p)}
                  editLabel="Edit"
                />
              ))}
              <button onClick={onNewOH} style={{ ...btnBase, background: C.accent + '18', color: C.navy, marginTop: 4 }}>
                + Add Open House
              </button>
            </div>

            {/* Sign Rider */}
            <AssetRow
              label="Sign Rider"
              dot={C.yellow}
              exists={hasSR}
              slug={group.signRiders[0]?.slug}
              route="sign-rider"
              onEdit={onEditSR}
              editLabel={hasSR ? 'Edit' : 'Assign Rider'}
            />

            {/* Seller Advantage */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Seller Advantage</div>
              {saPages.map(sa => (
                <AssetRow
                  key={sa.id}
                  label={sa.slug}
                  dot="#7C3AED"
                  exists
                  slug={sa.slug}
                  route="seller-advantage"
                  onEdit={() => onEditSA(sa)}
                  editLabel="Edit"
                />
              ))}
              <button onClick={onNewSA} style={{ ...btnBase, background: '#7C3AED18', color: '#7C3AED', marginTop: 4 }}>
                + Add Seller Advantage
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

function AssetRow({
  label, dot, exists, slug, route, onEdit, editLabel,
}: {
  label: string; dot: string; exists: boolean; slug?: string; route?: string; onEdit: () => void; editLabel: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: C.bg, borderRadius: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: exists ? dot : C.border, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: exists ? C.text : C.muted, fontWeight: exists ? 600 : 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {exists && slug && route && (
        <a
          href={`/${route}/${slug}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: C.muted, fontSize: 13, textDecoration: 'none', flexShrink: 0 }}
          title="Open page"
        >
          ↗
        </a>
      )}
      <button
        onClick={onEdit}
        style={{
          padding: '3px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
          background: C.white, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.navy, flexShrink: 0,
        }}
      >
        {editLabel}
      </button>
    </div>
  )
}

export default function Properties() {
  const { supabase, profile, setView, setPendingEdit } = useApp()
  const [pages, setPages] = useState<OHPage[]>([])
  const [saPages, setSaPages] = useState<SAPage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    if (!profile?.id) return
    const [ohRes, saRes] = await Promise.all([
      supabase.from('open_house_pages')
        .select('id,slug,address,city,state,zip,list_price,beds,baths,sqft,status,page_type,created_at,photos,advisor_name,rate_scenarios,callout_text')
        .eq('status', 'active')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('seller_advantage_pages')
        .select('id,slug,sales_price,quote_date,updated_at,address')
        .eq('created_by', profile.id)
        .order('updated_at', { ascending: false }),
    ])
    setPages((ohRes.data ?? []) as OHPage[])
    setSaPages((saRes.data ?? []) as SAPage[])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  // Group open_house_pages by address
  const groups: PropertyGroup[] = (() => {
    const map = new Map<string, PropertyGroup>()

    for (const p of pages) {
      if (p.page_type === 'sign_rider') continue // sign riders use generated slugs, group separately
      const key = addrKey(p)
      if (!map.has(key)) {
        map.set(key, {
          key,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          listing: null,
          openHouses: [],
          signRiders: [],
          photo: null,
          list_price: 0,
        })
      }
      const g = map.get(key)!
      if (p.page_type === 'listing') {
        g.listing = p
        g.list_price = p.list_price || 0
        g.photo = p.photos?.[0] ?? null
      } else if (p.page_type === 'open_house') {
        g.openHouses.push(p)
        if (!g.photo) g.photo = p.photos?.[0] ?? null
      }
    }

    // Also pick up sign riders that have a matching address
    for (const p of pages) {
      if (p.page_type !== 'sign_rider') continue
      const key = addrKey(p)
      if (map.has(key)) {
        map.get(key)!.signRiders.push(p)
      }
    }

    return Array.from(map.values())
  })()

  // SA pages matched by address (if address column exists), or unmatched
  function saForGroup(g: PropertyGroup): SAPage[] {
    return saPages.filter(sa =>
      sa.address &&
      sa.address.toLowerCase().trim() === g.address.toLowerCase().trim()
    )
  }

  const unlinkedSA = saPages.filter(sa =>
    !sa.address || !groups.some(g => g.address.toLowerCase().trim() === sa.address?.toLowerCase().trim())
  )

  const filtered = groups.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return g.address.toLowerCase().includes(q) || g.city.toLowerCase().includes(q)
  })

  function goEdit(id: string, type: 'listing' | 'openhouse' | 'signrider' | 'sa') {
    setPendingEdit(id, type)
    if (type === 'listing') setView('openhouse')
    else if (type === 'openhouse') setView('ohevents')
    else if (type === 'signrider') setView('signriders')
    else setView('sellerlp')
  }

  function goCreate(type: 'listing' | 'openhouse' | 'signrider' | 'sa') {
    setPendingEdit(null, null)
    if (type === 'listing') setView('openhouse')
    else if (type === 'openhouse') setView('ohevents')
    else if (type === 'signrider') setView('signriders')
    else setView('sellerlp')
  }

  return (
    <div style={{ padding: '28px 36px', background: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Properties</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>All your property campaigns in one place</div>
        </div>
        <button
          onClick={() => goCreate('listing')}
          style={{ padding: '10px 20px', background: C.navy, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 18 }}>+</span> New Property
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by address or city…"
          style={{ width: '100%', maxWidth: 400, padding: '9px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, color: C.text, background: C.white, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {loading ? (
        <div style={{ color: C.muted, padding: 32, textAlign: 'center' }}>Loading…</div>
      ) : filtered.length === 0 && unlinkedSA.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No properties yet</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
            Create a listing page to get started — open house, sign rider, and seller advantage campaigns attach to it automatically.
          </div>
          <button
            onClick={() => goCreate('listing')}
            style={{ padding: '12px 28px', background: C.navy, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            Add Your First Property
          </button>
        </div>
      ) : (
        <>
          {/* Stats strip */}
          {groups.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Properties', value: groups.length },
                { label: 'Listing Pages', value: groups.filter(g => g.listing).length },
                { label: 'Open Houses', value: groups.reduce((n, g) => n + g.openHouses.length, 0) },
                { label: 'Sign Riders', value: groups.reduce((n, g) => n + g.signRiders.length, 0) },
                { label: 'Seller Adv.', value: saPages.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: '10px 18px', minWidth: 100 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{value}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Property grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(g => (
              <PropertyCard
                key={g.key}
                group={g}
                saPages={saForGroup(g)}
                onEditListing={() => g.listing ? goEdit(g.listing.id, 'listing') : goCreate('listing')}
                onEditOH={p => goEdit(p.id, 'openhouse')}
                onNewOH={() => goCreate('openhouse')}
                onEditSR={() => g.signRiders[0] ? goEdit(g.signRiders[0].id, 'signrider') : goCreate('signrider')}
                onEditSA={sa => goEdit(sa.id, 'sa')}
                onNewSA={() => goCreate('sa')}
              />
            ))}
          </div>

          {/* Unlinked Seller Advantage pages */}
          {unlinkedSA.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 12 }}>Seller Advantage Pages (unlinked)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unlinkedSA.map(sa => (
                  <div key={sa.id} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{sa.slug}</div>
                      {sa.sales_price > 0 && <div style={{ fontSize: 12, color: C.muted }}>{fmtPrice(sa.sales_price)}</div>}
                    </div>
                    <a href={`/seller-advantage/${sa.slug}`} target="_blank" rel="noreferrer" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>↗</a>
                    <button
                      onClick={() => goEdit(sa.id, 'sa')}
                      style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.navy }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
