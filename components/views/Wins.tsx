'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/appContext'
import { createClient } from '@/lib/supabase/client'
import { Employee } from '@/lib/types'

const REACTIONS = ['🔥', '🏆', '🎉', '💪', '⭐']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface WinPost {
  id: string
  employee_id: string
  body: string
  author_name: string
  created_at: string
  tagged_ids:   string[]
  tagged_names: string[]
  reactions:    Record<string, number>
  image_url:    string | null
}

interface WinComment {
  id: string
  win_id: string
  body: string
  author_name: string
  created_at: string
}

const C = {
  bg: '#F4F6F8', white: '#fff', navy: '#0A2540', border: '#E4E8EC',
  text: '#26303B', muted: '#858889', dim: '#5C6570', accent: '#5BCBF5',
}

function avatarColor(name: string): string {
  const palette = ['#5BCBF5','#f472b6','#f59e0b','#34d399','#a78bfa','#fb923c','#06b6d4','#6366f1','#ec4899','#14b8a6']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return palette[hash % palette.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 2) return 'yesterday'
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

function autoEmoji(body: string): string {
  const l = body.toLowerCase()
  if (l.includes('fund') || l.includes('clos')) return '💰'
  if (l.includes('record')) return '🏅'
  if (l.includes('referr')) return '🤝'
  if (l.includes('million')) return '💎'
  if (l.includes('first') && l.includes('loan')) return '🎯'
  if (l.includes('promot') || l.includes('anniversar')) return '🎂'
  if (l.includes('team') || l.includes('branch')) return '🌟'
  return '🏆'
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Wins() {
  const { employees, profile } = useApp()
  const sb = createClient()

  const now = new Date()
  const [selYear, setSelYear]   = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [posts, setPosts]       = useState<WinPost[]>([])
  const [loading, setLoading]   = useState(true)

  const activeEmps = employees.filter(e => (e as any).status !== 'terminated')
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; email: string }[]>([])

  useEffect(() => {
    sb.from('profiles').select('id,full_name,email').eq('status','approved').order('full_name')
      .then(({ data }) => setProfiles(data ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const y = selYear, m = selMonth
    const from  = `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00`
    const nextM = m === 11 ? `${y + 1}-01-01T00:00:00` : `${y}-${String(m + 2).padStart(2, '0')}-01T00:00:00`
    const { data } = await sb.from('wins').select('*')
      .gte('created_at', from).lt('created_at', nextM)
      .order('created_at', { ascending: false })
    setPosts((data ?? []).map((w: any) => ({
      ...w,
      tagged_ids:   Array.isArray(w.tagged_ids)   ? w.tagged_ids   : [],
      tagged_names: Array.isArray(w.tagged_names) ? w.tagged_names : [],
      reactions:    w.reactions && typeof w.reactions === 'object' ? w.reactions : {},
      image_url:    w.image_url ?? null,
    })))
    setLoading(false)
  }, [selYear, selMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const monthOpts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  async function handleReact(winId: string, emoji: string) {
    const win = posts.find(p => p.id === winId)
    if (!win) return
    const reactions = { ...win.reactions, [emoji]: (win.reactions[emoji] ?? 0) + 1 }
    setPosts(prev => prev.map(p => p.id === winId ? { ...p, reactions } : p))
    await sb.from('wins').update({ reactions }).eq('id', winId)
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A2540 0%, #0f3460 100%)', padding: '28px 40px 0', flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ fontSize: 40, lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(245,158,11,0.4))' }}>🏆</div>
            <div>
              <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-.02em' }}>
                Team Wins
              </h1>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 3, fontWeight: 500 }}>
                {posts.length > 0
                  ? `${posts.length} win${posts.length !== 1 ? 's' : ''} in ${MONTH_NAMES[selMonth]} · Keep crushing it 🔥`
                  : 'Celebrate every milestone, big and small'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {monthOpts.map(opt => {
              const active = opt.year === selYear && opt.month === selMonth
              return (
                <button
                  key={`${opt.year}-${opt.month}`}
                  onClick={() => { setSelYear(opt.year); setSelMonth(opt.month) }}
                  style={{
                    padding: '9px 18px', border: 'none', background: 'transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    color: active ? C.accent : 'rgba(255,255,255,0.45)',
                    fontWeight: active ? 800 : 500, fontSize: 13,
                    borderBottom: `2px solid ${active ? C.accent : 'transparent'}`,
                    transition: 'all 0.12s',
                  }}
                >
                  {MONTH_NAMES[opt.month].slice(0, 3)}{opt.year !== now.getFullYear() ? ` '${String(opt.year).slice(2)}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 64px' }}>
          <SubmitWinCard
            profiles={profiles}
            authorName={profile?.full_name ?? 'Team'}
            onSubmit={fetchPosts}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: C.muted, fontSize: 14 }}>Loading wins...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ fontSize: 56 }}>🎯</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: C.navy, marginTop: 14 }}>
                No wins yet in {MONTH_NAMES[selMonth]}
              </div>
              <div style={{ color: C.muted, marginTop: 6, fontSize: 14 }}>Be the first to shout someone out!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
              {posts.map(post => (
                <WinCard key={post.id} post={post} employees={employees} onReact={handleReact} authorName={profile?.full_name ?? 'Team'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Submit card ──────────────────────────────────────────────────────────────
type TagProfile = { id: string; full_name: string; email: string }

function SubmitWinCard({ profiles, authorName, onSubmit }: {
  profiles: TagProfile[]
  authorName: string
  onSubmit: () => void
}) {
  const sb = createClient()
  const [body, setBody]             = useState('')
  const [tagged, setTagged]         = useState<string[]>([])
  const [imgFile, setImgFile]       = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [posted, setPosted]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const taggedProfiles = profiles.filter(p => tagged.includes(p.id))
  const canSubmit      = body.trim().length > 0 && tagged.length > 0

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImgPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function submit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    let image_url: string | null = null
    if (imgFile) {
      await fetch('/api/wins/ensure-bucket', { method: 'POST' })
      const ext  = imgFile.name.split('.').pop()
      const path = `wins/${Date.now()}.${ext}`
      const { data: up, error: upErr } = await sb.storage.from('win-images').upload(path, imgFile, { upsert: true })
      if (upErr) {
        console.error('Win image upload failed:', upErr)
        alert(`Photo upload failed: ${upErr.message}. The win will post without the photo.`)
      } else if (up) {
        const { data: pub } = sb.storage.from('win-images').getPublicUrl(up.path)
        image_url = pub.publicUrl
      }
    }
    const taggedNames = taggedProfiles.map(p => p.full_name)
    await sb.from('wins').insert({
      employee_id:  tagged[0],
      body:         body.trim(),
      author_name:  authorName,
      tagged_ids:   tagged,
      tagged_names: taggedNames,
      reactions:    {},
      image_url,
    })
    // Notify tagged users via email (fire and forget)
    fetch('/api/wins/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagged_ids: tagged, tagged_names: taggedNames, body: body.trim(), author_name: authorName }),
    })

    setBody(''); setTagged([]); setImgFile(null); setImgPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    setSubmitting(false); setPosted(true)
    setTimeout(() => setPosted(false), 2500)
    onSubmit()
  }

  return (
    <div style={{ background: C.white, borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(10,37,64,0.08)' }}>

      {/* Author bar */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.bg}` }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.navy, color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
          {initials(authorName)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{authorName}</div>
        <div style={{ marginLeft: 'auto', fontSize: 22 }}>✨</div>
      </div>

      {/* Textarea */}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
        placeholder="Share a win, milestone, or shoutout... 🏆"
        style={{ width: '100%', border: 'none', outline: 'none', padding: '14px 18px', fontSize: 15, color: C.text, resize: 'none', minHeight: 88, fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.65 }}
      />

      {/* Image preview */}
      {imgPreview && (
        <div style={{ position: 'relative', margin: '0 18px 14px' }}>
          <img src={imgPreview} alt="preview" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10 }} />
          <button
            onClick={() => { setImgFile(null); setImgPreview(null); if (fileRef.current) fileRef.current.value = '' }}
            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>
      )}

      {/* Tag */}
      <div style={{ padding: '4px 18px 14px', borderTop: `1px solid ${C.bg}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
          🏷️ Tag team members
        </div>
        <ProfileMultiSelect profiles={profiles} selected={tagged} onChange={setTagged} />
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFBFC', borderRadius: '0 0 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => fileRef.current?.click()}
            title="Add photo"
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16, color: C.dim, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            📷 <span style={{ fontSize: 12, fontWeight: 600 }}>Photo</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
          <span style={{ fontSize: 12, color: C.muted }}>
            {tagged.length > 0 ? `${tagged.length} tagged` : 'Tag someone first'}
          </span>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          style={{
            background: posted ? '#10B981' : canSubmit ? 'linear-gradient(135deg, #0A2540 0%, #1a3a5c 100%)' : C.border,
            color: (canSubmit || posted) ? '#fff' : C.muted,
            border: 'none', borderRadius: 10, padding: '10px 22px',
            fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', transition: 'all 0.15s',
          }}
        >
          {posted ? '✓ Posted!' : submitting ? 'Posting...' : 'Post Win 🏆'}
        </button>
      </div>
    </div>
  )
}

// ── Profile multi-select (fixed-position dropdown to avoid overflow clipping) ─
function ProfileMultiSelect({ profiles, selected, onChange }: {
  profiles: TagProfile[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect]     = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropRef.current    && !dropRef.current.contains(e.target as Node)
      ) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function openDropdown() {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const filtered      = profiles.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()))
  const selectedProfs = profiles.filter(p => selected.includes(p.id))

  return (
    <>
      <div
        ref={triggerRef}
        onClick={openDropdown}
        style={{ border: `1.5px solid ${open ? C.accent : C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 42, alignItems: 'center', background: C.white, transition: 'border-color 0.12s' }}
      >
        {selectedProfs.length === 0
          ? <span style={{ color: C.muted, fontSize: 13 }}>Select teammates...</span>
          : selectedProfs.map(p => (
            <span key={p.id} style={{ background: avatarColor(p.full_name), color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              {p.full_name}
              <span onClick={ev => { ev.stopPropagation(); toggle(p.id) }} style={{ cursor: 'pointer', opacity: .8, fontSize: 10 }}>✕</span>
            </span>
          ))
        }
        <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 10, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && rect && (
        <div ref={dropRef} style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(10,37,64,0.14)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.bg}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Search teammates..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: C.text, background: 'transparent', fontFamily: 'inherit' }}
            />
            <button
              onClick={e => { e.stopPropagation(); const allIds = filtered.map(p => p.id); const allSelected = allIds.every(id => selected.includes(id)); onChange(allSelected ? selected.filter(id => !allIds.includes(id)) : [...new Set([...selected, ...allIds])]) }}
              style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: '2px 4px' }}
            >
              {filtered.every(p => selected.includes(p.id)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '12px 14px', fontSize: 13, color: C.muted }}>No results</div>
              : filtered.map(p => {
                const sel = selected.includes(p.id)
                return (
                  <div key={p.id} onClick={() => toggle(p.id)} style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: sel ? 'rgba(91,203,245,0.07)' : 'transparent', transition: 'background 0.1s' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(p.full_name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                      {initials(p.full_name)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: C.text, flex: 1 }}>{p.full_name}</span>
                    {sel && <span style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>✓</span>}
                  </div>
                )
              })
            }
          </div>
        </div>
      )}
    </>
  )
}

// ── Win card ─────────────────────────────────────────────────────────────────
function WinCard({ post, employees, onReact, authorName }: {
  post: WinPost
  employees: Employee[]
  onReact: (id: string, emoji: string) => void
  authorName: string
}) {
  const sb = createClient()
  const [comments, setComments]       = useState<WinComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [loadingCmts, setLoadingCmts] = useState(false)
  const [posting, setPosting]         = useState(false)
  const [imgOpen, setImgOpen]         = useState(false)

  async function loadComments() {
    if (loadingCmts) return
    setLoadingCmts(true)
    const { data } = await sb.from('win_comments').select('*').eq('win_id', post.id).order('created_at', { ascending: true })
    setComments(data ?? [])
    setLoadingCmts(false)
  }

  function toggleComments() {
    if (!showComments) loadComments()
    setShowComments(v => !v)
  }

  async function postComment() {
    if (!commentDraft.trim() || posting) return
    setPosting(true)
    const { data } = await sb.from('win_comments').insert({
      win_id:      post.id,
      body:        commentDraft.trim(),
      author_name: authorName,
    }).select().single()
    if (data) setComments(prev => [...prev, data as WinComment])
    setCommentDraft('')
    setPosting(false)
  }

  const taggedNames = post.tagged_names.length > 0
    ? post.tagged_names
    : [employees.find(e => e.id === post.employee_id)?.name ?? 'Team']

  const primary   = avatarColor(taggedNames[0])
  const secondary = taggedNames.length > 1 ? avatarColor(taggedNames[1]) : primary + '66'

  const displayNames =
    taggedNames.length === 1 ? taggedNames[0]
    : taggedNames.length === 2 ? `${taggedNames[0]} & ${taggedNames[1]}`
    : `${taggedNames[0]}, ${taggedNames[1]} +${taggedNames.length - 2} more`

  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0)

  return (
    <>
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(10,37,64,0.06)' }}>

        {/* Color stripe */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

        <div style={{ padding: '18px 20px 14px' }}>
          {/* Tagged avatars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex' }}>
              {taggedNames.slice(0, 5).map((name, i) => (
                <div key={name} title={name} style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, border: '2px solid #fff', position: 'relative', marginLeft: i > 0 ? -10 : 0, zIndex: 5 - i }}>
                  {initials(name)}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayNames}
              </div>
            </div>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{autoEmoji(post.body)}</span>
          </div>

          {/* Body */}
          <p style={{ margin: '0 0 12px', fontSize: 15, color: C.text, lineHeight: 1.7, fontWeight: 500 }}>{post.body}</p>

          {/* Image */}
          {post.image_url && (
            <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in' }} onClick={() => setImgOpen(true)}>
              <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* Meta */}
          <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Posted by <span style={{ fontWeight: 600, color: C.dim }}>{post.author_name}</span></span>
            <span>·</span>
            <span>{fmtDate(post.created_at)}</span>
            {totalReactions > 0 && <><span>·</span><span>{totalReactions} reaction{totalReactions !== 1 ? 's' : ''}</span></>}
          </div>
        </div>

        {/* Reactions + comment button */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.bg}`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {REACTIONS.map(emoji => {
            const count = post.reactions[emoji] ?? 0
            return (
              <button
                key={emoji}
                onClick={() => onReact(post.id, emoji)}
                style={{ background: count > 0 ? `${primary}18` : C.bg, border: `1px solid ${count > 0 ? primary + '55' : 'transparent'}`, borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5, color: C.text, fontWeight: count > 0 ? 700 : 400, transition: 'all 0.12s' }}
              >
                {emoji}{count > 0 && <span style={{ fontSize: 12, color: C.dim }}>{count}</span>}
              </button>
            )
          })}
          <button
            onClick={toggleComments}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: showComments ? C.navy : C.muted, fontWeight: showComments ? 700 : 500, padding: '4px 8px', borderRadius: 8, transition: 'color 0.1s' }}
          >
            💬 {comments.length > 0 ? comments.length : ''} Comment{comments.length !== 1 ? 's' : ''}
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div style={{ borderTop: `1px solid ${C.bg}`, background: '#FAFBFC' }}>
            {loadingCmts
              ? <div style={{ padding: '12px 20px', fontSize: 13, color: C.muted }}>Loading...</div>
              : comments.length === 0
                ? <div style={{ padding: '12px 20px', fontSize: 13, color: C.muted }}>No comments yet. Be the first!</div>
                : <div style={{ padding: '8px 0' }}>
                    {comments.map(c => (
                      <div key={c.id} style={{ padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(c.author_name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {initials(c.author_name)}
                        </div>
                        <div style={{ flex: 1, background: C.white, borderRadius: 10, padding: '8px 12px', border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 3 }}>{c.author_name}</div>
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{c.body}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{fmtDate(c.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
            }

            {/* Comment input */}
            <div style={{ padding: '10px 20px 14px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(authorName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                {initials(authorName)}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() } }}
                  placeholder="Write a comment... (Enter to send)"
                  rows={1}
                  style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', fontSize: 13, color: C.text, resize: 'none', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5, background: C.white }}
                />
                <button
                  onClick={postComment}
                  disabled={!commentDraft.trim() || posting}
                  style={{ background: commentDraft.trim() ? C.navy : C.border, color: commentDraft.trim() ? '#fff' : C.muted, border: 'none', borderRadius: 10, padding: '8px 14px', cursor: commentDraft.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.12s' }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {imgOpen && post.image_url && (
        <div
          onClick={() => setImgOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 24 }}
        >
          <img src={post.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}
