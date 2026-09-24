'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AFScenario { header: string; rate: number; apr: number; payment: number }

interface PageData {
  id: string; slug: string; created_by: string
  sales_price: number; quote_date: string | null; seller_advantage_subheading: string | null
  image_urls: string[]
  ai_headline: string | null; ai_explainer: string | null; ai_talking_point: string | null
  scenarios: AFScenario[]
  advisor_name: string | null; advisor_title: string | null; advisor_phone: string | null
  advisor_email: string | null; advisor_photo: string | null; advisor_nmls: string | null
  schedule_url: string | null; apply_url: string | null; bntouch_user_id: string | null
}

const NAVY = '#0A2540'
const ACCENT = '#5BCBF5'
const GREEN = '#22c55e'
const WHITE = '#fff'

function fmt(n: number) { return '$' + Math.round(n).toLocaleString() }
function fmtRate(n: number) { return n.toFixed(3).replace(/\.?0+$/, '') + '%' }

function ContactSection({ page }: { page: PageData }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function validate() {
    if (!name.trim()) return 'Please enter your name.'
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email.'
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) return 'Please enter a valid phone number.'
    return ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)
    if (formRef.current) formRef.current.submit()
    setTimeout(() => { setSubmitted(true); setSubmitting(false) }, 1200)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)', color: WHITE, fontSize: 15, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6,
  }

  return (
    <div id="contact" className="af-contact-pad" style={{ background: NAVY }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 12 }}>Ready to Run the Numbers?</div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, color: WHITE, margin: 0, letterSpacing: '-0.03em' }}>
            See the Numbers for Your Client
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '12px auto 0', maxWidth: 480, lineHeight: 1.7 }}>
            Connect with us and we&apos;ll show you exactly how a seller-paid rate buydown changes the payment — specific to their home, loan type, and profile.
          </p>
        </div>

        {page.advisor_name && (
          <div className="af-advisor-card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {page.advisor_photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.advisor_photo} alt={page.advisor_name}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${ACCENT}`, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ color: WHITE, fontWeight: 800, fontSize: 18 }}>{page.advisor_name}</div>
              {page.advisor_title && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>{page.advisor_title}</div>}
              {page.advisor_nmls && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>NMLS #{page.advisor_nmls}</div>}
              <div className="af-cta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
                {page.schedule_url && (
                  <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
                    style={{ background: 'rgba(255,255,255,0.1)', color: WHITE, fontWeight: 700, fontSize: 13, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                    📅 Schedule a Call
                  </a>
                )}
                {page.apply_url && (
                  <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
                    style={{ background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 13, padding: '9px 18px', borderRadius: 8, textDecoration: 'none' }}>
                    Apply Now →
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
                {page.advisor_phone && (
                  <a href={`tel:${page.advisor_phone}`} style={{ color: ACCENT, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>📞 {page.advisor_phone}</a>
                )}
                {page.advisor_email && (
                  <a href={`mailto:${page.advisor_email}`} style={{ color: ACCENT, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>✉️ {page.advisor_email}</a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="af-divider" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 28 }}>
          or request a consultation
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ color: WHITE, fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Got it!</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Expect to hear from {page.advisor_name ?? 'us'} shortly.</div>
          </div>
        ) : (
          <>
            <iframe ref={iframeRef} name="af-bntouch-target" style={{ display: 'none' }} title="form-target" />
            <form ref={formRef} action="https://www.bntouchmortgage.net/api/webform/" method="POST" target="af-bntouch-target" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="hidden" name="USERID" value={page.bntouch_user_id ?? ''} />
              <input type="hidden" name="GROUPID" value="0" />
              <input type="hidden" name="SEQUENCEID" value="0" />
              <input type="hidden" name="WEBFORMID" value="0" />
              <input type="hidden" name="PROCESSTYPE" value="1" />
              <input type="hidden" name="UTMDATA" value="" />
              <input type="hidden" name="added_source" value={`Affordability LP — ${page.advisor_name ?? 'NEO Home Loans'}`} />
              <input type="hidden" name="loan_officer" value={page.advisor_name ?? ''} />

              <div className="af-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input name="name_1" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input name="phone_cell" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
              </div>

              {error && <div style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>{error}</div>}

              <button type="submit" disabled={submitting}
                style={{ background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 16, padding: '14px', borderRadius: 10, border: 'none', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
                {submitting ? 'Sending…' : 'Show Me My Options →'}
              </button>

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, margin: 0 }}>
                By submitting you allow mortgage related text message communication from NEO Home Loans and its loan officers. Message and data rates may apply. Message frequency varies. Reply STOP to opt out. Reply HELP for help. Privacy Policy at neohomeloans.com.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function ChartCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  function goTo(idx: number) {
    const next = Math.max(0, Math.min(idx, images.length - 1))
    setCurrent(next)
    trackRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px 48px' }}>
      {/* Slide */}
      <div style={{ position: 'relative' }}>
        <div ref={trackRef} style={{ display: 'flex', overflow: 'hidden', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
          {images.map((url, i) => (
            <div key={i} style={{ flex: '0 0 100%', background: 'rgba(255,255,255,0.04)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Market chart ${i + 1}`} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 720 }} />
            </div>
          ))}
        </div>

        {/* Prev button */}
        {current > 0 && (
          <button onClick={() => goTo(current - 1)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(10,37,64,0.75)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            ‹
          </button>
        )}

        {/* Next button */}
        {current < images.length - 1 && (
          <button onClick={() => goTo(current + 1)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(10,37,64,0.75)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            ›
          </button>
        )}
      </div>

      {/* Dots + counter */}
      {images.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
          <button onClick={() => goTo(current - 1)} disabled={current === 0}
            style={{ background: 'none', border: 'none', color: current === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: current === 0 ? 'default' : 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>
            ←
          </button>
          {images.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: i === current ? '#5BCBF5' : 'rgba(255,255,255,0.25)', padding: 0, transition: 'all 0.2s' }} />
          ))}
          <button onClick={() => goTo(current + 1)} disabled={current === images.length - 1}
            style={{ background: 'none', border: 'none', color: current === images.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: current === images.length - 1 ? 'default' : 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>
            →
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{current + 1} / {images.length}</span>
        </div>
      )}
    </div>
  )
}

export default function PageClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    async function load() {
      const { data: row } = await sb.from('affordability_pages').select('*').eq('slug', slug).single()
      if (!row) { setLoading(false); return }
      const { data: prof } = await sb.from('profiles')
        .select('full_name, title, phone, email, headshot_url, nmls, schedule_url, apply_url, bntouch_user_id')
        .eq('id', row.created_by).single()
      setPage({
        ...row,
        sales_price: row.sales_price ?? 0,
        quote_date: row.quote_date ?? null,
        image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
        scenarios: Array.isArray(row.scenarios) ? row.scenarios : [],
        advisor_name: prof?.full_name ?? null,
        advisor_title: prof?.title ?? null,
        advisor_phone: prof?.phone ?? null,
        advisor_email: prof?.email ?? null,
        advisor_photo: prof?.headshot_url ?? null,
        advisor_nmls: prof?.nmls ?? null,
        schedule_url: prof?.schedule_url ?? null,
        apply_url: prof?.apply_url ?? null,
        bntouch_user_id: prof?.bntouch_user_id ?? null,
      } as PageData)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Loading…</div>
  if (!page) return <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Page not found.</div>

  const baseline = page.scenarios[0]?.payment ?? 0
  const images = page.image_urls ?? []
  const qd = page.quote_date
    ? new Date(page.quote_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${NAVY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .af-hero { padding: 40px 20px 32px; }
        .af-h1 { font-size: clamp(30px, 5vw, 62px); }
        .af-sub { font-size: 16px; }
        .af-carousel { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 12px; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 4px; }
        .af-carousel::-webkit-scrollbar { display: none; }
        .af-carousel-slide { flex: 0 0 100%; scroll-snap-align: start; border-radius: 14px; overflow: hidden; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
        .af-carousel-dots { display: flex; justify-content: center; gap: 6px; margin-top: 12px; }
        .af-ai-box { padding: 28px 32px; }
        .af-headline { font-size: clamp(20px, 3vw, 30px); }
        .af-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; padding: 0 16px; }
        .af-card { padding: 22px 20px; border-radius: 18px; }
        .af-rate-num { font-size: clamp(48px, 6vw, 72px); }
        .af-payment-num { font-size: 26px; }
        .af-contact-pad { padding: 56px 24px; }
        .af-form-grid { grid-template-columns: 1fr 1fr; }
        .af-advisor-card { flex-direction: row; }
        @media (max-width: 640px) {
          .af-hero { padding: 24px 16px 20px; text-align: center; }
          .af-h1 { font-size: 28px; line-height: 1.1; }
          .af-sub { font-size: 14px; }
          .af-charts-grid-top { grid-template-columns: 1fr; }
          .af-charts-grid-bottom { grid-template-columns: 1fr; max-width: 100%; }
          .af-ai-box { padding: 20px 16px; text-align: center; }
          .af-headline { font-size: 20px; }
          .af-cards { grid-template-columns: 1fr; gap: 10px; padding: 0 12px; }
          .af-card { padding: 20px 16px; text-align: center; border-radius: 16px; }
          .af-rate-num { font-size: 54px; }
          .af-payment-num { font-size: 28px; }
          .af-contact-pad { padding: 40px 16px; }
          .af-form-grid { grid-template-columns: 1fr !important; }
          .af-advisor-card { flex-direction: column !important; align-items: center !important; text-align: center; }
          .af-cta-row { justify-content: center; }
          .af-divider { margin: 0 auto; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: NAVY }}>

        {/* Hero */}
        <div className="af-hero" style={{ textAlign: 'center' }}>
          {/* NEO logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://mettlehq.com/wp-content/uploads/2023/06/NEO_LOGO_HORIZ_WHITE-1.png"
            alt="NEO Home Loans" style={{ height: 34, display: 'block', margin: '0 auto 24px', objectFit: 'contain' }} />

          {page.apply_url && (
            <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 13, padding: '8px 18px', borderRadius: 8, textDecoration: 'none', marginBottom: 24 }}>
              Apply Now →
            </a>
          )}

          <h1 className="af-h1" style={{ fontWeight: 900, color: WHITE, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 16 }}>
            The Problem Isn&apos;t Home Prices.<br /><span style={{ color: ACCENT }}>It&apos;s Affordability.</span>
          </h1>
          <p className="af-sub" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.7 }}>
            This Is How We Manufacture Affordability.
          </p>

          {(page.sales_price > 0 || qd) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 20px', marginBottom: 8 }}>
              {page.sales_price > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 3 }}>Ex. Home Price</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(page.sales_price)}</div>
                </div>
              )}
              {page.sales_price > 0 && qd && <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.12)' }} />}
              {qd && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Rates As Of</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{qd}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Market Charts — carousel */}
        {images.length > 0 && <ChartCarousel images={images} />}

        {/* AI Explainer */}
        {(page.ai_headline || page.ai_explainer) && (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px 48px' }}>
            <div className="af-ai-box" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18 }}>
              {page.ai_headline && (
                <h2 className="af-headline" style={{ fontWeight: 800, color: ACCENT, letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.2 }}>
                  {page.ai_headline}
                </h2>
              )}
              {page.ai_explainer && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 1.75, marginBottom: page.ai_talking_point ? 20 : 0 }}>
                  {page.ai_explainer}
                </p>
              )}
              {page.ai_talking_point && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Client Talking Point</div>
                  <p style={{ color: WHITE, fontSize: 15, fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic' }}>
                    &ldquo;{page.ai_talking_point}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rate Scenarios */}
        {page.scenarios?.length > 0 && (
          <div style={{ padding: '0 16px 48px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 10 }}>NEO Home Loans</div>
                <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: WHITE, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  Our Solutions to Housing Affordability
                </h2>
              </div>

              {/* Seller Advantage section header */}
              <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <h3 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, color: WHITE, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px' }}>
                  Seller Advantage Program
                </h3>
                <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0, maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
                  {page.seller_advantage_subheading ?? 'A seller-paid rate buydown could reduce your monthly payment by hundreds of dollars — without waiting for market rates to fall.'}
                </p>
              </div>

              {/* Price + date pill */}
              {(page.sales_price > 0 || qd) && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 28px' }}>
                    {page.sales_price > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 4 }}>Ex. Home Price</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: WHITE, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmt(page.sales_price)}</div>
                      </div>
                    )}
                    {page.sales_price > 0 && qd && <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.12)' }} />}
                    {qd && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Rates As Of</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{qd}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="af-cards">
                {page.scenarios.map((s, i) => {
                  const isMarket = i === 0
                  const isBest = i === page.scenarios.length - 1 && i > 0
                  const savings = i > 0 && baseline > 0 ? baseline - s.payment : 0
                  const annualSavings = savings * 12
                  const cardAccent = isMarket ? 'rgba(255,255,255,0.4)' : isBest ? GREEN : ACCENT
                  const cardBg = isMarket ? 'rgba(255,255,255,0.05)' : isBest ? 'rgba(34,197,94,0.10)' : 'rgba(91,203,245,0.08)'
                  const cardBorder = isMarket ? 'rgba(255,255,255,0.1)' : isBest ? GREEN + '50' : ACCENT + '40'
                  const cardGlow = isBest ? `0 0 40px ${GREEN}30, 0 2px 16px rgba(0,0,0,0.3)` : undefined
                  return (
                    <div key={i} className="af-card" style={{ background: cardBg, border: `1px solid ${cardBorder}`, position: 'relative', overflow: 'hidden', boxShadow: cardGlow }}>
                      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: cardAccent, opacity: isMarket ? 0.03 : isBest ? 0.15 : 0.08, filter: 'blur(30px)' }} />
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: cardAccent, marginBottom: 14 }}>{s.header}</div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Interest Rate</div>
                        <div className="af-rate-num" style={{ fontWeight: 900, color: isBest ? GREEN : WHITE, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtRate(s.rate)}
                        </div>
                      </div>
                      {!isMarket && savings > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: `${cardAccent}25`, border: `1px solid ${cardAccent}60`, borderRadius: 20, padding: '6px 14px', marginBottom: 14 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: cardAccent }}>💰 Save {fmt(savings)}/mo</span>
                        </div>
                      )}
                      <div style={{ borderTop: `1px solid ${isMarket ? 'rgba(255,255,255,0.08)' : cardAccent + '30'}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>Monthly Payment</div>
                          <div className="af-payment-num" style={{ fontWeight: 900, color: WHITE, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{fmt(s.payment)}</div>
                        </div>
                        {!isMarket && annualSavings > 0 && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: isBest ? GREEN : 'rgba(255,255,255,0.5)' }}>{fmt(annualSavings)}/yr savings vs. market</div>
                        )}
                        {isMarket && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Standard market financing</div>}
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>APR {fmtRate(s.apr)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <a href="#contact" style={{ display: 'inline-block', background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 16, padding: '14px 40px', borderRadius: 10, textDecoration: 'none', letterSpacing: '-0.01em', boxShadow: `0 4px 24px ${ACCENT}44` }}>
                  Show Me My Options →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        <ContactSection page={page} />

        {/* Disclaimer */}
        <div style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '28px 24px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', fontSize: 11, color: '#94A3B8', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: '#64748B' }}>Disclaimer: </strong>
              {`Illustrative example only. ${page.scenarios?.map(s => `${s.header}: ${fmtRate(s.rate)} interest rate (${fmtRate(s.apr)} APR), estimated total monthly payment of ${fmt(s.payment)}.`).join(' ')} Payments include estimated P&I, mortgage insurance, taxes and insurance. Rates and programs subject to change. Not a commitment to lend. All loans subject to credit approval. NEO Home Loans is an equal housing lender. Educational purposes only. Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan.`}
            </p>
            <p style={{ margin: 0 }}>
              {`© 2026 Better Home & Finance Holding Company and/or its affiliates. Better Mortgage Corporation provides home loans; Better Real Estate, LLC (CA License # 02164055) provides real estate services; Better Cover, LLC sells insurance products; Better Settlement Services provides title insurance; Better Inspect, LLC provides home inspection services. Home lending products offered by Better Mortgage Corporation. NMLS #330511. 1 World Trade Center, 80th Floor, New York, NY 10007. Not available in all states. Equal Housing Lender. `}
              <a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noopener noreferrer" style={{ color: '#64748B', textDecoration: 'underline' }}>www.nmlsconsumeraccess.org</a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
