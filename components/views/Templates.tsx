'use client'
import { useState } from 'react'
import { useApp } from '@/lib/appContext'
import { EXTREME_OWNERSHIP_MSG } from '@/lib/checklist'
import { Label, Input, Textarea } from '@/components/ui/Input'

export default function Templates() {
  const { welcomeTemplate, supabase, reload } = useApp()
  const [name, setName] = useState('')
  const [sender, setSender] = useState('')
  const [body, setBody] = useState(welcomeTemplate)
  const [welcomeCopied, setWelcomeCopied] = useState(false)
  const [extremeCopied, setExtremeCopied] = useState(false)

  async function saveTemplate(newBody: string) {
    setBody(newBody)
    await supabase.from('message_templates').upsert({ key: 'welcome', body: newBody })
    reload()
  }

  async function copyWelcome() {
    const filled = body.replace(/{name}/g, name || '{name}').replace(/{sender}/g, sender || '{sender}')
    await navigator.clipboard.writeText(filled)
    setWelcomeCopied(true)
    setTimeout(() => setWelcomeCopied(false), 2000)
  }

  async function copyExtreme() {
    await navigator.clipboard.writeText(EXTREME_OWNERSHIP_MSG)
    setExtremeCopied(true)
    setTimeout(() => setExtremeCopied(false), 2000)
  }

  const btnStyle: React.CSSProperties = { background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 40px 90px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, letterSpacing: '-.02em', fontSize: 32, margin: 0, color: '#0A2540' }}>Message Templates</h1>
        <div style={{ fontSize: 14, color: '#858889', marginTop: 5 }}>Personalize, then copy to paste into your email.</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Label>Recipient's name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="New hire's first name" />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Label>Your name (sign-off)</Label>
          <Input value={sender} onChange={e => setSender(e.target.value)} placeholder="Your name" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0A2540' }}>Division Welcome Letter</div>
              <div style={{ fontSize: 12, color: '#858889', marginTop: 2 }}>Insert a welcome GIF when you send</div>
            </div>
            <button onClick={copyWelcome} style={btnStyle}>{welcomeCopied ? 'Copied!' : 'Copy filled letter'}</button>
          </div>
          <div style={{ fontSize: 11.5, color: '#858889', marginBottom: 8, lineHeight: 1.5 }}>
            Edit freely — use <code style={{ background: '#EEF1F4', padding: '1px 5px', borderRadius: 4 }}>{'{name}'}</code> and <code style={{ background: '#EEF1F4', padding: '1px 5px', borderRadius: 4 }}>{'{sender}'}</code> as placeholders; they fill in automatically when sent or copied.
          </div>
          <Textarea
            value={body}
            onChange={e => saveTemplate(e.target.value)}
            style={{ minHeight: 240, fontSize: 13.5, lineHeight: 1.7, color: '#3A4552', background: '#FAFBFC', border: '1px solid #EEF1F4', borderRadius: 10, padding: 16, flex: 1, resize: 'vertical' }}
          />
        </div>

        <div style={{ background: '#fff', border: '1px solid #E4E8EC', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0A2540' }}>Extreme Ownership Message</div>
              <div style={{ fontSize: 12, color: '#858889', marginTop: 2 }}>Drop ship the book from Amazon</div>
            </div>
            <button onClick={copyExtreme} style={btnStyle}>{extremeCopied ? 'Copied!' : 'Copy message'}</button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.7, color: '#3A4552', background: '#FAFBFC', border: '1px solid #EEF1F4', borderRadius: 10, padding: 16, flex: 1 }}>
            {EXTREME_OWNERSHIP_MSG}
          </div>
        </div>
      </div>
    </div>
  )
}
