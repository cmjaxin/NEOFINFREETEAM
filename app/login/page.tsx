'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'pending'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #DCE1E6',
    borderRadius: 9, fontSize: 14, color: '#26303B', background: '#fff',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 600, color: '#5F6B76', marginBottom: 5,
  }

  async function handleSubmit() {
    setError(''); setLoading(true)
    const supabase = createClient()
    try {
      if (mode === 'login') {
        const { data: signInData, error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authErr) { setError('Incorrect email or password.'); return }
        // Check approval by user ID (more reliable with RLS)
        const userId = signInData.user?.id
        const { data: profile } = await supabase.from('profiles').select('status').eq('id', userId).single()
        if (!profile || profile.status !== 'approved') {
          await supabase.auth.signOut()
          setError('Your account is awaiting administrator approval.')
          return
        }
        router.push('/')
      } else {
        if (!name.trim()) { setError('Full name is required.'); return }
        if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
        if (password !== confirm) { setError('Passwords do not match.'); return }
        const { data, error: signupErr } = await supabase.auth.signUp({ email: email.trim(), password })
        if (signupErr) { setError(signupErr.message); return }
        if (data.user) {
          await supabase.from('profiles').insert({ id: data.user.id, full_name: name.trim(), email: email.trim().toLowerCase(), status: 'pending', role: 'member' })
        }
        await supabase.auth.signOut()
        setMode('pending')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(circle at 30% 15%, #123659 0%, #0A2540 62%)' }}>
      <div className="animate-fadein" style={{ width: 404, maxWidth: '100%', background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 24px 60px rgba(5,18,35,.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <Image src="/neo-logo.png" alt="NEO Home Loans" width={150} height={50} style={{ width: 150, height: 'auto' }} priority />
        </div>

        {mode === 'pending' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontWeight: 800, fontSize: 21, margin: '0 0 8px', color: '#0A2540' }}>Request received</h1>
            <div style={{ fontSize: 13.5, color: '#5F6B76', lineHeight: 1.6, marginBottom: 20 }}>Your account is pending approval by an administrator. You'll be able to sign in once it's approved.</div>
            <button onClick={() => setMode('login')} style={{ width: '100%', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Back to sign in</button>
          </div>
        )}

        {mode !== 'pending' && (
          <>
            <h1 style={{ fontWeight: 800, fontSize: 22, textAlign: 'center', margin: '0 0 4px', color: '#0A2540' }}>
              {mode === 'login' ? 'Sign in to Team HQ' : 'Create an account'}
            </h1>
            <div style={{ fontSize: 13, color: '#858889', textAlign: 'center', marginBottom: 24 }}>
              {mode === 'login' ? 'FinFree Division · NEO Home Loans' : 'Request access to Team HQ'}
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#5BCBF5')} onBlur={e => (e.currentTarget.style.borderColor = '#DCE1E6')} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Work email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@neohomeloans.com" style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#5BCBF5')} onBlur={e => (e.currentTarget.style.borderColor = '#DCE1E6')} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#5BCBF5')} onBlur={e => (e.currentTarget.style.borderColor = '#DCE1E6')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
            </div>
            {mode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#5BCBF5')} onBlur={e => (e.currentTarget.style.borderColor = '#DCE1E6')} />
              </div>
            )}

            {error && <div style={{ fontSize: 13, color: '#B0504A', background: '#FBF1F0', border: '1px solid #EAD6D1', borderRadius: 9, padding: '9px 12px', marginBottom: 14 }}>{error}</div>}

            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#858889', marginTop: 18 }}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background: 'none', border: 'none', color: '#2A9BC9', fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
            {mode === 'login' && (
              <div style={{ textAlign: 'center', fontSize: 11.5, color: '#A6ABB0', marginTop: 16, borderTop: '1px solid #EEF1F4', paddingTop: 14 }}>
                FinFree Division — Team HQ internal portal
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
