'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/appContext'

// ── Types ──────────────────────────────────────────────────────────────────

interface SpliceScript {
  id: string; title: string; slug: string
  status: 'draft' | 'live' | 'archived'; created_at: string
  scenes?: SpliceScene[]
}
interface SpliceScene {
  id: string; script_id: string; kind: 'hook' | 'body' | 'cta'
  text: string; duration_seconds: number; scene_order: number
}
interface SpliceVideo {
  id: string; script_id: string; user_id: string
  status: 'awaiting_scenes' | 'uploading' | 'rendering' | 'ready' | 'error'
  file_url: string | null; created_at: string
}
interface SpliceMember {
  id: string; full_name: string; email: string; headshot_url?: string
  video_count?: number; last_video?: string
}

type SpliceTab = 'home' | 'record' | 'scripts' | 'videos' | 'team'
type RecordStep = 'select' | 'compose' | 'ready' | 'countdown' | 'recording' | 'review' | 'uploading' | 'done'

const SCENE: Record<string, { label: string; color: string; tip: string; placeholder: string }> = {
  hook: { label: 'Hook', color: '#4BC8F2', tip: 'Grab attention in the first 5–10 seconds', placeholder: '"Did you know most homeowners are leaving $400/mo on the table with their current rate?"' },
  body: { label: 'Body', color: '#A78BFA', tip: 'Deliver your main message clearly', placeholder: '"Here\'s how a simple refi breakeven analysis works in 3 steps..."' },
  cta:  { label: 'CTA',  color: '#34D399', tip: 'Tell them exactly what to do next', placeholder: '"Drop a comment or DM me — I\'ll run the numbers free."' },
}

// ── Splash / App Shell ─────────────────────────────────────────────────────

export default function Reels() {
  const { profile, setView } = useApp()
  const supabase = createClient()
  const isColin = profile?.email?.toLowerCase() === 'colin.jenson@neohomeloans.com'
  const isAdmin = profile?.role === 'admin' || isColin

  const [tab, setTab] = useState<SpliceTab>('home')
  const [scripts, setScripts] = useState<SpliceScript[]>([])
  const [myVideos, setMyVideos] = useState<SpliceVideo[]>([])
  const [allVideos, setAllVideos] = useState<SpliceVideo[]>([])
  const [members, setMembers] = useState<SpliceMember[]>([])
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showRecord, setShowRecord] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [scriptsRes, myVideosRes, allVideosRes, assignRes, membersRes] = await Promise.all([
      supabase.from('splice_scripts').select('*, splice_scenes(*)').order('created_at', { ascending: false }),
      supabase.from('splice_videos').select('*, splice_scripts(title)').eq('user_id', profile!.id).order('created_at', { ascending: false }),
      isAdmin ? supabase.from('splice_videos').select('*, splice_scripts(title), profiles(full_name,email)').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from('splice_script_assignments').select('script_id').eq('user_id', profile!.id),
      isAdmin ? supabase.from('profiles').select('id,full_name,email,headshot_url').eq('status', 'approved').order('full_name') : Promise.resolve({ data: [] }),
    ])
    const raw = (scriptsRes.data ?? []) as any[]
    setScripts(raw.map(s => ({ ...s, scenes: (s.splice_scenes ?? []).sort((a: SpliceScene, b: SpliceScene) => a.scene_order - b.scene_order) })))
    setMyVideos((myVideosRes.data ?? []) as SpliceVideo[])
    setAllVideos((allVideosRes.data ?? []) as SpliceVideo[])
    setAssignedIds((assignRes.data ?? []).map((r: any) => r.script_id))
    setMembers((membersRes.data ?? []) as SpliceMember[])
    setLoading(false)
  }, [supabase, isAdmin, profile])

  useEffect(() => { load() }, [load])

  const liveScripts = scripts.filter(s => s.status === 'live')
  const assignedScripts = liveScripts.filter(s => assignedIds.includes(s.id))

  // ── Sidebar nav items ──────────────────────────────────────────────────
  const navItems: { id: SpliceTab; icon: string; label: string; adminOnly?: boolean }[] = [
    { id: 'home',    icon: '⌂',  label: 'Home' },
    { id: 'scripts', icon: '📋', label: 'Scripts', adminOnly: true },
    { id: 'videos',  icon: '🎬', label: 'Videos',  adminOnly: true },
    { id: 'team',    icon: '👥', label: 'Team',    adminOnly: true },
  ]
  const visibleNav = navItems.filter(n => !n.adminOnly || isAdmin)

  return (
    // Full-screen dark overlay — completely different "world"
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: '#060F18', fontFamily: "'Montserrat', system-ui, sans-serif" }}>

      {/* ── Left sidebar ─────────────────────────────────── */}
      <aside style={{ width: 220, flexShrink: 0, background: '#071420', borderRight: '1px solid rgba(75,200,242,0.12)', display: 'flex', flexDirection: 'column', padding: '0 0 20px' }}>

        {/* Logo */}
        <div style={{ padding: '20px 20px 0' }}>
          <SpliceLogo />
          {isAdmin && (
            <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#4BC8F2', textTransform: 'uppercase', opacity: 0.7 }}>
              Admin
            </div>
          )}
        </div>

        {/* Record CTA */}
        <div style={{ padding: '20px 16px 4px' }}>
          <button onClick={() => { setTab('home'); setShowRecord(true) }} style={{
            width: '100%', padding: '11px 0', background: '#EF4444', color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ width: 9, height: 9, background: '#fff', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            RECORD
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: '8px 10px', flex: 1 }}>
          {visibleNav.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
              background: tab === n.id ? 'rgba(75,200,242,0.12)' : 'transparent',
              color: tab === n.id ? '#4BC8F2' : '#61798A',
              fontSize: 13.5, fontWeight: tab === n.id ? 700 : 500,
              transition: 'all 0.12s',
            }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Back to HQ */}
        <div style={{ padding: '0 10px' }}>
          <button onClick={() => setView('dashboard')} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: '#3D5468', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            ← Back to Team HQ
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#07111C' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#3D5468', fontSize: 14 }}>
            Loading Splice…
          </div>
        ) : tab === 'home' ? (
          <HomeView
            myVideos={myVideos} assignedScripts={assignedScripts} liveScripts={liveScripts}
            isAdmin={isAdmin} allVideos={allVideos} onRecord={() => setShowRecord(true)}
            profile={profile}
          />
        ) : tab === 'scripts' ? (
          <ScriptsView scripts={scripts} members={members} onRefresh={load} />
        ) : tab === 'videos' ? (
          <VideosView videos={allVideos} onRefresh={load} />
        ) : tab === 'team' ? (
          <TeamView members={members} allVideos={allVideos} />
        ) : null}
      </main>

      {/* ── Record modal ─────────────────────────────────── */}
      {showRecord && (
        <RecordModal
          scripts={liveScripts} assignedScripts={assignedScripts} profile={profile}
          onClose={() => { setShowRecord(false); load() }}
        />
      )}
    </div>
  )
}

// ── Splice Logo ────────────────────────────────────────────────────────────

function SpliceLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/splice-logo.png" alt="Splice" style={{ height: 48, width: 'auto', display: 'block' }} />
  )
}

// ── Home View ──────────────────────────────────────────────────────────────

function HomeView({ myVideos, assignedScripts, liveScripts, isAdmin, allVideos, onRecord, profile }: {
  myVideos: SpliceVideo[]; assignedScripts: SpliceScript[]; liveScripts: SpliceScript[]
  isAdmin: boolean; allVideos: SpliceVideo[]; onRecord: () => void; profile: any
}) {
  const readyCount = allVideos.filter(v => v.status === 'ready').length
  const renderingCount = allVideos.filter(v => v.status === 'rendering').length

  return (
    <div style={{ padding: '32px 36px', maxWidth: 920, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#F2F7FA', margin: '0 0 6px', letterSpacing: '-.01em' }}>
          Hey {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#61798A', margin: 0 }}>
          {assignedScripts.length > 0
            ? `You have ${assignedScripts.length} script${assignedScripts.length > 1 ? 's' : ''} waiting for you.`
            : 'Write your own script or use a published one to record a Splice video.'}
        </p>
      </div>

      {/* Admin stats row */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
          {[
            { label: 'Total Videos', value: allVideos.length, color: '#4BC8F2' },
            { label: 'Ready', value: readyCount, color: '#34D399' },
            { label: 'Rendering', value: renderingCount, color: '#A78BFA' },
            { label: 'Live Scripts', value: liveScripts.length, color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#3D5468', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Assigned scripts */}
      {assignedScripts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Assigned to You</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assignedScripts.map(s => (
              <div key={s.id} style={{ background: 'rgba(75,200,242,0.06)', border: '1px solid rgba(75,200,242,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#F2F7FA', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(s.scenes ?? []).map(sc => (
                      <span key={sc.id} style={{ background: SCENE[sc.kind]?.color + '22', color: SCENE[sc.kind]?.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                        {SCENE[sc.kind]?.label} · {sc.duration_seconds}s
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={onRecord} style={{ padding: '9px 20px', background: '#4BC8F2', color: '#060F18', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Record Now →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My videos */}
      <div>
        <SectionLabel>My Videos ({myVideos.length})</SectionLabel>
        {myVideos.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F2F7FA', marginBottom: 6 }}>No videos yet</div>
            <div style={{ fontSize: 13, color: '#3D5468', marginBottom: 22 }}>Write your own script or choose an assigned one</div>
            <button onClick={onRecord} style={{ padding: '11px 28px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              Record Your First Video
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {myVideos.map(v => <VideoCard key={v.id} video={v} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Scripts View (Admin) ───────────────────────────────────────────────────

function ScriptsView({ scripts, members, onRefresh }: { scripts: SpliceScript[]; members: SpliceMember[]; onRefresh: () => void }) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assignScript, setAssignScript] = useState<SpliceScript | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', scenes: [
    { kind: 'hook' as const, text: '', duration_seconds: 30 },
    { kind: 'body' as const, text: '', duration_seconds: 60 },
    { kind: 'cta'  as const, text: '', duration_seconds: 15 },
  ]})

  function updateScene(idx: number, key: string, val: any) {
    const s = [...form.scenes]; s[idx] = { ...s[idx], [key]: val }
    setForm(f => ({ ...f, scenes: s }))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const { data: script, error } = await supabase.from('splice_scripts').insert({ title: form.title, slug, status: 'draft' }).select().single()
    if (!error && script) {
      await supabase.from('splice_scenes').insert(form.scenes.map((s, i) => ({ ...s, script_id: script.id, scene_order: i })))
    }
    setSaving(false)
    setForm({ title: '', scenes: [{ kind: 'hook', text: '', duration_seconds: 30 }, { kind: 'body', text: '', duration_seconds: 60 }, { kind: 'cta', text: '', duration_seconds: 15 }] })
    setShowForm(false)
    onRefresh()
  }

  async function toggleStatus(s: SpliceScript) {
    await supabase.from('splice_scripts').update({ status: s.status === 'draft' ? 'live' : 'draft' }).eq('id', s.id)
    onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Delete this script?')) return
    await supabase.from('splice_scripts').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F2F7FA', margin: '0 0 4px' }}>Scripts</h2>
          <p style={{ fontSize: 13, color: '#3D5468', margin: 0 }}>Create and publish scripts for your team to record</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={darkBtn}>{showForm ? 'Cancel' : '+ New Script'}</button>
      </div>

      {showForm && (
        <form onSubmit={create} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={darkLabel}>Script Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g., Refi Breakeven Analysis" style={darkInput} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {form.scenes.map((scene, idx) => (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${SCENE[scene.kind].color}33`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: SCENE[scene.kind].color + '22', color: SCENE[scene.kind].color, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 5, letterSpacing: '.06em' }}>
                      {scene.kind.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11.5, color: '#3D5468' }}>{SCENE[scene.kind].tip}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" value={scene.duration_seconds} min={5} max={120}
                      onChange={e => updateScene(idx, 'duration_seconds', parseInt(e.target.value))}
                      style={{ ...darkInput, width: 64, padding: '5px 8px' }} />
                    <span style={{ fontSize: 12, color: '#3D5468' }}>s</span>
                  </div>
                </div>
                <textarea value={scene.text} rows={3} placeholder={SCENE[scene.kind].placeholder}
                  onChange={e => updateScene(idx, 'text', e.target.value)}
                  style={{ ...darkInput, resize: 'vertical', width: '100%' }} />
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} style={{ ...darkBtn, width: '100%', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating…' : 'Create Script'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scripts.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: '#3D5468' }}>No scripts yet.</p>}
        {scripts.map(s => (
          <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#F2F7FA' }}>{s.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '.04em', background: s.status === 'live' ? '#34D39922' : 'rgba(255,255,255,0.06)', color: s.status === 'live' ? '#34D399' : '#3D5468' }}>
                    {s.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(s.scenes ?? []).map(sc => (
                    <span key={sc.id} style={{ background: SCENE[sc.kind]?.color + '18', color: SCENE[sc.kind]?.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                      {SCENE[sc.kind]?.label} · {sc.duration_seconds}s
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => toggleStatus(s)} style={ghostBtn}>
                  {s.status === 'live' ? 'Set Draft' : '▶ Go Live'}
                </button>
                {s.status === 'live' && (
                  <button onClick={() => setAssignScript(s)} style={{ ...ghostBtn, color: '#4BC8F2', borderColor: 'rgba(75,200,242,0.3)' }}>
                    Push to Team →
                  </button>
                )}
                <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} style={{ ...ghostBtn, padding: '6px 10px' }}>
                  {expandedId === s.id ? '▲' : '▼'}
                </button>
                <button onClick={() => del(s.id)} style={{ ...ghostBtn, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 10px' }}>✕</button>
              </div>
            </div>
            {expandedId === s.id && s.scenes && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.scenes.map(sc => (
                  <div key={sc.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                    <span style={{ background: SCENE[sc.kind]?.color + '22', color: SCENE[sc.kind]?.color, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, marginRight: 8 }}>{sc.kind.toUpperCase()} · {sc.duration_seconds}s</span>
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: '#8BA3B5', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{sc.text || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No script text</span>}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {assignScript && <AssignModal script={assignScript} members={members} onClose={() => { setAssignScript(null); onRefresh() }} />}
    </div>
  )
}

// ── Videos View (Admin) ────────────────────────────────────────────────────

function VideosView({ videos, onRefresh }: { videos: SpliceVideo[]; onRefresh: () => void }) {
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

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1040, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F2F7FA', margin: '0 0 4px' }}>All Videos</h2>
        <p style={{ fontSize: 13, color: '#3D5468', margin: '0 0 16px' }}>Every video your team has recorded</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'ready', 'rendering', 'awaiting_scenes', 'uploading', 'error'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filter === f ? '#4BC8F2' : 'rgba(255,255,255,0.08)'}`, background: filter === f ? 'rgba(75,200,242,0.15)' : 'transparent', color: filter === f ? '#4BC8F2' : '#61798A' }}>
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 48, color: '#3D5468' }}>No videos found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(v => <VideoCard key={v.id} video={v} isAdmin onRender={() => triggerRender(v.id)} rendering={rendering === v.id} />)}
        </div>
      )}
    </div>
  )
}

// ── Team View (Admin) ──────────────────────────────────────────────────────

function TeamView({ members, allVideos }: { members: SpliceMember[]; allVideos: SpliceVideo[] }) {
  const videosPerUser: Record<string, number> = {}
  for (const v of allVideos) { videosPerUser[v.user_id] = (videosPerUser[v.user_id] ?? 0) + 1 }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F2F7FA', margin: '0 0 4px' }}>Team Activity</h2>
        <p style={{ fontSize: 13, color: '#3D5468', margin: 0 }}>See who's recording and how many videos each advisor has made</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.length === 0 && <p style={{ color: '#3D5468', textAlign: 'center', padding: 32 }}>No members found.</p>}
        {[...members].sort((a, b) => (videosPerUser[b.id] ?? 0) - (videosPerUser[a.id] ?? 0)).map(m => {
          const count = videosPerUser[m.id] ?? 0
          return (
            <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(75,200,242,0.15)', color: '#4BC8F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {m.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#F2F7FA' }}>{m.full_name}</div>
                <div style={{ fontSize: 12, color: '#3D5468' }}>{m.email}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: count > 0 ? '#4BC8F2' : '#1E3248' }}>{count}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#3D5468', letterSpacing: '.06em' }}>VIDEOS</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Assign Modal ───────────────────────────────────────────────────────────

function AssignModal({ script, members, onClose }: { script: SpliceScript; members: SpliceMember[]; onClose: () => void }) {
  const supabase = createClient()
  const [assigned, setAssigned] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('splice_script_assignments').select('user_id').eq('script_id', script.id)
      .then(({ data }) => setAssigned(new Set((data ?? []).map((r: any) => r.user_id))))
  }, [script.id, supabase])

  function toggle(id: string) {
    setAssigned(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function save() {
    setSaving(true)
    await supabase.from('splice_script_assignments').delete().eq('script_id', script.id)
    if (assigned.size > 0) {
      await supabase.from('splice_script_assignments').insert(Array.from(assigned).map(user_id => ({ script_id: script.id, user_id })))
    }
    setSaving(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0C1E2E', border: '1px solid rgba(75,200,242,0.2)', borderRadius: 16, width: 440, maxWidth: '94vw', maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#F2F7FA', marginBottom: 4 }}>Push Script to Team</div>
        <div style={{ fontSize: 13, color: '#3D5468', marginBottom: 20 }}>"{script.title}" — selected advisors will see it with a Record Now prompt.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {members.map(m => (
            <label key={m.id} onClick={() => toggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: `1px solid ${assigned.has(m.id) ? 'rgba(75,200,242,0.3)' : 'rgba(255,255,255,0.06)'}`, background: assigned.has(m.id) ? 'rgba(75,200,242,0.08)' : 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${assigned.has(m.id) ? '#4BC8F2' : '#3D5468'}`, background: assigned.has(m.id) ? '#4BC8F2' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {assigned.has(m.id) && <span style={{ color: '#060F18', fontSize: 12, fontWeight: 900 }}>✓</span>}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(75,200,242,0.15)', color: '#4BC8F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                {m.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: '#F2F7FA' }}>{m.full_name}</div>
                <div style={{ fontSize: 11.5, color: '#3D5468' }}>{m.email}</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#61798A' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px 0', background: '#4BC8F2', color: '#060F18', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : `Push to ${assigned.size} advisor${assigned.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Video Card ─────────────────────────────────────────────────────────────

function VideoCard({ video, isAdmin, onRender, rendering }: {
  video: SpliceVideo; isAdmin?: boolean; onRender?: () => void; rendering?: boolean
}) {
  const statusColor: Record<string, string> = {
    ready: '#34D399', rendering: '#A78BFA', awaiting_scenes: '#F59E0B', uploading: '#4BC8F2', error: '#EF4444',
  }
  const statusLabel: Record<string, string> = {
    ready: 'Ready', rendering: 'Rendering', awaiting_scenes: 'Awaiting Render', uploading: 'Uploading', error: 'Error',
  }
  const color = statusColor[video.status] ?? '#3D5468'

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ aspectRatio: '16/9', background: '#040D14', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {video.file_url
          ? <video src={video.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
          : <span style={{ fontSize: 30, opacity: 0.2 }}>🎥</span>}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F7FA', minWidth: 0 }}>
            {(video as any).splice_scripts?.title ?? 'My Script'}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: color + '22', color, whiteSpace: 'nowrap' }}>
            {statusLabel[video.status] ?? video.status}
          </span>
        </div>
        {isAdmin && (video as any).profiles?.full_name && (
          <div style={{ fontSize: 11.5, color: '#3D5468', marginBottom: 4 }}>{(video as any).profiles.full_name}</div>
        )}
        <div style={{ fontSize: 11, color: '#1E3248' }}>{new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        {isAdmin && video.status === 'awaiting_scenes' && (
          <button onClick={onRender} disabled={rendering} style={{ marginTop: 10, width: '100%', padding: '8px 0', background: '#A78BFA22', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: rendering ? 0.6 : 1 }}>
            {rendering ? 'Starting render…' : '▶ Trigger Render'}
          </button>
        )}
        {video.status === 'ready' && video.file_url && (
          <a href={video.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 10, padding: '8px 0', background: '#4BC8F222', color: '#4BC8F2', border: '1px solid rgba(75,200,242,0.3)', borderRadius: 7, textAlign: 'center', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Download MP4
          </a>
        )}
      </div>
    </div>
  )
}

// ── Section Label ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#3D5468', marginBottom: 12 }}>{children}</div>
}

// ── Record Modal ───────────────────────────────────────────────────────────

const DEFAULT_COMPOSE = [
  { kind: 'hook' as const, text: '', duration_seconds: 30 },
  { kind: 'body' as const, text: '', duration_seconds: 60 },
  { kind: 'cta'  as const, text: '', duration_seconds: 15 },
]

function RecordModal({ scripts, assignedScripts, profile, onClose }: {
  scripts: SpliceScript[]; assignedScripts: SpliceScript[]; profile: any; onClose: () => void
}) {
  const supabase = createClient()
  const [step, setStep] = useState<RecordStep>('select')
  const [selectedScript, setSelectedScript] = useState<SpliceScript | null>(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [clips, setClips] = useState<{ blob: Blob; url: string }[]>([])
  const [countdown, setCountdown] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [submitStatus, setSubmitStatus] = useState('')
  const [scrolling, setScrolling] = useState(true)
  const [composeTitle, setComposeTitle] = useState('')
  const [composeScenes, setComposeScenes] = useState(DEFAULT_COMPOSE.map(s => ({ ...s })))
  const [aiTopic, setAiTopic] = useState('')
  const [aiNotes, setAiNotes] = useState('')
  const [aiPlatform, setAiPlatform] = useState('Short-form social (Instagram Reels / TikTok)')
  const [aiCta, setAiCta] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiResult, setAiResult] = useState<any>(null)
  const [composeMode, setComposeMode] = useState<'ai' | 'manual'>('ai')
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const scrollAnimRef = useRef<number>(0)

  const scenes = selectedScript?.scenes ?? []
  const currentScene = scenes[sceneIdx]

  function clearTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  async function startCamera() {
    setError('')
    try {
      // On mobile this will use the front-facing camera; on desktop it uses the webcam
      const constraints: MediaStreamConstraints = {
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      setError('Camera access denied. On mobile: allow camera in your browser settings. On desktop: allow access in the browser permission bar.')
    }
  }

  function stopCamera() { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }

  async function handleSelectScript(s: SpliceScript) {
    setSelectedScript(s); setStep('ready'); setSceneIdx(0); setClips([])
    await startCamera()
  }

  async function handleStartCompose() {
    if (!composeTitle.trim()) return
    const slug = composeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    // Note: no author_id column — just title, slug, status
    const { data: script, error: sErr } = await supabase.from('splice_scripts').insert({ title: composeTitle.trim(), slug, status: 'draft' }).select().single()
    if (sErr || !script) { setError('Could not save script: ' + (sErr?.message ?? 'Unknown error')); return }
    await supabase.from('splice_scenes').insert(composeScenes.map((s, i) => ({ ...s, script_id: script.id, scene_order: i })))
    const { data: full } = await supabase.from('splice_scripts').select('*, splice_scenes(*)').eq('id', script.id).single()
    const built: SpliceScript = { ...(full as any), scenes: ((full as any)?.splice_scenes ?? []).sort((a: any, b: any) => a.scene_order - b.scene_order) }
    setSelectedScript(built); setSceneIdx(0); setClips([])
    setStep('ready')
    await startCamera()
  }

  function startCountdown() {
    setStep('countdown'); setCountdown(3); let c = 3
    timerRef.current = setInterval(() => { c--; setCountdown(c); if (c <= 0) { clearTimer(); startRecording() } }, 1000)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setClips(prev => { const n = [...prev]; n[sceneIdx] = { blob, url }; return n })
      setStep('review')
    }
    recorder.start(250)
    setStep('recording'); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    // Auto-scroll teleprompter
    if (promptRef.current && currentScene?.duration_seconds) {
      const el = promptRef.current; el.scrollTop = 0
      const total = el.scrollHeight - el.clientHeight
      if (total > 0 && scrolling) {
        const start = Date.now(); const dur = currentScene.duration_seconds * 1000
        const tick = () => { const pct = Math.min((Date.now() - start) / dur, 1); el.scrollTop = total * pct; if (pct < 1) scrollAnimRef.current = requestAnimationFrame(tick) }
        scrollAnimRef.current = requestAnimationFrame(tick)
      }
    }
  }

  function stopRecording() { clearTimer(); cancelAnimationFrame(scrollAnimRef.current); recorderRef.current?.stop() }
  function reRecord() { setStep('ready'); if (promptRef.current) promptRef.current.scrollTop = 0 }

  function nextScene() {
    if (sceneIdx < scenes.length - 1) { setSceneIdx(i => i + 1); setStep('ready'); if (promptRef.current) promptRef.current.scrollTop = 0 }
    else { setStep('uploading'); submitAll() }
  }

  async function submitAll() {
    if (!selectedScript || !profile) return
    setSubmitStatus('Creating video record…')
    try {
      const { data: video, error: vErr } = await supabase.from('splice_videos').insert({ script_id: selectedScript.id, user_id: profile.id, status: 'uploading' }).select().single()
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
    } catch (e: any) { setError('Upload failed: ' + e.message); setStep('ready') }
  }

  function handleClose() { clearTimer(); cancelAnimationFrame(scrollAnimRef.current); stopCamera(); clips.forEach(c => URL.revokeObjectURL(c.url)); onClose() }
  function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

  const isRecordStep = step === 'ready' || step === 'countdown' || step === 'recording' || step === 'review'

  return (
    <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0C1E2E', border: '1px solid rgba(75,200,242,0.2)', borderRadius: 18, width: '100%', maxWidth: step === 'recording' ? 900 : 660, maxHeight: '95vh', overflow: 'auto', margin: 12, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SpliceLogo />
            <span style={{ color: '#3D5468', fontSize: 14 }}>·</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#61798A' }}>
              {step === 'select' ? 'Choose a Script' : step === 'compose' ? 'Write Your Script' : step === 'done' ? 'Done!' : step === 'uploading' ? 'Submitting…' : `${SCENE[currentScene?.kind]?.label ?? ''} — Scene ${sceneIdx + 1} / ${scenes.length}`}
            </span>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#3D5468', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 22, flex: 1, overflow: 'auto' }}>
          {error && (
            <div style={{ background: '#7F1D1D44', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#FCA5A5', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* SELECT */}
          {step === 'select' && (
            <div>
              <button onClick={() => setStep('compose')} style={{ width: '100%', background: 'linear-gradient(135deg,rgba(75,200,242,0.15) 0%,rgba(124,58,237,0.15) 100%)', border: '1px solid rgba(75,200,242,0.3)', borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>✍️</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#F2F7FA', marginBottom: 3 }}>Write Your Own Script</div>
                  <div style={{ fontSize: 12, color: '#61798A' }}>Type your Hook, Body &amp; CTA — the teleprompter shows it on screen while you record</div>
                </div>
              </button>
              {scripts.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#3D5468', marginBottom: 10 }}>
                    {assignedScripts.length > 0 ? 'Assigned to You' : 'Published Scripts'}
                  </div>
                  {(assignedScripts.length > 0 ? assignedScripts : scripts).map(s => (
                    <button key={s.id} onClick={() => handleSelectScript(s)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#F2F7FA', marginBottom: 6 }}>{s.title}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(s.scenes ?? []).map(sc => (
                          <span key={sc.id} style={{ background: SCENE[sc.kind]?.color + '22', color: SCENE[sc.kind]?.color, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                            {SCENE[sc.kind]?.label} · {sc.duration_seconds}s
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* COMPOSE */}
          {step === 'compose' && (
            <div>
              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4 }}>
                {(['ai', 'manual'] as const).map(m => (
                  <button key={m} onClick={() => setComposeMode(m)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: composeMode === m ? '#4BC8F2' : 'transparent',
                    color: composeMode === m ? '#060F18' : '#61798A',
                  }}>
                    {m === 'ai' ? '✨ AI Script Writer' : '✍️ Write Manually'}
                  </button>
                ))}
              </div>

              {/* AI MODE */}
              {composeMode === 'ai' && (
                <div>
                  {!aiResult ? (
                    <div>
                      <div style={{ background: 'rgba(75,200,242,0.06)', border: '1px solid rgba(75,200,242,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#4BC8F2', marginBottom: 4, letterSpacing: '.04em' }}>POWERED BY FIVE LAWS MARKETING</div>
                        <div style={{ fontSize: 12.5, color: '#61798A', lineHeight: 1.5 }}>Tell the AI your topic and any key points. It will write a complete Hook, Body &amp; CTA script designed to earn attention and drive action.</div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={darkLabel}>Video Topic *</label>
                        <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} autoFocus
                          placeholder="e.g., Why waiting for lower rates is costing buyers money"
                          style={darkInput} />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={darkLabel}>Key Points / Notes (optional)</label>
                        <textarea value={aiNotes} onChange={e => setAiNotes(e.target.value)} rows={3}
                          placeholder="e.g., Target first-time buyers, mention we can close in 21 days, emphasize the rent vs own comparison"
                          style={{ ...darkInput, resize: 'vertical', lineHeight: 1.55 }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        <div>
                          <label style={darkLabel}>Platform</label>
                          <select value={aiPlatform} onChange={e => setAiPlatform(e.target.value)} style={{ ...darkInput, cursor: 'pointer' }}>
                            <option>Short-form social (Instagram Reels / TikTok)</option>
                            <option>YouTube Shorts</option>
                            <option>Standard YouTube Video</option>
                            <option>LinkedIn Video</option>
                            <option>Facebook Video</option>
                          </select>
                        </div>
                        <div>
                          <label style={darkLabel}>Call to Action (optional)</label>
                          <input value={aiCta} onChange={e => setAiCta(e.target.value)}
                            placeholder="e.g., DM me the word READY"
                            style={darkInput} />
                        </div>
                      </div>

                      {aiError && (
                        <div style={{ background: '#7F1D1D44', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#FCA5A5', fontSize: 13 }}>
                          {aiError}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#61798A' }}>Back</button>
                        <button
                          onClick={async () => {
                            if (!aiTopic.trim()) return
                            setAiLoading(true); setAiError('')
                            try {
                              const res = await fetch('/api/reels/ai-script', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ topic: aiTopic, notes: aiNotes, platform: aiPlatform, cta: aiCta }),
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error ?? 'AI request failed')
                              setAiResult(data)
                              // Pre-fill the compose fields
                              setComposeTitle(data.title ?? aiTopic)
                              setComposeScenes(data.scenes.map((s: any) => ({ kind: s.kind, text: s.text, duration_seconds: s.duration_seconds ?? (s.kind === 'hook' ? 25 : s.kind === 'body' ? 60 : 15) })))
                            } catch (e: any) { setAiError(e.message) }
                            setAiLoading(false)
                          }}
                          disabled={!aiTopic.trim() || aiLoading}
                          style={{ flex: 2, padding: '11px 0', background: aiLoading ? 'rgba(75,200,242,0.3)' : '#4BC8F2', color: '#060F18', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: aiTopic.trim() && !aiLoading ? 'pointer' : 'default', opacity: aiTopic.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {aiLoading ? (
                            <>
                              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(6,15,24,0.3)', borderTopColor: '#060F18', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                              Writing your script…
                            </>
                          ) : '✨ Generate Script'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* AI result — show scenes for review/edit */
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#F2F7FA' }}>{composeTitle}</div>
                        <button onClick={() => setAiResult(null)} style={{ ...ghostBtn, fontSize: 11 }}>← Re-generate</button>
                      </div>

                      {aiResult.audience && (
                        <div style={{ background: 'rgba(75,200,242,0.06)', border: '1px solid rgba(75,200,242,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#4BC8F2' }}>
                          🎯 Audience: {aiResult.audience}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                        {composeScenes.map((scene, idx) => (
                          <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${SCENE[scene.kind].color}33`, borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ background: SCENE[scene.kind].color + '22', color: SCENE[scene.kind].color, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 5, letterSpacing: '.06em' }}>{scene.kind.toUpperCase()}</span>
                                {aiResult.scenes?.[idx]?.notes && <span style={{ fontSize: 11, color: '#3D5468', fontStyle: 'italic' }}>{aiResult.scenes[idx].notes}</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <input type="number" value={scene.duration_seconds} min={5} max={120}
                                  onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], duration_seconds: parseInt(e.target.value) }; setComposeScenes(s) }}
                                  style={{ ...darkInput, width: 60, padding: '4px 8px' }} />
                                <span style={{ fontSize: 12, color: '#3D5468' }}>s</span>
                              </div>
                            </div>
                            <textarea value={scene.text} rows={4}
                              onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], text: e.target.value }; setComposeScenes(s) }}
                              style={{ ...darkInput, resize: 'vertical', width: '100%', fontSize: 13.5, lineHeight: 1.65 }} />
                          </div>
                        ))}
                      </div>

                      {aiResult.onscreen_text?.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#3D5468', marginBottom: 6, letterSpacing: '.06em' }}>SUGGESTED ON-SCREEN TEXT</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {aiResult.onscreen_text.map((t: string, i: number) => (
                              <span key={i} style={{ background: 'rgba(75,200,242,0.12)', color: '#4BC8F2', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button onClick={handleStartCompose} style={{ width: '100%', padding: '12px 0', background: '#4BC8F2', color: '#060F18', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                        Looks Good — Start Recording →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL MODE */}
              {composeMode === 'manual' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={darkLabel}>Video Title</label>
                    <input value={composeTitle} onChange={e => setComposeTitle(e.target.value)} placeholder="e.g., Why Now Is the Time to Refinance" style={darkInput} autoFocus />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {composeScenes.map((scene, idx) => (
                      <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${SCENE[scene.kind].color}33`, borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: SCENE[scene.kind].color + '22', color: SCENE[scene.kind].color, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 5, letterSpacing: '.06em' }}>{scene.kind.toUpperCase()}</span>
                            <span style={{ fontSize: 11.5, color: '#3D5468' }}>{SCENE[scene.kind].tip}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <input type="number" value={scene.duration_seconds} min={5} max={120}
                              onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], duration_seconds: parseInt(e.target.value) }; setComposeScenes(s) }}
                              style={{ ...darkInput, width: 60, padding: '4px 8px' }} />
                            <span style={{ fontSize: 12, color: '#3D5468' }}>s</span>
                          </div>
                        </div>
                        <textarea value={scene.text} rows={3} placeholder={SCENE[scene.kind].placeholder}
                          onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], text: e.target.value }; setComposeScenes(s) }}
                          style={{ ...darkInput, resize: 'vertical', width: '100%', fontSize: 13.5, lineHeight: 1.65 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#61798A' }}>Back</button>
                    <button onClick={handleStartCompose} disabled={!composeTitle.trim()} style={{ flex: 2, padding: '11px 0', background: '#4BC8F2', color: '#060F18', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: composeTitle.trim() ? 'pointer' : 'default', opacity: composeTitle.trim() ? 1 : 0.5 }}>
                      Start Recording →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RECORD STEPS */}
          {isRecordStep && (
            <div>
              {/* Scene progress bar */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
                {scenes.map((s, i) => (
                  <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: i < sceneIdx ? '#4BC8F2' : i === sceneIdx ? SCENE[s.kind]?.color : 'rgba(255,255,255,0.08)' }} />
                ))}
              </div>

              {step === 'review' && clips[sceneIdx] ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F2F7FA', marginBottom: 10 }}>Review your {SCENE[currentScene?.kind]?.label}</div>
                  <video src={clips[sceneIdx].url} controls style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: 400 }} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button onClick={reRecord} style={{ flex: 1, padding: '11px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#61798A' }}>Re-record</button>
                    <button onClick={nextScene} style={{ flex: 2, padding: '11px 0', background: SCENE[currentScene?.kind]?.color ?? '#4BC8F2', color: '#060F18', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                      {sceneIdx < scenes.length - 1 ? `Next: ${SCENE[scenes[sceneIdx + 1]?.kind]?.label} →` : '✓ Submit Video'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Side-by-side: teleprompter + camera (stacked on mobile) */}
                  <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row', marginBottom: 14 }}>

                    {/* Teleprompter */}
                    {currentScene?.text && (
                      <div style={{ flex: 1, background: '#000', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: isMobile ? 160 : 300 }}>
                        <div style={{ padding: '8px 14px', background: '#0A0A0A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: SCENE[currentScene.kind]?.color, letterSpacing: '.08em' }}>
                            {currentScene.kind.toUpperCase()} · TELEPROMPTER
                          </span>
                          <button onClick={() => setScrolling(s => !s)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 10, color: scrolling ? '#4BC8F2' : '#3D5468', cursor: 'pointer', fontWeight: 600 }}>
                            {scrolling ? '⬆ Auto' : '✋ Manual'}
                          </button>
                        </div>
                        <div ref={promptRef} style={{ flex: 1, overflowY: step === 'recording' && scrolling ? 'hidden' : 'auto', padding: '20px 22px 48px' }}>
                          <p style={{ fontSize: isMobile ? 16 : 20, lineHeight: 1.8, color: '#FFFFFF', fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>
                            {currentScene.text}
                          </p>
                        </div>
                        <div style={{ height: 48, background: 'linear-gradient(transparent,#000)', marginTop: -48, pointerEvents: 'none', flexShrink: 0 }} />
                      </div>
                    )}

                    {/* Camera */}
                    <div style={{ flex: currentScene?.text ? '0 0 50%' : 1, position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', minHeight: isMobile ? 220 : 300 }}>
                      <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />

                      {step === 'countdown' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
                          <div style={{ fontSize: 100, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{countdown}</div>
                        </div>
                      )}
                      {step === 'recording' && (
                        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.75)', borderRadius: 7, padding: '5px 11px' }}>
                          <div style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%', animation: 'blink 1s ease-in-out infinite' }} />
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</span>
                          {currentScene?.duration_seconds && <span style={{ color: '#61798A', fontSize: 11 }}>/ {fmt(currentScene.duration_seconds)}</span>}
                        </div>
                      )}
                      {step === 'ready' && (
                        <div style={{ position: 'absolute', bottom: 10, left: 10, background: SCENE[currentScene?.kind]?.color, color: '#060F18', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 5, letterSpacing: '.06em' }}>
                          {currentScene?.kind?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {!currentScene?.text && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#3D5468', fontStyle: 'italic' }}>
                      No script text for this scene — speak from your knowledge!
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {step === 'ready' && (
                      <button onClick={startCountdown} style={{ padding: '13px 40px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%', display: 'inline-block' }} /> Start Recording
                      </button>
                    )}
                    {(step === 'countdown' || step === 'recording') && (
                      <button onClick={stopRecording} disabled={step === 'countdown'} style={{ padding: '13px 40px', background: step === 'countdown' ? 'rgba(255,255,255,0.06)' : '#1C3248', color: '#F2F7FA', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: step === 'countdown' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2, display: 'inline-block' }} />
                        {step === 'countdown' ? 'Get ready…' : 'Stop Recording'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'uploading' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⬆️</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#F2F7FA', marginBottom: 8 }}>Uploading your clips…</div>
              <div style={{ fontSize: 13, color: '#3D5468' }}>{submitStatus}</div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#4BC8F2', marginBottom: 8 }}>Video Submitted!</div>
              <div style={{ fontSize: 14, color: '#61798A', marginBottom: 28 }}>Your clips are uploaded. An admin will stitch them into a final MP4 with your contact info end card.</div>
              <button onClick={handleClose} style={{ padding: '12px 32px', background: '#4BC8F2', color: '#060F18', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Done</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Dark style tokens ──────────────────────────────────────────────────────

const darkInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  fontSize: 13.5, color: '#F2F7FA', background: 'rgba(0,0,0,0.3)',
}
const darkLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#61798A', marginBottom: 6, letterSpacing: '.03em',
}
const darkBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', background: 'rgba(75,200,242,0.12)', color: '#4BC8F2',
  border: '1px solid rgba(75,200,242,0.25)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
const ghostBtn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, fontSize: 12,
  fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#61798A',
}
