'use client'
import { useState } from 'react'
import { useApp } from '@/lib/appContext'
import Modal from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsModal() {
  const { profile, setShowSettings, pendingProfiles, reload } = useApp()
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({ name: profile?.full_name ?? '', title: profile?.title ?? '', email: profile?.email ?? '', password: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function save() {
    setError(''); setSaved(false)
    try {
      await supabase.from('profiles').update({ full_name: form.name.trim(), title: form.title.trim(), email: form.email.trim() }).eq('id', profile!.id)
      if (form.password) {
        const { error: pwErr } = await supabase.auth.updateUser({ password: form.password })
        if (pwErr) { setError(pwErr.message); return }
      }
      await reload()
      setSaved(true)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    }
  }

  async function approve(id: string) {
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id)
    await reload()
  }

  async function deny(id: string) {
    await supabase.from('profiles').delete().eq('id', id)
    await supabase.auth.admin?.deleteUser(id).catch(() => {})
    await reload()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (name: string) => name.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Modal onClose={() => setShowSettings(false)}>
      <div className="animate-fadein-fast" style={{ background: '#fff', borderRadius: 18, width: 480, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(10,25,45,0.3)', zIndex: 60 }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 4px', color: '#0A2540' }}>Account Settings</h2>
        <div style={{ fontSize: 13, color: '#858889', marginBottom: 20 }}>Update your login and how your name appears on stamps.</div>

        <div style={{ marginBottom: 14 }}><Label>Display name</Label><Input value={form.name} onChange={set('name')} /></div>
        <div style={{ marginBottom: 14 }}><Label>Job title</Label><Input value={form.title} onChange={set('title')} placeholder="e.g. Administrative Assistant" /></div>
        <div style={{ marginBottom: 14 }}><Label>Email</Label><Input value={form.email} onChange={set('email')} /></div>
        <div><Label>New password</Label><Input type="password" value={form.password} onChange={set('password')} placeholder="Leave blank to keep current" /></div>

        {error && <div style={{ fontSize: 13, color: '#B0504A', background: '#FBF1F0', border: '1px solid #EAD6D1', borderRadius: 9, padding: '9px 12px', marginTop: 12 }}>{error}</div>}
        {saved && <div style={{ fontSize: 13, color: '#2E7D57', background: '#F0F7F3', border: '1px solid #D6E8DE', borderRadius: 9, padding: '9px 12px', marginTop: 12 }}>Saved.</div>}

        {profile?.role === 'admin' && (
          <div style={{ marginTop: 22, borderTop: '1px solid #EEF1F4', paddingTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 4 }}>Pending sign-ups</div>
            <div style={{ fontSize: 12.5, color: '#858889', marginBottom: 12 }}>Approve people who requested access to Team HQ.</div>
            {pendingProfiles.length === 0 && <div style={{ fontSize: 13, color: '#A6ABB0' }}>No pending requests.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingProfiles.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #EEF1F4', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E2F3FB', color: '#1B6E90', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {initials(p.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#132B44' }}>{p.full_name}</div>
                    <div style={{ fontSize: 12, color: '#858889' }}>{p.email}</div>
                  </div>
                  <button onClick={() => deny(p.id)} style={{ background: '#fff', border: '1px solid #E4D3CF', color: '#9A5A54', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Deny</button>
                  <button onClick={() => approve(p.id)} style={{ background: '#2E7D57', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 22 }}>
          <button onClick={signOut} style={{ background: 'none', border: '1px solid #DCE1E6', color: '#5C6570', borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Sign out</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: '1px solid #DCE1E6', color: '#5C6570', borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            <button onClick={save} style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Save changes</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
