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
  form.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), 'clip.mp4')
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

// words are already relative to their clip's trimmed start; timelineOffset is cursor position
function groupWordsToChunks(words: WhisperWord[], timelineOffset: number, _unused = 0, chunkSize = 4): CaptionChunk[] {
  const chunks: CaptionChunk[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize)
    if (!group.length) continue
    const nextStart = words[i + chunkSize]?.start
    const end = timelineOffset + (nextStart != null ? nextStart - 0.05 : group[group.length - 1].end + 0.2)
    chunks.push({
      text: group.map(w => w.word).join(' ').trim(),
      start: timelineOffset + group[0].start,
      end: Math.max(timelineOffset + group[0].start + 0.3, end),
    })
  }
  return chunks
}

// TikTok-style caption: large bold white text with dark pill background
function captionClip(chunk: CaptionChunk) {
  const duration = Math.max(0.3, chunk.end - chunk.start)
  const escaped = chunk.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return {
    asset: {
      type: 'html',
      html: `<div style="width:900px;padding:18px 32px;background:rgba(0,0,0,0.72);border-radius:16px;text-align:center">
        <span style="font-family:Montserrat,Arial,sans-serif;font-size:64px;font-weight:900;color:#ffffff;line-height:1.25;letter-spacing:-0.5px">${escaped}</span>
      </div>`,
      width: 900,
      height: 260,
    },
    start: chunk.start,
    length: duration,
    position: 'bottom',
    offset: { x: 0, y: 0.12 },
  }
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()
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
    const shotStackUrl = process.env.SHOTSTACK_API_URL ?? 'https://api.shotstack.io/stage/render'
    const openAiKey = process.env.OPENAI_API_KEY

    if (!shotStackApiKey) return NextResponse.json({ error: 'SHOTSTACK_API_KEY not configured' }, { status: 500 })

    // Sort clips: scene_order first, then clip_order within scene
    const clips: any[] = (video.splice_video_clips ?? []).sort((a: any, b: any) => {
      const sa = a.splice_scenes?.scene_order ?? 0
      const sb2 = b.splice_scenes?.scene_order ?? 0
      return sa !== sb2 ? sa - sb2 : (a.clip_order ?? 0) - (b.clip_order ?? 0)
    })

    if (clips.length === 0) return NextResponse.json({ error: 'No clips found' }, { status: 400 })

    // Build sequential timeline — clean cuts, no transitions
    let cursor = 0
    const videoClips: any[] = []
    const allCaptionChunks: CaptionChunk[] = []

    for (const clip of clips) {
      const duration = Math.max(1, clip.duration_seconds ?? 5)

      // Clean cut — no transition, trim 0.25s of dead air from start and end
      const trimStart = 0.25
      const trimEnd = 0.25
      const usableDuration = Math.max(1, duration - trimStart - trimEnd)
      videoClips.push({
        asset: {
          type: 'video',
          src: clip.clip_url,
          volume: 1,
          trim: trimStart,
        },
        start: cursor,
        length: usableDuration,
        fit: 'cover',
        scale: 1,
      })

      // Transcribe for captions — offset by trimStart so captions align to trimmed clip
      if (openAiKey && clip.clip_url) {
        try {
          const words = await transcribeClip(clip.clip_url, openAiKey)
          // Shift word timestamps: subtract trimStart, clamp to usable window
          const adjusted = words
            .map(w => ({ ...w, start: w.start - trimStart, end: w.end - trimStart }))
            .filter(w => w.end > 0 && w.start < usableDuration)
          allCaptionChunks.push(...groupWordsToChunks(adjusted, cursor, 0))
        } catch (err) {
          console.warn('Transcription failed for clip, skipping:', err)
        }
      }

      cursor += usableDuration
    }

    const totalDuration = cursor

    // End card (5 s)
    const endCardStart = totalDuration
    const endCardDuration = 6
    const p = profile as any
    const displayName  = p?.full_name ?? ''
    const displayTitle = p?.title ?? ''
    const displayNmls  = p?.nmls  ? `NMLS# ${p.nmls}` : ''
    const displayPhone = p?.phone ?? ''
    const displayEmail = p?.email ?? ''

    // NEO logo hosted on the deployed app
    const appBase = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://finfree-team-hq.vercel.app')
    const neoLogoUrl = `${appBase}/neo-logo.png`

    const DISCLAIMER = '© 2026 Better Home &amp; Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License #02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved. Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, Floor 80, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. NMLS Consumer Access'

    // Single HTML end card — full layout in one asset
    const endCardHtml = `
<div style="width:1080px;height:1920px;background:#060e1f;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:120px 80px 80px;box-sizing:border-box">
  <!-- Logo -->
  <div style="display:flex;align-items:center;justify-content:center">
    <img src="${neoLogoUrl}" style="width:320px;height:auto;filter:brightness(0) invert(1)" />
  </div>

  <!-- Advisor info -->
  <div style="text-align:center">
    <p style="font-family:Montserrat,Arial,sans-serif;font-size:62px;font-weight:900;color:#ffffff;margin:0 0 16px">${displayName}</p>
    ${displayTitle ? `<p style="font-family:Montserrat,Arial,sans-serif;font-size:34px;font-weight:600;color:#7eb8f7;margin:0 0 28px">${displayTitle}</p>` : ''}
    <div style="display:flex;flex-direction:column;gap:14px;align-items:center">
      ${displayNmls  ? `<p style="font-family:Montserrat,Arial,sans-serif;font-size:28px;color:#ccddee;margin:0">${displayNmls}</p>`  : ''}
      ${displayPhone ? `<p style="font-family:Montserrat,Arial,sans-serif;font-size:28px;color:#ccddee;margin:0">${displayPhone}</p>` : ''}
      ${displayEmail ? `<p style="font-family:Montserrat,Arial,sans-serif;font-size:28px;color:#ccddee;margin:0">${displayEmail}</p>` : ''}
    </div>
  </div>

  <!-- Disclaimer -->
  <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:32px;width:100%">
    <p style="font-family:Montserrat,Arial,sans-serif;font-size:18px;color:rgba(255,255,255,0.45);line-height:1.55;text-align:center;margin:0">${DISCLAIMER}</p>
  </div>
</div>`

    const endCard = {
      asset: { type: 'html', html: endCardHtml, width: 1080, height: 1920 },
      start: endCardStart,
      length: endCardDuration,
      position: 'center',
      transition: { in: 'fade' },
    }

    // Track order: top layer first
    const tracks: any[] = []
    if (allCaptionChunks.length > 0) {
      tracks.push({ clips: allCaptionChunks.map(captionClip) })
    }
    tracks.push({ clips: [endCard] })
    tracks.push({ clips: videoClips })

    const timeline = {
      background: '#000000',
      tracks,
    }

    const shotRes = await fetch(shotStackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotStackApiKey },
      body: JSON.stringify({
        timeline,
        output: { format: 'mp4', resolution: 'hd', aspectRatio: '9:16', fps: 30 },
      }),
    })

    if (!shotRes.ok) {
      const errText = await shotRes.text()
      throw new Error('Shotstack error: ' + errText)
    }

    const shotData = await shotRes.json()
    const renderId = shotData.response?.id

    await sb.from('splice_videos').update({ status: 'rendering', render_job_id: renderId }).eq('id', videoId)

    return NextResponse.json({ renderId, videoId, clipCount: clips.length, totalDuration, captionChunks: allCaptionChunks.length })
  } catch (e: any) {
    console.error('Reels render error:', e)
    await supabase().from('splice_videos').update({ status: 'error' }).eq('id', (await (async () => {
      try { return (await request.json()).videoId } catch { return '' }
    })()))
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
