'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import LeadCaptureModal from '@/components/LeadCaptureModal'

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

const SCENARIO_THEME = [
  { border: '#334E6A', label: 'rgba(255,255,255,0.5)', badge: 'rgba(255,255,255,0.1)', badgeText: 'rgba(255,255,255,0.6)' },
  { border: ACCENT,   label: ACCENT,                  badge: 'rgba(91,203,245,0.15)',  badgeText: ACCENT },
  { border: '#34D399', label: '#34D399',               badge: 'rgba(52,211,153,0.12)', badgeText: '#34D399' },
]

export default function PageClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLead, setShowLead] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(1)

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
  const disclaimer = `Rates quoted as of ${qd ?? 'the date shown'}. ${page.sales_price ? `Based on a purchase price of ${fmt(page.sales_price)}. ` : ''}${scenarios.map(s => `${s.header}: ${fmtRate(s.rate)} interest rate (${fmtRate(s.apr)} APR), estimated total monthly payment of ${fmt(s.payment)}.`).join(' ')} Payments include estimated P&I, mortgage insurance, taxes and insurance. Rates and programs subject to change. Not a commitment to lend. All loans subject to credit approval. NEO Home Loans is an equal housing lender. Educational purposes only.`

  const ff = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

  return (
    <div style={{ fontFamily: ff, background: '#F0F4F8', minHeight: '100vh', color: NAVY }}>

      {/* ── Nav ── */}
      <div style={{ background: NAVY, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neo-logo.png" alt="NEO Home Loans" style={{ height: 28, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span style={{ color: WHITE, fontWeight: 700, fontSize: 14 }}>NEO Home Loans</span>
        </div>
        <button onClick={() => setShowLead(true)}
          style={{ background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 13, padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
          Get My Numbers
        </button>
      </div>

      {/* ── Hero ── */}
      <div style={{ background: NAVY, padding: 'clamp(48px,8vw,88px) 24px clamp(56px,10vw,120px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* decorative rings */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', border: `1px solid rgba(91,203,245,0.07)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', border: `1px solid rgba(91,203,245,0.1)`, pointerEvents: 'none' }} />

        <div style={{ display: 'inline-block', border: `1px solid rgba(91,203,245,0.4)`, color: ACCENT, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '5px 16px', borderRadius: 20, marginBottom: 22 }}>
          Seller Advantage Program
        </div>

        <h1 style={{ color: WHITE, fontSize: 'clamp(36px,7vw,80px)', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.05, letterSpacing: '-0.035em' }}>
          The Market Is<br /><span style={{ color: ACCENT }}>Expensive.</span>
        </h1>
        <h2 style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(20px,3.5vw,36px)', fontWeight: 700, margin: '0 0 32px', letterSpacing: '-0.02em' }}>
          We Have Solutions.
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(15px,2vw,17px)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
          When a seller pays closing costs to buy down your rate, your monthly payment can drop by hundreds of dollars — every single month.
        </p>

        {page.sales_price > 0 && (
          <div style={{ display: 'inline-flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 24px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Purchase price <strong style={{ color: WHITE }}>{fmt(page.sales_price)}</strong></span>
            {qd && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Rates as of <strong style={{ color: WHITE }}>{qd}</strong></span>}
          </div>
        )}
      </div>

      {/* ── Rate Cards ── */}
      <div style={{ maxWidth: 960, margin: '-40px auto 0', padding: '0 16px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {scenarios.map((s, i) => {
            const savings = i > 0 && baseline > 0 ? baseline - s.payment : 0
            const annualSavings = savings * 12
            const isMarket = i === 0
            const cardAccent = i === 0 ? ACCENT : i === 1 ? ACCENT : '#34D399'
            return (
              <div key={i} style={{ background: NAVY, borderRadius: 18, padding: '28px 24px', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', position: 'relative', overflow: 'hidden', border: `1.5px solid ${isMarket ? 'rgba(255,255,255,0.08)' : cardAccent + '55'}` }}>
                <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: cardAccent, opacity: 0.05 }} />

                {/* Header */}
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: cardAccent, marginBottom: 22 }}>
                  {s.header}
                </div>

                {/* Rate — hero number */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Interest Rate</div>
                  <div style={{ fontSize: 'clamp(48px,8vw,72px)', fontWeight: 900, color: WHITE, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtRate(s.rate)}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Monthly Payment */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Monthly Payment</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: WHITE, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{fmt(s.payment)}</div>
                  </div>

                  {/* Savings badge */}
                  {!isMarket && savings > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${cardAccent}18`, border: `1px solid ${cardAccent}44`, borderRadius: 20, padding: '6px 14px', alignSelf: 'flex-start' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: cardAccent }}>Save {fmt(savings)}/mo</span>
                    </div>
                  )}

                  {/* Annual callout */}
                  {!isMarket && annualSavings > 0 && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                      {fmt(annualSavings)}/yr vs. market rate
                    </div>
                  )}

                  {isMarket && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Standard market financing</div>
                  )}

                  {/* APR — small, at bottom */}
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    APR {fmtRate(s.apr)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── How It Works ── */}
      <div style={{ background: WHITE, padding: '56px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 10 }}>How It Works</div>
            <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, color: NAVY, margin: 0, letterSpacing: '-0.03em' }}>Seller Pays → Your Rate Drops</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
            {[
              { n: '01', title: 'Seller Pays Closing Costs', body: 'Instead of a price cut, the seller contributes funds at closing specifically to reduce your interest rate.' },
              { n: '02', title: 'Your Rate Drops', body: 'Those funds permanently or temporarily lower your mortgage rate below what the open market offers.' },
              { n: '03', title: 'Lower Payment, Every Month', body: 'A lower rate means less interest — that savings hits your bank account every month for the life of the loan.' },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <div style={{ fontSize: 48, fontWeight: 900, color: ACCENT, opacity: 0.3, marginBottom: 10, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: NAVY, marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contact ── */}
      <div style={{ background: NAVY, padding: '64px 24px' }}>
        <div style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 14 }}>Get Your Numbers</div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, color: WHITE, margin: '0 0 14px', letterSpacing: '-0.03em' }}>See What This Looks Like for Your Home</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, margin: '0 0 36px', lineHeight: 1.7 }}>
            Get a personalized analysis based on your actual price, loan type, and credit profile.
          </p>

          {page.advisor_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
              {page.advisor_photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.advisor_photo} alt={page.advisor_name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ color: WHITE, fontWeight: 800, fontSize: 15 }}>{page.advisor_name}</div>
                {page.advisor_title && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{page.advisor_title}</div>}
                {page.advisor_nmls && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>NMLS #{page.advisor_nmls}</div>}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={() => setShowLead(true)}
              style={{ background: ACCENT, color: NAVY, fontWeight: 800, fontSize: 15, padding: '14px 32px', borderRadius: 10, border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
              Get My Free Analysis
            </button>
            {page.schedule_url && (
              <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
                style={{ background: 'rgba(255,255,255,0.1)', color: WHITE, fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                📅 Schedule a Call
              </a>
            )}
            {page.apply_url && (
              <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
                style={{ background: 'rgba(255,255,255,0.1)', color: WHITE, fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                📋 Start Application
              </a>
            )}
          </div>
          {page.advisor_phone && (
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Or call: <a href={`tel:${page.advisor_phone}`} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, textDecoration: 'none' }}>{page.advisor_phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', fontSize: 11, color: '#94A3B8', lineHeight: 1.8 }}>
          <strong style={{ color: '#64748B' }}>Disclaimer: </strong>{disclaimer}
        </div>
      </div>

      {showLead && (
        <LeadCaptureModal
          address="Seller Advantage Program"
          advisorName={page.advisor_name}
          bntouchUserId={page.bntouch_user_id}
          onDismiss={() => setShowLead(false)}
          callout="I'd like to see how a seller-paid rate reduction could lower my monthly payment."
        />
      )}
    </div>
  )
}
