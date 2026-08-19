'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import LeadCaptureModal from '@/components/LeadCaptureModal'

const C = {
  navy: '#0A2540', accent: '#5BCBF5', white: '#fff',
  bg: '#F4F6F8', border: '#E4E8EC', muted: '#6B7280',
  dim: '#374151', text: '#1F2937',
}

function fmtPrice(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

// Extract Loom video ID from share URL
// e.g. https://www.loom.com/share/abc123def456 → abc123def456
function loomIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
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
      <img src={photos[idx]} alt={address} className="sr-gallery-img" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
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

// ─── Page Data Interface ────────────────────────────────────────────────────────
interface PageData {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  beds: number; baths: number; sqft: number; lot_size: string; year_built: number
  description: string; photos: string[]; list_price: number; hoa_monthly: number
  advisor_name: string; advisor_title: string; advisor_email: string
  advisor_phone: string; advisor_photo: string; advisor_nmls: string
  partner_name: string; partner_title: string; partner_email: string
  partner_phone: string; partner_photo: string; partner_nmls: string; partner_logo: string
  tca_url: string | null
  tca_screenshot: string | null
  loom_url: string | null
  callout_text: string | null
  schedule_url: string | null
  apply_url: string | null
  bntouch_user_id: string | null
}

export default function SignRiderPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'loan' | 'contact'>('loan')
  const [showLead, setShowLead] = useState(false)
  const leadShown = useRef(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const sb = createClient()
    sb.from('open_house_pages')
      .select('*')
      .eq('slug', slug)
      .eq('page_type', 'sign_rider')
      .limit(1)
      .then(({ data, error }) => {
        if (error) { setDbError(`DB error: ${error.message}`); setLoading(false); return }
        if (!data || data.length === 0) { setDbError(`No page found for "${slug}"`); setLoading(false); return }
        if (data[0].status !== 'active') { setDbError('Page not active'); setLoading(false); return }
        const row = data[0]
        const pageData: PageData = {
          partner_name: '', partner_title: '', partner_email: '', partner_phone: '',
          partner_photo: '', partner_nmls: '', partner_logo: '', tca_url: null,
          tca_screenshot: null, loom_url: null, callout_text: null, schedule_url: null,
          apply_url: null, bntouch_user_id: null,
          ...row,
        } as PageData

        const fetchExtras = async () => {
          const profileRes = row.created_by
            ? await sb.from('profiles').select('bntouch_user_id').eq('id', row.created_by).single()
            : { data: null, error: null }
          const partnerRes = pageData.partner_name
            ? await sb.from('marketing_partners').select('logo_url, name')
            : { data: null }
          const profileData = profileRes.data as { bntouch_user_id?: string } | null
          const bntouchUserId = profileData?.bntouch_user_id ?? null
          // schedule_url and apply_url are stored directly on the page row (denormalized at save time)
          let finalData = { ...pageData, bntouch_user_id: bntouchUserId }
          if (partnerRes.data) {
            const match = (partnerRes.data as { name: string; logo_url: string }[]).find(p =>
              p.name.toLowerCase().trim() === pageData.partner_name.toLowerCase().trim()
            )
            if (match?.logo_url) finalData = { ...finalData, partner_logo: match.logo_url }
          }
          setPage(finalData)
        }
        fetchExtras().finally(() => setLoading(false))
      }, (e: unknown) => { setDbError(`Fetch error: ${e}`); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (!page || leadShown.current) return
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1') return
    const t = setTimeout(() => { leadShown.current = true; setShowLead(true) }, 10000)
    return () => clearTimeout(t)
  }, [page])

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ color: C.muted, fontSize: 16 }}>Loading…</div>
    </div>
  )
  if (dbError || !page) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🪧</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>Page not found</div>
        <div style={{ color: C.muted, marginTop: 8 }}>This sign rider may have been removed.</div>
        {dbError && <div style={{ marginTop: 16, padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', textAlign: 'left', fontFamily: 'monospace', wordBreak: 'break-all' }}>{dbError}</div>}
      </div>
    </div>
  )

  const TABS = [
    { id: 'overview', label: 'Property' },
    { id: 'loan', label: 'Loan Details' },
    { id: 'contact', label: 'Contact' },
  ] as const

  const loomId = page.loom_url ? loomIdFromUrl(page.loom_url) : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: C.navy, padding: '14px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {page.partner_logo && (
            <img src={page.partner_logo} alt={page.partner_name} style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
            <img src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png" alt="NEO Home Loans" style={{ height: 32, width: 'auto' }} />
            {page.apply_url && (
              <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
                style={{ background: C.accent, color: C.navy, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Apply Now →
              </a>
            )}
          </div>
        </div>
      </header>

      {page.callout_text && (
        <div style={{ background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)', padding: '28px 20px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📣</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{page.callout_text}</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Photos */}
        <PhotoGallery photos={page.photos ?? []} address={page.address} />

        {/* Price + Address + Stats */}
        <div style={{ marginTop: 20 }}>
          <div className="sr-price" style={{ fontWeight: 800, color: C.navy, lineHeight: 1 }}>{Number(page.list_price) > 0 ? fmtPrice(page.list_price) : 'Price Upon Request'}</div>
          <div style={{ fontSize: 16, color: C.dim, marginTop: 6, fontWeight: 600 }}>{page.address}</div>
          <div style={{ fontSize: 14, color: C.muted }}>{page.city}{page.city && page.state ? ', ' : ''}{page.state} {page.zip}</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, padding: '14px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
            {[
              { label: 'Beds', val: page.beds },
              { label: 'Baths', val: page.baths },
              { label: 'Sq Ft', val: page.sqft ? page.sqft.toLocaleString() : null },
              { label: 'Lot', val: page.lot_size || null },
              { label: 'Year Built', val: page.year_built || null },
              { label: 'HOA', val: Number(page.hoa_monthly) > 0 ? `${fmtPrice(page.hoa_monthly)}/mo` : null },
            ].filter(r => r.val).map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginTop: 2 }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact cards */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '20px 0' }}>

          {/* Partner card (first) */}
          {page.partner_name && (
            <div style={{ flex: '1 1 200px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Listing Agent</div>
                {page.partner_logo && <img src={page.partner_logo} alt={page.partner_name} style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain' }} />}
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
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {page.partner_phone && <a href={`tel:${page.partner_phone}`} style={{ fontSize: 12, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>{page.partner_phone}</a>}
                    {page.partner_email && <a href={`mailto:${page.partner_email}`} style={{ fontSize: 11, color: C.muted, textDecoration: 'none', wordBreak: 'break-all' }}>{page.partner_email}</a>}
                  </div>
                </div>
              </div>
              {page.partner_phone && (
                <a href={`tel:${page.partner_phone}`}
                  style={{ display: 'block', marginTop: 14, textAlign: 'center', background: C.navy, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 0', borderRadius: 9, textDecoration: 'none' }}>
                  Schedule a Viewing →
                </a>
              )}
            </div>
          )}

          {/* Advisor card */}
          <div style={{ flex: '1 1 200px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Loan Advisor</div>
              <img src="https://8blocks.s3-us-west-1.amazonaws.com/neo/images/logo-big.jpg" alt="NEO Home Loans" style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {page.advisor_photo
                ? <img src={page.advisor_photo} alt={page.advisor_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.accent, fontWeight: 800, flexShrink: 0 }}>{page.advisor_name?.[0] ?? '?'}</div>
              }
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{page.advisor_name || 'Loan Advisor'}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{page.advisor_title || 'Mortgage Advisor'}</div>
                {page.advisor_nmls && <div style={{ fontSize: 11, color: C.muted }}>NMLS# {page.advisor_nmls}</div>}
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {page.advisor_phone && <a href={`tel:${page.advisor_phone}`} style={{ fontSize: 12, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>{page.advisor_phone}</a>}
                  {page.advisor_email && <a href={`mailto:${page.advisor_email}?subject=Interest in ${page.address}`} style={{ fontSize: 11, color: C.muted, textDecoration: 'none', wordBreak: 'break-all' }}>{page.advisor_email}</a>}
                </div>
              </div>
            </div>
            {page.schedule_url && (
              <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', marginTop: 14, textAlign: 'center', background: C.accent, color: C.navy, fontWeight: 700, fontSize: 13, padding: '10px 0', borderRadius: 9, textDecoration: 'none' }}>
                Schedule a Time to Talk →
              </a>
            )}
          </div>

        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="sr-tab-btn"
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

        {/* Loan Details Tab */}
        {activeTab === 'loan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Loom Video — only shown if a valid Loom URL is set */}
            {loomId && (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Video Walkthrough</div>
                  {page.loom_url && (
                    <a href={page.loom_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: C.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      Open Full Screen ↗
                    </a>
                  )}
                </div>
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                  <iframe
                    src={`https://www.loom.com/embed/${loomId}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    title="Video Walkthrough"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* TCA */}
            {page.tca_url ? (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ background: C.navy }}>
                  <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Total Cost Analysis</div>
                    <a href={page.tca_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: C.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      Open Full Screen ↗
                    </a>
                  </div>
                  <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <svg width="14" height="16" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 20L20 7L35 20V40H26V29H14V40H5V20Z" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" fill="none"/><line x1="14" y1="25" x2="26" y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/><line x1="14" y1="30" x2="26" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/></svg>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>Special financing incentive available! This home qualifies for a reduced interest rate or closing cost credit when financed through NEO Home Loans, the preferred lender. Participation is optional; buyers may use any lender of their choice. Contact listing agent or lender for details.</div>
                  </div>
                </div>
                <iframe
                  src={page.tca_url}
                  className="sr-iframe-tca"
                  style={{ width: '100%', border: 'none', display: 'block' }}
                  title="Total Cost Analysis"
                  allow="fullscreen"
                />
              </div>
            ) : page.tca_screenshot ? (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ background: C.navy }}>
                  <div style={{ padding: '14px 20px' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Total Cost Analysis</div>
                  </div>
                  <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <svg width="14" height="16" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 20L20 7L35 20V40H26V29H14V40H5V20Z" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" fill="none"/><line x1="14" y1="25" x2="26" y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/><line x1="14" y1="30" x2="26" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/></svg>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>Special financing incentive available! This home qualifies for a reduced interest rate or closing cost credit when financed through NEO Home Loans, the preferred lender. Participation is optional; buyers may use any lender of their choice. Contact listing agent or lender for details.</div>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <img src={page.tca_screenshot} alt="Total Cost Analysis" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                </div>
              </div>
            ) : (
              <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: 32, textAlign: 'center', color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📊</div>
                <div style={{ fontWeight: 600 }}>Total Cost Analysis not yet attached.</div>
              </div>
            )}

          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} />
        )}

      </div>

      {/* Always-visible CTAs — Apply Now + Schedule */}
      {(page.apply_url || page.schedule_url) && (
        <div style={{ background: C.bg, padding: '0 20px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {page.apply_url && (
              <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Ready to move forward?</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 6 }}>Get Fully Underwritten Approval Today</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Start your mortgage application online in minutes.</div>
                <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', background: C.accent, color: C.navy, fontWeight: 800, fontSize: 15, padding: '14px 36px', borderRadius: 10, textDecoration: 'none' }}>
                  Get Approved →
                </a>
              </div>
            )}

            {page.schedule_url && (
              <div style={{ background: C.navy, borderRadius: 16, padding: '32px 28px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Ready to connect?</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 20 }}>
                  Schedule a time to talk with {page.advisor_name?.split(' ')[0] || 'your advisor'}
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 28, textAlign: 'left', flexWrap: 'wrap' }}>
                  {[
                    { num: '01', text: 'Get your questions answered about financing this home' },
                    { num: '02', text: 'Explore loan options and see your real monthly payment' },
                  ].map(r => (
                    <div key={r.num} style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: '0.06em', flexShrink: 0, marginTop: 1 }}>{r.num}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{r.text}</div>
                    </div>
                  ))}
                </div>
                <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', background: C.accent, color: C.navy, fontWeight: 800, fontSize: 15, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
                  Schedule a Free Consultation →
                </a>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Legal Disclaimer Footer */}
      <div style={{ background: '#F1F5F9', borderTop: '1px solid #E4E8EC', padding: '20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', fontSize: 9, color: '#94A3B8', lineHeight: 1.7 }}>
          Special financing incentive available! This home qualifies for a reduced interest rate or closing cost credit when financed through NEO Home Loans, the preferred lender. Participation is optional; buyers may use any lender of their choice. Contact listing agent or lender for details. © 2026 Better Home &amp; Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License # 02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Better BMC operates under the name Better Mortgage Corporation in New York. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, 80th Floor, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access. Better Real Estate, LLC dba BRE, Better Home Services, BRE Services, LLC and Better Real Estate, and operating in the State of California through its wholly owned subsidiary Better Real Estate California Inc., is a licensed real estate brokerage and maintains its corporate headquarters at 325-41 Chestnut Street, Suite 826, Philadelphia, PA 19106. Better Real Estate, LLC provides access to real estate brokerage services via its nationwide network of partner brokerages and real estate agents. Equal Housing Opportunity. All rights reserved. New York State Housing and Anti-Discrimination Notice. New York Standard Operating Procedures. Texas Real Estate Commission: Information About Brokerage Services | Consumer Protection Notice. Better Settlement Services, LLC. 325-41 Chestnut Street, Suite 803, Philadelphia, PA 19106. Homeowners insurance policies are offered through Better Cover, LLC, a Pennsylvania Resident Producer Agency. License #881593. 325-41 Chestnut Street, Suite 807, Philadelphia, PA 19106. Better Inspect, LLC maintains its corporate headquarters at 325-41 Chestnut Street, Suite 846, Philadelphia, PA 19106. Better Mortgage Corporation, Better Real Estate, LLC, Better Settlement Services, LLC, Better Cover, LLC, Better Connect, and Better Inspect, LLC are separate operating subsidiaries of Better Home &amp; Finance Holding Company. Each company is a separate legal entity operated and managed through its own management and governance structure as required by its state of incorporation, and applicable and legal and regulatory requirements. Products not available in all states. Any unauthorized use of any proprietary or intellectual property is strictly prohibited. All trademarks, service marks, trade names, logos, icons, and domain names are proprietary to Better Home &amp; Finance Holding Company. Licensed by the Department of Financial Protection and Innovation under the California Residential Mortgage Lending Act.
        </div>
      </div>

      {/* BNTouch Lead Capture Modal (15 second timer) */}
      {showLead && (
        <LeadCaptureModal
          address={`Sign Rider ${slug.match(/(\d+)$/)?.[1] ?? ''}`}
          bntouchUserId={page.bntouch_user_id}
          onDismiss={() => setShowLead(false)}
          callout={page.callout_text}
        />
      )}

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Montserrat', system-ui, sans-serif; }
        a { color: inherit; }
        .sr-gallery-img { width: 100%; height: 340px; object-fit: cover; display: block; }
        .sr-price { font-size: 30px; }
        .sr-tab-btn { padding: 10px 22px; font-size: 14px; }
        .sr-iframe-tca { height: 820px; }
        @media (max-width: 600px) {
          .sr-gallery-img { height: 220px; }
          .sr-price { font-size: 22px; }
          .sr-tab-btn { padding: 8px 12px; font-size: 12px; }
          .sr-iframe-tca { height: 500px; }
        }
      `}</style>
    </div>
  )
}
