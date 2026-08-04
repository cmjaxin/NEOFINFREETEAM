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
  scripts?: { title: string }
  profiles?: { full_name: string }
}

type ReelsTab = 'home' | 'admin-scripts' | 'admin-videos'
type RecordStep = 'select' | 'ready' | 'countdown' | 'recording' | 'review' | 'uploading' | 'done'

const SCENE_LABELS: Record<string, { label: string; color: string; tip: string }> = {
  hook: { label: 'Hook', color: '#7C3AED', tip: 'Grab attention in the first 5 seconds' },
  body: { label: 'Body', color: '#0A2540', tip: 'Deliver your main message clearly' },
  cta:  { label: 'CTA',  color: '#0891B2', tip: 'Tell them exactly what to do next' },
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
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [scriptsRes, allVideosRes, myVideosRes] = await Promise.all([
      supabase.from('splice_scripts').select('*, splice_scenes(*)').order('created_at', { ascending: false }),
      isAdmin ? supabase.from('splice_videos').select('*, splice_scripts(title), profiles(full_name)').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from('splice_videos').select('*, splice_scripts(title)').eq('user_id', profile!.id).order('created_at', { ascending: false }),
    ])
    const rawScripts = (scriptsRes.data ?? []) as any[]
    setScripts(rawScripts.map(s => ({
      ...s,
      scenes: (s.splice_scenes ?? []).sort((a: ReelsScene, b: ReelsScene) => a.scene_order - b.scene_order),
    })))
    setVideos((allVideosRes.data ?? []) as ReelsVideo[])
    setMyVideos((myVideosRes.data ?? []) as ReelsVideo[])
    setLoading(false)
  }, [supabase, isAdmin, profile])

  useEffect(() => { loadData() }, [loadData])

  const liveScripts = scripts.filter(s => s.status === 'live')

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A2540', margin: '0 0 4px' }}>Splice</h1>
          <div style={{ fontSize: 14, color: '#6B7280' }}>Record short-form video content in 3 scenes — Hook, Body, CTA</div>
        </div>
        <button onClick={() => setShowRecord(true)} style={{
          padding: '11px 22px', background: '#0A2540', color: '#fff', border: 'none',
          borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>●</span> Record a Video
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabBtn('home', 'My Videos')}
        {isAdmin && tabBtn('admin-scripts', 'Scripts')}
        {isAdmin && tabBtn('admin-videos', 'All Videos')}
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>Loading…</div>
      ) : tab === 'home' ? (
        <HomeTab myVideos={myVideos} liveScripts={liveScripts} onRecord={() => setShowRecord(true)} onRefresh={loadData} />
      ) : tab === 'admin-scripts' ? (
        <ScriptsTab scripts={scripts} onRefresh={loadData} />
      ) : (
        <AllVideosTab videos={videos} onRefresh={loadData} />
      )}

      {showRecord && (
        <RecordModal
          scripts={liveScripts}
          profile={profile}
          onClose={() => { setShowRecord(false); loadData() }}
        />
      )}
    </div>
  )
}

// ── Home Tab ───────────────────────────────────────────────────────────────

function HomeTab({ myVideos, liveScripts, onRecord, onRefresh }: {
  myVideos: ReelsVideo[]; liveScripts: ReelsScript[]; onRecord: () => void; onRefresh: () => void
}) {
  function statusBadge(status: ReelsVideo['status']) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      awaiting_scenes: { bg: '#FEF3C7', color: '#92400E', label: 'Draft' },
      uploading:       { bg: '#DBEAFE', color: '#1E40AF', label: 'Uploading' },
      rendering:       { bg: '#EDE9FE', color: '#5B21B6', label: 'Rendering' },
      ready:           { bg: '#D1FAE5', color: '#065F46', label: 'Ready' },
      error:           { bg: '#FEE2E2', color: '#991B1B', label: 'Error' },
    }
    const s = map[status] ?? map.awaiting_scenes
    return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{s.label}</span>
  }

  return (
    <div>
      {liveScripts.length === 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 14, color: '#92400E' }}>
          No scripts are live yet. An admin needs to publish a script before you can record.
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 14 }}>
        My Videos ({myVideos.length})
      </div>

      {myVideos.length === 0 ? (
        <div style={{ border: '2px dashed #D1D5DB', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No videos yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Select a script and record your first Splice video</div>
          <button onClick={onRecord} style={{ background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Record a Video
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {myVideos.map(v => (
            <div key={v.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/9', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {v.file_url ? (
                  <video src={v.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                ) : (
                  <span style={{ fontSize: 32 }}>🎥</span>
                )}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A2540' }}>
                    {(v as any).splice_scripts?.title ?? 'Video'}
                  </div>
                  {statusBadge(v.status)}
                </div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 4 }}>
                  {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                {v.status === 'ready' && v.file_url && (
                  <a href={v.file_url} download target="_blank" rel="noopener noreferrer" style={{
                    display: 'block', marginTop: 10, padding: '8px 0', background: '#0A2540', color: '#fff',
                    borderRadius: 7, textAlign: 'center', fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}>
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
    const s = [...form.scenes]
    s[idx] = { ...s[idx], [key]: val }
    setForm(f => ({ ...f, scenes: s }))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.slug) return
    setSaving(true)
    const { data: script, error } = await supabase.from('splice_scripts').insert({ title: form.title, slug: form.slug, status: 'draft' }).select().single()
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
        <button onClick={() => setShowForm(s => !s)} style={{
          padding: '9px 18px', background: '#0A2540', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>{showForm ? 'Cancel' : '+ New Script'}</button>
      </div>

      {showForm && (
        <form onSubmit={create} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Script Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                placeholder="e.g., Refi Breakeven Analysis" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>URL Slug</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required
                placeholder="refi-breakeven" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {form.scenes.map((scene, idx) => {
              const meta = SCENE_LABELS[scene.kind]
              return (
                <div key={idx} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: meta.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '.04em' }}>
                        {meta.label.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{meta.tip}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, color: '#6B7280' }}>Duration:</label>
                      <input type="number" value={scene.duration_seconds} min={5} max={120}
                        onChange={e => updateScene(idx, 'duration_seconds', parseInt(e.target.value))}
                        style={{ ...inputStyle, width: 70, padding: '5px 8px' }} />
                      <span style={{ fontSize: 12, color: '#6B7280' }}>sec</span>
                    </div>
                  </div>
                  <textarea value={scene.text} rows={3} placeholder="Scene script / talking points…"
                    onChange={e => updateScene(idx, 'text', e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', width: '100%' }} />
                </div>
              )
            })}
          </div>
          <button type="submit" disabled={saving} style={{
            width: '100%', padding: '11px 0', background: '#0A2540', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Creating…' : 'Create Script'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scripts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>No scripts yet. Create one above.</div>
        )}
        {scripts.map(script => (
          <div key={script.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A2540', marginBottom: 3 }}>{script.title}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{script.slug}</div>
                {script.scenes && script.scenes.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {script.scenes.map(s => (
                      <span key={s.id} style={{ background: '#F3F4F6', color: '#374151', fontSize: 11, padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>
                        {SCENE_LABELS[s.kind]?.label ?? s.kind} · {s.duration_seconds}s
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  background: script.status === 'live' ? '#D1FAE5' : '#F3F4F6',
                  color: script.status === 'live' ? '#065F46' : '#6B7280',
                }}>{script.status === 'live' ? 'LIVE' : 'DRAFT'}</span>
                <button onClick={() => toggleStatus(script)} style={{
                  padding: '6px 14px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: '#fff', color: '#374151',
                }}>
                  {script.status === 'live' ? 'Set Draft' : 'Go Live'}
                </button>
                <button onClick={() => deleteScript(script.id)} style={{
                  padding: '6px 10px', border: '1px solid #FCA5A5', borderRadius: 7, fontSize: 12, color: '#DC2626', cursor: 'pointer', background: '#fff',
                }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── All Videos Tab (Admin) ─────────────────────────────────────────────────

function AllVideosTab({ videos, onRefresh }: { videos: ReelsVideo[]; onRefresh: () => void }) {
  const supabase = createClient()
  const [filter, setFilter] = useState('all')
  const [rendering, setRendering] = useState<string | null>(null)

  const filtered = filter === 'all' ? videos : videos.filter(v => v.status === filter)

  async function triggerRender(videoId: string) {
    setRendering(videoId)
    try {
      const res = await fetch('/api/reels/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })
      if (!res.ok) throw new Error(await res.text())
      onRefresh()
    } catch (e: any) {
      alert('Render failed: ' + e.message)
    }
    setRendering(null)
  }

  const filters = ['all', 'ready', 'rendering', 'awaiting_scenes', 'error']

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filter === f ? '#0A2540' : '#fff',
            color: filter === f ? '#fff' : '#374151',
          }}>{f.replace('_', ' ')}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>No videos found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(v => (
            <div key={v.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/9', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {v.file_url ? (
                  <video src={v.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                ) : (
                  <span style={{ fontSize: 28, color: '#D1D5DB' }}>🎥</span>
                )}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A2540', marginBottom: 2 }}>
                  {(v as any).splice_scripts?.title ?? '—'}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  {(v as any).profiles?.full_name ?? 'Unknown'} · {new Date(v.created_at).toLocaleDateString()}
                </div>
                <VideoStatusBadge status={v.status} />
                {v.status === 'awaiting_scenes' && (
                  <button onClick={() => triggerRender(v.id)} disabled={rendering === v.id} style={{
                    marginTop: 10, width: '100%', padding: '8px 0', background: '#7C3AED', color: '#fff',
                    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: rendering === v.id ? 0.6 : 1,
                  }}>
                    {rendering === v.id ? 'Starting render…' : 'Trigger Render'}
                  </button>
                )}
                {v.status === 'ready' && v.file_url && (
                  <a href={v.file_url} download target="_blank" rel="noopener noreferrer" style={{
                    display: 'block', marginTop: 10, padding: '8px 0', background: '#0A2540', color: '#fff',
                    borderRadius: 7, textAlign: 'center', fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}>
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

function VideoStatusBadge({ status }: { status: ReelsVideo['status'] }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    awaiting_scenes: { bg: '#FEF3C7', color: '#92400E', label: 'Awaiting Render' },
    uploading:       { bg: '#DBEAFE', color: '#1E40AF', label: 'Uploading' },
    rendering:       { bg: '#EDE9FE', color: '#5B21B6', label: 'Rendering' },
    ready:           { bg: '#D1FAE5', color: '#065F46', label: 'Ready' },
    error:           { bg: '#FEE2E2', color: '#991B1B', label: 'Error' },
  }
  const s = map[status] ?? map.awaiting_scenes
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{s.label}</span>
}

// ── Record Modal ───────────────────────────────────────────────────────────

function RecordModal({ scripts, profile, onClose }: {
  scripts: ReelsScript[]; profile: any; onClose: () => void
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scenes = selectedScript?.scenes ?? []
  const currentScene = scenes[sceneIdx]

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play()
      }
    } catch (e: any) {
      setError('Camera access denied. Please allow camera and microphone in your browser.')
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

  function startCountdown() {
    setStep('countdown')
    setCountdown(3)
    let c = 3
    timerRef.current = setInterval(() => {
      c--
      setCountdown(c)
      if (c <= 0) {
        clearTimer()
        startRecording()
      }
    }, 1000)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setClips(prev => {
        const next = [...prev]
        next[sceneIdx] = { blob, url }
        return next
      })
      setStep('review')
    }
    recorder.start(250)
    setStep('recording')
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }

  function stopRecording() {
    clearTimer()
    recorderRef.current?.stop()
  }

  function reRecord() {
    setStep('ready')
  }

  function nextScene() {
    if (sceneIdx < scenes.length - 1) {
      setSceneIdx(i => i + 1)
      setStep('ready')
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
        script_id: selectedScript.id,
        user_id: profile.id,
        status: 'uploading',
      }).select().single()
      if (vErr || !video) throw vErr ?? new Error('Failed to create video')

      for (let i = 0; i < clips.length; i++) {
        const scene = scenes[i]
        const clip = clips[i]
        if (!clip) continue
        setSubmitStatus(`Uploading scene ${i + 1} of ${clips.length}…`)
        const path = `splice-clips/${video.id}/scene-${i}.webm`
        const { error: uploadErr } = await supabase.storage.from('splice-clips').upload(path, clip.blob, { contentType: 'video/webm', upsert: true })
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('splice-clips').getPublicUrl(path)
        await supabase.from('splice_video_clips').insert({
          video_id: video.id,
          scene_id: scene.id,
          clip_url: urlData.publicUrl,
          duration_seconds: elapsed,
        })
      }

      await supabase.from('splice_videos').update({ status: 'awaiting_scenes' }).eq('id', video.id)
      setSubmitStatus('')
      setStep('done')
    } catch (e: any) {
      setError('Upload failed: ' + e.message)
      setStep('ready')
    }
  }

  function handleClose() {
    clearTimer()
    stopCamera()
    clips.forEach(c => URL.revokeObjectURL(c.url))
    onClose()
  }

  return (
    <div onClick={handleClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '90vh', overflow: 'auto', margin: 16,
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0A2540' }}>
            {step === 'select' ? 'Choose a Script' :
             step === 'done' ? 'Video Submitted!' :
             step === 'uploading' ? 'Submitting…' :
             `Scene ${sceneIdx + 1} of ${scenes.length} — ${SCENE_LABELS[currentScene?.kind]?.label ?? ''}`}
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#991B1B', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* STEP: SELECT SCRIPT */}
          {step === 'select' && (
            <div>
              {scripts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                  No live scripts available. Ask an admin to publish a script first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {scripts.map(s => (
                    <button key={s.id} onClick={() => handleSelectScript(s)} style={{
                      background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10,
                      padding: '14px 18px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.12s',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0A2540', marginBottom: 4 }}>{s.title}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(s.scenes ?? []).map(sc => (
                          <span key={sc.id} style={{ background: '#E5E7EB', color: '#374151', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                            {SCENE_LABELS[sc.kind]?.label} · {sc.duration_seconds}s
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP: READY / COUNTDOWN / RECORDING / REVIEW */}
          {(step === 'ready' || step === 'countdown' || step === 'recording' || step === 'review') && (
            <div>
              {/* Scene progress */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {scenes.map((s, i) => (
                  <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: i < sceneIdx ? '#0A2540' : i === sceneIdx ? '#5BCBF5' : '#E5E7EB' }} />
                ))}
              </div>

              {/* Scene info */}
              {currentScene && step !== 'review' && (
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: SCENE_LABELS[currentScene.kind]?.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>
                      {SCENE_LABELS[currentScene.kind]?.label.toUpperCase()} · {currentScene.duration_seconds}s
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{currentScene.text || 'No script provided — speak from your knowledge!'}</div>
                </div>
              )}

              {/* Camera preview */}
              {step !== 'review' && (
                <div style={{ position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 16, aspectRatio: '16/9' }}>
                  <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  {step === 'countdown' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                      <div style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{countdown}</div>
                    </div>
                  )}
                  {step === 'recording' && (
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 10px' }}>
                      <div style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }} />
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{elapsed}s</span>
                    </div>
                  )}
                </div>
              )}

              {/* Clip review */}
              {step === 'review' && clips[sceneIdx] && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 600, color: '#0A2540' }}>
                    Review your {SCENE_LABELS[currentScene?.kind]?.label}
                  </div>
                  <video src={clips[sceneIdx].url} controls style={{ width: '100%', borderRadius: 10, background: '#000' }} />
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {step === 'ready' && (
                  <button onClick={startCountdown} style={{
                    padding: '12px 32px', background: '#EF4444', color: '#fff', border: 'none',
                    borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%' }} />
                    Start Recording
                  </button>
                )}
                {step === 'recording' && (
                  <button onClick={stopRecording} style={{
                    padding: '12px 32px', background: '#374151', color: '#fff', border: 'none',
                    borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2 }} />
                    Stop Recording
                  </button>
                )}
                {step === 'review' && (
                  <>
                    <button onClick={reRecord} style={{
                      padding: '11px 24px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB',
                      borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>Re-record</button>
                    <button onClick={nextScene} style={{
                      padding: '11px 28px', background: '#0A2540', color: '#fff', border: 'none',
                      borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {sceneIdx < scenes.length - 1 ? `Next Scene →` : 'Submit Video'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP: UPLOADING */}
          {step === 'uploading' && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⬆️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', marginBottom: 8 }}>Uploading your clips…</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{submitStatus}</div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎬</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0A2540', marginBottom: 8 }}>Video Submitted!</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
                Your clips are uploaded. An admin will trigger the final render shortly.
              </div>
              <button onClick={handleClose} style={{
                padding: '11px 28px', background: '#0A2540', color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8,
  fontSize: 13.5, color: '#0A2540', background: '#fff',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 5, letterSpacing: '.03em',
}
