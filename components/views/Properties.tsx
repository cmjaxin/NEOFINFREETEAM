'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/appContext'
import { CreateModal as ListingModal } from './OpenHouse'
import { CreateModal as OHEventModal } from './OpenHouseEvents'
import { CreateModal as SignRiderModal } from './SignRiders'
import { SAModal } from './SellerAdvantageLp'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a', yellow: '#d97706', purple: '#7C3AED',
}

interface OHPage {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  list_price: number; beds: number; baths: number; sqft: number; status: string
  page_type: string; created_at: string; photos: string[]; advisor_name: string
  rate_scenarios: unknown[] | null; callout_text: string | null
}

interface SAPage {
  id: string; slug: string; sales_price: number; quote_date: string; updated_at: string; address: string | null
}

interface PropertyGroup {
  key: string; address: string; city: string; state: string; zip: string
  listing: OHPage | null; openHouses: OHPage[]; signRiders: OHPage[]
  photo: string | null; list_price: number; beds: number; baths: number; sqft: number
}

type ModalState = {
  type: 'listing' | 'ohEvent' | 'signRider' | 'sa'
  editing: OHPage | null
} | null

function fmt$(n: number) { return n ? '$' + Math.round(n).toLocaleString() : '' }
function fmtNum(n: number) { return n ? n.toLocaleString() : '' }
function addrKey(p: OHPage) { return [p.address, p.city, p.state].join('|').toLowerCase().trim() }

function AssetTile({
  label, color, exists, count, slug, route, onAction, actionLabel,
}: {
  label: string; color: string; exists: boolean; count?: number
  slug?: string; route?: string; onAction: () => void; actionLabel: string
}) {
  return (
    <div style={{
      flex: 1, minWidth: 130, background: exists ? color + '0D' : C.bg,
      border: `1px solid ${exists ? color + '33' : C.border}`,
      borderRadius: 10, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 7,
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: exists ? color : '#D1D5DB', flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: exists ? color : C.muted, letterSpacing: '0.03em', flex: 1, minWidth: 0 }}>
          {label}{count && count > 1 ? ` (${count})` : ''}
        </span>
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={onAction} style={{
          flex: 1, padding: '5px 0', border: `1px solid ${exists ? color + '44' : C.border}`,
          borderRadius: 7, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
          background: exists ? C.white : 'transparent',
          color: exists ? C.navy : C.muted,
        }}>
          {actionLabel}
        </button>
        {exists && slug && route && (
          <a
            href={`/${route}/${slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, border: `1px solid ${color + '44'}`, borderRadius: 7,
              color: color, fontSize: 13, textDecoration: 'none', background: C.white,
              fontWeight: 700, flexShrink: 0,
            }}
            title="View live page"
          >
            ↗
          </a>
        )}
      </div>
    </div>
  )
}

function PropertyRow({
  group, saPages, allSignRiders, onEdit, onCreate,
}: {
  group: PropertyGroup; saPages: SAPage[]; allSignRiders: OHPage[]
  onEdit: (page: OHPage, type: 'listing' | 'ohEvent' | 'signRider' | 'sa') => void
  onCreate: (type: 'listing' | 'ohEvent' | 'signRider' | 'sa', address?: string) => void
}) {
  const hasOH = group.openHouses.length > 0
  const hasSA = saPages.length > 0

  // Check if any sign rider matches this property's address
  const linkedRiders = allSignRiders.filter(
    sr => sr.address.toLowerCase().trim() === group.address.toLowerCase().trim()
  )
  const hasRider = linkedRiders.length > 0

  return (
    <div style={{
      background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
      boxShadow: '0 1px 4px rgba(10,37,64,0.06)', overflow: 'hidden',
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Photo */}
      <div style={{ width: 160, flexShrink: 0, background: '#DCE7F2', position: 'relative', overflow: 'hidden', minHeight: 160 }}>
        {group.photo
          ? <img src={group.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, opacity: 0.3 }}>🏡</div>
        }
        {group.list_price > 0 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(10,37,64,0.78))',
            padding: '24px 10px 8px', color: '#fff', fontSize: 13.5, fontWeight: 800, textAlign: 'center',
          }}>
            {fmt$(group.list_price)}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Address + sign rider chip */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: C.navy, lineHeight: 1.3 }}>{group.address}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              {[group.city, group.state, group.zip].filter(Boolean).join(', ')}
            </div>
          </div>
          {hasRider && (
            <div style={{
              flexShrink: 0, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: C.yellow + '15', border: `1px solid ${C.yellow}44`, color: C.yellow,
              whiteSpace: 'nowrap',
            }}>
              🪧 Sign Rider{linkedRiders.length > 1 ? ` ×${linkedRiders.length}` : ''}
            </div>
          )}
        </div>

        {/* Specs */}
        {(group.beds > 0 || group.baths > 0 || group.sqft > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {group.beds > 0 && <Chip>{group.beds} bd</Chip>}
            {group.baths > 0 && <Chip>{group.baths} ba</Chip>}
            {group.sqft > 0 && <Chip>{fmtNum(group.sqft)} sqft</Chip>}
          </div>
        )}

        {/* Asset tiles — Listing, Open House, Seller Advantage */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <AssetTile
            label="Listing Page" color={C.green} exists={!!group.listing}
            slug={group.listing?.slug} route="listing-presentation"
            onAction={() => group.listing ? onEdit(group.listing, 'listing') : onCreate('listing', group.address)}
            actionLabel={group.listing ? 'Edit' : '+ Create'}
          />
          <AssetTile
            label="Open Houses" color={C.accent} exists={hasOH} count={group.openHouses.length}
            slug={group.openHouses[0]?.slug} route="open-house"
            onAction={() => hasOH ? onEdit(group.openHouses[0], 'ohEvent') : onCreate('ohEvent', group.address)}
            actionLabel={hasOH ? `Edit${group.openHouses.length > 1 ? ` (${group.openHouses.length})` : ''}` : '+ Add'}
          />
          {hasOH && (
            <a
              href={`/open-house/${group.openHouses[0].slug}/agent`}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', gap: 7,
                background: C.navy + '0D', border: `1px solid ${C.navy}33`,
                borderRadius: 10, padding: '10px 12px', textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.navy, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.navy, letterSpacing: '0.03em' }}>Agent Hub</span>
              </div>
              <div style={{
                width: '100%', padding: '5px 0', border: `1px solid ${C.navy}44`,
                borderRadius: 7, fontSize: 11.5, fontWeight: 700,
                background: C.white, color: C.navy, textAlign: 'center',
              }}>
                Open ↗
              </div>
            </a>
          )}
          <AssetTile
            label="Seller Adv." color={C.purple} exists={hasSA}
            slug={saPages[0]?.slug} route="seller-advantage"
            onAction={() => hasSA ? onEdit(saPages[0] as unknown as OHPage, 'sa') : onCreate('sa')}
            actionLabel={hasSA ? 'Edit' : '+ Add'}
          />
        </div>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
      background: C.bg, border: `1px solid ${C.border}`, color: C.dim,
    }}>
      {children}
    </span>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', minWidth: 80 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? C.navy, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, marginTop: 1 }}>{label}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '28px 0 10px' }}>
      {children}
    </div>
  )
}

// Overlay wrapper for modals

export default function Properties() {
  const { supabase, profile } = useApp()
  const [pages, setPages] = useState<OHPage[]>([])
  const [saPages, setSaPages] = useState<SAPage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalState, setModalState] = useState<ModalState>(null)

  async function load() {
    if (!profile?.id) return
    const [ohRes, saRes] = await Promise.all([
      supabase.from('open_house_pages')
        .select('*')
        .eq('status', 'active').eq('created_by', profile.id).order('created_at', { ascending: false }),
      supabase.from('seller_advantage_pages')
        .select('id,slug,sales_price,quote_date,updated_at,address')
        .eq('created_by', profile.id).order('updated_at', { ascending: false }),
    ])
    setPages((ohRes.data ?? []) as OHPage[])
    setSaPages((saRes.data ?? []) as SAPage[])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  const groups: PropertyGroup[] = (() => {
    const map = new Map<string, PropertyGroup>()
    for (const p of pages) {
      if (p.page_type === 'sign_rider') continue
      const key = addrKey(p)
      if (!map.has(key)) {
        map.set(key, { key, address: p.address, city: p.city, state: p.state, zip: p.zip, listing: null, openHouses: [], signRiders: [], photo: null, list_price: 0, beds: 0, baths: 0, sqft: 0 })
      }
      const g = map.get(key)!
      if (p.page_type === 'listing') {
        g.listing = p; g.list_price = p.list_price || 0; g.photo = p.photos?.[0] ?? null
        g.beds = p.beds || 0; g.baths = p.baths || 0; g.sqft = p.sqft || 0
      } else if (p.page_type === 'open_house') {
        g.openHouses.push(p)
        if (!g.photo) g.photo = p.photos?.[0] ?? null
        if (!g.beds) { g.beds = p.beds || 0; g.baths = p.baths || 0; g.sqft = p.sqft || 0 }
      }
    }
    return Array.from(map.values())
  })()

  // All sign riders — standalone list regardless of address match
  const allSignRiders = pages.filter(p => p.page_type === 'sign_rider')

  function saForGroup(g: PropertyGroup): SAPage[] {
    return saPages.filter(sa => sa.address && sa.address.toLowerCase().trim() === g.address.toLowerCase().trim())
  }

  const unlinkedSA = saPages.filter(sa =>
    !sa.address || !groups.some(g => g.address.toLowerCase().trim() === sa.address?.toLowerCase().trim())
  )

  const filtered = groups.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return g.address.toLowerCase().includes(q) || g.city.toLowerCase().includes(q)
  })

  const filteredSR = allSignRiders.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.address.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)
  })

  function openEdit(page: OHPage, type: 'listing' | 'ohEvent' | 'signRider' | 'sa') {
    setModalState({ type, editing: page })
  }

  function openCreate(type: 'listing' | 'ohEvent' | 'signRider' | 'sa') {
    setModalState({ type, editing: null })
  }

  function closeModal() {
    setModalState(null)
  }

  function handleSaved() {
    load()
    setModalState(null)
  }

  const hasAnything = filtered.length > 0 || allSignRiders.length > 0 || saPages.length > 0

  return (
    <div style={{ padding: '28px 32px', background: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Properties</div>
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: 3 }}>Every campaign, organized by home</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openCreate('signRider')} style={{
            padding: '10px 16px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.yellow, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          }}>
            + Sign Rider
          </button>
          <button onClick={() => openCreate('listing')} style={{
            padding: '10px 20px', background: C.navy, border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Property
          </button>
        </div>
      </div>

      {/* Stats + search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {hasAnything && (
          <>
            <StatCard label="Properties" value={groups.length} />
            <StatCard label="Listings" value={groups.filter(g => g.listing).length} color={C.green} />
            <StatCard label="Open Houses" value={groups.reduce((n, g) => n + g.openHouses.length, 0)} color={C.accent} />
            <StatCard label="Sign Riders" value={allSignRiders.length} color={C.yellow} />
            <StatCard label="Seller Adv." value={saPages.length} color={C.purple} />
          </>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search address or city…"
            style={{
              width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`,
              borderRadius: 10, fontSize: 14, color: C.text, background: C.white,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.muted, padding: 48, textAlign: 'center', fontSize: 14 }}>Loading…</div>
      ) : !hasAnything ? (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 64, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🏡</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 8 }}>No properties yet</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
            Create a listing page to get started — open house, sign rider, and seller advantage campaigns attach automatically.
          </div>
          <button onClick={() => openCreate('listing')} style={{
            padding: '12px 28px', background: C.navy, border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            Add Your First Property
          </button>
        </div>
      ) : (
        <>
          {/* ── Properties ── */}
          {filtered.length > 0 && (
            <>
              <SectionLabel>Properties ({filtered.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(g => (
                  <PropertyRow
                    key={g.key}
                    group={g}
                    saPages={saForGroup(g)}
                    allSignRiders={allSignRiders}
                    onEdit={openEdit}
                    onCreate={openCreate}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Sign Riders — standalone ── */}
          {filteredSR.length > 0 && (
            <>
              <SectionLabel>Sign Riders ({filteredSR.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredSR.map(p => (
                  <div key={p.id} style={{
                    background: C.white, borderRadius: 12, border: `1px solid ${C.yellow}22`,
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.yellow, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.address}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        {[p.city, p.state, p.zip].filter(Boolean).join(', ')}
                        {p.list_price > 0 && ` · ${fmt$(p.list_price)}`}
                      </div>
                    </div>
                    <a
                      href={`/sign-rider/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                        border: `1px solid ${C.yellow}55`, color: C.yellow, textDecoration: 'none',
                        background: C.yellow + '0D', flexShrink: 0,
                      }}
                    >
                      View ↗
                    </a>
                    <button
                      onClick={() => openEdit(p, 'signRider')}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                        background: C.white, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.navy, flexShrink: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Unlinked Seller Advantage ── */}
          {unlinkedSA.length > 0 && (
            <>
              <SectionLabel>Seller Advantage — Unlinked ({unlinkedSA.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unlinkedSA.map(sa => (
                  <div key={sa.id} style={{
                    background: C.white, borderRadius: 12, border: `1px solid ${C.purple}22`,
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.purple, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sa.slug}</div>
                      {sa.sales_price > 0 && <div style={{ fontSize: 12, color: C.muted }}>{fmt$(sa.sales_price)}</div>}
                    </div>
                    <a
                      href={`/seller-advantage/${sa.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                        border: `1px solid ${C.purple}55`, color: C.purple, textDecoration: 'none',
                        background: C.purple + '0D', flexShrink: 0,
                      }}
                    >
                      View ↗
                    </a>
                    <button
                      onClick={() => openEdit(sa as unknown as OHPage, 'sa')}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                        background: C.white, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.navy, flexShrink: 0,
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Inline Modals — each form renders its own fixed backdrop ── */}
      {modalState?.type === 'listing' && (
        <ListingModal
          editing={modalState.editing as Parameters<typeof ListingModal>[0]['editing']}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
      {modalState?.type === 'ohEvent' && (
        <OHEventModal
          editing={modalState.editing as Parameters<typeof OHEventModal>[0]['editing']}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
      {modalState?.type === 'signRider' && (
        <SignRiderModal
          editing={modalState.editing as Parameters<typeof SignRiderModal>[0]['editing']}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
      {modalState?.type === 'sa' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 760, background: C.white, borderRadius: 16, boxShadow: '0 8px 40px rgba(10,37,64,0.18)' }}>
            <button onClick={closeModal} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, width: 32, height: 32, borderRadius: '50%', border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim }}>×</button>
            <SAModal />
          </div>
        </div>
      )}
    </div>
  )
}
