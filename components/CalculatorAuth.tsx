'use client'
import { useState } from 'react'

interface CalculatorAuthProps {
  onAuth: (email: string) => void
  loading?: boolean
}

export default function CalculatorAuth({ onAuth, loading = false }: CalculatorAuthProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mode, setMode] = useState<'email' | 'details'>('email')
  const [error, setError] = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    // For now, just proceed to calculator (in production, send magic link)
    // In production: POST to /api/calculator/send-magic-link
    onAuth(email.toLowerCase())
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #E4E8EC',
    borderRadius: 10,
    fontSize: 15,
    color: '#26303B',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#5C6570',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: '#0A2540',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.7 : 1,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'linear-gradient(135deg, #0A2540 0%, #123659 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          padding: 40,
          boxShadow: '0 20px 60px rgba(10, 37, 64, 0.3)',
        }}
      >
        {/* Logo placeholder */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#0A2540',
              letterSpacing: '-1px',
            }}
          >
            💰 Financial Freedom
          </div>
          <div style={{ fontSize: 14, color: '#5C6570', marginTop: 6 }}>
            Calculator
          </div>
        </div>

        {mode === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Your Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: error ? '#dc2626' : '#E4E8EC',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#5BCBF5')}
                onBlur={(e) =>
                  (e.target.style.borderColor = error ? '#dc2626' : '#E4E8EC')
                }
              />
              <div style={{ fontSize: 13, color: '#5C6570', marginTop: 6 }}>
                We'll use this to save your plan and send you your results.
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? 'Loading...' : 'Continue'}
            </button>
          </form>
        )}

        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#858889',
            marginTop: 20,
            paddingTop: 20,
            borderTop: '1px solid #E4E8EC',
          }}
        >
          Your data is securely stored and encrypted. We never share your
          information.
        </div>
      </div>
    </div>
  )
}
