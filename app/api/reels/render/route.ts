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

function groupWordsToChunks(words: WhisperWord[], timelineOffset: number, chunkSize = 3): CaptionChunk[] {
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

function captionClip(chunk: CaptionChunk) {
  const text = chunk.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').toUpperCase()
  return {
    asset: {
      type: 'html',
      html: `<div style="width:680px;box-sizing:border-box;padding:0 16px;text-align:center"><div style="background:rgba(0,0,0,0.82);border-radius:10px;padding:14px 22px;width:100%;box-sizing:border-box"><span style="font-family:Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;color:#ffffff;line-height:1.3;word-break:break-word;white-space:normal;display:block;text-align:center;letter-spacing:0.04em">${text}</span></div></div>`,
      width: 680,
      height: 180,
    },
    start: chunk.start,
    length: Math.max(0.4, chunk.end - chunk.start),
    position: 'bottom',
    offset: { x: 0, y: 0.12 },
  }
}

// End card — 1 full-frame HTML text clip + 2 native image clips for logos
const NEO_LOGO = 'https://mettlehq.com/wp-content/uploads/2023/06/NEO_LOGO_HORIZ_WHITE-1.png'
const EHL_LOGO  = 'https://mettlehq.com/wp-content/uploads/2018/06/EHL-Logo.png'
const DISCLAIMER = '© 2026 Better Home & Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License #02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, Floor 80, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access'

function endCardClips(
  name: string, title: string, nmls: string, phone: string, email: string,
  start: number, dur: number,
) {
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const infoLines = [nmls, phone, email].filter(Boolean)
    .map(v => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;color:#b8cfe8;margin:4px 0">${e(v)}</div>`)
    .join('')

  // Full-frame HTML — navy bg, centered text block, disclaimer pinned to bottom
  // Top ~180px left empty for the NEO logo image clip to sit on top
  // Bottom ~80px left for EHL logo image clip
  const bodyHtml = `
    <div style="width:720px;height:1280px;background:#060e1f;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:180px 40px 120px">
      <div style="text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:46px;font-weight:900;color:#ffffff;line-height:1.1">${e(name)}</div>
        ${title ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#7eb8f7;margin-top:4px">${e(title)}</div>` : ''}
        <div style="margin-top:14px">${infoLines}</div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.18);padding-top:12px;width:100%;text-align:center">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.38);line-height:1.55">${e(DISCLAIMER)}</div>
      </div>
    </div>`.replace(/\n\s*/g, '')

  const fade = { in: 'fade' }
  return [
    // Full-frame HTML: navy bg + all text (top/bottom gaps for image clips)
    {
      asset: { type: 'html', html: bodyHtml, width: 720, height: 1280 },
      start, length: dur, position: 'center', transition: fade,
    },
    // NEO logo — small, top-center, sitting in the empty top band
    {
      asset: { type: 'image', src: NEO_LOGO },
      start, length: dur, position: 'top', offset: { x: 0, y: 0.06 }, scale: 0.18, transition: fade,
    },
    // EHL logo — bottom-center, above disclaimer
    {
      asset: { type: 'image', src: EHL_LOGO },
      start, length: dur, position: 'bottom', offset: { x: 0, y: 0.06 }, scale: 0.05, transition: fade,
    },
  ]
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

      // Give a generous pre-speech buffer so first syllable never gets clipped.
      // Give a generous post-speech buffer so last word isn't cut early.
      // Only trim silence if speech starts more than 0.15s in to avoid WebM black-frame bug.
      const speechStart = words.length > 0 ? Math.max(0, words[0].start - 0.15) : 0
      const speechEnd   = words.length > 0 ? Math.min(rawDuration, words[words.length - 1].end + 0.4) : rawDuration
      const usedLength  = Math.max(0.5, speechEnd - speechStart)

      const assetTrim = speechStart > 0.15 ? speechStart : 0

      videoClips.push({
        asset: { type: 'video', src: clip.clip_url, volume: 1, ...(assetTrim > 0 ? { trim: assetTrim } : {}) },
        start: cursor,
        length: usedLength,
        fit: 'cover',
      })

      // Caption word timestamps are relative to clip start; offset for trim + timeline position
      if (words.length > 0) {
        const adjusted = words
          .map(w => ({ ...w, start: w.start - speechStart, end: w.end - speechStart }))
          .filter(w => w.end > 0 && w.start < usedLength)
        allCaptionChunks.push(...groupWordsToChunks(adjusted, cursor))
      }

      cursor += usedLength
    }

    const endCardStart = cursor
    const endCardDur   = 7
    const p = profile as any
    const ecClips = endCardClips(
      p?.full_name ?? '', p?.title ?? '',
      p?.nmls ? `NMLS# ${p.nmls}` : '', p?.phone ?? '', p?.email ?? '',
      endCardStart, endCardDur,
    )

    // Track order: first track = top layer in Shotstack
    // Captions on top, then end card logos, then end card body, then video clips at bottom
    const [ecBody, ecLogo, ecEHL] = ecClips
    const tracks: any[] = []
    if (allCaptionChunks.length > 0) tracks.push({ clips: allCaptionChunks.map(captionClip) })
    tracks.push({ clips: [ecLogo] })
    tracks.push({ clips: [ecEHL] })
    tracks.push({ clips: [ecBody] })       // end card body on its own track — NOT mixed with video clips
    tracks.push({ clips: videoClips })     // video clips on their own bottom track

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
