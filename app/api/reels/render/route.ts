import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface WhisperWord { word: string; start: number; end: number }
interface CaptionChunk { text: string; start: number; end: number }

async function transcribeClip(clipUrl: string, apiKey: string): Promise<WhisperWord[]> {
  const videoRes = await fetch(clipUrl)
  if (!videoRes.ok) throw new Error(`Failed to fetch clip: ${clipUrl}`)
  const buf = await videoRes.arrayBuffer()
  const form = new FormData()
  form.append('file', new Blob([buf], { type: 'video/webm' }), 'clip.webm')
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) { console.warn('Whisper error:', await res.text()); return [] }
  const data = await res.json()
  return (data.words ?? []) as WhisperWord[]
}

function groupWordsToChunks(words: WhisperWord[], timelineOffset: number, chunkSize = 2): CaptionChunk[] {
  const chunks: CaptionChunk[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize)
    if (!group.length) continue
    const nextStart = words[i + chunkSize]?.start
    const end = nextStart != null
      ? timelineOffset + nextStart - 0.05
      : timelineOffset + group[group.length - 1].end + 0.2
    chunks.push({
      text: group.map(w => w.word).join(' ').trim(),
      start: timelineOffset + group[0].start,
      end: Math.max(timelineOffset + group[0].start + 0.4, end),
    })
  }
  return chunks
}

// Native Shotstack title — no HTML, consistent font everywhere
function captionClip(chunk: CaptionChunk) {
  return {
    asset: {
      type: 'title',
      text: chunk.text.toUpperCase(),
      style: 'minimal',
      color: '#ffffff',
      size: 'medium',
      background: '#000000',
    },
    start: chunk.start,
    length: Math.max(0.4, chunk.end - chunk.start),
    position: 'bottom',
    offset: { x: 0, y: 0.1 },
  }
}

// End card — all native Shotstack assets, no HTML
const NEO_LOGO  = 'https://mettlehq.com/wp-content/uploads/2023/06/NEO_LOGO_HORIZ_WHITE-1.png'
const EHL_LOGO  = 'https://mettlehq.com/wp-content/uploads/2018/06/EHL-Logo.png'
const DISCLAIMER = 'Equal Housing Lender. NMLS #330511. Not available in all states. © 2026 NEO Home Loans. All rights reserved.'

function buildEndCard(
  name: string, title: string, nmls: string, phone: string, email: string,
  start: number, dur: number,
): any[] {
  const clips: any[] = []

  // Navy background
  clips.push({
    asset: { type: 'color', color: '#060e1f' },
    start, length: dur,
  })

  // NEO logo — top center, small
  clips.push({
    asset: { type: 'image', src: NEO_LOGO },
    start, length: dur,
    position: 'top', offset: { x: 0, y: -0.15 }, scale: 0.2,
  })

  // EHL logo — bottom center, tiny
  clips.push({
    asset: { type: 'image', src: EHL_LOGO },
    start, length: dur,
    position: 'bottom', offset: { x: 0, y: 0.1 }, scale: 0.06,
  })

  // Name — large, center
  clips.push({
    asset: { type: 'title', text: name, style: 'minimal', color: '#ffffff', size: 'large' },
    start, length: dur,
    position: 'center', offset: { x: 0, y: 0.12 },
  })

  // Title line
  if (title) {
    clips.push({
      asset: { type: 'title', text: title, style: 'minimal', color: '#7eb8f7', size: 'small' },
      start, length: dur,
      position: 'center', offset: { x: 0, y: 0.04 },
    })
  }

  // NMLS
  if (nmls) {
    clips.push({
      asset: { type: 'title', text: nmls, style: 'minimal', color: '#a0b4c8', size: 'x-small' },
      start, length: dur,
      position: 'center', offset: { x: 0, y: title ? -0.03 : 0.04 },
    })
  }

  // Phone
  if (phone) {
    clips.push({
      asset: { type: 'title', text: phone, style: 'minimal', color: '#b8cfe8', size: 'x-small' },
      start, length: dur,
      position: 'center', offset: { x: 0, y: -0.08 },
    })
  }

  // Email
  if (email) {
    clips.push({
      asset: { type: 'title', text: email, style: 'minimal', color: '#b8cfe8', size: 'x-small' },
      start, length: dur,
      position: 'center', offset: { x: 0, y: phone ? -0.15 : -0.08 },
    })
  }

  // Disclaimer — very small, bottom
  clips.push({
    asset: { type: 'title', text: DISCLAIMER, style: 'minimal', color: '#4a6070', size: 'xx-small' },
    start, length: dur,
    position: 'bottom', offset: { x: 0, y: 0.03 },
  })

  return clips
}

export async function POST(request: NextRequest) {
  let videoId = ''
  try {
    const body = await request.json()
    videoId = body.videoId
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

    const sb = supabase()
    const { data: video, error: vErr } = await sb
      .from('splice_videos')
      .select('*, splice_video_clips(*, splice_scenes(scene_order))')
      .eq('id', videoId).single()
    if (vErr || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const { data: profile } = await sb
      .from('profiles')
      .select('full_name, email, title, nmls, phone')
      .eq('id', video.user_id).single()

    const shotStackApiKey = process.env.SHOTSTACK_API_KEY
    const shotStackUrl = process.env.SHOTSTACK_API_URL ?? 'https://api.shotstack.io/v1/render'
    const openAiKey = process.env.OPENAI_API_KEY
    if (!shotStackApiKey) return NextResponse.json({ error: 'SHOTSTACK_API_KEY not set' }, { status: 500 })

    const clips: any[] = (video.splice_video_clips ?? []).sort((a: any, b: any) => {
      const sa = a.splice_scenes?.scene_order ?? 0
      const sb2 = b.splice_scenes?.scene_order ?? 0
      return sa !== sb2 ? sa - sb2 : (a.clip_order ?? 0) - (b.clip_order ?? 0)
    })
    if (clips.length === 0) return NextResponse.json({ error: 'No clips found' }, { status: 400 })

    let cursor = 0
    const videoClips: any[] = []
    const allCaptionChunks: CaptionChunk[] = []

    for (const clip of clips) {
      const rawDuration = Math.max(1, clip.duration_seconds ?? 5)
      let words: WhisperWord[] = []

      if (openAiKey && clip.clip_url) {
        try { words = await transcribeClip(clip.clip_url, openAiKey) }
        catch (err) { console.warn('Transcription failed, skipping:', err) }
      }

      // Use full raw duration — no trim, no silence detection.
      // WebM + Shotstack trim is unreliable and causes early cuts and inter-clip pauses.
      const usedLength = Math.max(0.5, rawDuration)

      videoClips.push({
        asset: { type: 'video', src: clip.clip_url, volume: 1 },
        start: cursor,
        length: usedLength,
        fit: 'cover',
      })

      // Caption timestamps are relative to clip start; offset for timeline position
      if (words.length > 0) {
        allCaptionChunks.push(...groupWordsToChunks(words, cursor))
      }

      cursor += usedLength
    }

    const endCardStart = cursor
    const endCardDur   = 7
    const p = profile as any
    const ecClips = buildEndCard(
      p?.full_name ?? '', p?.title ?? '',
      p?.nmls ? `NMLS# ${p.nmls}` : '', p?.phone ?? '', p?.email ?? '',
      endCardStart, endCardDur,
    )

    // Track order: first track = top layer in Shotstack
    // Captions on top, end card clips on separate tracks, video clips at bottom
    const tracks: any[] = []
    if (allCaptionChunks.length > 0) tracks.push({ clips: allCaptionChunks.map(captionClip) })
    // Each end card clip on its own track to avoid Shotstack conflicts
    for (const ec of ecClips) tracks.push({ clips: [ec] })
    tracks.push({ clips: videoClips })

    const timeline = { background: '#000000', tracks }

    const shotRes = await fetch(shotStackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotStackApiKey },
      body: JSON.stringify({
        timeline,
        output: { format: 'mp4', size: { width: 720, height: 1280 }, fps: 30 },
      }),
    })

    if (!shotRes.ok) throw new Error('Shotstack error: ' + await shotRes.text())

    const shotData = await shotRes.json()
    const renderId = shotData.response?.id
    await sb.from('splice_videos').update({ status: 'rendering', render_job_id: renderId }).eq('id', videoId)

    return NextResponse.json({ renderId, videoId, clipCount: clips.length, totalDuration: cursor, captionChunks: allCaptionChunks.length })
  } catch (e: any) {
    console.error('Reels render error:', e)
    if (videoId) await supabase().from('splice_videos').update({ status: 'error' }).eq('id', videoId)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
