'use client'
import { useState } from 'react'

interface Listing {
  id: string
  slug: string
  address: string
  city: string
  state: string
  zip: string
  list_price: number
  beds: number
  baths: number
  sqft: number
  photos: string[]
  tca_url: string | null
  loom_url: string | null
  rate_scenarios: any[] | null
}

function fmtPrice(n: number) {
  return n > 0 ? '$' + Math.round(n).toLocaleString() : ''
}

export default function PartnerHubListings({ listings, origin }: { listings: Listing[]; origin: string }) {
  const NEO = '#0A2540'
  const CYAN = '#5BCBF5'
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!listings.length) {
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E8EC', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: NEO, marginBottom: 8 }}>No active listings yet</div>
        <div style={{ fontSize: 14, color: '#6B7280' }}>Once your advisor links a listing to you, it&apos;ll appear here with all the marketing materials.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {listings.map(l => {
        const photo = l.photos?.[0]
        const clientUrl = `${origin}/open-house/${l.slug}`
        const primary = l.rate_scenarios?.find((s: any) => s.buydown_rate !== s.market_rate) ?? l.rate_scenarios?.[0] ?? null

        return (
          <div key={l.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E8EC', overflow: 'hidden' }}>
            {/* Top: photo + property info */}
            <div style={{ display: 'flex' }}>
              <div style={{ width: 140, height: 120, flexShrink: 0, background: '#E4E8EC', overflow: 'hidden' }}>
                {photo
                  ? <img src={photo} alt={l.address} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🏡</div>
                }
              </div>
              <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    {fmtPrice(l.list_price) && (
                      <div style={{ fontSize: 16, fontWeight: 900, color: NEO }}>{fmtPrice(l.list_price)}</div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginTop: 1 }}>{l.address}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                      {[l.city, l.state, l.zip].filter(Boolean).join(', ')}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                      {l.beds ? <span><strong style={{ color: NEO }}>{l.beds}</strong> bd</span> : null}
                      {l.baths ? <span><strong style={{ color: NEO }}>{l.baths}</strong> ba</span> : null}
                      {l.sqft ? <span><strong style={{ color: NEO }}>{l.sqft.toLocaleString()}</strong> sf</span> : null}
                    </div>
                  </div>
                  {primary && primary.buydown_rate !== primary.market_rate && (
                    <div style={{ background: 'rgba(91,203,245,0.1)', border: '1px solid rgba(91,203,245,0.3)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: NEO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Special Rate</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: NEO }}>{primary.buydown_rate.toFixed(3)}%</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#16A34A' }}>
                        Save ${(primary.market_payment - primary.buydown_payment).toLocaleString()}/mo
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Materials bar */}
            <div style={{ borderTop: '1px solid #E4E8EC', background: '#F8FAFC', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={`${origin}/open-house/${l.slug}/agent`}
                style={{ background: CYAN, color: NEO, borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
              >
                Open Agent Hub ↗
              </a>
              <a
                href={clientUrl}
                style={{ background: NEO, color: '#fff', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
              >
                Client Page ↗
              </a>
              <button
                onClick={() => copy(clientUrl, `url-${l.id}`)}
                style={{ background: copied === `url-${l.id}` ? '#16a34a' : '#fff', color: copied === `url-${l.id}` ? '#fff' : NEO, border: '1.5px solid #E4E8EC', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                {copied === `url-${l.id}` ? '✓ Copied' : '📋 Copy Link'}
              </button>
              {l.tca_url && (
                <a href={l.tca_url} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#fff', color: NEO, border: '1.5px solid #E4E8EC', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                  📊 Total Cost Analysis
                </a>
              )}
              {l.loom_url && (
                <a href={l.loom_url} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#fff', color: NEO, border: '1.5px solid #E4E8EC', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                  🎬 Video Walkthrough
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
