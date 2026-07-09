'use client'
import { useState, useRef } from 'react'
import { useApp } from '@/lib/appContext'
import { Input, Textarea, Label } from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'
import { roleMeta, statusPillMeta, fmtDate, dayInfo } from '@/lib/utils'
import { sectionsFor } from '@/lib/checklist'
import { GPTS_EMAIL_SUBJECT, GPTS_EMAIL_BODY, WELCOME_EMAIL_SUBJECT } from '@/lib/checklist'
import { OnboardingRole } from '@/lib/types'

export default function EmployeeProfile() {
  const { employees, selectedId, profileTab, setProfileTab, profileFrom, setView, supabase, reloadEmployee, reload, profile, welcomeTemplate, coaching, wins, children: empChildren, completions } = useApp()
  const emp = employees.find(e => e.id === selectedId)
  const [coachDraft, setCoachDraft] = useState('')
  const [winDraft, setWinDraft] = useState('')
  const [kidDraft, setKidDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  if (!emp) return null
  const e = emp

  const rm = roleMeta(e.onboarding_role)
  const sp = statusPillMeta(e.status)
  const kids = empChildren[e.id] ?? []
  const coachList = coaching[e.id] ?? []
  const winList = wins[e.id] ?? []
  const compList = completions[e.id] ?? []
  const doneIds = new Set(compList.map(c => c.item_id))
  const sections = sectionsFor(e.onboarding_role)
  const allItems = sections.flatMap(s => s.items)
  const done = allItems.filter(it => doneIds.has(it.id)).length
  const total = allItems.length
  const pct = total ? done / total : 0
  const di = dayInfo(e.start_date)

  const backLabel = profileFrom === 'dashboard' ? '← Back to Onboarding' : profileFrom === 'terminated' ? '← Back to Terminated' : '← Back to Directory'

  async function update(fields: Record<string, unknown>) {
    await supabase.from('employees').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', e.id)
    await reloadEmployee(e.id)
  }

  async function graduate() {
    await update({ status: 'active' })
  }

  async function terminate() {
    const reason = window.prompt('Termination reason (optional):') ?? ''
    const today = new Date().toISOString().slice(0, 10)
    await update({ status: 'terminated', termination_date: today, termination_reason: reason })
    setView(profileFrom === 'dashboard' ? 'dashboard' : 'terminated')
  }

  async function reactivate() {
    await update({ status: 'active', termination_date: null, termination_reason: '' })
  }

  async function deleteEmployee() {
    if (!window.confirm(`Delete ${e.name}? This cannot be undone.`)) return
    await supabase.from('employees').delete().eq('id', e.id)
    await reload()
    setView(profileFrom)
  }

  async function toggleCheck(itemId: string) {
    if (doneIds.has(itemId)) {
      await supabase.from('checklist_completions').delete().eq('employee_id', e.id).eq('item_id', itemId)
    } else {
      const now = new Date().toISOString()
      await supabase.from('checklist_completions').insert({ employee_id: e.id, item_id: itemId, completed_by: profile?.full_name ?? 'Unknown', completed_at: now })
      const newDoneIds = new Set([...doneIds, itemId])
      const allDone = allItems.every(it => newDoneIds.has(it.id))
      if (allDone && e.status === 'onboarding') {
        await supabase.from('employees').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', e.id)
      }
    }
    await reloadEmployee(e.id)
  }

  async function addCoach() {
    if (!coachDraft.trim()) return
    await supabase.from('coaching_notes').insert({ employee_id: e.id, body: coachDraft.trim(), author_name: profile?.full_name ?? 'Unknown' })
    setCoachDraft('')
    await reloadEmployee(e.id)
  }

  async function deleteCoach(id: string) {
    await supabase.from('coaching_notes').delete().eq('id', id)
    await reloadEmployee(e.id)
  }

  async function addWin() {
    if (!winDraft.trim()) return
    await supabase.from('wins').insert({ employee_id: e.id, body: winDraft.trim(), author_name: profile?.full_name ?? 'Unknown' })
    setWinDraft('')
    await reloadEmployee(e.id)
  }

  async function deleteWin(id: string) {
    await supabase.from('wins').delete().eq('id', id)
    await reloadEmployee(e.id)
  }

  async function addKid() {
    if (!kidDraft.trim()) return
    await supabase.from('employee_children').insert({ employee_id: e.id, name: kidDraft.trim() })
    setKidDraft('')
    await reloadEmployee(e.id)
  }

  async function deleteKid(id: string) {
    await supabase.from('employee_children').delete().eq('id', id)
    await reloadEmployee(e.id)
  }

  async function uploadHeadshot(file: File) {
    const ext = file.name.split('.').pop()
    const path = `${e.id}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('headshots').upload(path, file, { upsert: true })
    if (uploadErr) { alert(`Upload failed: ${uploadErr.message}`); return }
    const { data } = supabase.storage.from('headshots').getPublicUrl(path)
    await update({ headshot_url: data.publicUrl + `?t=${Date.now()}` })
  }

  function sendGptEmail() {
    const mailto = `mailto:${e.work_email}?subject=${encodeURIComponent(GPTS_EMAIL_SUBJECT)}&body=${encodeURIComponent(GPTS_EMAIL_BODY)}`
    window.open(mailto)
  }

  function sendWelcomeEmail() {
    const firstName = e.name.split(' ')[0]
    const body = welcomeTemplate.replace(/{name}/g, firstName).replace(/{sender}/g, profile?.full_name ?? '')
    const mailto = `mailto:${e.work_email}?subject=${encodeURIComponent(WELCOME_EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`
    window.open(mailto)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
    color: active ? '#0A2540' : '#858889',
    borderBottom: active ? '2px solid #0A2540' : '2px solid transparent',
    marginBottom: -1, transition: 'color 0.12s',
  })

  const btnStyle = (variant: 'primary' | 'danger' | 'secondary' = 'secondary'): React.CSSProperties => ({
    border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? '#E7DAD8' : '#E4D3CF'}`,
    background: variant === 'primary' ? '#0A2540' : '#fff',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#B0504A' : '#9A5A54',
    borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  })

  const initials = e.name.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 40px 90px' }}>
      <button onClick={() => setView(profileFrom)} style={{ background: 'none', border: 'none', color: '#858889', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 }}
        onMouseEnter={ev => (ev.currentTarget.style.color = '#0A2540')}
        onMouseLeave={ev => (ev.currentTarget.style.color = '#858889')}
      >{backLabel}</button>

      {e.status === 'terminated' && (
        <div style={{ background: '#FBF3F1', border: '1px solid #EAD6D1', borderRadius: 12, padding: '12px 18px', marginBottom: 16, fontSize: 13.5, color: '#9A5A54' }}>
          Terminated {fmtDate(e.termination_date, { month: 'long', day: 'numeric', year: 'numeric' })}
          {e.termination_reason ? ` — ${e.termination_reason}` : ''}
        </div>
      )}

      {/* Header card */}
      <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: '24px 26px', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
        <label title="Upload headshot" style={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 24, overflow: 'hidden', flexShrink: 0,
            background: rm.bg, color: rm.fg,
          }}>
            {e.headshot_url
              ? <img src={e.headshot_url} alt="" onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : initials}
          </div>
          <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#0A2540', color: '#fff', borderRadius: 8, fontSize: 10.5, fontWeight: 600, padding: '3px 7px', border: '2px solid #fff' }}>Edit</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={ev => { if (ev.target.files?.[0]) uploadHeadshot(ev.target.files[0]) }} style={{ display: 'none' }} />
        </label>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
            <h1 style={{ fontWeight: 800, letterSpacing: '-.01em', fontSize: 26, margin: 0, color: '#0A2540' }}>{e.name}</h1>
            {e.team && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: '#EEF1F4', color: '#5F6B76' }}>{e.team}</span>}
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: sp.bg, color: sp.fg }}>{sp.label}</span>
          </div>
          {e.title && <div style={{ fontSize: 14, color: '#5F6B76', marginTop: 6 }}>{e.title}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {e.status === 'onboarding' && <button onClick={graduate} style={btnStyle('primary')}>Mark onboarding complete</button>}
            {(e.status === 'onboarding' || e.status === 'active') && <button onClick={terminate} style={btnStyle('secondary')}>Terminate</button>}
            {e.status === 'terminated' && <button onClick={reactivate} style={btnStyle('primary')}>Reactivate</button>}
            <button onClick={deleteEmployee} style={btnStyle('danger')}>Delete</button>
          </div>
        </div>
      </div>

      {/* Tabs — hide Onboarding tab once employee is active or terminated */}
      <div style={{ display: 'flex', gap: 6, margin: '22px 0 20px', borderBottom: '1px solid #E4E8EC' }}>
        <button onClick={() => setProfileTab('profile')} style={tabStyle(profileTab === 'profile')}>Profile</button>
        {e.status === 'onboarding' && (
          <button onClick={() => setProfileTab('onboarding')} style={tabStyle(profileTab === 'onboarding')}>Onboarding</button>
        )}
      </div>

      {(profileTab === 'profile' || e.status !== 'onboarding') && (
        <ProfileTab emp={e} kids={kids} coachList={coachList} winList={winList} update={update} kidDraft={kidDraft} setKidDraft={setKidDraft} addKid={addKid} deleteKid={deleteKid} coachDraft={coachDraft} setCoachDraft={setCoachDraft} addCoach={addCoach} deleteCoach={deleteCoach} winDraft={winDraft} setWinDraft={setWinDraft} addWin={addWin} deleteWin={deleteWin} />
      )}

      {profileTab === 'onboarding' && e.status === 'onboarding' && (
        <OnboardingTab emp={e} sections={sections} doneIds={doneIds} compList={compList} done={done} total={total} pct={pct} di={di} toggleCheck={toggleCheck} sendGptEmail={sendGptEmail} sendWelcomeEmail={sendWelcomeEmail} update={update} />
      )}
    </div>
  )
}

function ProfileTab({ emp, kids, coachList, winList, update, kidDraft, setKidDraft, addKid, deleteKid, coachDraft, setCoachDraft, addCoach, deleteCoach, winDraft, setWinDraft, addWin, deleteWin }: any) {
  function field(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ [key]: e.target.value })
  }

  const roleOptions: OnboardingRole[] = ['MA', 'LSCA', 'PP']

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Contact & Personal */}
        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 16 }}>Contact & Personal</div>
          {[
            { label: 'Full name', key: 'name', placeholder: 'Full name' },
            { label: 'Job title', key: 'title', placeholder: 'e.g. Mortgage Advisor' },
            { label: 'Team', key: 'team', placeholder: 'e.g. Team Mettle' },
            { label: 'Work email', key: 'work_email', placeholder: 'name@neohomeloans.com' },
            { label: 'Personal email', key: 'personal_email', placeholder: 'personal@email.com' },
            { label: 'Phone', key: 'phone', placeholder: '(555) 555-5555' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <Label>{label}</Label>
              <Input defaultValue={emp[key]} onBlur={field(key)} placeholder={placeholder} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <Label>Onboarding role</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              {roleOptions.map(r => (
                <button key={r} onClick={() => update({ onboarding_role: r })} style={{ flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${emp.onboarding_role === r ? '#0A2540' : '#DCE1E6'}`, background: emp.onboarding_role === r ? '#0A2540' : '#fff', color: emp.onboarding_role === r ? '#fff' : '#5C6570' }}>
                  {r === 'LSCA' ? 'LS/CA' : r}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>Home address</Label>
            <Textarea defaultValue={emp.address} onBlur={field('address')} placeholder="Street, City, State ZIP" style={{ minHeight: 60 }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>Date of birth</Label>
              <Input type="date" defaultValue={emp.dob ?? ''} onBlur={field('dob')} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Employee anniversary</Label>
              <Input type="date" defaultValue={emp.work_anniversary ?? ''} onBlur={field('work_anniversary')} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Family */}
          <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 16 }}>Family</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <Label>Spouse / partner</Label>
                <Input defaultValue={emp.spouse} onBlur={field('spouse')} placeholder="Name" />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Anniversary</Label>
                <Input type="date" defaultValue={emp.spouse_anniversary ?? ''} onBlur={field('spouse_anniversary')} />
              </div>
            </div>
            <Label>Children ({kids.length})</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {kids.length === 0 && <span style={{ fontSize: 13, color: '#A6ABB0', padding: '5px 0' }}>None added</span>}
              {kids.map((kid: any) => (
                <span key={kid.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#EEF1F4', borderRadius: 999, padding: '5px 8px 5px 12px', fontSize: 13, color: '#33414E' }}>
                  {kid.name}
                  <button onClick={() => deleteKid(kid.id)} style={{ background: 'none', border: 'none', color: '#9AA0A6', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={kidDraft} onChange={(e: any) => setKidDraft(e.target.value)} placeholder="Child's name" onKeyDown={(e: any) => { if (e.key === 'Enter') addKid() }} />
              <button onClick={addKid} style={{ background: '#EEF1F4', border: '1px solid #DCE1E6', color: '#33414E', borderRadius: 9, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
            </div>
          </div>

          {/* Licensing */}
          <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 16 }}>Licensing</div>
            <div style={{ marginBottom: 14 }}>
              <Label>NMLS number</Label>
              <Input defaultValue={emp.nmls_number} onBlur={field('nmls_number')} placeholder="If licensed" />
            </div>
            <div>
              <Label>Licensed states</Label>
              <Input defaultValue={emp.licensed_states} onBlur={field('licensed_states')} placeholder="e.g. CA, TX, AZ" />
            </div>
          </div>
        </div>
      </div>

      {/* Coaching Notes */}
      <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 22, marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 14 }}>Coaching Notes</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Textarea value={coachDraft} onChange={(e: any) => setCoachDraft(e.target.value)} placeholder="Add a coaching note…" style={{ flex: 1, minHeight: 54 }} />
          <button onClick={addCoach} style={{ alignSelf: 'flex-start', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add note</button>
        </div>
        {coachList.length === 0 && <div style={{ fontSize: 13.5, color: '#A6ABB0' }}>No coaching notes yet.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coachList.map((c: any) => (
            <div key={c.id} style={{ border: '1px solid #EEF1F4', borderRadius: 11, padding: '13px 15px', background: '#FAFBFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2A9BC9' }}>{fmtDate(c.created_at, { month: 'short', day: 'numeric', year: 'numeric' })} · {c.author_name}</span>
                <button onClick={() => deleteCoach(c.id)} style={{ background: 'none', border: 'none', color: '#B4B9BE', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              <div style={{ fontSize: 14, color: '#2B3644', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wins */}
      <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 22, marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 14 }}>Wins</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Textarea value={winDraft} onChange={(e: any) => setWinDraft(e.target.value)} placeholder="Log a win…" style={{ flex: 1, minHeight: 54 }} />
          <button onClick={addWin} style={{ alignSelf: 'flex-start', background: '#2E7D57', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add win</button>
        </div>
        {winList.length === 0 && <div style={{ fontSize: 13.5, color: '#A6ABB0' }}>No wins logged yet.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {winList.map((w: any) => (
            <div key={w.id} style={{ border: '1px solid #E7F0EB', borderRadius: 11, padding: '13px 15px', background: '#F6FBF8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2E7D57' }}>{fmtDate(w.created_at, { month: 'short', day: 'numeric', year: 'numeric' })} · {w.author_name}</span>
                <button onClick={() => deleteWin(w.id)} style={{ background: 'none', border: 'none', color: '#B4B9BE', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              <div style={{ fontSize: 14, color: '#2B3644', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{w.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OnboardingTab({ emp, sections, doneIds, compList, done, total, pct, di, toggleCheck, sendGptEmail, sendWelcomeEmail, update }: any) {
  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, maxWidth: 560 }}>
          <ProgressBar pct={pct} height={9} />
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0A2540' }}>{Math.round(pct * 100)}%</div>
        </div>
        <div style={{ fontSize: 13, color: '#858889', marginTop: 8 }}>
          {done} of {total} complete · Starts {fmtDate(emp.start_date, { month: 'short', day: 'numeric', year: 'numeric' }) || 'no date'} · {di.label}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 22, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 20, position: 'sticky', top: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#858889', marginBottom: 16 }}>Onboarding Details</div>
          <div style={{ marginBottom: 16 }}>
            <Label>Start date</Label>
            <input type="date" defaultValue={emp.start_date ?? ''} onBlur={(e: any) => update({ start_date: e.target.value || null })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #DCE1E6', borderRadius: 9, fontSize: 14, color: '#26303B', background: '#fff' }} onFocus={(e: any) => (e.currentTarget.style.borderColor = '#5BCBF5')} onBlurCapture={(e: any) => (e.currentTarget.style.borderColor = '#DCE1E6')} />
          </div>
          {emp.onboarding_role === 'PP' && (
            <div style={{ marginBottom: 16 }}>
              <Label>Assigned MA</Label>
              <input defaultValue={emp.assigned_ma} onBlur={(e: any) => update({ assigned_ma: e.target.value })} placeholder="Once assigned…" style={{ width: '100%', padding: '10px 12px', border: '1px solid #DCE1E6', borderRadius: 9, fontSize: 14, color: '#26303B', background: '#fff' }} onFocus={(e: any) => (e.currentTarget.style.borderColor = '#5BCBF5')} />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <Label>Equipment tracking</Label>
            <textarea defaultValue={emp.equipment} onBlur={(e: any) => update({ equipment: e.target.value })} placeholder="Carrier, tracking #, delivery status…" style={{ width: '100%', padding: '10px 12px', border: '1px solid #DCE1E6', borderRadius: 9, fontSize: 14, color: '#26303B', background: '#fff', resize: 'vertical', lineHeight: 1.5, minHeight: 64 }} onFocus={(e: any) => (e.currentTarget.style.borderColor = '#5BCBF5')} />
          </div>
          <div>
            <Label>Onboarding notes</Label>
            <textarea defaultValue={emp.notes} onBlur={(e: any) => update({ notes: e.target.value })} placeholder="Anything to remember…" style={{ width: '100%', padding: '10px 12px', border: '1px solid #DCE1E6', borderRadius: 9, fontSize: 14, color: '#26303B', background: '#fff', resize: 'vertical', lineHeight: 1.5, minHeight: 64 }} onFocus={(e: any) => (e.currentTarget.style.borderColor = '#5BCBF5')} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {sections.map((section: any) => {
            const secDone = section.items.filter((it: any) => doneIds.has(it.id)).length
            return (
              <div key={section.id} style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid #EEF1F4' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0A2540' }}>{section.title}</div>
                    {section.note && <div style={{ fontSize: 12.5, color: '#858889', marginTop: 5, lineHeight: 1.5, maxWidth: 540 }}>{section.note}</div>}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5F6B76', background: '#EEF1F4', padding: '4px 11px', borderRadius: 999, flexShrink: 0 }}>{secDone}/{section.items.length}</span>
                </div>
                <div style={{ padding: 8 }}>
                  {section.items.map((item: any) => {
                    const isDone = doneIds.has(item.id)
                    const comp = compList.find((c: any) => c.item_id === item.id)
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'background .12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F6F8FA')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isDone ? '#2E7D57' : '#C6CCD2'}`, background: isDone ? '#2E7D57' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          {isDone && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14.5, fontWeight: 500, color: isDone ? '#9AA0A6' : '#26303B', textDecoration: isDone ? 'line-through' : 'none' }}>{item.text}</span>
                            {item.cost && <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2A9BC9', background: '#E6F5FC', padding: '2px 7px', borderRadius: 5 }}>{item.cost}</span>}
                          </div>
                          {item.note && <div style={{ fontSize: 12.5, color: '#858889', marginTop: 3, lineHeight: 1.45 }}>{item.note}</div>}
                          {isDone && comp && <div style={{ fontSize: 12, color: '#2E7D57', fontWeight: 600, marginTop: 4 }}>Completed {fmtDate(comp.completed_at, { month: 'short', day: 'numeric' })} · {comp.completed_by}</div>}
                        </div>
                        {item.action && (
                          <button
                            onClick={e => { e.stopPropagation(); item.action === 'gptEmail' ? sendGptEmail() : sendWelcomeEmail() }}
                            style={{ flexShrink: 0, alignSelf: 'center', background: '#E6F5FC', border: '1px solid #BFE6F6', color: '#186C8E', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {item.action === 'gptEmail' ? 'Send email' : 'Send welcome letter'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
