'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/appContext'

// ── Types ──────────────────────────────────────────────────────────────────

interface ReelsScript {
  id: string
  title: string
  slug: string
  status: 'draft' | 'live' | 'archived'
  created_at: string
  scenes?: ReelsScene[]
}

interface ReelsScene {
  id: string
  script_id: string
  kind: 'hook' | 'body' | 'cta'
  text: string
  duration_seconds: number
  scene_order: number
}

interface ReelsVideo {
  id: string
  script_id: string
  user_id: string
  status: 'awaiting_scenes' | 'uploading' | 'rendering' | 'ready' | 'error'
  file_url: string | null
  created_at: string
}

interface Profile {
  id: string
  full_name: string
  email: string
}

type ReelsTab = 'home' | 'admin-scripts' | 'admin-videos'
type RecordStep = 'select' | 'compose' | 'ready' | 'countdown' | 'recording' | 'review' | 'uploading' | 'done'

const SCENE_META: Record<string, { label: string; color: string; tip: string; placeholder: string }> = {
  hook: { label: 'Hook',  color: '#7C3AED', tip: 'Grab attention in the first 5–10 seconds', placeholder: 'e.g. "Did you know most homeowners are leaving $400/mo on the table with their current rate?"' },
  body: { label: 'Body',  color: '#0A2540', tip: 'Deliver your main message clearly',          placeholder: 'e.g. "Here\'s how a simple refi breakeven analysis works..."' },
  cta:  { label: 'CTA',   color: '#0891B2', tip: 'Tell them exactly what to do next',          placeholder: 'e.g. "Drop a comment below or DM me and I\'ll run the numbers for you — free."' },
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Reels() {
  const { profile } = useApp()
  const supabase = createClient()
  const isColin = profile?.email?.toLowerCase() === 'colin.jenson@neohomeloans.com'
  const isAdmin = profile?.role === 'admin' || isColin

  const [tab, setTab] = useState<ReelsTab>('home')
  const [showRecord, setShowRecord] = useState(false)
  const [scripts, setScripts] = useState<ReelsScript[]>([])
  const [videos, setVideos] = useState<ReelsVideo[]>([])
  const [myVideos, setMyVideos] = useState<ReelsVideo[]>([])
  const [assignedScriptIds, setAssignedScriptIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [scriptsRes, allVideosRes, myVideosRes, assignRes] = await Promise.all([
      supabase.from('splice_scripts').select('*, splice_scenes(*)').order('created_at', { ascending: false }),
      isAdmin
        ? supabase.from('splice_videos').select('*, splice_scripts(title), profiles(full_name)').order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('splice_videos').select('*, splice_scripts(title)').eq('user_id', profile!.id).order('created_at', { ascending: false }),
      supabase.from('splice_script_assignments').select('script_id').eq('user_id', profile!.id),
    ])
    const raw = (scriptsRes.data ?? []) as any[]
    setScripts(raw.map(s => ({
      ...s,
      scenes: (s.splice_scenes ?? []).sort((a: ReelsScene, b: ReelsScene) => a.scene_order - b.scene_order),
    })))
    setVideos((allVideosRes.data ?? []) as ReelsVideo[])
    setMyVideos((myVideosRes.data ?? []) as ReelsVideo[])
    setAssignedScriptIds((assignRes.data ?? []).map((r: any) => r.script_id))
    setLoading(false)
  }, [supabase, isAdmin, profile])

  useEffect(() => { loadData() }, [loadData])

  const liveScripts = scripts.filter(s => s.status === 'live')
  const assignedScripts = liveScripts.filter(s => assignedScriptIds.includes(s.id))

  function tabBtn(id: ReelsTab, label: string) {
    const active = tab === id
    return (
      <button onClick={() => setTab(id)} style={{
        padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontWeight: 700, fontSize: 13,
        background: active ? '#0A2540' : '#F3F4F6',
        color: active ? '#fff' : '#4B5563',
      }}>{label}</button>
    )
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', margin: '0 0 4px' }}>Splice</h1>
          <div style={{ fontSize: 14, color: '#6B7280' }}>Record short-form video in 3 scenes — Hook, Body, CTA — with a built-in teleprompter</div>
        </div>
        <button onClick={() => setShowRecord(true)} style={{
          padding: '11px 22px', background: '#0A2540', color: '#fff', border: 'none',
          borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>●</span> Record a Video
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabBtn('home', 'My Videos')}
        {isAdmin && tabBtn('admin-scripts', 'Scripts')}
        {isAdmin && tabBtn('admin-videos', 'All Videos')}
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>Loading…</div>
      ) : tab === 'home' ? (
        <HomeTab myVideos={myVideos} assignedScripts={assignedScripts} liveScripts={liveScripts} onRecord={() => setShowRecord(true)} />
      ) : tab === 'admin-scripts' ? (
        <ScriptsTab scripts={scripts} onRefresh={loadData} />
      ) : (
        <AllVideosTab videos={videos} onRefresh={loadData} />
      )}

      {showRecord && (
        <RecordModal
          scripts={liveScripts}
          assignedScripts={assignedScripts}
          profile={profile}
          onClose={() => { setShowRecord(false); loadData() }}
        />
      )}
    </div>
  )
}

// ── Home Tab ───────────────────────────────────────────────────────────────

function HomeTab({ myVideos, assignedScripts, liveScripts, onRecord }: {
  myVideos: ReelsVideo[]
  assignedScripts: ReelsScript[]
  liveScripts: ReelsScript[]
  onRecord: () => void
}) {
  function statusBadge(status: ReelsVideo['status']) {
    const map: Record<string, [string, string, string]> = {
      awaiting_scenes: ['#FEF3C7', '#92400E', 'Pending Render'],
      uploading:       ['#DBEAFE', '#1E40AF', 'Uploading'],
      rendering:       ['#EDE9FE', '#5B21B6', 'Rendering'],
      ready:           ['#D1FAE5', '#065F46', 'Ready'],
      error:           ['#FEE2E2', '#991B1B', 'Error'],
    }
    const [bg, color, label] = map[status] ?? map.awaiting_scenes
    return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{label}</span>
  }

  return (
    <div>
      {/* Assigned scripts */}
      {assignedScripts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 12 }}>
            Assigned to You
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assignedScripts.map(s => (
              <div key={s.id} style={{ background: '#FAF5FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0A2540', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(s.scenes ?? []).map(sc => (
                      <span key={sc.id} style={{ background: '#EDE9FE', color: '#5B21B6', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                        {SCENE_META[sc.kind]?.label} · {sc.duration_seconds}s
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={onRecord} style={{ padding: '8px 18px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Record Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My videos */}
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 14 }}>
        My Videos ({myVideos.length})
      </div>

      {myVideos.length === 0 ? (
        <div style={{ border: '2px dashed #D1D5DB', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No videos yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Write your own script or choose one your team published</div>
          <button onClick={onRecord} style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Record a Video
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {myVideos.map(v => (
            <div key={v.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/9', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {v.file_url
                  ? <video src={v.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                  : <span style={{ fontSize: 32, opacity: 0.4 }}>🎥</span>}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A2540' }}>{(v as any).splice_scripts?.title ?? 'My Script'}</div>
                  {statusBadge(v.status)}
                </div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                {v.status === 'ready' && v.file_url && (
                  <a href={v.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 10, padding: '8px 0', background: '#0A2540', color: '#fff', borderRadius: 7, textAlign: 'center', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Download MP4
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Scripts Tab (Admin) ────────────────────────────────────────────────────

function ScriptsTab({ scripts, onRefresh }: { scripts: ReelsScript[]; onRefresh: () => void }) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assignScript, setAssignScript] = useState<ReelsScript | null>(null)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    scenes: [
      { kind: 'hook' as const, text: '', duration_seconds: 30 },
      { kind: 'body' as const, text: '', duration_seconds: 60 },
      { kind: 'cta'  as const, text: '', duration_seconds: 15 },
    ],
  })

  function updateScene(idx: number, key: string, val: any) {
    const s = [...form.scenes]; s[idx] = { ...s[idx], [key]: val }
    setForm(f => ({ ...f, scenes: s }))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { data: script, error } = await supabase.from('splice_scripts').insert({ title: form.title, slug, status: 'draft' }).select().single()
    if (!error && script) {
      const scenesToInsert = form.scenes.map((s, i) => ({ ...s, script_id: script.id, scene_order: i }))
      await supabase.from('splice_scenes').insert(scenesToInsert)
    }
    setSaving(false)
    setForm({ title: '', slug: '', scenes: [
      { kind: 'hook', text: '', duration_seconds: 30 },
      { kind: 'body', text: '', duration_seconds: 60 },
      { kind: 'cta',  text: '', duration_seconds: 15 },
    ]})
    setShowForm(false)
    onRefresh()
  }

  async function toggleStatus(script: ReelsScript) {
    const next = script.status === 'draft' ? 'live' : 'draft'
    await supabase.from('splice_scripts').update({ status: next }).eq('id', script.id)
    onRefresh()
  }

  async function deleteScript(id: string) {
    if (!confirm('Delete this script and all its scenes?')) return
    await supabase.from('splice_scripts').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '9px 18px', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ New Script'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelSt}>Script Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g., Refi Breakeven Analysis" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Slug (auto-generated if blank)</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="refi-breakeven" style={inputSt} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {form.scenes.map((scene, idx) => {
              const meta = SCENE_META[scene.kind]
              return (
                <div key={idx} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: meta.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>{meta.label.toUpperCase()}</span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{meta.tip}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" value={scene.duration_seconds} min={5} max={120}
                        onChange={e => updateScene(idx, 'duration_seconds', parseInt(e.target.value))}
                        style={{ ...inputSt, width: 64, padding: '5px 8px' }} />
                      <span style={{ fontSize: 12, color: '#6B7280' }}>sec</span>
                    </div>
                  </div>
                  <textarea value={scene.text} rows={3} placeholder={meta.placeholder}
                    onChange={e => updateScene(idx, 'text', e.target.value)}
                    style={{ ...inputSt, resize: 'vertical', width: '100%' }} />
                </div>
              )
            })}
          </div>
          <button type="submit" disabled={saving} style={{ width: '100%', padding: '11px 0', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating…' : 'Create Script'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scripts.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>No scripts yet.</div>}
        {scripts.map(script => (
          <div key={script.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 3 }}>{script.title}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 8 }}>{script.slug}</div>
                {script.scenes && script.scenes.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {script.scenes.map(s => (
                      <span key={s.id} style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>
                        {SCENE_META[s.kind]?.label} · {s.duration_seconds}s
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: script.status === 'live' ? '#D1FAE5' : '#F3F4F6', color: script.status === 'live' ? '#065F46' : '#6B7280' }}>
                  {script.status === 'live' ? 'LIVE' : 'DRAFT'}
                </span>
                <button onClick={() => toggleStatus(script)} style={{ padding: '6px 14px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151' }}>
                  {script.status === 'live' ? 'Set Draft' : 'Go Live'}
                </button>
                {script.status === 'live' && (
                  <button onClick={() => setAssignScript(script)} style={{ padding: '6px 14px', border: '1px solid #DDD6FE', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#FAF5FF', color: '#7C3AED' }}>
                    Assign →
                  </button>
                )}
                <button onClick={() => deleteScript(script.id)} style={{ padding: '6px 10px', border: '1px solid #FCA5A5', borderRadius: 7, fontSize: 12, color: '#DC2626', cursor: 'pointer', background: '#fff' }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {assignScript && (
        <AssignModal script={assignScript} onClose={() => { setAssignScript(null); onRefresh() }} />
      )}
    </div>
  )
}

// ── Assign Modal ───────────────────────────────────────────────────────────

function AssignModal({ script, onClose }: { script: ReelsScript; onClose: () => void }) {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [assigned, setAssigned] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [profRes, assignRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').eq('status', 'approved').order('full_name'),
        supabase.from('splice_script_assignments').select('user_id').eq('script_id', script.id),
      ])
      setProfiles(profRes.data ?? [])
      setAssigned(new Set((assignRes.data ?? []).map((r: any) => r.user_id)))
    }
    load()
  }, [script.id, supabase])

  function toggle(userId: string) {
    setAssigned(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  async function save() {
    setSaving(true)
    await supabase.from('splice_script_assignments').delete().eq('script_id', script.id)
    if (assigned.size > 0) {
      const rows = Array.from(assigned).map(user_id => ({ script_id: script.id, user_id }))
      await supabase.from('splice_script_assignments').insert(rows)
    }
    setSaving(false)
    onClose()
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 420, maxWidth: '94vw', maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#0A2540', marginBottom: 4 }}>Assign Script</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
          "{script.title}" — selected advisors will see it on their home screen with a Record Now prompt.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {profiles.map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 9, border: `1px solid ${assigned.has(p.id) ? '#DDD6FE' : '#E5E7EB'}`, background: assigned.has(p.id) ? '#FAF5FF' : '#fff', cursor: 'pointer' }}>
              <input type="checkbox" checked={assigned.has(p.id)} onChange={() => toggle(p.id)} style={{ width: 16, height: 16, accentColor: '#7C3AED' }} />
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EDE9FE', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {initials(p.full_name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0A2540' }}>{p.full_name}</div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{p.email}</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: '10px 0', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : `Assign to ${assigned.size} advisor${assigned.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── All Videos Tab (Admin) ─────────────────────────────────────────────────

function AllVideosTab({ videos, onRefresh }: { videos: ReelsVideo[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('all')
  const [rendering, setRendering] = useState<string | null>(null)

  const filtered = filter === 'all' ? videos : videos.filter(v => v.status === filter)

  async function triggerRender(videoId: string) {
    setRendering(videoId)
    try {
      const res = await fetch('/api/reels/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId }) })
      if (!res.ok) throw new Error(await res.text())
      onRefresh()
    } catch (e: any) { alert('Render failed: ' + e.message) }
    setRendering(null)
  }

  const statusMap: Record<string, [string, string, string]> = {
    awaiting_scenes: ['#FEF3C7', '#92400E', 'Awaiting Render'],
    uploading:       ['#DBEAFE', '#1E40AF', 'Uploading'],
    rendering:       ['#EDE9FE', '#5B21B6', 'Rendering'],
    ready:           ['#D1FAE5', '#065F46', 'Ready'],
    error:           ['#FEE2E2', '#991B1B', 'Error'],
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'ready', 'rendering', 'awaiting_scenes', 'error'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f ? '#0A2540' : '#fff', color: filter === f ? '#fff' : '#374151' }}>
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>No videos found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(v => {
            const [bg, color, label] = statusMap[v.status] ?? statusMap.awaiting_scenes
            return (
              <div key={v.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '16/9', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {v.file_url ? <video src={v.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls /> : <span style={{ fontSize: 28, opacity: 0.3 }}>🎥</span>}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A2540', marginBottom: 2 }}>{(v as any).splice_scripts?.title ?? '—'}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>{(v as any).profiles?.full_name ?? 'Unknown'} · {new Date(v.created_at).toLocaleDateString()}</div>
                  <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{label}</span>
                  {v.status === 'awaiting_scenes' && (
                    <button onClick={() => triggerRender(v.id)} disabled={rendering === v.id} style={{ marginTop: 10, width: '100%', padding: '8px 0', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: rendering === v.id ? 0.6 : 1 }}>
                      {rendering === v.id ? 'Starting…' : 'Trigger Render'}
                    </button>
                  )}
                  {v.status === 'ready' && v.file_url && (
                    <a href={v.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 10, padding: '8px 0', background: '#0A2540', color: '#fff', borderRadius: 7, textAlign: 'center', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      Download MP4
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Record Modal ───────────────────────────────────────────────────────────

const DEFAULT_COMPOSE = [
  { kind: 'hook' as const, text: '', duration_seconds: 30 },
  { kind: 'body' as const, text: '', duration_seconds: 60 },
  { kind: 'cta'  as const, text: '', duration_seconds: 15 },
]

function RecordModal({ scripts, assignedScripts, profile, onClose }: {
  scripts: ReelsScript[]
  assignedScripts: ReelsScript[]
  profile: any
  onClose: () => void
}) {
  const supabase = createClient()
  const [step, setStep] = useState<RecordStep>('select')
  const [selectedScript, setSelectedScript] = useState<ReelsScript | null>(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [clips, setClips] = useState<{ blob: Blob; url: string }[]>([])
  const [countdown, setCountdown] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [submitStatus, setSubmitStatus] = useState('')
  const [scrolling, setScrolling] = useState(true)
  const [composeTitle, setComposeTitle] = useState('')
  const [composeScenes, setComposeScenes] = useState(DEFAULT_COMPOSE.map(s => ({ ...s })))

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const scrollAnimRef = useRef<number>(0)

  const scenes = selectedScript?.scenes ?? []
  const currentScene = scenes[sceneIdx]

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      setError('Camera access denied. Please allow camera and microphone access in your browser settings.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function handleSelectScript(script: ReelsScript) {
    setSelectedScript(script)
    setStep('ready')
    setSceneIdx(0)
    setClips([])
    await startCamera()
  }

  // Build a script from compose form and start recording
  async function handleStartCompose() {
    if (!composeTitle.trim()) return
    const slug = composeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const { data: script, error: sErr } = await supabase.from('splice_scripts').insert({
      title: composeTitle.trim(), slug, status: 'draft', author_id: profile?.id,
    }).select().single()
    if (sErr || !script) { setError('Could not save script: ' + sErr?.message); return }
    const scenesToInsert = composeScenes.map((s, i) => ({ ...s, script_id: script.id, scene_order: i }))
    await supabase.from('splice_scenes').insert(scenesToInsert)
    const { data: full } = await supabase.from('splice_scripts').select('*, splice_scenes(*)').eq('id', script.id).single()
    const built: ReelsScript = {
      ...(full as any),
      scenes: ((full as any)?.splice_scenes ?? []).sort((a: any, b: any) => a.scene_order - b.scene_order),
    }
    setSelectedScript(built)
    setSceneIdx(0)
    setClips([])
    setStep('ready')
    await startCamera()
  }

  function startCountdown() {
    setStep('countdown')
    setCountdown(3)
    let c = 3
    timerRef.current = setInterval(() => {
      c--; setCountdown(c)
      if (c <= 0) { clearTimer(); startRecording() }
    }, 1000)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setClips(prev => { const next = [...prev]; next[sceneIdx] = { blob, url }; return next })
      setStep('review')
    }
    recorder.start(250)
    setStep('recording')
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    // Auto-scroll teleprompter
    if (promptRef.current && currentScene?.duration_seconds) {
      const el = promptRef.current
      el.scrollTop = 0
      const totalScroll = el.scrollHeight - el.clientHeight
      if (totalScroll > 0) {
        const startTime = Date.now()
        const dur = currentScene.duration_seconds * 1000
        const tick = () => {
          const pct = Math.min((Date.now() - startTime) / dur, 1)
          el.scrollTop = totalScroll * pct
          if (pct < 1) scrollAnimRef.current = requestAnimationFrame(tick)
        }
        scrollAnimRef.current = requestAnimationFrame(tick)
      }
    }
  }

  function stopRecording() {
    clearTimer()
    cancelAnimationFrame(scrollAnimRef.current)
    recorderRef.current?.stop()
  }

  function reRecord() {
    setStep('ready')
    if (promptRef.current) promptRef.current.scrollTop = 0
  }

  function nextScene() {
    if (sceneIdx < scenes.length - 1) {
      setSceneIdx(i => i + 1)
      setStep('ready')
      if (promptRef.current) promptRef.current.scrollTop = 0
    } else {
      setStep('uploading')
      submitAll()
    }
  }

  async function submitAll() {
    if (!selectedScript || !profile) return
    setSubmitStatus('Creating video record…')
    try {
      const { data: video, error: vErr } = await supabase.from('splice_videos').insert({
        script_id: selectedScript.id, user_id: profile.id, status: 'uploading',
      }).select().single()
      if (vErr || !video) throw vErr ?? new Error('Failed to create video')

      for (let i = 0; i < clips.length; i++) {
        const scene = scenes[i]; const clip = clips[i]
        if (!clip || !scene) continue
        setSubmitStatus(`Uploading scene ${i + 1} of ${clips.length}…`)
        const path = `splice-clips/${video.id}/scene-${i}.webm`
        const { error: uploadErr } = await supabase.storage.from('splice-clips').upload(path, clip.blob, { contentType: 'video/webm', upsert: true })
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('splice-clips').getPublicUrl(path)
        await supabase.from('splice_video_clips').insert({ video_id: video.id, scene_id: scene.id, clip_url: urlData.publicUrl, duration_seconds: elapsed })
      }

      await supabase.from('splice_videos').update({ status: 'awaiting_scenes' }).eq('id', video.id)
      setSubmitStatus(''); setStep('done')
    } catch (e: any) {
      setError('Upload failed: ' + e.message); setStep('ready')
    }
  }

  function handleClose() {
    clearTimer()
    cancelAnimationFrame(scrollAnimRef.current)
    stopCamera()
    clips.forEach(c => URL.revokeObjectURL(c.url))
    onClose()
  }

  function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

  const isRecordingStep = step === 'ready' || step === 'countdown' || step === 'recording' || step === 'review'

  return (
    <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: step === 'recording' ? 900 : 680, maxHeight: '92vh', overflow: 'auto', margin: 12, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#0A2540' }}>
            {step === 'select' ? 'Start Recording' :
             step === 'compose' ? 'Write Your Script' :
             step === 'done' ? '🎬 Video Submitted!' :
             step === 'uploading' ? 'Uploading…' :
             `${SCENE_META[currentScene?.kind]?.label ?? ''} — Scene ${sceneIdx + 1} of ${scenes.length}`}
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 22, flex: 1, overflow: 'auto' }}>
          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#991B1B', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* ── SELECT ─────────────────────────────────────── */}
          {step === 'select' && (
            <div>
              {/* Write your own — always first */}
              <button onClick={() => setStep('compose')} style={{
                width: '100%', background: 'linear-gradient(135deg,#0A2540 0%,#1a3d6e 100%)', border: 'none',
                borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 28 }}>✍️</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Write Your Own Script</div>
                  <div style={{ fontSize: 12, color: '#93C5FD' }}>Type your Hook, Body, and CTA — teleprompter shows it while you record</div>
                </div>
              </button>

              {scripts.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10 }}>
                    {assignedScripts.length > 0 ? 'Assigned to You' : 'Published Scripts'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(assignedScripts.length > 0 ? assignedScripts : scripts).map(s => (
                      <button key={s.id} onClick={() => handleSelectScript(s)} style={{
                        background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10,
                        padding: '14px 16px', textAlign: 'left', cursor: 'pointer', width: '100%',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0A2540', marginBottom: 6 }}>{s.title}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(s.scenes ?? []).map(sc => (
                            <span key={sc.id} style={{ background: SCENE_META[sc.kind]?.color + '22', color: SCENE_META[sc.kind]?.color, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                              {SCENE_META[sc.kind]?.label} · {sc.duration_seconds}s
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── COMPOSE ────────────────────────────────────── */}
          {step === 'compose' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>Video Title</label>
                <input value={composeTitle} onChange={e => setComposeTitle(e.target.value)} placeholder="e.g., Why Now Is the Time to Refinance" style={inputSt} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {composeScenes.map((scene, idx) => {
                  const meta = SCENE_META[scene.kind]
                  return (
                    <div key={idx} style={{ background: '#F9FAFB', border: `1px solid ${meta.color}33`, borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <span style={{ background: meta.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, marginRight: 8 }}>{meta.label.toUpperCase()}</span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{meta.tip}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <input type="number" value={scene.duration_seconds} min={5} max={120}
                            onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], duration_seconds: parseInt(e.target.value) }; setComposeScenes(s) }}
                            style={{ ...inputSt, width: 60, padding: '4px 8px' }} />
                          <span style={{ fontSize: 12, color: '#6B7280' }}>s</span>
                        </div>
                      </div>
                      <textarea value={scene.text} rows={4} placeholder={meta.placeholder}
                        onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], text: e.target.value }; setComposeScenes(s) }}
                        style={{ ...inputSt, resize: 'vertical', width: '100%', fontSize: 13.5, lineHeight: 1.6 }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px 0', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151' }}>Back</button>
                <button onClick={handleStartCompose} disabled={!composeTitle.trim()} style={{ flex: 2, padding: '11px 0', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: composeTitle.trim() ? 'pointer' : 'default', opacity: composeTitle.trim() ? 1 : 0.5 }}>
                  Start Recording →
                </button>
              </div>
            </div>
          )}

          {/* ── READY / COUNTDOWN / RECORDING / REVIEW ─────── */}
          {isRecordingStep && (
            <div>
              {/* Scene progress */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {scenes.map((s, i) => (
                  <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: i < sceneIdx ? '#0A2540' : i === sceneIdx ? SCENE_META[s.kind]?.color : '#E5E7EB' }} />
                ))}
              </div>

              {step === 'review' && clips[sceneIdx] ? (
                /* ── REVIEW CLIP ── */
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0A2540', marginBottom: 10 }}>
                    Review your {SCENE_META[currentScene?.kind]?.label}
                  </div>
                  <video src={clips[sceneIdx].url} controls style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 380 }} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button onClick={reRecord} style={{ flex: 1, padding: '11px 0', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151' }}>
                      Re-record
                    </button>
                    <button onClick={nextScene} style={{ flex: 2, padding: '11px 0', background: SCENE_META[currentScene?.kind]?.color ?? '#0A2540', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {sceneIdx < scenes.length - 1 ? `Next: ${SCENE_META[scenes[sceneIdx + 1]?.kind]?.label} →` : 'Submit Video ✓'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── CAMERA + TELEPROMPTER ── */
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>

                    {/* Teleprompter panel */}
                    {currentScene?.text && (
                      <div style={{ flex: 1, background: '#0A0A0A', borderRadius: 12, padding: 0, position: 'relative', minHeight: 260, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '10px 14px', background: '#141414', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: SCENE_META[currentScene.kind]?.color, letterSpacing: '.08em' }}>
                            {SCENE_META[currentScene.kind]?.label.toUpperCase()} TELEPROMPTER
                          </span>
                          <button onClick={() => setScrolling(s => !s)} style={{ background: 'none', border: '1px solid #333', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: '#888', cursor: 'pointer' }}>
                            {scrolling ? 'Manual' : 'Auto-scroll'}
                          </button>
                        </div>
                        <div ref={promptRef} style={{ flex: 1, overflowY: step === 'recording' && scrolling ? 'hidden' : 'auto', padding: '18px 20px 60px' }}>
                          <p style={{ fontSize: 18, lineHeight: 1.75, color: '#FFFFFF', fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>
                            {currentScene.text}
                          </p>
                        </div>
                        {step !== 'recording' && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, #0A0A0A)', pointerEvents: 'none' }} />
                        )}
                      </div>
                    )}

                    {/* Camera preview */}
                    <div style={{ flex: currentScene?.text ? '0 0 52%' : 1, position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', minHeight: 260 }}>
                      <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />

                      {/* Countdown overlay */}
                      {step === 'countdown' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                          <div style={{ fontSize: 96, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>{countdown}</div>
                        </div>
                      )}

                      {/* REC indicator */}
                      {step === 'recording' && (
                        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '5px 10px' }}>
                          <div style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%', animation: 'pulse 1s ease-in-out infinite' }} />
                          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</span>
                          {currentScene?.duration_seconds && (
                            <span style={{ color: '#9CA3AF', fontSize: 11 }}>/ {fmt(currentScene.duration_seconds)}</span>
                          )}
                        </div>
                      )}

                      {/* Scene label badge */}
                      {step === 'ready' && (
                        <div style={{ position: 'absolute', bottom: 10, left: 10, background: SCENE_META[currentScene?.kind]?.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>
                          {SCENE_META[currentScene?.kind]?.label.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Script text below if no text was entered (fallback) */}
                  {!currentScene?.text && (
                    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#374151', fontStyle: 'italic' }}>
                      No script text for this scene — speak from your knowledge!
                    </div>
                  )}

                  {/* Controls */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {step === 'ready' && (
                      <button onClick={startCountdown} style={{
                        padding: '13px 36px', background: '#EF4444', color: '#fff', border: 'none',
                        borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                        Start Recording
                      </button>
                    )}
                    {(step === 'countdown' || step === 'recording') && (
                      <button onClick={stopRecording} disabled={step === 'countdown'} style={{
                        padding: '13px 36px', background: step === 'countdown' ? '#6B7280' : '#374151', color: '#fff', border: 'none',
                        borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: step === 'countdown' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2, display: 'inline-block' }} />
                        {step === 'countdown' ? 'Get ready…' : 'Stop Recording'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── UPLOADING ──────────────────────────────────── */}
          {step === 'uploading' && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>⬆️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>Uploading your clips…</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{submitStatus}</div>
            </div>
          )}

          {/* ── DONE ───────────────────────────────────────── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>Video Submitted!</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
                Your clips are uploaded. An admin will trigger the final render to stitch everything into one MP4 with your contact info end card.
              </div>
              <button onClick={handleClose} style={{ padding: '11px 28px', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8,
  fontSize: 13.5, color: '#0A2540', background: '#fff',
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '.03em',
}
