import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PartnerPortalClient from './PartnerPortalClient'
import PartnerHubListings from './PartnerHubListings'

export const dynamic = 'force-dynamic'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('marketing_partners').select('name')
  const match = (data ?? []).find((p: any) => slugify(p.name) === slug)
  if (!match) return { title: 'Partner Hub' }
  return { title: `${match.name} — Partner Hub | NEO Home Loans` }
}

export default async function PartnerHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: allPartners } = await supabase.from('marketing_partners').select('*')
  const partner = (allPartners ?? []).find((p: any) => slugify(p.name) === slug)
  if (!partner) notFound()

  const { data: listings } = await supabase
    .from('open_house_pages')
    .select('id, slug, address, city, state, zip, list_price, beds, baths, sqft, photos, status, tca_url, loom_url, rate_scenarios, apply_url, bntouch_user_id, advisor_name')
    .eq('partner_name', partner.name)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const applyUrl = (listings ?? []).map((l: any) => l.apply_url).find(Boolean) ?? 'https://neohomeloans.com/apply'
  const bntouchUserId = (listings ?? []).map((l: any) => l.bntouch_user_id).find(Boolean) ?? null
  const advisorName = (listings ?? []).map((l: any) => l.advisor_name).find(Boolean) ?? null

  // Get origin for building full client URLs
  const headersList = await headers()
  const host = headersList.get('host') ?? 'www.neofinfree.com'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  const NEO = '#0A2540'
  const CYAN = '#5BCBF5'

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F8', fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <header style={{ background: NEO, padding: '0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png" alt="NEO Home Loans" style={{ maxHeight: 32, maxWidth: 110, objectFit: 'contain' }} />
            <PartnerPortalClient
              partnerName={partner.name}
              advisorName={advisorName}
              bntouchUserId={bntouchUserId}
              applyUrl={applyUrl}
            />
          </div>
        </div>

        <div style={{ background: CYAN, padding: '12px 24px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: NEO, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Partner Hub
              </div>
              <div style={{ fontSize: 12, color: NEO, opacity: 0.7, marginTop: 2 }}>
                Your active listings — client pages and marketing materials
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: NEO }}>
              {(listings ?? []).length} active listing{(listings ?? []).length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
        <PartnerHubListings listings={(listings ?? []) as any} origin={origin} />

        <div style={{ marginTop: 48, fontSize: 10, color: '#9CA3AF', lineHeight: 1.6, textAlign: 'center' }}>
          Rates and payments shown are estimates for illustrative purposes only and are not a commitment to lend.
          Financing through NEO Home Loans is optional; buyers may use any lender of their choice.
        </div>
      </main>
    </div>
  )
}
