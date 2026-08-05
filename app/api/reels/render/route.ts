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
  const videoBuffer = await videoRes.arrayBuffer()

  const form = new FormData()
  form.append('file', new Blob([videoBuffer], { type: 'video/webm' }), 'clip.webm')
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

// Group into 3-word chunks — easier to read on vertical video
function groupWordsToChunks(words: WhisperWord[], timelineOffset: number, chunkSize = 3): CaptionChunk[] {
  const chunks: CaptionChunk[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize)
    if (!group.length) continue
    const nextStart = words[i + chunkSize]?.start
    const chunkEnd = nextStart != null
      ? timelineOffset + nextStart - 0.05
      : timelineOffset + group[group.length - 1].end + 0.25
    chunks.push({
      text: group.map(w => w.word).join(' ').trim(),
      start: timelineOffset + group[0].start,
      end: Math.max(timelineOffset + group[0].start + 0.4, chunkEnd),
    })
  }
  return chunks
}

// Bold white caption with dark background pill — TikTok style
function captionClip(chunk: CaptionChunk) {
  const duration = Math.max(0.4, chunk.end - chunk.start)
  const text = chunk.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return {
    asset: {
      type: 'html',
      html: `<div style="display:inline-block;background:rgba(0,0,0,0.75);border-radius:20px;padding:20px 40px;max-width:940px;text-align:center"><span style="font-family:Arial,Helvetica,sans-serif;font-size:72px;font-weight:900;color:#ffffff;line-height:1.2">${text}</span></div>`,
      width: 1000,
      height: 300,
    },
    start: chunk.start,
    length: duration,
    position: 'bottom',
    offset: { x: 0, y: 0.14 },
  }
}

const NEO_LOGO = 'https://mettlehq.com/wp-content/uploads/2023/06/NEO_LOGO_HORIZ_WHITE-1.png'
const EHL_LOGO = 'https://mettlehq.com/wp-content/uploads/2018/06/EHL-Logo.png'
const DISCLAIMER = '&copy; 2026 Better Home &amp; Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License #02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, Floor 80, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access'

function buildEndCard(name: string, title: string, nmls: string, phone: string, email: string, start: number, duration: number) {
  const infoRows = [nmls, phone, email].filter(Boolean)
    .map(v => `<p style="font-family:Arial,Helvetica,sans-serif;font-size:30px;color:#b8cfe8;margin:0;padding:6px 0">${v}</p>`)
    .join('')

  const html = `<div style="width:1080px;height:1920px;background:#060e1f;box-sizing:border-box;padding:110px 80px 70px;display:flex;flex-direction:column;align-items:center;justify-content:space-between">
  <img src="${NEO_LOGO}" width="320" style="display:block" />
  <div style="text-align:center">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:64px;font-weight:900;color:#ffffff;margin:0 0 14px">${name}</p>
    ${title ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:600;color:#7eb8f7;margin:0 0 24px">${title}</p>` : ''}
    ${infoRows}
  </div>
  <div style="width:100%">
    <div style="border-top:1px solid rgba(255,255,255,0.18);padding-top:28px;margin-bottom:22px">
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:17px;color:rgba(255,255,255,0.42);line-height:1.6;text-align:center;margin:0">${DISCLAIMER}</p>
    </div>
    <div style="text-align:center"><img src="${EHL_LOGO}" width="64" style="opacity:0.55;display:inline-block" /></div>
  </div>
</div>`

  return {
    asset: { type: 'html', html, width: 1080, height: 1920 },
    start,
    length: duration,
    position: 'center',
    transition: { in: 'fade' },
  }
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
      .eq('id', videoId)
      .single()
    if (vErr || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const { data: profile } = await sb
      .from('profiles')
      .select('full_name, email, title, nmls, phone')
      .eq('id', video.user_id)
      .single()

    const shotStackApiKey = process.env.SHOTSTACK_API_KEY
    // Default to production — stage watermarks videos
    const shotStackUrl = process.env.SHOTSTACK_API_URL ?? 'https://api.shotstack.io/v1/render'
    const openAiKey = process.env.OPENAI_API_KEY

    if (!shotStackApiKey) return NextResponse.json({ error: 'SHOTSTACK_API_KEY not configured' }, { status: 500 })

    // Sort clips: scene_order, then clip_order
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
      const duration = Math.max(1, clip.duration_seconds ?? 5)

      // NO trim — WebM files from MediaRecorder have no seek index so trim causes black video
      // fit: cover fills the 9:16 frame; no scale override
      videoClips.push({
        asset: {
          type: 'video',
          src: clip.clip_url,
          volume: 1,
        },
        start: cursor,
        length: duration,
        fit: 'cover',
      })

      if (openAiKey && clip.clip_url) {
        try {
          const words = await transcribeClip(clip.clip_url, openAiKey)
          allCaptionChunks.push(...groupWordsToChunks(words, cursor))
        } catch (err) {
          console.warn('Transcription failed for clip, skipping:', err)
        }
      }

      cursor += duration
    }

    const endCardStart = cursor
    const endCardDuration = 7

    const p = profile as any
    const endCard = buildEndCard(
      p?.full_name ?? '',
      p?.title ?? '',
      p?.nmls ? `NMLS# ${p.nmls}` : '',
      p?.phone ?? '',
      p?.email ?? '',
      endCardStart,
      endCardDuration,
    )

    // Track order: top = first in array
    const tracks: any[] = []
    if (allCaptionChunks.length > 0) tracks.push({ clips: allCaptionChunks.map(captionClip) })
    tracks.push({ clips: [endCard] })
    tracks.push({ clips: videoClips })

    const timeline = { background: '#000000', tracks }

    const shotRes = await fetch(shotStackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotStackApiKey },
      body: JSON.stringify({
        timeline,
        output: { format: 'mp4', resolution: 'hd', aspectRatio: '9:16', fps: 30 },
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
