'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  partnerName: string
  advisorName: string | null
  bntouchUserId: string | null
  applyUrl: string
}

export default function PartnerPortalClient({ partnerName, advisorName, bntouchUserId, applyUrl }: Props) {
  const [showModal, setShowModal] = useState(false)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)
    if (formRef.current) formRef.current.submit()
    try {
      const sb = createClient()
      await sb.from('page_leads').insert({
        page_type: 'partner_portal',
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: partnerName,
        source: `Partner Portal — ${partnerName}`,
      })
    } catch { /* non-blocking */ }
    setTimeout(() => { setSubmitted(true); setSubmitting(false) }, 1200)
  }

  const NEO = '#0A2540'; const CYAN = '#5BCBF5'

  return (
    <>
      {/* Apply Now button */}
      <button
        onClick={() => setShowModal(true)}
        style={{ background: CYAN, color: NEO, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        Apply Now →
      </button>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,37,64,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={() => !submitted && setShowModal(false)} />
          <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(10,37,64,0.35)', overflow: 'hidden' }}>
            <div style={{ background: NEO, padding: '24px 32px 20px', textAlign: 'center' }}>
              <img src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png" alt="NEO Home Loans" style={{ height: 28, width: 'auto', marginBottom: 16 }} />
              <div style={{ color: CYAN, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                Get Pre-Qualified
              </div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
                Start your application with {advisorName ?? 'your NEO advisor'}
              </div>
            </div>
            <div style={{ padding: '28px 32px 32px' }}>
              {!submitted ? (
                <>
                  <iframe ref={iframeRef} name="bnt_partner_iframe" style={{ display: 'none' }} title="BNTouch Submit" />
                  <form ref={formRef} method="post" action="https://www.bntouchmortgage.net/api/webform/" target="bnt_partner_iframe" onSubmit={handleSubmit}>
                    <input type="hidden" name="added_source" value={`Partner Portal — ${partnerName}`} />
                    <input type="hidden" name="RETURNTIMEOUT" value="10" />
                    <input type="hidden" name="USERID" value={bntouchUserId ?? '10543'} />
                    <input type="hidden" name="GROUPID" value="1" />
                    <input type="hidden" name="SEQUENCEID" value="1" />
                    <input type="hidden" name="WEBFORMID" value="5524" />
                    <input type="hidden" name="PROCESSTYPE" value="mortgage" />
                    <input type="hidden" name="UTMDATA" value="" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Full Name', name: 'name_1', type: 'text', placeholder: 'Jane Smith', value: name, set: setName },
                        { label: 'Email Address', name: 'email', type: 'email', placeholder: 'jane@email.com', value: email, set: setEmail },
                        { label: 'Cell Phone', name: 'phone_cell', type: 'tel', placeholder: '(801) 555-0100', value: phone, set: setPhone },
                      ].map(f => (
                        <div key={f.name}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{f.label} <span style={{ color: '#EF4444' }}>*</span></label>
                          <input type={f.type} name={f.name} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} required
                            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E4E8EC', borderRadius: 9, fontSize: 14, color: '#1F2937', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                    {error && <div style={{ marginTop: 12, fontSize: 12.5, color: '#B0504A', background: '#FBF1F0', border: '1px solid #EAD6D1', borderRadius: 8, padding: '9px 12px' }}>{error}</div>}
                    <button type="submit" disabled={submitting}
                      style={{ marginTop: 20, width: '100%', background: submitting ? '#93C5D7' : CYAN, color: NEO, border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 800, cursor: submitting ? 'default' : 'pointer' }}>
                      {submitting ? 'Sending…' : 'Start Application →'}
                    </button>
                    <div style={{ marginTop: 10, fontSize: 10.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                      Or apply directly: <a href={applyUrl} target="_blank" rel="noopener noreferrer" style={{ color: CYAN, fontWeight: 600, textDecoration: 'none' }}>Open full application ↗</a>
                    </div>
                  </form>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: NEO, marginBottom: 8 }}>You&apos;re all set!</div>
                  <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
                    {advisorName ?? 'Your NEO advisor'} will be in touch shortly.
                  </div>
                  <button onClick={() => setShowModal(false)}
                    style={{ background: NEO, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    View Listings →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
