'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/appContext'
import { CreateModal as ListingModal } from './OpenHouse'
import { CreateModal as OHEventModal } from './OpenHouseEvents'
import { CreateModal as SignRiderModal } from './SignRiders'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#858889', dim: '#5C6570', text: '#26303B',
  green: '#16a34a', yellow: '#d97706', red: '#DC2626',
}

interface OHPage {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  list_price: number; beds: number; baths: number; sqft: number; status: string
  page_type: string; created_at: string; photos: string[]; advisor_name: string
  rate_scenarios: unknown[] | null; callout_text: string | null
}

interface PropertyGroup {
  key: string; address: string; city: string; state: string; zip: string
  listing: OHPage | null; openHouses: OHPage[]
  photo: string | null; list_price: number; beds: number; baths: number; sqft: number
}

type ModalState = {
  type: 'listing' | 'ohEvent' | 'signRider'
  editing: OHPage | null
  prefillAddress?: string
} | null

type ConfirmState = {
  message: string
  onConfirm: () => void
} | null

function fmt$(n: number) { return n ? '$' + Math.round(n).toLocaleString() : '' }
function fmtNum(n: number) { return n ? n.toLocaleString() : '' }
function addrKey(p: OHPage) { return [p.address, p.city, p.state].join('|').toLowerCase().trim() }

function AssetTile({
  label, color, exists, count, slug, route, onAction, actionLabel, onDelete,
}: {
  label: string; color: string; exists: boolean; count?: number
  slug?: string; route?: string; onAction: () => void; actionLabel: string
  onDelete?: () => void
}) {
  return (
    <div style={{
      flex: 1, minWidth: 130, background: exists ? color + '0D' : C.bg,
      border: `1px solid ${exists ? color + '33' : C.border}`,
      borderRadius: 10, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 7, position: 'relative',
    }}>
      {/* Delete X */}
      {exists && onDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete() }} style={{
          position: 'absolute', top: 5, right: 5, width: 18, height: 18,
          borderRadius: '50%', border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: C.muted, lineHeight: 1,
        }} title="Remove">×</button>
      )}

      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: exists && onDelete ? 16 : 0 }}>
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
  group, allSignRiders, onEdit, onCreate, onDelete, onDeletePage,
}: {
  group: PropertyGroup; allSignRiders: OHPage[]
  onEdit: (page: OHPage, type: 'listing' | 'ohEvent' | 'signRider') => void
  onCreate: (type: 'listing' | 'ohEvent' | 'signRider', address?: string) => void
  onDelete: (group: PropertyGroup) => void
  onDeletePage: (id: string) => void
}) {
  const hasOH = group.openHouses.length > 0

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
        {/* Address + delete */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: C.navy, lineHeight: 1.3 }}>{group.address}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              {[group.city, group.state, group.zip].filter(Boolean).join(', ')}
            </div>
          </div>
          <button
            onClick={() => onDelete(group)}
            style={{
              flexShrink: 0, padding: '3px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.muted, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            title="Delete all pages for this property"
          >
            Delete Property
          </button>
        </div>

        {/* Specs */}
        {(group.beds > 0 || group.baths > 0 || group.sqft > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {group.beds > 0 && <Chip>{group.beds} bd</Chip>}
            {group.baths > 0 && <Chip>{group.baths} ba</Chip>}
            {group.sqft > 0 && <Chip>{fmtNum(group.sqft)} sqft</Chip>}
          </div>
        )}

        {/* Asset tiles — Listing, Open House, Agent Hub */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <AssetTile
            label="Listing Page" color={C.green} exists={!!group.listing}
            slug={group.listing?.slug} route="listing-presentation"
            onAction={() => group.listing ? onEdit(group.listing, 'listing') : onCreate('listing', group.address)}
            actionLabel={group.listing ? 'Edit' : '+ Create'}
            onDelete={group.listing ? () => onDeletePage(group.listing!.id) : undefined}
          />
          <AssetTile
            label="Open Houses" color={C.accent} exists={hasOH} count={group.openHouses.length}
            slug={group.openHouses[0]?.slug} route="open-house"
            onAction={() => hasOH ? onEdit(group.openHouses[0], 'ohEvent') : onCreate('ohEvent', group.address)}
            actionLabel={hasOH ? `Edit${group.openHouses.length > 1 ? ` (${group.openHouses.length})` : ''}` : '+ Add'}
            onDelete={hasOH ? () => onDeletePage(group.openHouses[0].id) : undefined}
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
        </div>

        {/* Sign Riders — inline on property row */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            Sign Riders
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {linkedRiders.map(sr => (
              <div key={sr.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: C.yellow + '0D', border: `1px solid ${C.yellow}44`,
                borderRadius: 8, padding: '5px 10px',
              }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.yellow }}>🪧 {sr.address || sr.slug}</span>
                <a href={`/sign-rider/${sr.slug}`} target="_blank" rel="noreferrer"
                  style={{ color: C.yellow, fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>↗</a>
                <button onClick={() => onEdit(sr, 'signRider')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 12, fontWeight: 700, padding: '0 2px' }}>
                  Edit
                </button>
                <button onClick={() => onDeletePage(sr.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                  title="Remove sign rider">×</button>
              </div>
            ))}
            <button
              onClick={() => onCreate('signRider', group.address)}
              style={{
                padding: '5px 12px', border: `1px dashed ${C.yellow}66`, borderRadius: 8,
                background: 'transparent', cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                color: C.yellow,
              }}
            >
              {hasRider ? '+ Add Another' : '+ Add Sign Rider'}
            </button>
          </div>
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

function ConfirmDialog({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: C.white, borderRadius: 14, padding: '28px 32px', maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(10,37,64,0.18)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Are you sure?</div>
        <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.6, marginBottom: 24 }}>{state.message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: C.dim }}>
            Cancel
          </button>
          <button onClick={() => { state.onConfirm(); onCancel() }} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: C.red, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: C.white }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Properties() {
  const { supabase, profile } = useApp()
  const [pages, setPages] = useState<OHPage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalState, setModalState] = useState<ModalState>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)

  async function load() {
    if (!profile?.id) return
    const { data } = await supabase.from('open_house_pages')
      .select('*')
      .eq('status', 'active').eq('created_by', profile.id).order('created_at', { ascending: false })
    setPages((data ?? []) as OHPage[])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  const groups: PropertyGroup[] = (() => {
    const map = new Map<string, PropertyGroup>()
    for (const p of pages) {
      if (p.page_type === 'sign_rider') continue
      const key = addrKey(p)
      if (!map.has(key)) {
        map.set(key, { key, address: p.address, city: p.city, state: p.state, zip: p.zip, listing: null, openHouses: [], photo: null, list_price: 0, beds: 0, baths: 0, sqft: 0 })
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

  const allSignRiders = pages.filter(p => p.page_type === 'sign_rider')

  // Sign riders with no matching property address (orphaned)
  const unlinkedRiders = allSignRiders.filter(
    sr => !groups.some(g => g.address.toLowerCase().trim() === sr.address.toLowerCase().trim())
  )

  const filtered = groups.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return g.address.toLowerCase().includes(q) || g.city.toLowerCase().includes(q)
  })

  const filteredUnlinked = unlinkedRiders.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.address.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)
  })

  function openEdit(page: OHPage, type: 'listing' | 'ohEvent' | 'signRider') {
    setModalState({ type, editing: page })
  }

  function openCreate(type: 'listing' | 'ohEvent' | 'signRider', address?: string) {
    setModalState({ type, editing: null, prefillAddress: address })
  }

  function closeModal() { setModalState(null) }
  function handleSaved() { load(); setModalState(null) }

  async function deletePage(id: string) {
    await supabase.from('open_house_pages').update({ status: 'inactive' }).eq('id', id)
    load()
  }

  async function deleteGroup(group: PropertyGroup) {
    const ids = [
      group.listing?.id,
      ...group.openHouses.map(p => p.id),
      ...allSignRiders.filter(sr => sr.address.toLowerCase().trim() === group.address.toLowerCase().trim()).map(sr => sr.id),
    ].filter(Boolean) as string[]
    if (ids.length === 0) return
    await supabase.from('open_house_pages').update({ status: 'inactive' }).in('id', ids)
    load()
  }

  function confirmDeletePage(id: string, label: string) {
    setConfirmState({
      message: `Remove "${label}"? This will deactivate the live page. You can recreate it anytime.`,
      onConfirm: () => deletePage(id),
    })
  }

  function confirmDeleteGroup(group: PropertyGroup) {
    const riderCount = allSignRiders.filter(sr => sr.address.toLowerCase().trim() === group.address.toLowerCase().trim()).length
    const parts = [
      group.listing ? 'listing page' : '',
      group.openHouses.length > 0 ? `${group.openHouses.length} open house(s)` : '',
      riderCount > 0 ? `${riderCount} sign rider(s)` : '',
    ].filter(Boolean)
    setConfirmState({
      message: `Delete all pages for ${group.address}? This will deactivate: ${parts.join(', ')}. Live links will stop working.`,
      onConfirm: () => deleteGroup(group),
    })
  }

  const hasAnything = filtered.length > 0 || unlinkedRiders.length > 0

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
            Create a listing page to get started — open house and sign rider campaigns attach automatically.
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
          {filtered.length > 0 && (
            <>
              <SectionLabel>Properties ({filtered.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(g => (
                  <PropertyRow
                    key={g.key}
                    group={g}
                    allSignRiders={allSignRiders}
                    onEdit={openEdit}
                    onCreate={openCreate}
                    onDelete={confirmDeleteGroup}
                    onDeletePage={(id) => {
                      const page = pages.find(p => p.id === id)
                      confirmDeletePage(id, page?.address ?? 'this page')
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Orphaned sign riders — have no matching property */}
          {filteredUnlinked.length > 0 && (
            <>
              <SectionLabel>Unlinked Sign Riders ({filteredUnlinked.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredUnlinked.map(p => (
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
                    <button
                      onClick={() => confirmDeletePage(p.id, p.address)}
                      style={{
                        padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
                        background: C.white, cursor: 'pointer', fontSize: 14, color: C.muted, flexShrink: 0,
                      }}
                      title="Remove"
                    >×</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
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

      <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />
    </div>
  )
}
