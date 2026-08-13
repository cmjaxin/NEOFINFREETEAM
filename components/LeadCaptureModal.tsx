'use client'
import { useState, useEffect, useRef } from 'react'

interface Props {
  address: string
  bntouchUserId: string | null
  onDismiss: () => void
}

export default function LeadCaptureModal({ address, bntouchUserId, onDismiss }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
    // Submit via hidden iframe to avoid page redirect
    if (formRef.current) formRef.current.submit()
    setTimeout(() => {
      setSubmitted(true)
      setSubmitting(false)
    }, 1200)
  }

  function handleDone() {
    try { sessionStorage.setItem('lp_lead_captured', '1') } catch {}
    onDismiss()
  }

  const userId = bntouchUserId || '10543'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* Backdrop — blurred */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10, 37, 64, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#fff', borderRadius: 20,
        width: '100%', maxWidth: 440,
        boxShadow: '0 32px 80px rgba(10,37,64,0.35)',
        overflow: 'hidden',
      }}>

        {/* Header band */}
        <div style={{
          background: '#0A2540', padding: '28px 32px 24px',
          textAlign: 'center',
        }}>
          <img
            src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png"
            alt="NEO Home Loans"
            style={{ height: 28, width: 'auto', marginBottom: 16 }}
          />
          <div style={{ color: '#5BCBF5', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Exclusive Listing Info
          </div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>
            See loan scenarios &amp; full details
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
            Enter your info to unlock the full listing presentation including rate scenarios and cost analysis.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px 32px' }}>
          {!submitted ? (
            <>
              {/* Hidden iframe for form submission */}
              <iframe
                ref={iframeRef}
                name="bnt_iframe"
                style={{ display: 'none' }}
                title="BNTouch Submit"
              />

              <form
                ref={formRef}
                name="bntWebForm"
                id="bntWebForm"
                method="post"
                action="https://www.bntouchmortgage.net/api/webform/"
                target="bnt_iframe"
                onSubmit={handleSubmit}
              >
                {/* Hidden BNTouch fields */}
                <input type="hidden" name="added_source" value={address} />
                <input type="hidden" name="RETURNTIMEOUT" value="10" />
                <input type="hidden" name="USERID" value={userId} />
                <input type="hidden" name="GROUPID" value="1" />
                <input type="hidden" name="SEQUENCEID" value="1" />
                <input type="hidden" name="WEBFORMID" value="5524" />
                <input type="hidden" name="PROCESSTYPE" value="mortgage" />
                <input type="hidden" name="UTMDATA" id="WEBFORMUTM" value="" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field label="Full Name" required>
                    <input
                      type="text"
                      name="name_1"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Email Address" required>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="jane@email.com"
                      required
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Cell Phone" required>
                    <input
                      type="tel"
                      name="phone_cell"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="(801) 555-0100"
                      required
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {error && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: '#B0504A', background: '#FBF1F0', border: '1px solid #EAD6D1', borderRadius: 8, padding: '9px 12px' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: 20, width: '100%',
                    background: submitting ? '#93C5D7' : '#5BCBF5',
                    color: '#0A2540', border: 'none', borderRadius: 10,
                    padding: '14px 0', fontSize: 15, fontWeight: 800,
                    cursor: submitting ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {submitting ? 'Sending…' : 'View Full Presentation →'}
                </button>

                <div style={{ marginTop: 12, fontSize: 10.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                  By submitting you agree to be contacted by NEO Home Loans.
                  Message &amp; data rates may apply.
                </div>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>You&apos;re all set!</div>
              <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
                Thanks for your info. Your advisor will be in touch soon. Enjoy the full presentation!
              </div>
              <button
                onClick={handleDone}
                style={{
                  background: '#0A2540', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '13px 32px', fontSize: 15,
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                View Listing →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.03em' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #E4E8EC', borderRadius: 9,
  fontSize: 14, color: '#1F2937', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
