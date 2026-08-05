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
      : timelineOffset + group[group.length - 1].end + 0.25
    chunks.push({
      text: group.map(w => w.word).join(' ').trim(),
      start: timelineOffset + group[0].start,
      end: Math.max(timelineOffset + group[0].start + 0.4, end),
    })
  }
  return chunks
}

function captionClip(chunk: CaptionChunk) {
  const text = chunk.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return {
    asset: {
      type: 'html',
      html: `<div style="background:rgba(0,0,0,0.72);border-radius:14px;padding:16px 28px;display:inline-block"><span style="font-family:Arial,Helvetica,sans-serif;font-size:54px;font-weight:900;color:#fff;line-height:1.2">${text}</span></div>`,
      width: 680,
      height: 220,
    },
    start: chunk.start,
    length: Math.max(0.4, chunk.end - chunk.start),
    position: 'bottom',
    offset: { x: 0, y: 0.15 },
  }
}

// End card — separate Shotstack clips so images load via native asset renderer
const NEO_LOGO = 'https://mettlehq.com/wp-content/uploads/2023/06/NEO_LOGO_HORIZ_WHITE-1.png'
const EHL_LOGO  = 'https://mettlehq.com/wp-content/uploads/2018/06/EHL-Logo.png'
const DISCLAIMER = '© 2026 Better Home & Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License #02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, Floor 80, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access'

function endCardClips(
  name: string, title: string, nmls: string, phone: string, email: string,
  start: number, dur: number,
) {
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const infoLines = [nmls, phone, email].filter(Boolean)
    .map(v => `<p style="font-family:Arial,Helvetica,sans-serif;font-size:26px;color:#b8cfe8;margin:0;padding:5px 0">${e(v)}</p>`)
    .join('')

  const nameHtml = `<div style="text-align:center;width:660px">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:54px;font-weight:900;color:#ffffff;margin:0 0 10px">${e(name)}</p>
    ${title ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:700;color:#7eb8f7;margin:0 0 18px">${e(title)}</p>` : ''}
    ${infoLines}
  </div>`

  const disclaimerHtml = `<div style="text-align:center;width:660px;border-top:1px solid rgba(255,255,255,0.2);padding-top:14px">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.55;margin:0">${e(DISCLAIMER)}</p>
  </div>`

  const fade = { in: 'fade' }
  return [
    // Navy background
    {
      asset: { type: 'html', html: '<div style="width:720px;height:1280px;background:#060e1f"></div>', width: 720, height: 1280 },
      start, length: dur, position: 'center', transition: fade,
    },
    // NEO logo — native image asset (no HTML img tag, loads reliably)
    {
      asset: { type: 'image', src: NEO_LOGO },
      start, length: dur, position: 'top', offset: { x: 0, y: -0.35 }, scale: 0.42, transition: fade,
    },
    // Name / title / contact
    {
      asset: { type: 'html', html: nameHtml, width: 660, height: 340 },
      start, length: dur, position: 'center', offset: { x: 0, y: 0.01 }, transition: fade,
    },
    // Disclaimer
    {
      asset: { type: 'html', html: disclaimerHtml, width: 660, height: 220 },
      start, length: dur, position: 'bottom', offset: { x: 0, y: 0.13 }, transition: fade,
    },
    // Equal Housing logo — native image asset
    {
      asset: { type: 'image', src: EHL_LOGO },
      start, length: dur, position: 'bottom', offset: { x: 0, y: 0.055 }, scale: 0.055, transition: fade,
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

      // Use speech timestamps for tight cuts — trim silence before first word and after last word
      // Small padding so first/last syllable isn't clipped
      const speechStart = words.length > 0 ? Math.max(0, words[0].start - 0.15) : 0
      const speechEnd   = words.length > 0 ? Math.min(rawDuration, words[words.length - 1].end + 0.2) : rawDuration
      const usedLength  = Math.max(0.5, speechEnd - speechStart)

      videoClips.push({
        asset: { type: 'video', src: clip.clip_url, volume: 1, trim: speechStart },
        start: cursor,
        length: usedLength,
        fit: 'cover',
      })

      // Caption chunks: word timestamps are relative to clip start; adjust for trim and timeline position
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

    // Tracks: top layer first
    // End card has 5 clips across multiple layers — put them all in one track (Shotstack handles z-order by track index)
    const tracks: any[] = []
    if (allCaptionChunks.length > 0) tracks.push({ clips: allCaptionChunks.map(captionClip) })

    // End card layers (each in its own track so z-order is correct: logo over bg, text over bg)
    const [ecBg, ecLogo, ecName, ecDisclaimer, ecEHL] = ecClips
    tracks.push({ clips: [ecLogo] })
    tracks.push({ clips: [ecName] })
    tracks.push({ clips: [ecDisclaimer] })
    tracks.push({ clips: [ecEHL] })
    tracks.push({ clips: [ecBg, ...videoClips] })

    const timeline = { background: '#000000', tracks }

    const shotRes = await fetch(shotStackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotStackApiKey },
      body: JSON.stringify({
        timeline,
        output: { format: 'mp4', resolution: 'sd', aspectRatio: '9:16', fps: 25 },
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
