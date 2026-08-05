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
  tagged_ids: string[]
  tagged_names: string[]
  reactions: Record<string, number>
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
  if (l.includes('million') || l.includes('$1')) return '💎'
  if (l.includes('first') && l.includes('loan')) return '🎯'
  if (l.includes('promot') || l.includes('anniversar')) return '🎂'
  if (l.includes('team') || l.includes('branch')) return '🌟'
  return '🏆'
}

export default function Wins() {
  const { employees, profile } = useApp()
  const sb = createClient()

  const now = new Date()
  const [selYear, setSelYear]   = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [posts, setPosts]       = useState<WinPost[]>([])
  const [loading, setLoading]   = useState(true)

  const activeEmps = employees.filter(e => (e as any).status !== 'terminated')

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const y = selYear, m = selMonth
    const from    = `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00`
    const nextM   = m === 11 ? `${y + 1}-01-01T00:00:00` : `${y}-${String(m + 2).padStart(2, '0')}-01T00:00:00`
    const { data } = await sb.from('wins').select('*')
      .gte('created_at', from).lt('created_at', nextM)
      .order('created_at', { ascending: false })
    setPosts((data ?? []).map((w: any) => ({
      ...w,
      tagged_ids:   Array.isArray(w.tagged_ids)   ? w.tagged_ids   : [],
      tagged_names: Array.isArray(w.tagged_names) ? w.tagged_names : [],
      reactions:    w.reactions && typeof w.reactions === 'object' ? w.reactions : {},
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

      {/* ── Hero header ── */}
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
                  ? `${posts.length} win${posts.length !== 1 ? 's' : ''} in ${MONTH_NAMES[selMonth]} · Keep crushing it`
                  : 'Celebrate every milestone, big and small'}
              </div>
            </div>
          </div>

          {/* Month tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {monthOpts.map(opt => {
              const active = opt.year === selYear && opt.month === selMonth
              const isCurrentYear = opt.year === now.getFullYear()
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
                  {MONTH_NAMES[opt.month].slice(0, 3)}{!isCurrentYear ? ` '${String(opt.year).slice(2)}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 64px' }}>

          {/* Submit */}
          <SubmitWinCard
            employees={activeEmps}
            authorName={profile?.full_name ?? 'Team'}
            onSubmit={fetchPosts}
          />

          {/* Posts */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: C.muted, fontSize: 14 }}>
              Loading wins...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ fontSize: 56 }}>🎯</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: C.navy, marginTop: 14 }}>
                No wins logged yet in {MONTH_NAMES[selMonth]}
              </div>
              <div style={{ color: C.muted, marginTop: 6, fontSize: 14 }}>
                Be the first to shout someone out!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
              {posts.map(post => (
                <WinCard
                  key={post.id}
                  post={post}
                  employees={employees}
                  onReact={handleReact}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Submit card ──────────────────────────────────────────────────────────────
function SubmitWinCard({ employees, authorName, onSubmit }: {
  employees: Employee[]
  authorName: string
  onSubmit: () => void
}) {
  const sb = createClient()
  const [body, setBody]           = useState('')
  const [tagged, setTagged]       = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [posted, setPosted]       = useState(false)

  const taggedEmps = employees.filter(e => tagged.includes(e.id))
  const canSubmit  = body.trim().length > 0 && tagged.length > 0

  async function submit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    await sb.from('wins').insert({
      employee_id:  tagged[0],
      body:         body.trim(),
      author_name:  authorName,
      tagged_ids:   tagged,
      tagged_names: taggedEmps.map(e => e.name),
      reactions:    {},
    })
    setBody('')
    setTagged([])
    setSubmitting(false)
    setPosted(true)
    setTimeout(() => setPosted(false), 2500)
    onSubmit()
  }

  return (
    <div style={{
      background: C.white, borderRadius: 18, border: `1px solid ${C.border}`,
      overflow: 'hidden', boxShadow: '0 4px 24px rgba(10,37,64,0.08)',
    }}>
      {/* Author bar */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.bg}` }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: C.navy,
          color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 12, flexShrink: 0,
        }}>
          {initials(authorName)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{authorName}</div>
        <div style={{ marginLeft: 'auto', fontSize: 22 }}>✨</div>
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
        placeholder="Share a win, milestone, or shoutout... 🏆"
        style={{
          width: '100%', border: 'none', outline: 'none',
          padding: '14px 18px', fontSize: 15, color: C.text,
          resize: 'none', minHeight: 88, fontFamily: 'inherit',
          boxSizing: 'border-box', lineHeight: 1.65,
        }}
      />

      {/* Tag */}
      <div style={{ padding: '4px 18px 14px', borderTop: `1px solid ${C.bg}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
          🏷️ Tag team members
        </div>
        <EmployeeMultiSelect employees={employees} selected={tagged} onChange={setTagged} />
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 18px', borderTop: `1px solid ${C.bg}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FAFBFC',
      }}>
        <div style={{ fontSize: 12, color: C.muted }}>
          {tagged.length > 0
            ? `${tagged.length} person${tagged.length > 1 ? 's' : ''} tagged`
            : 'Tag at least one person'}
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          style={{
            background: posted
              ? '#10B981'
              : canSubmit
                ? 'linear-gradient(135deg, #0A2540 0%, #1a3a5c 100%)'
                : C.border,
            color: (canSubmit || posted) ? '#fff' : C.muted,
            border: 'none', borderRadius: 10, padding: '10px 22px',
            fontSize: 14, fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          {posted ? '✓ Posted!' : submitting ? 'Posting...' : 'Post Win 🏆'}
        </button>
      </div>
    </div>
  )
}

// ── Employee multi-select ────────────────────────────────────────────────────
function EmployeeMultiSelect({ employees, selected, onChange }: {
  employees: Employee[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )
  const selectedEmps = employees.filter(e => selected.includes(e.id))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          border: `1px solid ${open ? C.accent : C.border}`,
          borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
          display: 'flex', flexWrap: 'wrap', gap: 6,
          minHeight: 40, alignItems: 'center', background: C.white,
          transition: 'border-color 0.12s',
        }}
      >
        {selectedEmps.length === 0
          ? <span style={{ color: C.muted, fontSize: 13 }}>Select teammates...</span>
          : selectedEmps.map(e => (
            <span
              key={e.id}
              style={{
                background: avatarColor(e.name), color: '#fff',
                borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {e.name}
              <span
                onClick={ev => { ev.stopPropagation(); toggle(e.id) }}
                style={{ cursor: 'pointer', opacity: .75, fontSize: 10, lineHeight: 1 }}
              >✕</span>
            </span>
          ))
        }
        <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 10, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
          boxShadow: '0 8px 28px rgba(10,37,64,0.12)', marginTop: 4,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.bg}` }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Search..."
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: C.text, background: 'transparent', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '12px 14px', fontSize: 13, color: C.muted }}>No results</div>
              : filtered.map(e => {
                const sel = selected.includes(e.id)
                return (
                  <div
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    style={{
                      padding: '9px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: sel ? 'rgba(91,203,245,0.07)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: avatarColor(e.name), color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 11, flexShrink: 0,
                    }}>
                      {initials(e.name)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: C.text, flex: 1 }}>
                      {e.name}
                    </span>
                    {sel && <span style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>✓</span>}
                  </div>
                )
              })
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Win card ─────────────────────────────────────────────────────────────────
function WinCard({ post, employees, onReact }: {
  post: WinPost
  employees: Employee[]
  onReact: (id: string, emoji: string) => void
}) {
  const taggedNames = post.tagged_names.length > 0
    ? post.tagged_names
    : [employees.find(e => e.id === post.employee_id)?.name ?? 'Team']

  const primary   = avatarColor(taggedNames[0])
  const secondary = taggedNames.length > 1 ? avatarColor(taggedNames[1]) : primary + '66'

  const displayNames =
    taggedNames.length === 1
      ? taggedNames[0]
      : taggedNames.length === 2
        ? `${taggedNames[0]} & ${taggedNames[1]}`
        : `${taggedNames[0]}, ${taggedNames[1]} +${taggedNames.length - 2} more`

  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0)

  return (
    <div style={{
      background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
      overflow: 'hidden', boxShadow: '0 2px 12px rgba(10,37,64,0.06)',
    }}>
      {/* Color stripe */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Tagged people */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex' }}>
            {taggedNames.slice(0, 5).map((name, i) => (
              <div
                key={name}
                title={name}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: avatarColor(name), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 12, flexShrink: 0,
                  border: '2px solid #fff', position: 'relative',
                  marginLeft: i > 0 ? -10 : 0, zIndex: 5 - i,
                }}
              >
                {initials(name)}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayNames}
            </div>
          </div>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{autoEmoji(post.body)}</span>
        </div>

        {/* Body */}
        <p style={{ margin: 0, fontSize: 15, color: C.text, lineHeight: 1.7, fontWeight: 500 }}>
          {post.body}
        </p>

        {/* Meta */}
        <div style={{ marginTop: 12, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Posted by <span style={{ fontWeight: 600, color: C.dim }}>{post.author_name}</span></span>
          <span>·</span>
          <span>{fmtDate(post.created_at)}</span>
          {totalReactions > 0 && (
            <>
              <span>·</span>
              <span>{totalReactions} reaction{totalReactions !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Reactions */}
      <div style={{
        padding: '10px 20px 14px', borderTop: `1px solid ${C.bg}`,
        display: 'flex', gap: 6, flexWrap: 'wrap',
      }}>
        {REACTIONS.map(emoji => {
          const count = post.reactions[emoji] ?? 0
          return (
            <button
              key={emoji}
              onClick={() => onReact(post.id, emoji)}
              style={{
                background: count > 0 ? `${primary}18` : C.bg,
                border: `1px solid ${count > 0 ? primary + '55' : 'transparent'}`,
                borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
                fontSize: 14, display: 'flex', alignItems: 'center', gap: 5,
                color: C.text, fontWeight: count > 0 ? 700 : 400,
                transition: 'all 0.12s',
              }}
            >
              {emoji}
              {count > 0 && <span style={{ fontSize: 12, color: C.dim }}>{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
