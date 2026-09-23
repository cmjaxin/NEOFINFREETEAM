'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import LeadCaptureModal from '@/components/LeadCaptureModal'

const C = {
  navy: '#0A2540', navyDark: '#071a2e', accent: '#5BCBF5',
  white: '#fff', bg: '#F4F6F8', border: '#E4E8EC',
  muted: '#6B7280', text: '#1F2937', green: '#059669',
}

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

function fmt(n: number) { return '$' + Math.round(n).toLocaleString() }
function fmtRate(n: number) { return n.toFixed(3).replace(/\.?0+$/, '') + '%' }

export default function PageClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLead, setShowLead] = useState(false)

  useEffect(() => {
    const sb = createClient()
    async function load() {
      const { data: row } = await sb
        .from('seller_advantage_pages')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!row) { setLoading(false); return }

      // Pull advisor info from profile
      const { data: prof } = await sb
        .from('profiles')
        .select('full_name, title, phone, email, headshot_url, nmls, schedule_url, apply_url, bntouch_user_id')
        .eq('id', row.created_by)
        .single()

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
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.accent, fontSize: 16 }}>Loading…</div>
    </div>
  )

  if (!page) return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: 16 }}>Page not found.</div>
    </div>
  )

  const scenarios = page.scenarios ?? []
  const baseline = scenarios[0]?.payment ?? 0

  // Format quote date
  const qd = page.quote_date
    ? new Date(page.quote_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  // Auto-generate disclaimer
  const disclaimer = `Rates quoted as of ${qd ?? 'the date shown'}. ${
    page.sales_price ? `Based on a purchase price of ${fmt(page.sales_price)}. ` : ''
  }${scenarios.map(s => `${s.header}: ${fmtRate(s.rate)} interest rate (${fmtRate(s.apr)} APR), estimated total monthly payment of ${fmt(s.payment)}.`).join(' ')} Payments shown include principal & interest, mortgage insurance, and estimated property taxes and insurance. Actual payments will vary based on credit score, down payment, loan type, and other factors. This is not a commitment to lend. Rates and programs are subject to change without notice. All loans subject to credit approval. NEO Home Loans is an equal housing lender. This content is provided for educational purposes only.`

  const scenarioColors = [
    { bg: '#0A2540', accent: '#5BCBF5', text: '#fff', label: '#5BCBF5' },  // navy - market
    { bg: '#064E3B', accent: '#34D399', text: '#fff', label: '#34D399' },  // green - permanent
    { bg: '#1E3A5F', accent: '#93C5FD', text: '#fff', label: '#93C5FD' },  // blue - temp
  ]

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: C.bg, minHeight: '100vh' }}>

      {/* Nav */}
      <div style={{ background: C.navy, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neo-logo.png" alt="NEO Home Loans" style={{ height: 32, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>NEO Home Loans</span>
        </div>
        {page.apply_url && (
          <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
            style={{ background: C.accent, color: C.navy, fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 20, textDecoration: 'none' }}>
            Apply Now
          </a>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: C.navy, padding: '56px 24px 64px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(91,203,245,0.15)', color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, marginBottom: 20 }}>
          Seller Advantage Program
        </div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          The Market Is Expensive.<br />
          <span style={{ color: C.accent }}>We Have Solutions.</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 16, maxWidth: 560, margin: '0 auto 28px', lineHeight: 1.65 }}>
          When a seller negotiates closing costs to buy down your interest rate, your monthly payment drops — sometimes dramatically. See how the numbers compare below.
        </p>
        {page.sales_price > 0 && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Based on a purchase price of <strong style={{ color: '#fff' }}>{fmt(page.sales_price)}</strong>
            {qd ? <> · Rates as of <strong style={{ color: '#fff' }}>{qd}</strong></> : ''}
          </div>
        )}
      </div>

      {/* Rate Cards */}
      <div style={{ maxWidth: 960, margin: '-36px auto 0', padding: '0 16px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {scenarios.map((s, i) => {
            const col = scenarioColors[i] ?? scenarioColors[0]
            const savings = i > 0 && baseline > 0 ? baseline - s.payment : 0
            const isMarket = i === 0
            return (
              <div key={i} style={{ background: col.bg, borderRadius: 16, padding: '28px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden' }}>
                {/* Background shimmer */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: col.accent, opacity: 0.06 }} />

                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: col.label, marginBottom: 20 }}>
                  {s.header}
                </div>

                {/* Monthly Payment — the hero number */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Total Monthly Payment</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {fmt(s.payment)}
                    <span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>/mo</span>
                  </div>
                  {!isMarket && savings > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 12px' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: col.label }}>Save {fmt(savings)}/mo</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>vs market</span>
                    </div>
                  )}
                  {isMarket && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Standard market financing</div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Interest Rate</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{fmtRate(s.rate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>APR</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{fmtRate(s.apr)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Annual savings callout */}
        {scenarios.length > 1 && baseline > 0 && (scenarios[1]?.payment ?? 0) < baseline && (
          <div style={{ background: '#064E3B', borderRadius: 12, padding: '20px 24px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
            <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.5 }}>
              With a <strong style={{ color: '#34D399' }}>Permanent Buydown</strong>, you could save{' '}
              <strong style={{ color: '#34D399' }}>{fmt((baseline - scenarios[1].payment) * 12)} per year</strong> compared to standard market financing — that&apos;s real money back in your pocket every month.
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div style={{ background: C.white, padding: '56px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.accent, marginBottom: 10 }}>How It Works</div>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: C.navy, margin: 0, letterSpacing: '-0.02em' }}>Seller-Paid Rate Reductions Explained</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 28 }}>
            {[
              { n: '01', title: 'Seller Pays Closing Costs', body: 'Instead of a price reduction, the seller contributes funds at closing specifically to buy down your interest rate.' },
              { n: '02', title: 'Your Rate Drops', body: 'Those funds are used to permanently or temporarily lower your mortgage rate below the current market rate.' },
              { n: '03', title: 'Lower Monthly Payment', body: 'A lower rate means a lower monthly payment — every single month, for the life of your loan (or the buydown period).' },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.accent, opacity: 0.4, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div style={{ background: C.navy, padding: '56px 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.accent, marginBottom: 12 }}>Get Your Numbers</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' }}>See What This Looks Like for You</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
            Get a personalized analysis based on your actual purchase price, loan type, and the home you&apos;re looking at.
          </p>

          {/* Advisor card */}
          {page.advisor_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
              {page.advisor_photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.advisor_photo} alt={page.advisor_name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{page.advisor_name}</div>
                {page.advisor_title && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{page.advisor_title}</div>}
                {page.advisor_nmls && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>NMLS #{page.advisor_nmls}</div>}
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={() => setShowLead(true)}
              style={{ background: C.accent, color: C.navy, fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              Get My Free Analysis
            </button>
            {page.schedule_url && (
              <a href={page.schedule_url} target="_blank" rel="noopener noreferrer"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                📅 Schedule a Call
              </a>
            )}
            {page.apply_url && (
              <a href={page.apply_url} target="_blank" rel="noopener noreferrer"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                📋 Start Application
              </a>
            )}
          </div>

          {page.advisor_phone && (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              Or call directly: <a href={`tel:${page.advisor_phone}`} style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600, textDecoration: 'none' }}>{page.advisor_phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: '#F9FAFB', borderTop: `1px solid ${C.border}`, padding: '28px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
          <strong style={{ color: C.text }}>Disclaimer: </strong>{disclaimer}
        </div>
      </div>

      {/* Lead modal */}
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
