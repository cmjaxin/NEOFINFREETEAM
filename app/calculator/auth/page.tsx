'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState('Validating magic link...')
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleAuth() {
      try {
        const token = searchParams.get('token')

        if (!token) {
          setError('Invalid magic link. Please request a new one.')
          return
        }

        const supabase = createClient()

        // Verify token and get email
        const { data: authToken, error: tokenError } = await supabase
          .from('calculator_auth_tokens')
          .select('email, expires_at, used_at')
          .eq('token', token)
          .single()

        if (tokenError || !authToken) {
          setError('Link expired or invalid. Please request a new one.')
          return
        }

        if (authToken.used_at) {
          setError('This link has already been used.')
          return
        }

        const expiresAt = new Date(authToken.expires_at)
        if (expiresAt < new Date()) {
          setError('Link expired. Please request a new one.')
          return
        }

        // Mark token as used
        await supabase
          .from('calculator_auth_tokens')
          .update({ used_at: new Date() })
          .eq('token', token)

        // Set email in session
        sessionStorage.setItem('calculator_email', authToken.email)
        sessionStorage.setItem('calculator_timestamp', Date.now().toString())

        // Redirect to calculator
        router.push('/calculator')
      } catch (err) {
        console.error('Auth error:', err)
        setError('Failed to authenticate. Please try again.')
      }
    }

    handleAuth()
  }, [searchParams, router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A2540 0%, #123659 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 40,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(10, 37, 64, 0.3)',
        }}
      >
        {error ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h1 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 900, color: '#dc2626' }}>
              Link Invalid
            </h1>
            <p style={{ margin: '0 0 24px 0', fontSize: 15, color: '#5C6570', lineHeight: 1.6 }}>
              {error}
            </p>
            <a
              href="/calculator"
              style={{
                display: 'inline-block',
                background: '#0A2540',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Back to Calculator
            </a>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 2s infinite' }}>
              ✓
            </div>
            <h1 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 900, color: '#0A2540' }}>
              {status}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#5C6570' }}>
              Redirecting you to your calculator...
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
