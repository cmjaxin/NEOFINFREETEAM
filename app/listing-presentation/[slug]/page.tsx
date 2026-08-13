'use client'
// ─── CONFIGURE ONCE ───────────────────────────────────────────────────────────
// Upload the Seller Advantage PDF to Supabase Storage and paste the public URL here.
const SELLER_ADVANTAGE_PDF_URL = 'https://qrkwcdyqqozkvenwuoun.supabase.co/storage/v1/object/public/splice-clips/Stern%20Team%20Seller%20Advantage%20Program_081026.pdf'
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  dim: '#374151', text: '#1F2937',
}

function fmtPrice(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

// ─── Photo Gallery ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos, address }: { photos: string[]; address: string }) {
  const [idx, setIdx] = useState(0)
  if (!photos || photos.length === 0) {
    return (
      <div style={{ width: '100%', height: 320, background: '#E4E8EC', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🏡</div>
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <img src={photos[idx]} alt={address} className="lp-gallery-img" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
      {photos.length > 1 && (
        <div>
          <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => setIdx(i => (i + 1) % photos.length)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 99, background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 99 }}>
            {idx + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
interface PageData {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  beds: number; baths: number; sqft: number; lot_size: string; year_built: number
  description: string; photos: string[]; list_price: number; hoa_monthly: number
  advisor_name: string; advisor_title: string; advisor_email: string
  advisor_phone: string; advisor_photo: string; advisor_nmls: string
  partner_name: string; partner_title: string; partner_email: string
  partner_phone: string; partner_photo: string; partner_nmls: string; partner_logo: string
  tca_url: string | null
}

export default function ListingPresentationPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = use(paramsPromise)
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'tca' | 'contact'>('tca')

  useEffect(() => {
    const sb = createClient()
    sb.from('open_house_pages')
      .select('*')
      .eq('slug', params.slug)
      .limit(1)
      .then(({ data, error }) => {
        if (error) { setDbError(`DB error: ${error.message}`); setLoading(false); return }
        if (!data || data.length === 0) { setDbError(`No page found for "${params.slug}"`); setLoading(false); return }
        if (data[0].status !== 'active') { setDbError('Page not active'); setLoading(false); return }
        const row = data[0]
        const pageData: PageData = {
          partner_name: '', partner_title: '', partner_email: '', partner_phone: '',
          partner_photo: '', partner_nmls: '', partner_logo: '', tca_url: null,
          ...row,
        } as PageData
        // Backfill partner logo from marketing_partners if missing
        if (!pageData.partner_logo && pageData.partner_name) {
          sb.from('marketing_partners').select('logo_url, name').then(({ data: partners }) => {
            if (partners) {
              const match = partners.find((p: { name: string; logo_url: string }) =>
                p.name.toLowerCase().trim() === pageData.partner_name.toLowerCase().trim()
              )
              if (match?.logo_url) { setPage({ ...pageData, partner_logo: match.logo_url }); return }
            }
            setPage(pageData)
          })
        } else {
          setPage(pageData)
        }
        setLoading(false)
      }, (e: unknown) => { setDbError(`Fetch error: ${e}`); setLoading(false) })
  }, [params.slug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ color: C.muted, fontSize: 16 }}>Loading…</div>
    </div>
  )
  if (dbError || !page) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>Page not found</div>
        <div style={{ color: C.muted, marginTop: 8 }}>This listing may have been removed.</div>
        {dbError && <div style={{ marginTop: 16, padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', textAlign: 'left', fontFamily: 'monospace', wordBreak: 'break-all' }}>{dbError}</div>}
      </div>
    </div>
  )

  const TABS = [
    { id: 'overview', label: 'Property' },
    { id: 'tca', label: 'Seller Advantage' },
    { id: 'contact', label: 'Contact' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: C.navy, padding: '14px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
          <img src="/neo-logo.png" alt="NEO Home Loans" style={{ height: 32, width: 'auto' }} />
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Photos */}
        <PhotoGallery photos={page.photos ?? []} address={page.address} />

        {/* Price + Address + Contact panel */}
        <div style={{ marginTop: 20, marginBottom: 20, display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Left: price, address, stats */}
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <div className="lp-price" style={{ fontWeight: 800, color: C.navy, lineHeight: 1 }}>{fmtPrice(page.list_price)}</div>
            <div style={{ fontSize: 16, color: C.dim, marginTop: 6, fontWeight: 600 }}>{page.address}</div>
            <div style={{ fontSize: 14, color: C.muted }}>{page.city}{page.city && page.state ? ', ' : ''}{page.state} {page.zip}</div>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, padding: '14px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
              {[
                { label: 'Beds', val: page.beds },
                { label: 'Baths', val: page.baths },
                { label: 'Sq Ft', val: page.sqft ? page.sqft.toLocaleString() : null },
                { label: 'Lot', val: page.lot_size || null },
                { label: 'Year Built', val: page.year_built || null },
                { label: 'HOA', val: page.hoa_monthly ? `${fmtPrice(page.hoa_monthly)}/mo` : null },
              ].filter(r => r.val).map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginTop: 2 }}>{r.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: team contact card */}
          <div className="lp-agent-col" style={{ flex: '0 0 auto' }}>
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>

              {/* Advisor row */}
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Loan Advisor</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {page.advisor_photo
                    ? <img src={page.advisor_photo} alt={page.advisor_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.accent, fontWeight: 800, flexShrink: 0 }}>{page.advisor_name?.[0] ?? '?'}</div>
                  }
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{page.advisor_name || 'Loan Advisor'}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{page.advisor_title || 'Mortgage Advisor'}</div>
                    {page.advisor_nmls && <div style={{ fontSize: 11, color: C.muted }}>NMLS# {page.advisor_nmls}</div>}
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {page.advisor_phone && <a href={`tel:${page.advisor_phone}`} style={{ fontSize: 12, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>{page.advisor_phone}</a>}
                      {page.advisor_email && <a href={`mailto:${page.advisor_email}?subject=Listing — ${page.address}`} style={{ fontSize: 11, color: C.muted, textDecoration: 'none', wordBreak: 'break-all' }}>{page.advisor_email}</a>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Partner row */}
              {page.partner_name && (
                <>
                  <div style={{ height: 1, background: C.border }} />
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Listing Agent</div>
                      {page.partner_logo && <img src={page.partner_logo} alt={page.partner_name} style={{ maxHeight: 24, maxWidth: 80, objectFit: 'contain' }} />}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {page.partner_photo
                        ? <img src={page.partner_photo} alt={page.partner_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.navy, fontWeight: 800, flexShrink: 0 }}>{page.partner_name[0]}</div>
                      }
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{page.partner_name}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{page.partner_title || 'Listing Agent'}</div>
                        {page.partner_nmls && <div style={{ fontSize: 11, color: C.muted }}>NMLS# {page.partner_nmls}</div>}
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {page.partner_phone && <a href={`tel:${page.partner_phone}`} style={{ fontSize: 12, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>{page.partner_phone}</a>}
                          {page.partner_email && <a href={`mailto:${page.partner_email}`} style={{ fontSize: 11, color: C.muted, textDecoration: 'none', wordBreak: 'break-all' }}>{page.partner_email}</a>}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="lp-tab-btn"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer',
                fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? C.navy : C.muted,
                borderBottom: `2px solid ${activeTab === t.id ? C.navy : 'transparent'}`, marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Property Tab */}
        {activeTab === 'overview' && (
          <div>
            {page.description && (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 10 }}>About This Property</div>
                <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{page.description}</div>
              </div>
            )}
          </div>
        )}

        {/* Seller Advantage Tab */}
        {activeTab === 'tca' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* PDF Presentation */}
            {SELLER_ADVANTAGE_PDF_URL && (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Seller Advantage Program</div>
                  <a href={SELLER_ADVANTAGE_PDF_URL} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Open Full Screen ↗
                  </a>
                </div>
                <iframe
                  src={SELLER_ADVANTAGE_PDF_URL + '#toolbar=0&navpanes=0&scrollbar=1'}
                  className="lp-iframe-pdf"
                  style={{ width: '100%', border: 'none', display: 'block' }}
                  title="Seller Advantage Presentation"
                />
              </div>
            )}

            {/* TCA Embed */}
            {page.tca_url ? (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Total Cost Analysis</div>
                  <a href={page.tca_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Open Full Screen ↗
                  </a>
                </div>
                <iframe
                  src={page.tca_url}
                  className="lp-iframe-tca"
                  style={{ width: '100%', border: 'none', display: 'block' }}
                  title="Total Cost Analysis"
                  allow="fullscreen"
                />
              </div>
            ) : (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 32, textAlign: 'center', color: C.muted }}>
                TCA not yet attached to this listing.
              </div>
            )}

          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="lp-contact-grid" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                {page.advisor_photo ? (
                  <img src={page.advisor_photo} alt={page.advisor_name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                    {page.advisor_name?.[0] ?? '?'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: C.navy }}>{page.advisor_name || 'Your Loan Advisor'}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{page.advisor_title || 'Mortgage Advisor'}</div>
                  {page.advisor_nmls && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>NMLS# {page.advisor_nmls}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {page.advisor_phone && (
                  <a href={`tel:${page.advisor_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: C.navy, borderRadius: 10, color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                    <span>📞</span> {page.advisor_phone}
                  </a>
                )}
                {page.advisor_email && (
                  <a href={`mailto:${page.advisor_email}?subject=Listing Presentation — ${page.address}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.navy, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                    <span>✉️</span> {page.advisor_email}
                  </a>
                )}
              </div>
            </div>
            {page.partner_name && (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Listing Agent</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                  {page.partner_photo ? (
                    <img src={page.partner_photo} alt={page.partner_name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                      {page.partner_name[0]}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: C.navy }}>{page.partner_name}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{page.partner_title || 'Listing Agent'}</div>
                    {page.partner_nmls && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>NMLS# {page.partner_nmls}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {page.partner_phone && (
                    <a href={`tel:${page.partner_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.navy, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                      📞 {page.partner_phone}
                    </a>
                  )}
                  {page.partner_email && (
                    <a href={`mailto:${page.partner_email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.navy, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                      ✉️ {page.partner_email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Montserrat', system-ui, sans-serif; }
        a { color: inherit; }
        .lp-gallery-img { width: 100%; height: 340px; object-fit: cover; display: block; }
        .lp-price { font-size: 30px; }
        .lp-tab-btn { padding: 10px 22px; font-size: 14px; }
        .lp-contact-grid { max-width: 480px; }
        .lp-iframe-pdf { height: 700px; }
        .lp-iframe-tca { height: 820px; }
        .lp-agent-col { width: 220px; }
        @media (max-width: 600px) {
          .lp-gallery-img { height: 220px; }
          .lp-price { font-size: 22px; }
          .lp-tab-btn { padding: 8px 12px; font-size: 12px; }
          .lp-contact-grid { max-width: 100%; }
          .lp-iframe-pdf { height: 420px; }
          .lp-iframe-tca { height: 500px; }
          .lp-agent-col { width: 100%; }
        }
      `}</style>
    </div>
  )
}
