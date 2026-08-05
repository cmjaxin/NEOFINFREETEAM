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
type RecordStep = 'select' | 'compose' | 'scene' | 'uploading' | 'done'
type SceneSubStep = 'ready' | 'countdown' | 'recording' | 'review-clip'

const SCENE: Record<string, { label: string; color: string; tip: string; placeholder: string }> = {
  hook: { label: 'Hook', color: '#2DAEFF', tip: 'Grab attention in the first 5–10 seconds', placeholder: '"Did you know most homeowners are leaving $400/mo on the table with their current rate?"' },
  body: { label: 'Body', color: '#7A33F5', tip: 'Deliver your main message clearly', placeholder: '"Here\'s how a simple refi breakeven analysis works in 3 steps..."' },
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
  const [recordInitialScript, setRecordInitialScript] = useState<SpliceScript | null>(null)

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
    { id: 'home',    icon: '·',  label: 'Home' },
    { id: 'scripts', icon: '·', label: 'Scripts', adminOnly: true },
    { id: 'videos',  icon: '·', label: 'Videos',  adminOnly: true },
    { id: 'team',    icon: '·', label: 'Team',    adminOnly: true },
  ]
  const visibleNav = navItems.filter(n => !n.adminOnly || isAdmin)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: '#000a15', fontFamily: "'Montserrat', system-ui, sans-serif" }}>

      <style>{`
        @media (min-width: 640px) {
          .splice-topbar { display: none !important; }
          .splice-bottomnav { display: none !important; }
          .splice-sidebar { display: flex !important; }
        }
        @media (max-width: 639px) {
          .splice-sidebar { display: none !important; }
          .splice-modal {
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: 100vw !important;
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
          }
          .splice-main-pad { padding: 16px !important; }
          .splice-h1 { font-size: 22px !important; }
          .splice-card-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Mobile top bar ───────────────────────────────── */}
      <div className="splice-topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#05070b', borderBottom: '1px solid rgba(45,174,255,0.1)', flexShrink: 0 }}>
        <SpliceLogo />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setTab('home'); setShowRecord(true) }} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#2DAEFF,#7A33F5)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, background: '#fff', borderRadius: '50%', display: 'inline-block' }} />
          RECORD
        </button>
        <button onClick={() => setView('dashboard')} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          HQ
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

      {/* ── Left sidebar (desktop only) ───────────────────── */}
      <aside className="splice-sidebar" style={{ width: 200, flexShrink: 0, background: '#05070b', borderRight: '1px solid rgba(45,174,255,0.12)', display: 'none', flexDirection: 'column', padding: '0 0 20px' }}>

        {/* Logo */}
        <div style={{ padding: '20px 20px 0' }}>
          <SpliceLogo />
          {isAdmin && (
            <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#2DAEFF', textTransform: 'uppercase', opacity: 0.7 }}>
              Admin
            </div>
          )}
        </div>

        {/* Record CTA */}
        <div style={{ padding: '20px 16px 4px' }}>
          <button onClick={() => { setTab('home'); setShowRecord(true) }} style={{
            width: '100%', padding: '11px 0',
            background: 'linear-gradient(135deg, #2DAEFF 0%, #7A33F5 100%)',
            color: '#fff', border: 'none',
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
              background: tab === n.id ? 'rgba(45,174,255,0.12)' : 'transparent',
              color: tab === n.id ? '#2DAEFF' : '#999',
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
            background: 'transparent', color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Back to Team HQ
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#000a15', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 14 }}>
            Loading Splice…
          </div>
        ) : tab === 'home' ? (
          <HomeView
            myVideos={myVideos} assignedScripts={assignedScripts} liveScripts={liveScripts}
            isAdmin={isAdmin} allVideos={allVideos}
            onRecord={(s?: SpliceScript) => { setRecordInitialScript(s ?? null); setShowRecord(true) }}
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

      </div>{/* end desktop flex row */}

      {/* ── Mobile bottom nav ────────────────────────────── */}
      <nav className="splice-bottomnav" style={{ display: 'flex', background: '#05070b', borderTop: '1px solid rgba(45,174,255,0.1)', flexShrink: 0 }}>
        {visibleNav.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            flex: 1, padding: '10px 4px 8px', border: 'none', cursor: 'pointer', background: 'transparent',
            color: tab === n.id ? '#2DAEFF' : '#666',
            fontSize: 10, fontWeight: tab === n.id ? 700 : 500, letterSpacing: '.04em',
            borderTop: `2px solid ${tab === n.id ? '#2DAEFF' : 'transparent'}`,
          }}>
            {n.label}
          </button>
        ))}
      </nav>

      {/* ── Record modal ─────────────────────────────────── */}
      {showRecord && (
        <RecordModal
          scripts={liveScripts} assignedScripts={assignedScripts} profile={profile}
          initialScript={recordInitialScript ?? undefined}
          onClose={() => { setShowRecord(false); setRecordInitialScript(null); load() }}
        />
      )}
    </div>
  )
}

// ── Splice Logo ────────────────────────────────────────────────────────────

function SpliceLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="https://mettlehq.com/wp-content/uploads/2026/08/SPLICE.png" alt="Splice" style={{ height: 48, width: 'auto', display: 'block' }} />
  )
}

// ── Home View ──────────────────────────────────────────────────────────────

function HomeView({ myVideos, assignedScripts, liveScripts, isAdmin, allVideos, onRecord, profile }: {
  myVideos: SpliceVideo[]; assignedScripts: SpliceScript[]; liveScripts: SpliceScript[]
  isAdmin: boolean; allVideos: SpliceVideo[]; onRecord: (s?: SpliceScript) => void; profile: any
}) {
  const readyCount = allVideos.filter(v => v.status === 'ready').length
  const renderingCount = allVideos.filter(v => v.status === 'rendering').length
  // Live scripts not assigned to this user (shown as browsable marketing scripts)
  const assignedIds = new Set(assignedScripts.map(s => s.id))
  const marketingScripts = liveScripts.filter(s => !assignedIds.has(s.id))

  return (
    <div className="splice-main-pad" style={{ padding: '28px 32px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="splice-h1" style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-.01em' }}>
          Hey {profile?.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p style={{ fontSize: 14, color: '#999', margin: 0 }}>
          {assignedScripts.length > 0
            ? `You have ${assignedScripts.length} script${assignedScripts.length > 1 ? 's' : ''} waiting for you.`
            : 'Record a video using an assigned script or a marketing script below.'}
        </p>
      </div>

      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Videos', value: allVideos.length, color: '#2DAEFF' },
            { label: 'Ready', value: readyCount, color: '#34D399' },
            { label: 'Rendering', value: renderingCount, color: '#7A33F5' },
            { label: 'Live Scripts', value: liveScripts.length, color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {assignedScripts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Your Assigned Scripts</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assignedScripts.map(s => (
              <div key={s.id} style={{ background: 'rgba(45,174,255,0.06)', border: '1px solid rgba(45,174,255,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(s.scenes ?? []).map(sc => (
                      <span key={sc.id} style={{ background: SCENE[sc.kind]?.color + '22', color: SCENE[sc.kind]?.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                        {SCENE[sc.kind]?.label} · {sc.duration_seconds}s
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => onRecord(s)} style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #2DAEFF, #7A33F5)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Film Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {marketingScripts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Marketing Scripts</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {marketingScripts.map(s => (
              <div key={s.id} style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(s.scenes ?? []).map(sc => (
                      <span key={sc.id} style={{ background: SCENE[sc.kind]?.color + '22', color: SCENE[sc.kind]?.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                        {SCENE[sc.kind]?.label} · {sc.duration_seconds}s
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => onRecord(s)} style={{ padding: '9px 20px', background: 'rgba(45,174,255,0.15)', color: '#2DAEFF', border: '1px solid rgba(45,174,255,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Film Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>My Videos ({myVideos.length})</SectionLabel>
        {myVideos.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 13, color: '#FCA5A5', lineHeight: 1.5 }}>
              <strong>Videos are deleted after 24 hours.</strong> Save your finished video to your phone or computer, then send it to Colin before it expires.
            </p>
          </div>
        )}
        {myVideos.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>No videos yet</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 22 }}>Choose a script above to record your first Splice video</div>
            <button onClick={() => onRecord()} style={{ padding: '11px 28px', background: 'linear-gradient(135deg, #2DAEFF, #7A33F5)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              Record a Video
            </button>
          </div>
        ) : (
          <div className="splice-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {myVideos.map(v => <VideoCard key={v.id} video={v} onRefresh={() => onRecord()} />)}
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
    { kind: 'hook' as const, text: '', duration_seconds: 20 },
    { kind: 'body' as const, text: '', duration_seconds: 25 },
    { kind: 'body' as const, text: '', duration_seconds: 25 },
    { kind: 'body' as const, text: '', duration_seconds: 25 },
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
    setForm({ title: '', scenes: [{ kind: 'hook', text: '', duration_seconds: 20 }, { kind: 'body', text: '', duration_seconds: 25 }, { kind: 'body', text: '', duration_seconds: 25 }, { kind: 'body', text: '', duration_seconds: 25 }, { kind: 'cta', text: '', duration_seconds: 15 }] })
    setShowForm(false)
    onRefresh()
  }

  async function toggleStatus(s: SpliceScript) {
    await supabase.from('splice_scripts').update({ status: s.status === 'draft' ? 'live' : 'draft' }).eq('id', s.id)
    onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Delete this script? This cannot be undone.')) return
    const res = await fetch('/api/reels/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'script', id }) })
    if (!res.ok) { alert('Delete failed — please try again'); return }
    onRefresh()
  }

  return (
    <div className="splice-main-pad" style={{ padding: '28px 32px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="splice-h1" style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Scripts</h2>
          <p style={{ fontSize: 13, color: '#999', margin: 0 }}>Create and publish scripts for your team to record</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={darkBtn}>{showForm ? 'Cancel' : '+ New Script'}</button>
      </div>

      {showForm && (
        <form onSubmit={create} style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 14, padding: 24, marginBottom: 24 }}>
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
                      {scene.kind === 'body' ? `BODY ${form.scenes.slice(0, idx).filter(s => s.kind === 'body').length + 1}` : scene.kind.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11.5, color: '#666' }}>{SCENE[scene.kind].tip}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" value={scene.duration_seconds} min={5} max={120}
                      onChange={e => updateScene(idx, 'duration_seconds', parseInt(e.target.value))}
                      style={{ ...darkInput, width: 64, padding: '5px 8px' }} />
                    <span style={{ fontSize: 12, color: '#666' }}>s</span>
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
        {scripts.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: '#666' }}>No scripts yet.</p>}
        {scripts.map(s => {
          let bodyCount = 0
          return (
            <div key={s.id} style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{s.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '.04em', background: s.status === 'live' ? '#2DAEFF22' : 'rgba(255,255,255,0.06)', color: s.status === 'live' ? '#2DAEFF' : '#666' }}>
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(s.scenes ?? []).map(sc => {
                      const label = sc.kind === 'body' ? `Body ${++bodyCount}` : SCENE[sc.kind]?.label
                      return (
                        <span key={sc.id} style={{ background: SCENE[sc.kind]?.color + '18', color: SCENE[sc.kind]?.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                          {label} · {sc.duration_seconds}s
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => toggleStatus(s)} style={ghostBtn}>
                    {s.status === 'live' ? 'Set Draft' : 'Go Live'}
                  </button>
                  {s.status === 'live' && (
                    <button onClick={() => setAssignScript(s)} style={{ ...ghostBtn, color: '#2DAEFF', borderColor: 'rgba(45,174,255,0.3)' }}>
                      Push to Team
                    </button>
                  )}
                  <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} style={{ ...ghostBtn, padding: '6px 10px' }}>
                    {expandedId === s.id ? '▲' : '▼'}
                  </button>
                  <button onClick={() => del(s.id)} style={{ ...ghostBtn, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 10px' }}>✕</button>
                </div>
              </div>
              {expandedId === s.id && s.scenes && (
                <div style={{ borderTop: '1px solid #2d3e4f', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {s.scenes.map((sc, sci) => {
                    const scBodyIdx = s.scenes!.slice(0, sci).filter(x => x.kind === 'body').length + 1
                    const lbl = sc.kind === 'body' ? `BODY ${scBodyIdx}` : sc.kind.toUpperCase()
                    return (
                      <div key={sc.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                        <span style={{ background: SCENE[sc.kind]?.color + '22', color: SCENE[sc.kind]?.color, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, marginRight: 8 }}>{lbl} · {sc.duration_seconds}s</span>
                        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#aaa', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{sc.text || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No script text</span>}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {assignScript && <AssignModal script={assignScript} members={members} onClose={() => { setAssignScript(null); onRefresh() }} />}
    </div>
  )
}

// ── Videos View (Admin) ────────────────────────────────────────────────────

function VideosView({ videos, onRefresh }: { videos: SpliceVideo[]; onRefresh: () => void }) {
  const supabase = createClient()
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

  async function deleteVideo(videoId: string) {
    if (!confirm('Delete this video and all its clips?')) return
    const res = await fetch('/api/reels/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'video', id: videoId }) })
    if (!res.ok) { alert('Delete failed — please try again'); return }
    onRefresh()
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1040, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>All Videos</h2>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 16px' }}>Every video your team has recorded</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'ready', 'rendering', 'awaiting_scenes', 'uploading', 'error'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filter === f ? '#2DAEFF' : '#2d3e4f'}`, background: filter === f ? 'rgba(45,174,255,0.15)' : 'transparent', color: filter === f ? '#2DAEFF' : '#999' }}>
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 48, color: '#666' }}>No videos found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(v => <VideoCard key={v.id} video={v} isAdmin onRender={() => triggerRender(v.id)} rendering={rendering === v.id} onDelete={() => deleteVideo(v.id)} />)}
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
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Team Activity</h2>
        <p style={{ fontSize: 13, color: '#999', margin: 0 }}>See who is recording and how many videos each advisor has made</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.length === 0 && <p style={{ color: '#666', textAlign: 'center', padding: 32 }}>No members found.</p>}
        {[...members].sort((a, b) => (videosPerUser[b.id] ?? 0) - (videosPerUser[a.id] ?? 0)).map(m => {
          const count = videosPerUser[m.id] ?? 0
          return (
            <div key={m.id} style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 11, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(45,174,255,0.15)', color: '#2DAEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {m.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.full_name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{m.email}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: count > 0 ? '#2DAEFF' : '#2d3e4f' }}>{count}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#666', letterSpacing: '.06em' }}>VIDEOS</div>
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 16, width: 440, maxWidth: '94vw', maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#fff', marginBottom: 4 }}>Push Script to Team</div>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>"{script.title}" — selected advisors will see it with a Record Now prompt.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {members.map(m => (
            <label key={m.id} onClick={() => toggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: `1px solid ${assigned.has(m.id) ? 'rgba(45,174,255,0.3)' : '#2d3e4f'}`, background: assigned.has(m.id) ? 'rgba(45,174,255,0.08)' : 'transparent', cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${assigned.has(m.id) ? '#2DAEFF' : '#666'}`, background: assigned.has(m.id) ? '#2DAEFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {assigned.has(m.id) && <span style={{ color: '#000a15', fontSize: 12, fontWeight: 900 }}>✓</span>}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(45,174,255,0.15)', color: '#2DAEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                {m.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: '#fff' }}>{m.full_name}</div>
                <div style={{ fontSize: 11.5, color: '#666' }}>{m.email}</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #2d3e4f', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#999' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px 0', background: 'linear-gradient(135deg, #2DAEFF, #7A33F5)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : `Push to ${assigned.size} advisor${assigned.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Video Card ─────────────────────────────────────────────────────────────

function VideoCard({ video, isAdmin, onRender, rendering, onDelete, onRefresh }: {
  video: SpliceVideo; isAdmin?: boolean; onRender?: () => void; rendering?: boolean; onDelete?: () => void; onRefresh?: () => void
}) {
  const supabase = createClient()
  const [checking, setChecking] = useState(false)

  const statusColor: Record<string, string> = {
    ready: '#34D399', rendering: '#7A33F5', awaiting_scenes: '#F59E0B', uploading: '#2DAEFF', error: '#EF4444',
  }
  const statusLabel: Record<string, string> = {
    ready: 'Ready', rendering: 'Rendering…', awaiting_scenes: 'Awaiting Render', uploading: 'Uploading', error: 'Error',
  }
  const color = statusColor[video.status] ?? '#666'

  async function checkStatus() {
    setChecking(true)
    try {
      const res = await fetch('/api/reels/render-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      })
      const data = await res.json()
      if (data.status === 'ready' || data.status === 'error') {
        if (onRefresh) onRefresh()
      }
    } catch {}
    setChecking(false)
  }

  async function deleteThis() {
    if (!confirm('Delete this video?')) return
    const res = await fetch('/api/reels/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'video', id: video.id }) })
    if (!res.ok) { alert('Delete failed — please try again'); return }
    if (onDelete) onDelete()
    if (onRefresh) onRefresh()
  }

  return (
    <div style={{ background: '#1a2633', border: '1px solid #2d3e4f', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ aspectRatio: '9/16', background: '#0d1220', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', maxHeight: 280 }}>
        {video.file_url
          ? <video src={video.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
          : (
            <div style={{ textAlign: 'center', color: '#2d3e4f' }}>
              <div style={{ fontSize: 32, marginBottom: 6, opacity: 0.4 }}>▶</div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{statusLabel[video.status] ?? video.status}</div>
            </div>
          )}
        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: color + '33', color, backdropFilter: 'blur(4px)' }}>
          {statusLabel[video.status] ?? video.status}
        </span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
          {(video as any).splice_scripts?.title ?? 'My Script'}
        </div>
        {isAdmin && (video as any).profiles?.full_name && (
          <div style={{ fontSize: 11.5, color: '#999', marginBottom: 2 }}>{(video as any).profiles.full_name}</div>
        )}
        <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>{new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>

        {isAdmin && video.status === 'awaiting_scenes' && (
          <button onClick={onRender} disabled={rendering} style={{ width: '100%', padding: '8px 0', background: 'rgba(122,51,245,0.15)', color: '#7A33F5', border: '1px solid rgba(122,51,245,0.3)', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: rendering ? 0.6 : 1, marginBottom: 6 }}>
            {rendering ? 'Starting…' : 'Trigger Render'}
          </button>
        )}

        {video.status === 'rendering' && (
          <button onClick={checkStatus} disabled={checking} style={{ width: '100%', padding: '8px 0', background: 'rgba(122,51,245,0.1)', color: '#7A33F5', border: '1px solid rgba(122,51,245,0.2)', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: checking ? 0.6 : 1, marginBottom: 6 }}>
            {checking ? 'Checking…' : 'Check Status'}
          </button>
        )}

        {video.status === 'ready' && video.file_url && (
          <a href={video.file_url} download target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '9px 0', background: 'linear-gradient(135deg,rgba(45,174,255,0.15),rgba(122,51,245,0.15))', color: '#2DAEFF', border: '1px solid rgba(45,174,255,0.3)', borderRadius: 7, textAlign: 'center', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 6 }}>
            Download to Device
          </a>
        )}

        <button onClick={deleteThis} style={{ width: '100%', padding: '7px 0', background: 'transparent', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Section Label ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#666', marginBottom: 12 }}>{children}</div>
}

// ── Record Modal ───────────────────────────────────────────────────────────

const DEFAULT_COMPOSE = [
  { kind: 'hook' as const, text: '', duration_seconds: 20 },
  { kind: 'body' as const, text: '', duration_seconds: 25 },
  { kind: 'body' as const, text: '', duration_seconds: 25 },
  { kind: 'body' as const, text: '', duration_seconds: 25 },
  { kind: 'cta'  as const, text: '', duration_seconds: 15 },
]

function RecordModal({ scripts, assignedScripts, profile, onClose, initialScript }: {
  scripts: SpliceScript[]; assignedScripts: SpliceScript[]; profile: any; onClose: () => void; initialScript?: SpliceScript
}) {
  const supabase = createClient()
  const [step, setStep] = useState<RecordStep>('select')
  const [sceneSubStep, setSceneSubStep] = useState<SceneSubStep>('ready')
  const [selectedScript, setSelectedScript] = useState<SpliceScript | null>(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  // allClips[sceneIdx] = array of clips recorded for that scene (includes per-clip duration)
  const [allClips, setAllClips] = useState<{ blob: Blob; url: string; duration: number }[][]>([])
  const [pendingClip, setPendingClip] = useState<{ blob: Blob; url: string; duration: number } | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [submitStatus, setSubmitStatus] = useState('')
  const [scrollSpeed, setScrollSpeed] = useState(1)
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
  const textRef = useRef<HTMLParagraphElement>(null)
  const promptContainerRef = useRef<HTMLDivElement>(null)
  const scrollAnimRef = useRef<number>(0)
  const scrollOffsetRef = useRef<number>(0)

  const scenes = selectedScript?.scenes ?? []
  const currentScene = scenes[sceneIdx]
  const currentClips = allClips[sceneIdx] ?? []

  function clearTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  // Auto-select and start filming if an initialScript was passed in
  useEffect(() => {
    if (initialScript) {
      handleSelectScript(initialScript)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-attach camera stream when returning to a scene sub-step that needs live video
  useEffect(() => {
    if (step === 'scene' && sceneSubStep !== 'review-clip' && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [step, sceneSubStep])

  // Set teleprompter start position when scene is ready/visible
  useEffect(() => {
    if (step !== 'scene' || sceneSubStep === 'review-clip') return
    const id = setTimeout(() => setTeleprompterStart(), 80)
    return () => clearTimeout(id)
  }, [step, sceneIdx, sceneSubStep])

  // Start scroll AFTER sceneSubStep becomes 'recording' so the teleprompter is mounted
  useEffect(() => {
    if (step !== 'scene' || sceneSubStep !== 'recording') return
    // Small delay to let React render the teleprompter before measuring it
    const id = setTimeout(() => {
      if (currentScene?.duration_seconds) startScrollAnimation(currentScene.duration_seconds)
    }, 50)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneSubStep])

  async function startCamera() {
    setError('')
    try {
      const constraints: MediaStreamConstraints = {
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user', frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
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
    // Always fetch full script with scenes so we have scene text + duration
    const { data } = await supabase
      .from('splice_scripts')
      .select('*, splice_scenes(*)')
      .eq('id', s.id)
      .single()
    const full: SpliceScript = data
      ? { ...data, scenes: ((data as any).splice_scenes ?? []).sort((a: any, b: any) => a.scene_order - b.scene_order) }
      : s
    setSelectedScript(full); setStep('scene'); setSceneSubStep('ready'); setSceneIdx(0); setAllClips([])
    await startCamera()
  }

  async function handleStartCompose() {
    if (!composeTitle.trim()) return
    const slug = composeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const { data: script, error: sErr } = await supabase.from('splice_scripts').insert({ title: composeTitle.trim(), slug, status: 'draft' }).select().single()
    if (sErr || !script) { setError('Could not save script: ' + (sErr?.message ?? 'Unknown error')); return }
    await supabase.from('splice_scenes').insert(composeScenes.map((s, i) => ({ ...s, script_id: script.id, scene_order: i })))
    const { data: full } = await supabase.from('splice_scripts').select('*, splice_scenes(*)').eq('id', script.id).single()
    const built: SpliceScript = { ...(full as any), scenes: ((full as any)?.splice_scenes ?? []).sort((a: any, b: any) => a.scene_order - b.scene_order) }
    setSelectedScript(built); setSceneIdx(0); setAllClips([])
    setStep('scene'); setSceneSubStep('ready')
    await startCamera()
  }

  function setTeleprompterStart() {
    if (!textRef.current || !promptContainerRef.current) return
    const startY = promptContainerRef.current.clientHeight * 0.42
    textRef.current.style.transform = `translateY(${startY}px)`
  }

  function startScrollAnimation(durationSeconds: number) {
    cancelAnimationFrame(scrollAnimRef.current)
    if (!textRef.current || !promptContainerRef.current) return
    const screenH = promptContainerRef.current.clientHeight
    const textH = textRef.current.scrollHeight
    const startY = screenH * 0.42
    const endY = -(textH + 40)
    const totalScroll = startY - endY
    textRef.current.style.transform = `translateY(${startY}px)`
    const totalMs = (durationSeconds / scrollSpeed) * 1000
    const startTime = performance.now()
    const tick = (now: number) => {
      const pct = Math.min((now - startTime) / totalMs, 1)
      if (textRef.current) textRef.current.style.transform = `translateY(${startY - pct * totalScroll}px)`
      if (pct < 1) scrollAnimRef.current = requestAnimationFrame(tick)
    }
    scrollAnimRef.current = requestAnimationFrame(tick)
  }

  function resetTeleprompter() {
    cancelAnimationFrame(scrollAnimRef.current)
    scrollOffsetRef.current = 0
    requestAnimationFrame(() => setTeleprompterStart())
  }

  function startCountdown() {
    setSceneSubStep('countdown'); setCountdown(3); let c = 3
    timerRef.current = setInterval(() => { c--; setCountdown(c); if (c <= 0) { clearTimer(); startRecording() } }, 1000)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
    const recorder = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 })
    recorderRef.current = recorder
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      // capture elapsed at stop time via ref so the closure sees the current value
      setElapsed(e => { setPendingClip({ blob, url, duration: e }); return e })
      setSceneSubStep('review-clip')
      if (videoRef.current) videoRef.current.srcObject = null
    }
    recorder.start(250)
    setSceneSubStep('recording'); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    // scroll is started by useEffect watching sceneSubStep === 'recording'
    // so the teleprompter has time to mount before we measure it
  }

  function stopRecording() { clearTimer(); cancelAnimationFrame(scrollAnimRef.current); recorderRef.current?.stop() }

  function keepClip() {
    if (!pendingClip) return
    const clip = pendingClip
    setAllClips(prev => {
      const n = [...prev]
      n[sceneIdx] = [...(n[sceneIdx] ?? []), clip]
      return n
    })
    setPendingClip(null)
    resetTeleprompter()
    // Re-attach camera
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
    setSceneSubStep('ready')
  }

  function discardClip() {
    if (pendingClip) { URL.revokeObjectURL(pendingClip.url); setPendingClip(null) }
    resetTeleprompter()
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
    setSceneSubStep('ready')
  }

  function advanceScene() {
    resetTeleprompter()
    if (sceneIdx < scenes.length - 1) {
      setSceneIdx(i => i + 1)
      setSceneSubStep('ready')
    } else {
      setStep('uploading')
      submitAll()
    }
  }

  async function submitAll() {
    if (!selectedScript || !profile) return
    setSubmitStatus('Preparing storage…')
    try {
      // Ensure bucket exists (server-side, bypasses RLS)
      await fetch('/api/reels/ensure-bucket', { method: 'POST' })

      // Create video record server-side (bypasses RLS)
      setSubmitStatus('Creating video record…')
      const startRes = await fetch('/api/reels/start-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: selectedScript.id, userId: profile.id }),
      })
      const startData = await startRes.json()
      if (!startRes.ok || !startData.videoId) throw new Error(startData.error ?? 'Failed to create video')
      const videoId = startData.videoId

      // Upload blobs directly to storage (bucket is public so anon key works)
      const clipRecords: { sceneId: string | null; clipUrl: string; durationSeconds: number; clipOrder: number }[] = []
      let totalClips = 0
      for (let si = 0; si < allClips.length; si++) totalClips += (allClips[si] ?? []).length
      let uploaded = 0

      for (let si = 0; si < allClips.length; si++) {
        const scene = scenes[si]
        const sceneClips = allClips[si] ?? []
        for (let ci = 0; ci < sceneClips.length; ci++) {
          const clip = sceneClips[ci]
          uploaded++
          setSubmitStatus(`Uploading clip ${uploaded} of ${totalClips}…`)
          const path = `splice-clips/${videoId}/scene-${si}-clip-${ci}.webm`
          const { error: uploadErr } = await supabase.storage.from('splice-clips').upload(path, clip.blob, { contentType: 'video/webm', upsert: true })
          if (uploadErr) throw uploadErr
          const { data: urlData } = supabase.storage.from('splice-clips').getPublicUrl(path)
          clipRecords.push({ sceneId: scene?.id ?? null, clipUrl: urlData.publicUrl, durationSeconds: clip.duration, clipOrder: ci })
        }
      }

      // Save clip records + mark video ready — server-side (bypasses RLS)
      setSubmitStatus('Saving…')
      const finishRes = await fetch('/api/reels/finish-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, clips: clipRecords }),
      })
      const finishData = await finishRes.json()
      if (!finishRes.ok) throw new Error(finishData.error ?? 'Failed to save clips')

      setSubmitStatus(''); setStep('done')
    } catch (e: any) { setError('Upload failed: ' + e.message); setStep('scene'); setSceneSubStep('ready') }
  }

  function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

  function handleClose() {
    clearTimer()
    cancelAnimationFrame(scrollAnimRef.current)
    stopCamera()
    if (pendingClip) URL.revokeObjectURL(pendingClip.url)
    allClips.flat().forEach(c => URL.revokeObjectURL(c.url))
    onClose()
  }

  const SPEEDS = [
    { label: 'Slow', value: 0.5 },
    { label: 'Normal', value: 1 },
    { label: 'Fast', value: 1.5 },
    { label: 'Fastest', value: 2 },
  ]

  return (
    <div onClick={step === 'scene' ? undefined : handleClose} style={{ position: 'fixed', inset: 0, background: step === 'scene' ? '#000' : 'rgba(0,0,0,0.95)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="splice-modal" onClick={e => e.stopPropagation()} style={step === 'scene' ? { position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', zIndex: 501 } : { background: '#1a2633', border: '1px solid rgba(45,174,255,0.2)', borderRadius: 18, width: '100%', maxWidth: 660, maxHeight: '95vh', overflow: 'auto', margin: 12, display: 'flex', flexDirection: 'column' }}>

        {/* Header — hidden in full-screen scene mode */}
        {step !== 'scene' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SpliceLogo />
              <span style={{ color: '#666', fontSize: 14 }}>·</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#999' }}>
                {step === 'select' ? 'Choose a Script'
                  : step === 'compose' ? 'Write Your Script'
                  : step === 'done' ? 'Done!'
                  : 'Submitting…'}
              </span>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
          </div>
        )}

        <div style={step === 'scene' ? { flex: 1, position: 'relative', overflow: 'hidden' } : { padding: 22, flex: 1, overflow: 'auto' }}>
          {error && (
            <div style={{ background: '#7F1D1D44', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#FCA5A5', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* SELECT */}
          {step === 'select' && (
            <div>
              {/* Resume draft if compose has content */}
              {composeScenes.some(s => s.text.trim()) && (
                <button onClick={() => setStep('compose')} style={{ width: '100%', background: 'rgba(122,51,245,0.12)', border: '1px solid rgba(122,51,245,0.35)', borderRadius: 12, padding: '14px 20px', textAlign: 'left', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(122,51,245,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✏</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#7A33F5', marginBottom: 2 }}>Continue Draft</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{composeTitle || 'Untitled script'}</div>
                  </div>
                </button>
              )}
              <button onClick={() => setStep('compose')} style={{ width: '100%', background: 'linear-gradient(135deg,rgba(45,174,255,0.15) 0%,rgba(122,51,245,0.15) 100%)', border: '1px solid rgba(45,174,255,0.3)', borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2DAEFF,#7A33F5)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 3 }}>Write Your Own Script</div>
                  <div style={{ fontSize: 12, color: '#999' }}>Type your Hook, Body &amp; CTA — the teleprompter overlays the camera while you record</div>
                </div>
              </button>
              {scripts.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#666', marginBottom: 10 }}>
                    {assignedScripts.length > 0 ? 'Assigned to You' : 'Published Scripts'}
                  </div>
                  {(assignedScripts.length > 0 ? assignedScripts : scripts).map(s => (
                    <button key={s.id} onClick={() => handleSelectScript(s)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#ffffff', marginBottom: 6 }}>{s.title}</div>
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
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4 }}>
                {(['ai', 'manual'] as const).map(m => (
                  <button key={m} onClick={() => setComposeMode(m)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: composeMode === m ? '#2DAEFF' : 'transparent',
                    color: composeMode === m ? '#000a15' : '#999',
                  }}>
                    {m === 'ai' ? 'AI Script Writer' : 'Write Manually'}
                  </button>
                ))}
              </div>

              {composeMode === 'ai' && (
                <div>
                  {!aiResult ? (
                    <div>
                      <div style={{ background: 'rgba(45,174,255,0.06)', border: '1px solid rgba(45,174,255,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#2DAEFF', marginBottom: 4, letterSpacing: '.04em' }}>POWERED BY FIVE LAWS MARKETING</div>
                        <div style={{ fontSize: 12.5, color: '#999', lineHeight: 1.5 }}>Tell the AI your topic and any key points. It will write a complete Hook, Body &amp; CTA script designed to earn attention and drive action.</div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={darkLabel}>Video Topic *</label>
                        <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} autoFocus placeholder="e.g., Why waiting for lower rates is costing buyers money" style={darkInput} />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={darkLabel}>Key Points / Notes (optional)</label>
                        <textarea value={aiNotes} onChange={e => setAiNotes(e.target.value)} rows={3} placeholder="e.g., Target first-time buyers, mention we can close in 21 days, emphasize the rent vs own comparison" style={{ ...darkInput, resize: 'vertical', lineHeight: 1.55 }} />
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
                          <input value={aiCta} onChange={e => setAiCta(e.target.value)} placeholder="e.g., DM me the word READY" style={darkInput} />
                        </div>
                      </div>
                      {aiError && <div style={{ background: '#7F1D1D44', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#FCA5A5', fontSize: 13 }}>{aiError}</div>}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#999' }}>Back</button>
                        <button
                          onClick={async () => {
                            if (!aiTopic.trim()) return
                            setAiLoading(true); setAiError('')
                            try {
                              const res = await fetch('/api/reels/ai-script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: aiTopic, notes: aiNotes, platform: aiPlatform, cta: aiCta }) })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error ?? 'AI request failed')
                              setAiResult(data)
                              setComposeTitle(data.title ?? aiTopic)
                              // Split any body scene into 3 shorter clips
                              const expanded: typeof DEFAULT_COMPOSE = []
                              for (const s of data.scenes) {
                                if (s.kind === 'body') {
                                  const sentences = (s.text as string).match(/[^.!?]+[.!?]+/g) ?? [s.text]
                                  const third = Math.ceil(sentences.length / 3)
                                  const parts = [
                                    sentences.slice(0, third).join(' ').trim(),
                                    sentences.slice(third, third * 2).join(' ').trim(),
                                    sentences.slice(third * 2).join(' ').trim(),
                                  ].filter(Boolean)
                                  const dur = Math.round((s.duration_seconds ?? 60) / parts.length)
                                  parts.forEach(text => expanded.push({ kind: 'body', text, duration_seconds: dur }))
                                } else {
                                  expanded.push({ kind: s.kind, text: s.text, duration_seconds: s.duration_seconds ?? (s.kind === 'hook' ? 20 : 15) })
                                }
                              }
                              setComposeScenes(expanded)
                            } catch (e: any) { setAiError(e.message) }
                            setAiLoading(false)
                          }}
                          disabled={!aiTopic.trim() || aiLoading}
                          style={{ flex: 2, padding: '11px 0', background: aiLoading ? 'rgba(45,174,255,0.3)' : '#2DAEFF', color: '#000a15', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: aiTopic.trim() && !aiLoading ? 'pointer' : 'default', opacity: aiTopic.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {aiLoading ? (<><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(6,15,24,0.3)', borderTopColor: '#000a15', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Writing your script…</>) : 'Generate Script'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{composeTitle}</div>
                        <button onClick={() => setAiResult(null)} style={{ ...ghostBtn, fontSize: 11 }}>← Re-generate</button>
                      </div>
                      {aiResult.audience && <div style={{ background: 'rgba(45,174,255,0.06)', border: '1px solid rgba(45,174,255,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#2DAEFF' }}>Audience: {aiResult.audience}</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                        {composeScenes.map((scene, idx) => (
                          <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${SCENE[scene.kind].color}33`, borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ background: SCENE[scene.kind].color + '22', color: SCENE[scene.kind].color, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 5, letterSpacing: '.06em' }}>{scene.kind.toUpperCase()}</span>
                                {aiResult.scenes?.[idx]?.notes && <span style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>{aiResult.scenes[idx].notes}</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <input type="number" value={scene.duration_seconds} min={5} max={120} onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], duration_seconds: parseInt(e.target.value) }; setComposeScenes(s) }} style={{ ...darkInput, width: 60, padding: '4px 8px' }} />
                                <span style={{ fontSize: 12, color: '#666' }}>s</span>
                              </div>
                            </div>
                            <textarea value={scene.text} rows={4} onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], text: e.target.value }; setComposeScenes(s) }} style={{ ...darkInput, resize: 'vertical', width: '100%', fontSize: 13.5, lineHeight: 1.65 }} />
                          </div>
                        ))}
                      </div>
                      {aiResult.onscreen_text?.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 6, letterSpacing: '.06em' }}>SUGGESTED ON-SCREEN TEXT</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {aiResult.onscreen_text.map((t: string, i: number) => <span key={i} style={{ background: 'rgba(45,174,255,0.12)', color: '#2DAEFF', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5 }}>{t}</span>)}
                          </div>
                        </div>
                      )}
                      <button onClick={handleStartCompose} style={{ width: '100%', padding: '12px 0', background: '#2DAEFF', color: '#000a15', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Looks Good — Start Recording →</button>
                    </div>
                  )}
                </div>
              )}

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
                            <span style={{ fontSize: 11.5, color: '#666' }}>{SCENE[scene.kind].tip}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <input type="number" value={scene.duration_seconds} min={5} max={120} onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], duration_seconds: parseInt(e.target.value) }; setComposeScenes(s) }} style={{ ...darkInput, width: 60, padding: '4px 8px' }} />
                            <span style={{ fontSize: 12, color: '#666' }}>s</span>
                          </div>
                        </div>
                        <textarea value={scene.text} rows={3} placeholder={SCENE[scene.kind].placeholder} onChange={e => { const s = [...composeScenes]; s[idx] = { ...s[idx], text: e.target.value }; setComposeScenes(s) }} style={{ ...darkInput, resize: 'vertical', width: '100%', fontSize: 13.5, lineHeight: 1.65 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#999' }}>Back</button>
                    <button onClick={handleStartCompose} disabled={!composeTitle.trim()} style={{ flex: 2, padding: '11px 0', background: '#2DAEFF', color: '#000a15', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: composeTitle.trim() ? 'pointer' : 'default', opacity: composeTitle.trim() ? 1 : 0.5 }}>Start Recording →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCENE — true full-screen camera, all UI overlaid */}
          {step === 'scene' && (
            <div style={{ position: 'absolute', inset: 0 }}>

              {sceneSubStep === 'review-clip' && pendingClip ? (
                /* ── CLIP REVIEW ── */
                <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column' }}>
                  {/* review video fills available space */}
                  <video
                    src={pendingClip.url}
                    autoPlay
                    playsInline
                    controls
                    style={{ flex: 1, width: '100%', objectFit: 'contain', background: '#000', display: 'block', minHeight: 0 }}
                  />
                  {/* bottom bar */}
                  <div style={{ background: 'rgba(0,0,0,0.92)', padding: '12px 16px 28px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: SCENE[currentScene?.kind]?.color ?? '#fff' }}>
                        {SCENE[currentScene?.kind]?.label?.toUpperCase()} — CLIP {currentClips.length + 1}
                      </span>
                      <span style={{ fontSize: 12, color: '#666' }}>{pendingClip.duration ? `${pendingClip.duration}s` : ''}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                      <button onClick={discardClip} style={{ padding: '15px 0', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: '#EF4444' }}>
                        Retake
                      </button>
                      <button onClick={keepClip} style={{ padding: '15px 0', background: '#34D399', color: '#000', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>
                        Keep Clip
                      </button>
                    </div>
                    {currentClips.length > 0 && (
                      <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: '#666' }}>
                        {currentClips.length} clip{currentClips.length !== 1 ? 's' : ''} already kept
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── CAMERA + RECORDING UI ── */
                <div style={{ position: 'absolute', inset: 0 }}>
                  {/* Full-screen camera */}
                  <video ref={videoRef} muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />

                  {/* Countdown overlay */}
                  {sceneSubStep === 'countdown' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', zIndex: 20 }}>
                      <div style={{ fontSize: 140, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>{countdown}</div>
                    </div>
                  )}

                  {/* ── TOP BAR ── */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 15, padding: '48px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    {/* Scene progress + label */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        {scenes.map((s, i) => (
                          <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i < sceneIdx ? '#2DAEFF' : i === sceneIdx ? SCENE[s.kind]?.color : 'rgba(255,255,255,0.2)' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: SCENE[currentScene?.kind]?.color, color: '#000', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 5, letterSpacing: '.06em' }}>
                          {currentScene?.kind?.toUpperCase()}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}>
                          {sceneIdx + 1} / {scenes.length}
                        </span>
                        {currentClips.length > 0 && (
                          <span style={{ color: '#34D399', fontSize: 12, fontWeight: 700 }}>
                            {currentClips.length} kept
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Close + REC */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {sceneSubStep === 'recording' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: '5px 12px' }}>
                          <div style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%', animation: 'blink 1s ease-in-out infinite' }} />
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</span>
                          {currentScene?.duration_seconds && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>/ {fmt(currentScene.duration_seconds)}</span>}
                        </div>
                      )}
                      <button onClick={handleClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                    </div>
                  </div>

                  {/* ── TELEPROMPTER — text starts mid-screen and scrolls up ── */}
                  {currentScene?.text && sceneSubStep !== 'countdown' && (
                    <>
                      {/* Measurement + scroll container — NO overflow:hidden so text never clips */}
                      <div ref={promptContainerRef} style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
                        <p
                          ref={textRef}
                          style={{
                            position: 'absolute',
                            left: 0, right: 0, top: 0,
                            padding: '0 32px',
                            fontSize: 32,
                            lineHeight: 1.8,
                            color: 'rgba(255,255,255,0.85)',
                            fontWeight: 800,
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            textAlign: 'center',
                            textShadow: '0 2px 16px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,1)',
                            willChange: 'transform',
                          }}
                        >
                          {currentScene.text}
                        </p>
                      </div>
                      {/* Fade strips — top and bottom, over the text, pointer-events:none */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '22%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)', zIndex: 11, pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', zIndex: 11, pointerEvents: 'none' }} />
                    </>
                  )}

                  {/* ── BOTTOM CONTROLS ── */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '0 18px 36px' }}>
                    {/* Speed row */}
                    {sceneSubStep === 'ready' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '.06em' }}>SPEED</span>
                        {SPEEDS.map(sp => (
                          <button key={sp.value} onClick={() => setScrollSpeed(sp.value)} style={{
                            padding: '5px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            background: scrollSpeed === sp.value ? '#2DAEFF' : 'rgba(255,255,255,0.15)',
                            color: scrollSpeed === sp.value ? '#000' : 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(8px)',
                          }}>
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Kept clips thumbnails */}
                    {currentClips.length > 0 && sceneSubStep === 'ready' && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
                        {currentClips.map((clip, ci) => (
                          <video key={ci} src={clip.url} style={{ height: 52, width: 36, objectFit: 'cover', borderRadius: 6, border: '2px solid rgba(52,211,153,0.5)', flexShrink: 0, background: '#000' }} muted playsInline />
                        ))}
                      </div>
                    )}

                    {/* Primary: record / stop */}
                    {sceneSubStep === 'ready' && (
                      <button onClick={startCountdown} style={{ width: '100%', padding: '16px 0', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}>
                        <span style={{ width: 12, height: 12, background: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                        {currentClips.length === 0 ? 'Start Recording' : 'Record Another Take'}
                      </button>
                    )}
                    {(sceneSubStep === 'countdown' || sceneSubStep === 'recording') && (
                      <button onClick={stopRecording} disabled={sceneSubStep === 'countdown'} style={{ width: '100%', padding: '16px 0', background: sceneSubStep === 'countdown' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: sceneSubStep === 'countdown' ? 'default' : 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <span style={{ width: 12, height: 12, background: '#EF4444', borderRadius: 3, display: 'inline-block' }} />
                        {sceneSubStep === 'countdown' ? 'Get ready…' : 'Stop Recording'}
                      </button>
                    )}

                    {/* Next scene — only after a clip is kept */}
                    {sceneSubStep === 'ready' && currentClips.length > 0 && (
                      <button onClick={advanceScene} style={{ width: '100%', padding: '14px 0', background: 'rgba(45,174,255,0.2)', backdropFilter: 'blur(8px)', color: '#2DAEFF', border: '1px solid rgba(45,174,255,0.4)', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                        {sceneIdx < scenes.length - 1 ? `Next Scene (${sceneIdx + 2}/${scenes.length}) →` : '✓ Done — Submit Video'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'uploading' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 48, height: 48, border: '3px solid rgba(45,174,255,0.2)', borderTopColor: '#2DAEFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
              <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>Uploading your clips…</div>
              <div style={{ fontSize: 13, color: '#666' }}>{submitStatus}</div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#2DAEFF,#7A33F5)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✓</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#2DAEFF', marginBottom: 8 }}>Video Submitted!</div>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 28 }}>Your clips are uploaded. An admin will stitch them into a final MP4 with your contact info end card.</div>
              <button onClick={handleClose} style={{ padding: '12px 32px', background: '#2DAEFF', color: '#000a15', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Done</button>
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
  width: '100%', padding: '9px 12px', border: '1px solid #2d3e4f', borderRadius: 8,
  fontSize: 13.5, color: '#fff', background: '#0f1419',
}
const darkLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 6, letterSpacing: '.03em',
}
const darkBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', background: 'rgba(45,174,255,0.12)', color: '#2DAEFF',
  border: '1px solid rgba(45,174,255,0.25)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
const ghostBtn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #2d3e4f', borderRadius: 7, fontSize: 12,
  fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#999',
}
