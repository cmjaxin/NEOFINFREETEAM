'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SAScenario {
  header: string
  rate: number
  apr: number
  payment: number
}

interface PageData {
  id: string
  slug: string
  created_by: string
  sales_price: number
  quote_date: string
  scenarios: SAScenario[]
  advisor_name: string | null
  advisor_title: string | null
  advisor_phone: string | null
  advisor_email: string | null
  advisor_photo: string | null
  advisor_nmls: string | null
  schedule_url: string | null
  apply_url: string | null
  bntouch_user_id: string | null
}

const NAVY = '#0A2540'
const ACCENT = '#5BCBF5'
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
    background: 'rgba(255,255,255,0.07)', color: WHITE, fontSize: 15, outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6,
  }

  return (
    <div id="contact" className="sa-contact-pad" style={{ background: NAVY }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Section label */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 12 }}>Work With Us</div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, color: WHITE, margin: 0, letterSpacing: '-0.03em' }}>
            Ready to See Your Numbers?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '12px auto 0', maxWidth: 480, lineHeight: 1.7 }}>
            We&apos;ll show you exactly how a seller-paid rate reduction changes your payment — for your specific home, loan type, and profile.
          </p>
        </div>

        {/* Advisor card */}
        {page.advisor_name && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
            {page.advisor_photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.advisor_photo} alt={page.advisor_name}
                style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${ACCENT}`, marginBottom: 14 }} />
            )}
            <div style={{ color: WHITE, fontWeight: 800, fontSize: 20 }}>{page.advisor_name}</div>
            {page.advisor_title && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 2 }}>{page.advisor_title}</div>}
            {page.advisor_nmls && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>NMLS #{page.advisor_nmls}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 10 }}>
              {page.advisor_phone && (
                <a href={`tel:${page.advisor_phone}`} style={{ color: ACCENT, fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  📞 {page.advisor_phone}
                </a>
              )}
              {page.advisor_email && (
                <a href={`mailto:${page.advisor_email}`} style={{ color: ACCENT, fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  ✉️ {page.advisor_email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
          {page.schedule_url && (
            <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
              style={{ background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 15, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              📅 Schedule a Call
            </a>
          )}
          {page.apply_url && (
            <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
              style={{ background: 'rgba(255,255,255,0.12)', color: WHITE, fontWeight: 800, fontSize: 15, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Apply Now
            </a>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>or request a consultation</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Inline form */}
        {!submitted ? (
          <>
            <iframe ref={iframeRef} name="bnt_iframe_sa" style={{ display: 'none' }} title="BNTouch Submit" />
            <form ref={formRef} method="post" action="https://www.bntouchmortgage.net/api/webform/" target="bnt_iframe_sa" onSubmit={handleSubmit}>
              <input type="hidden" name="added_source" value={`Seller Advantage LP — ${page.advisor_name ?? 'NEO Home Loans'}`} />
              <input type="hidden" name="loan_officer" value={page.advisor_name ?? ''} />
              <input type="hidden" name="RETURNTIMEOUT" value="10" />
              <input type="hidden" name="USERID" value={page.bntouch_user_id || '10543'} />
              <input type="hidden" name="GROUPID" value="1" />
              <input type="hidden" name="SEQUENCEID" value="1" />
              <input type="hidden" name="WEBFORMID" value="5524" />
              <input type="hidden" name="PROCESSTYPE" value="mortgage" />
              <input type="hidden" name="UTMDATA" value="" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input name="name_1" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                </div>
                <div className="sa-form-grid" style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input name="email" type="email" placeholder="jane@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input name="phone_cell" type="tel" placeholder="(801) 555-0100" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                {error && <div style={{ color: '#F87171', fontSize: 13, fontWeight: 600 }}>{error}</div>}

                <button type="submit" disabled={submitting}
                  style={{ background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 16, padding: '14px', borderRadius: 10, border: 'none', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
                  {submitting ? 'Sending…' : 'Request More Info'}
                </button>

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
                  By submitting you allow mortgage related text message communication to this number. Providing your phone number above, and clicking the &quot;Request More Info&quot; button above, you agree to receive text messages from NEO Home Loans. Consent is not a condition of service. Message and data rates may apply. Message frequency varies. Reply HELP for help or STOP to cancel.
                </div>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 24px', background: 'rgba(91,203,245,0.1)', borderRadius: 14, border: `1px solid ${ACCENT}33` }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ color: WHITE, fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Got it — we&apos;ll be in touch!</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Expect to hear from {page.advisor_name ?? 'us'} shortly.</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PageClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    async function load() {
      const { data: row } = await sb.from('seller_advantage_pages').select('*').eq('slug', slug).single()
      if (!row) { setLoading(false); return }
      const { data: prof } = await sb.from('profiles')
        .select('full_name, title, phone, email, headshot_url, nmls, schedule_url, apply_url, bntouch_user_id')
        .eq('id', row.created_by).single()
      setPage({
        ...row,
        advisor_name: prof?.full_name ?? null,
        advisor_title: prof?.title ?? null,
        advisor_phone: prof?.phone ?? null,
        advisor_email: prof?.email ?? null,
        advisor_photo: prof?.headshot_url ?? null,
        advisor_nmls: prof?.nmls ?? null,
        schedule_url: prof?.schedule_url ?? null,
        apply_url: prof?.apply_url ?? null,
        bntouch_user_id: prof?.bntouch_user_id ?? null,
      })
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: ACCENT, fontSize: 16 }}>Loading…</div>
    </div>
  )
  if (!page) return (
    <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: WHITE, fontSize: 16 }}>Page not found.</div>
    </div>
  )

  const scenarios = page.scenarios ?? []
  const baseline = scenarios[0]?.payment ?? 0
  const qd = page.quote_date
    ? new Date(page.quote_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const betterDisclaimer = `© 2026 Better Home & Finance Holding Company and/or its affiliates. Better Mortgage Corporation provides home loans; Better Real Estate, LLC (CA License # 02164055) provides real estate services; Better Cover, LLC sells insurance products; Better Settlement Services provides title insurance; Better Inspect, LLC provides home inspection services. Home lending products offered by Better Mortgage Corporation. NMLS #330511. 1 World Trade Center, 80th Floor, New York, NY 10007. Not available in all states. Equal Housing Lender. www.nmlsconsumeraccess.org`
  const disclaimer = `Illustrative example only, rates quoted as of ${qd ?? 'the date shown'}. ${page.sales_price ? `Based on a purchase price of ${fmt(page.sales_price)}. ` : ''}${scenarios.map(s => `${s.header}: ${fmtRate(s.rate)} interest rate (${fmtRate(s.apr)} APR), estimated total monthly payment of ${fmt(s.payment)}.`).join(' ')} Payments include estimated P&I, mortgage insurance, taxes and insurance. Rates and programs subject to change. Not a commitment to lend. All loans subject to credit approval. NEO Home Loans is an equal housing lender. Educational purposes only. Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before choosing a loan.`

  const ff = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

  return (
    <div style={{ fontFamily: ff, background: '#F0F4F8', minHeight: '100vh', color: NAVY }}>
      <style>{`
        .sa-hero { padding: 32px 20px 28px; }
        .sa-apply-btn { position: absolute; top: 20px; right: 20px; }
        .sa-logo { height: 34px; display: block; margin: 0 auto 16px; object-fit: contain; }
        .sa-h1 { font-size: clamp(28px, 5.5vw, 64px); }
        .sa-sub { font-size: 15px; }
        .sa-price-pill { padding: 10px 20px; gap: 16px; }
        .sa-price-num { font-size: 20px; }
        .sa-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; padding: 0 16px; }
        .sa-card { padding: 22px 20px; border-radius: 18px; }
        .sa-rate-num { font-size: clamp(52px, 7vw, 76px); }
        .sa-payment-num { font-size: 26px; }
        .sa-steps-box { padding: 28px 32px; }
        .sa-how-grid { gap: 28px; }
        .sa-form-grid { grid-template-columns: 1fr 1fr; }
        .sa-contact-pad { padding: 56px 24px; }
        @media (max-width: 640px) {
          .sa-hero { padding: 20px 16px 20px; text-align: center; }
          .sa-apply-btn { position: static; display: block; text-align: center; margin: 0 auto 16px; width: fit-content; }
          .sa-logo { height: 28px; margin: 0 auto 12px; }
          .sa-h1 { font-size: 30px; line-height: 1.1; text-align: center; }
          .sa-sub { font-size: 14px; text-align: center; }
          .sa-price-pill { flex-direction: column; gap: 8px; padding: 12px 16px; }
          .sa-price-num { font-size: 22px; }
          .sa-cards { grid-template-columns: 1fr; gap: 10px; padding: 0 12px; }
          .sa-card { padding: 20px 18px; border-radius: 16px; text-align: center; }
          .sa-card-label { text-align: center; }
          .sa-rate-num { font-size: 58px; text-align: center; }
          .sa-payment-num { font-size: 28px; text-align: center; }
          .sa-savings-badge { align-self: center !important; }
          .sa-card-stats { align-items: center; }
          .sa-steps-box { padding: 22px 20px; }
          .sa-step { text-align: center; align-items: center !important; flex-direction: column !important; gap: 8px !important; }
          .sa-how-grid { grid-template-columns: 1fr !important; gap: 16px; }
          .sa-how-card { text-align: center; }
          .sa-how-icon { margin: 0 auto 14px; }
          .sa-form-grid { grid-template-columns: 1fr; }
          .sa-contact-pad { padding: 40px 16px; }
          .sa-advisor-card { text-align: center; flex-direction: column !important; align-items: center !important; }
          .sa-cta-row { justify-content: center; }
          .sa-divider { margin: 0 auto; }
        }
      `}</style>

      {/* ── Hero + Cards combined above the fold ── */}
      <div style={{ background: NAVY, position: 'relative', overflow: 'hidden', paddingBottom: 40 }}>
        {/* decorative rings */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 900, borderRadius: '50%', border: `1px solid rgba(91,203,245,0.05)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', border: `1px solid rgba(91,203,245,0.08)`, pointerEvents: 'none' }} />

        {/* Tight hero text */}
        <div className="sa-hero" style={{ textAlign: 'center', position: 'relative' }}>
          {/* Apply Now */}
          {page.apply_url && (
            <a href={page.apply_url} target="_blank" rel="noopener noreferrer" className="sa-apply-btn"
              style={{ background: '#0369A1', color: WHITE, fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 8, textDecoration: 'none' }}>
              Apply Now
            </a>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://mettlehq.com/wp-content/uploads/2023/06/NEO_LOGO_HORIZ_WHITE-1.png" alt="NEO Home Loans" className="sa-logo" />

          <div style={{ display: 'inline-block', border: `1px solid rgba(91,203,245,0.4)`, color: ACCENT, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, marginBottom: 14 }}>
            Seller Advantage Program
          </div>

          <h1 className="sa-h1" style={{ color: WHITE, fontWeight: 900, margin: '0 0 10px', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Love the House.<br />
            <span style={{ color: ACCENT }}>Not the Monthly Payment?</span>
          </h1>
          <p className="sa-sub" style={{ color: 'rgba(255,255,255,0.6)', margin: '0 auto 20px', maxWidth: 520, lineHeight: 1.65 }}>
            A seller-paid rate buydown could reduce your monthly payment by hundreds of dollars — without waiting for market rates to fall.
          </p>

          {page.sales_price > 0 && (
            <div className="sa-price-pill" style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 3 }}>Ex. Home Price</div>
                <div className="sa-price-num" style={{ fontWeight: 900, color: WHITE, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(page.sales_price)}</div>
              </div>
              {qd && (
                <>
                  <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.12)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Rates As Of</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{qd}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rate cards — inside the navy section so they're above the fold */}
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <div className="sa-cards">
            {scenarios.map((s, i) => {
              const savings = i > 0 && baseline > 0 ? baseline - s.payment : 0
              const annualSavings = savings * 12
              const isMarket = i === 0
              const cardAccent = i === 2 ? '#34D399' : ACCENT
              return (
                <div key={i} className="sa-card" style={{
                  background: isMarket ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, rgba(${i===2?'52,211,153':'91,203,245'},0.12) 0%, rgba(10,37,64,0) 100%)`,
                  border: `1.5px solid ${isMarket ? 'rgba(255,255,255,0.1)' : cardAccent + '60'}`,
                  boxShadow: isMarket ? 'none' : `0 0 40px ${cardAccent}18`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* glow orb */}
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: cardAccent, opacity: isMarket ? 0.03 : 0.08, filter: 'blur(20px)' }} />

                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: cardAccent, marginBottom: 14 }}>
                    {s.header}
                  </div>

                  {/* Rate — the hero stat */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Interest Rate</div>
                    <div className="sa-rate-num" style={{ fontWeight: 900, color: WHITE, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtRate(s.rate)}
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${isMarket ? 'rgba(255,255,255,0.08)' : cardAccent + '22'}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>Monthly Payment</div>
                      <div className="sa-payment-num" style={{ fontWeight: 900, color: WHITE, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{fmt(s.payment)}</div>
                    </div>

                    {!isMarket && savings > 0 && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', background: `${cardAccent}20`, border: `1px solid ${cardAccent}50`, borderRadius: 20, padding: '5px 12px', alignSelf: 'flex-start' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: cardAccent }}>Save {fmt(savings)}/mo</span>
                      </div>
                    )}
                    {!isMarket && annualSavings > 0 && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{fmt(annualSavings)}/yr vs. market</div>
                    )}
                    {isMarket && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Standard market financing</div>}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>APR {fmtRate(s.apr)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA below cards */}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <a href="#contact"
              style={{ display: 'inline-block', background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 16, padding: '14px 40px', borderRadius: 10, textDecoration: 'none', letterSpacing: '-0.01em', boxShadow: `0 4px 24px ${ACCENT}44` }}>
              Show Me My Options →
            </a>
          </div>
        </div>
      </div>

      {/* ── What Is the Seller Advantage Program? ── */}
      <div style={{ background: WHITE, padding: '64px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, color: NAVY, margin: 0, letterSpacing: '-0.03em' }}>What Is the Seller Advantage Program?</h2>
          </div>

          <div className="sa-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 52 }}>
            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '28px 28px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 18 }}>🏷️</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 10px', letterSpacing: '-0.01em' }}>A Seller-Funded Rate Reduction</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.75, margin: 0 }}>
                The seller contributes funds at closing that are used specifically to buy down your mortgage rate — either temporarily for the first few years, or permanently for the life of the loan. Think of it like a builder incentive, applied to any home on the market.
              </p>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '28px 28px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 18 }}>👥</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 10px', letterSpacing: '-0.01em' }}>More Buyers Can Qualify</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.75, margin: 0 }}>
                A lower rate means a lower monthly payment — and that lower payment can re-qualify buyers who were priced out at the market rate. The seller doesn&apos;t drop the asking price; instead, they make the financing affordable, which opens the door to a wider pool of buyers.
              </p>
            </div>
          </div>

          {/* How the math works */}
          <div className="sa-steps-box" style={{ background: NAVY, borderRadius: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, marginBottom: 16 }}>The Simple Version</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { step: '01', text: 'You make an offer and negotiate for the seller to cover a portion of your closing costs.' },
                { step: '02', text: 'Those funds are used to permanently or temporarily reduce your interest rate below market.' },
                { step: '03', text: 'Your monthly payment drops — potentially by hundreds of dollars — without changing the purchase price.' },
                { step: '04', text: 'You keep more money in your pocket every single month for the life of the buydown.' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(91,203,245,0.3)', lineHeight: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>{step}</div>
                  <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, paddingTop: 4 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact ── */}
      <ContactSection page={page} />

      {/* ── Disclaimer ── */}
      <div style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '28px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', fontSize: 11, color: '#94A3B8', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 12px' }}><strong style={{ color: '#64748B' }}>Disclaimer: </strong>{disclaimer}</p>
          <p style={{ margin: 0 }}>{betterDisclaimer.replace('www.nmlsconsumeraccess.org', '')}
            <a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noopener noreferrer" style={{ color: '#64748B', textDecoration: 'underline' }}>www.nmlsconsumeraccess.org</a>
          </p>
        </div>
      </div>
    </div>
  )
}
