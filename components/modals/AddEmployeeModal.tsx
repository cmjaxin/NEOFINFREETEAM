'use client'
import { useState } from 'react'
import { useApp } from '@/lib/appContext'
import Modal from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/Input'
import { OnboardingRole } from '@/lib/types'

const BLANK = {
  mode: 'onboarding' as 'onboarding' | 'existing',
  name: '', role: 'MA' as OnboardingRole, title: '', team: '',
  email: '', personalEmail: '', phone: '', startDate: '',
  workAnniversary: '', dob: '', nmlsNumber: '', nmls: '',
  address: '', spouse: '', spouseAnniversary: '', kids: '',
}

export default function AddEmployeeModal() {
  const { setShowAdd, supabase, reload } = useApp()
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)

  function set(k: keyof typeof BLANK) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function submit() {
    if (!form.name.trim()) return
    setSubmitting(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data: emp } = await supabase.from('employees').insert({
      name: form.name.trim(),
      onboarding_role: form.role,
      status: form.mode === 'onboarding' ? 'onboarding' : 'active',
      title: form.title.trim(),
      team: form.team.trim(),
      work_email: form.email.trim(),
      personal_email: form.personalEmail.trim(),
      phone: form.phone.trim(),
      start_date: form.mode === 'onboarding' ? (form.startDate || today) : null,
      work_anniversary: form.workAnniversary || null,
      dob: form.dob || null,
      nmls_number: form.nmlsNumber.trim(),
      licensed_states: form.nmls.trim(),
      address: form.address.trim(),
      spouse: form.spouse.trim(),
      spouse_anniversary: form.spouseAnniversary || null,
    }).select().single()

    if (emp && form.kids.trim()) {
      const kidNames = form.kids.split(',').map((n: string) => n.trim()).filter(Boolean)
      if (kidNames.length) {
        await supabase.from('employee_children').insert(kidNames.map((n: string) => ({ employee_id: emp.id, name: n })))
      }
    }

    await reload()
    setSubmitting(false)
    setShowAdd(false)
    setForm(BLANK)
  }

  const modeBtn = (on: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${on ? '#0A2540' : '#DCE1E6'}`,
    background: on ? '#0A2540' : '#fff',
    color: on ? '#fff' : '#5C6570',
  })

  const roleBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? '#0A2540' : '#DCE1E6'}`,
    background: active ? '#0A2540' : '#fff',
    color: active ? '#fff' : '#5C6570',
  })

  return (
    <Modal onClose={() => setShowAdd(false)}>
      <div className="animate-fadein-fast" style={{ background: '#fff', borderRadius: 18, width: 600, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(10,25,45,0.3)' }}>
        <h2 style={{ fontWeight: 800, letterSpacing: '-.01em', fontSize: 23, margin: '0 0 6px', color: '#0A2540' }}>
          {form.mode === 'onboarding' ? 'Add new hire' : 'Add employee'}
        </h2>
        <div style={{ fontSize: 13, color: '#858889', marginBottom: 18 }}>Everything here builds their directory profile too.</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setForm(f => ({ ...f, mode: 'onboarding' }))} style={modeBtn(form.mode === 'onboarding')}>New hire — start onboarding</button>
          <button onClick={() => setForm(f => ({ ...f, mode: 'existing' }))} style={modeBtn(form.mode === 'existing')}>Existing employee</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Full name *</Label>
            <Input value={form.name} onChange={set('name')} placeholder="Full name" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Onboarding role</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['MA', 'LSCA', 'PP'] as OnboardingRole[]).map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))} style={roleBtn(form.role === r)}>
                  {r === 'LSCA' ? 'LS/CA' : r}
                </button>
              ))}
            </div>
          </div>
          <div><Label>Job title</Label><Input value={form.title} onChange={set('title')} placeholder="e.g. Mortgage Advisor" /></div>
          <div><Label>Team</Label><Input value={form.team} onChange={set('team')} placeholder="e.g. Team Mettle" /></div>
          <div><Label>Work email</Label><Input value={form.email} onChange={set('email')} placeholder="name@neohomeloans.com" /></div>
          <div><Label>Personal email</Label><Input value={form.personalEmail} onChange={set('personalEmail')} placeholder="personal@email.com" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} placeholder="(555) 555-5555" /></div>
          {form.mode === 'onboarding' && <div><Label>Start date</Label><Input type="date" value={form.startDate} onChange={set('startDate')} /></div>}
          <div><Label>Employee anniversary</Label><Input type="date" value={form.workAnniversary} onChange={set('workAnniversary')} /></div>
          <div><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={set('dob')} /></div>
          <div><Label>NMLS number</Label><Input value={form.nmlsNumber} onChange={set('nmlsNumber')} placeholder="If licensed" /></div>
          <div style={{ gridColumn: '1 / -1' }}><Label>Licensed states</Label><Input value={form.nmls} onChange={set('nmls')} placeholder="e.g. CA, TX, AZ" /></div>
          <div style={{ gridColumn: '1 / -1' }}><Label>Home address</Label><Input value={form.address} onChange={set('address')} placeholder="Street, City, State ZIP" /></div>
          <div><Label>Spouse / partner</Label><Input value={form.spouse} onChange={set('spouse')} placeholder="Name" /></div>
          <div><Label>Spouse anniversary</Label><Input type="date" value={form.spouseAnniversary} onChange={set('spouseAnniversary')} /></div>
          <div style={{ gridColumn: '1 / -1' }}><Label>Children (comma-separated names)</Label><Input value={form.kids} onChange={set('kids')} placeholder="e.g. Mia, Leo" /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={() => setShowAdd(false)} style={{ background: '#fff', border: '1px solid #DCE1E6', color: '#5C6570', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={submitting || !form.name.trim()} style={{ padding: '10px 18px', borderRadius: 9, border: 'none', fontSize: 14, fontWeight: 600, cursor: form.name.trim() ? 'pointer' : 'not-allowed', background: form.name.trim() ? '#0A2540' : '#C3CAD1', color: '#fff' }}>
            {submitting ? 'Adding…' : form.mode === 'onboarding' ? 'Add & start onboarding' : 'Add employee'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
