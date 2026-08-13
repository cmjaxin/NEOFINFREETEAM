'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/appContext'
import Modal from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

async function uploadFile(supabase: any, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `profile-headshots/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('marketing-assets').upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('marketing-assets').getPublicUrl(path)
  return data.publicUrl
}

export default function SettingsModal() {
  const { profile, setShowSettings, pendingProfiles, reload } = useApp()
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({
    name: profile?.full_name ?? '',
    title: profile?.title ?? '',
    email: profile?.email ?? '',
    nmls: profile?.nmls ?? '',
    phone: profile?.phone ?? '',
    headshot_url: profile?.headshot_url ?? '',
    schedule_url: profile?.schedule_url ?? '',
    apply_url: (profile as any)?.apply_url ?? '',
    bntouch_user_id: profile?.bntouch_user_id ?? '',
    password: '',
  })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [approvedProfiles, setApprovedProfiles] = useState<{ id: string; full_name: string; email: string; can_production?: boolean; can_wins?: boolean; can_marketing?: boolean; can_open_houses?: boolean; can_listings?: boolean; can_sign_riders?: boolean }[]>([])

  useEffect(() => {
    if (profile?.role !== 'admin') return
    supabase.from('profiles').select('id, full_name, email, can_production, can_wins, can_marketing, can_open_houses, can_listings, can_sign_riders').eq('status', 'approved').neq('id', profile.id).then(({ data }) => {
      if (data) setApprovedProfiles(data)
    })
  }, [profile?.id])

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleHeadshotFile(file: File) {
    setUploading(true)
    try {
      const url = await uploadFile(supabase, file)
      setForm(f => ({ ...f, headshot_url: url }))
    } catch (e: any) {
      setError(`Headshot upload failed: ${e.message}`)
    }
    setUploading(false)
  }

  async function save() {
    setError(''); setSaved(false)
    try {
      await supabase.from('profiles').update({
        full_name: form.name.trim(),
        title: form.title.trim(),
        email: form.email.trim(),
        nmls: form.nmls.trim(),
        phone: form.phone.trim(),
        headshot_url: form.headshot_url,
        schedule_url: form.schedule_url.trim() || null,
        apply_url: form.apply_url.trim() || null,
        bntouch_user_id: form.bntouch_user_id.trim() || null,
      }).eq('id', profile!.id)
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

  async function toggleFeature(id: string, field: string, current: boolean) {
    await supabase.from('profiles').update({ [field]: !current }).eq('id', id)
    setApprovedProfiles(prev => prev.map(p => p.id === id ? { ...p, [field]: !current } : p))
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
      <div className="animate-fadein-fast" style={{ background: '#fff', borderRadius: 18, width: 520, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(10,25,45,0.3)', zIndex: 60 }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, margin: '0 0 4px', color: '#0A2540' }}>Account Settings</h2>
        <div style={{ fontSize: 13, color: '#858889', marginBottom: 22 }}>Your info here auto-fills into marketing templates.</div>

        {/* Headshot */}
        <div style={{ marginBottom: 20 }}>
          <Label>Headshot</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            {form.headshot_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.headshot_url} alt="" style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB' }} />
            ) : (
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#9CA3AF', border: '2px dashed #D1D5DB' }}>
                {initials(form.name) || '?'}
              </div>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleHeadshotFile(f); e.target.value = '' }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
                {uploading ? 'Uploading…' : form.headshot_url ? 'Replace Photo' : 'Upload Photo'}
              </button>
              {form.headshot_url && (
                <button onClick={() => setForm(f => ({ ...f, headshot_url: '' }))}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>
                  Remove
                </button>
              )}
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>JPG or PNG · appears on flyers &amp; social posts</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><Label>Full name</Label><Input value={form.name} onChange={set('name')} /></div>
          <div><Label>Job title</Label><Input value={form.title} onChange={set('title')} placeholder="Mortgage Advisor" /></div>
          <div><Label>NMLS #</Label><Input value={form.nmls} onChange={set('nmls')} placeholder="123456" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} placeholder="(801) 555-0100" /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={set('email')} /></div>
          <div><Label>New password</Label><Input type="password" value={form.password} onChange={set('password')} placeholder="Leave blank to keep" /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>Booking / Scheduling Link</Label>
          <Input value={form.schedule_url} onChange={set('schedule_url')} placeholder="https://youcanbook.me/…" />
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Used as the "Schedule" button on your listing presentation pages.</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>Apply Now Link</Label>
          <Input value={form.apply_url} onChange={set('apply_url')} placeholder="https://apply.neohomeloans.com/…" />
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Used as the "Apply Now" button on your sign rider pages.</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>BNTouch User ID</Label>
          <Input value={form.bntouch_user_id} onChange={set('bntouch_user_id')} placeholder="e.g. 10543" />
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Your BNTouch user ID — powers the lead capture form on your listing pages.</div>
        </div>

        {error && <div style={{ fontSize: 13, color: '#B0504A', background: '#FBF1F0', border: '1px solid #EAD6D1', borderRadius: 9, padding: '9px 12px', marginTop: 12 }}>{error}</div>}
        {saved && <div style={{ fontSize: 13, color: '#2E7D57', background: '#F0F7F3', border: '1px solid #D6E8DE', borderRadius: 9, padding: '9px 12px', marginTop: 12 }}>Saved — your info will pre-fill on your next template.</div>}

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

        {profile?.role === 'admin' && approvedProfiles.length > 0 && (
          <div style={{ marginTop: 22, borderTop: '1px solid #EEF1F4', paddingTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 4 }}>Page Access</div>
            <div style={{ fontSize: 12.5, color: '#858889', marginBottom: 12 }}>Control which pages each team member can see.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {approvedProfiles.map(p => {
                const features = [
                  { label: 'Production',     field: 'can_production',  val: p.can_production  ?? true },
                  { label: 'Monthly Wins',   field: 'can_wins',        val: p.can_wins        ?? true },
                  { label: 'Marketing',      field: 'can_marketing',   val: p.can_marketing   ?? true },
                  { label: 'Open Houses',    field: 'can_open_houses', val: p.can_open_houses ?? true },
                  { label: 'Listing Pages',  field: 'can_listings',    val: p.can_listings    ?? false },
                  { label: 'Sign Riders',    field: 'can_sign_riders', val: p.can_sign_riders ?? false },
                ]
                return (
                  <div key={p.id} style={{ border: '1px solid #EEF1F4', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#132B44' }}>{p.full_name}</div>
                      <div style={{ fontSize: 11, color: '#858889' }}>{p.email}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                      {features.map(({ label, field, val }) => (
                        <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{label}</span>
                          <button
                            onClick={() => toggleFeature(p.id, field, val)}
                            style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: val ? '#0A2540' : '#D1D5DB', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                          >
                            <div style={{ position: 'absolute', top: 3, left: val ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
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
