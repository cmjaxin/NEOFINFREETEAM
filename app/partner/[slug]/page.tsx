import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface OHPage {
  id: string; slug: string; address: string; city: string; state: string; zip: string
  list_price: number; beds: number; baths: number; sqft: number; photos: string[]
  rate_scenarios: any[]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('marketing_partners').select('name')
  const match = (data ?? []).find((p: any) => slugify(p.name) === slug)
  if (!match) return { title: 'Homes with Special Financing' }
  return { title: `${match.name} — Homes with Special Financing | NEO Home Loans` }
}

export default async function PartnerPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: allPartners } = await supabase.from('marketing_partners').select('*')
  const partner = (allPartners ?? []).find((p: any) => slugify(p.name) === slug)
  if (!partner) notFound()

  const { data: listings } = await supabase
    .from('open_house_pages')
    .select('id, slug, address, city, state, zip, list_price, beds, baths, sqft, photos, status, rate_scenarios')
    .eq('partner_name', partner.name)
    .eq('status', 'active')
    .neq('page_type', 'sign_rider')
    .order('created_at', { ascending: false })

  const NEO = '#0A2540'
  const CYAN = '#5BCBF5'

  function fmtPrice(n: number) {
    return n > 0 ? '$' + Math.round(n).toLocaleString() : 'Price Upon Request'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F8', fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <header style={{ background: NEO }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {partner.headshot_url
              ? <img src={partner.headshot_url} alt={partner.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(91,203,245,0.4)' }} />
              : <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(91,203,245,0.15)', color: CYAN, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {partner.name[0]}
                </div>
            }
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{partner.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                {[partner.title, partner.company].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png" alt="NEO Home Loans" style={{ maxHeight: 32, maxWidth: 110, objectFit: 'contain' }} />
        </div>

        <div style={{ background: CYAN, padding: '14px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: NEO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Homes with Special Financing
          </div>
          <div style={{ fontSize: 13, color: NEO, marginTop: 3, opacity: 0.75 }}>
            Exclusive listings with lender-paid buydowns and preferred financing for {partner.name.split(' ')[0]}&apos;s clients
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
        {listings && listings.length > 0 ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
              {listings.length} Active Listing{listings.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {(listings as OHPage[]).map((l) => {
                const photo = l.photos?.[0]
                const primary = l.rate_scenarios?.find((s: any) => s.buydown_rate !== s.market_rate) ?? l.rate_scenarios?.[0] ?? null
                return (
                  <a key={l.id} href={`/open-house/${l.slug}`}
                    style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E8EC', overflow: 'hidden', textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
                    <div style={{ height: 180, background: '#E4E8EC', overflow: 'hidden' }}>
                      {photo
                        ? <img src={photo} alt={l.address} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🏡</div>
                      }
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: NEO, letterSpacing: '-0.02em', marginBottom: 2 }}>{fmtPrice(l.list_price)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 2 }}>{l.address}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{[l.city, l.state, l.zip].filter(Boolean).join(', ')}</div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6B7280', marginBottom: primary ? 10 : 0 }}>
                        {l.beds ? <span><strong style={{ color: NEO }}>{l.beds}</strong> bd</span> : null}
                        {l.baths ? <span><strong style={{ color: NEO }}>{l.baths}</strong> ba</span> : null}
                        {l.sqft ? <span><strong style={{ color: NEO }}>{l.sqft.toLocaleString()}</strong> sf</span> : null}
                      </div>
                      {primary && primary.buydown_rate !== primary.market_rate && (
                        <div style={{ background: 'rgba(91,203,245,0.1)', border: '1px solid rgba(91,203,245,0.3)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 800, color: NEO, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Special Rate</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: NEO }}>{primary.buydown_rate.toFixed(3)}%</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 9, color: '#6B7280', textDecoration: 'line-through' }}>{primary.market_rate.toFixed(3)}%</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#16A34A' }}>Save ${(primary.market_payment - primary.buydown_payment).toLocaleString()}/mo</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid #E4E8EC', padding: '10px 16px', background: '#F8FAFC', fontSize: 12, fontWeight: 700, color: CYAN, textAlign: 'center' }}>
                      View Financing Details →
                    </div>
                  </a>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E8EC', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: NEO, marginBottom: 8 }}>No active listings right now</div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>Check back soon — {partner.name.split(' ')[0]}&apos;s next listing will appear here.</div>
          </div>
        )}

        <div style={{ marginTop: 48, fontSize: 9, color: '#9CA3AF', lineHeight: 1.7, textAlign: 'center', maxWidth: 820, margin: '48px auto 0' }}>
          <strong style={{ color: '#6B7280' }}>Planning assumptions and required disclosures.</strong>{' '}
          This is a planning illustration, not a commitment to lend. Rates, APR, costs, credits, payments, and program availability must be confirmed for the buyer and property.
          Property value and appreciation are assumptions, not guarantees. Taxes, insurance, mortgage insurance, HOA dues, and selling costs may change.
          Temporary buydown payments are funded from a closing deposit; the note rate and qualifying payment do not change, and the payment increases on schedule until it reaches the full note-rate payment.
          Owner-occupied primary residence. Credit, income, assets, property, and program eligibility remain subject to review. No values shown are an approval or a promise of future market conditions.
          Illustrated financing uses an assumed credit score of 780. Actual pricing and eligibility depend on the buyer, property, and current lender terms; this is not a credit approval.
          Rates, APRs, payments, fees, and other financing terms are illustrative and subject to current lender pricing, borrower and property eligibility, and final verification. This illustration is not a Loan Estimate, rate lock, loan approval, or commitment to lend.
          Financing through NEO Home Loans is optional; buyers may use any lender of their choice. Equal Housing Opportunity.
        </div>
      </main>
    </div>
  )
}
