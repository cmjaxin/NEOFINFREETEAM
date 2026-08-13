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

function buildCaptionElements(words: WhisperWord[], timelineOffset: number, chunkSize = 2): any[] {
  const elements: any[] = []
  const CAPTION_DELAY = 0.4
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize)
    if (!group.length) continue
    const start = timelineOffset + group[0].start + CAPTION_DELAY
    const nextWordStart = words[i + chunkSize]?.start
    const end = nextWordStart != null
      ? timelineOffset + nextWordStart - 0.05 + CAPTION_DELAY
      : timelineOffset + group[group.length - 1].end + 0.3 + CAPTION_DELAY
    const duration = Math.max(0.4, end - start)
    elements.push({
      type: 'text',
      track: 2,
      time: start,
      duration,
      text: group.map(w => w.word).join(' ').trim().toUpperCase(),
      font_family: 'Inter',
      font_weight: '700',
      font_size: '8 vmin',
      fill_color: '#ffffff',
      background_color: 'rgba(0,0,0,0.65)',
      background_x_padding: '28%',
      background_y_padding: '18%',
      background_border_radius: '25%',
      x: '50%',
      y: '82%',
      width: '85%',
      x_alignment: '50%',
      y_alignment: '50%',
    })
  }
  return elements
}

export async function POST(request: NextRequest) {
  let videoId = ''
  try {
    const body = await request.json()
    videoId = body.videoId
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

    const creatomateKey = process.env.CREATOMATE_API_KEY
    if (!creatomateKey) return NextResponse.json({ error: 'CREATOMATE_API_KEY not set' }, { status: 500 })

    const openAiKey = process.env.OPENAI_API_KEY

    const sb = supabase()
    const { data: video, error: vErr } = await sb
      .from('splice_videos')
      .select('*, splice_video_clips(*, splice_scenes(scene_order))')
      .eq('id', videoId).single()
    if (vErr || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const clips: any[] = (video.splice_video_clips ?? []).sort((a: any, b: any) => {
      const sa = a.splice_scenes?.scene_order ?? 0
      const sb2 = b.splice_scenes?.scene_order ?? 0
      return sa !== sb2 ? sa - sb2 : (a.clip_order ?? 0) - (b.clip_order ?? 0)
    })
    if (clips.length === 0) return NextResponse.json({ error: 'No clips found' }, { status: 400 })

    const TRIM_START = 0.3
    const TRIM_END = 0
    let cursor = 0
    const videoElements: any[] = []
    const captionElements: any[] = []

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const storedDuration = Math.max(0.5, clip.duration_seconds ?? 5)


      const clippedDuration = Math.max(0.5, storedDuration - TRIM_START - TRIM_END)

      videoElements.push({
        type: 'video',
        track: 1,
        source: clip.clip_url,
        fit: 'cover',
        volume: '100%',
        trim_start: TRIM_START,
        trim_duration: clippedDuration,
      })

      if (openAiKey && clip.clip_url) {
        try {
          const words = await transcribeClip(clip.clip_url, openAiKey)
          captionElements.push(...buildCaptionElements(words, cursor))
        } catch (err) {
          console.warn(`Transcription failed for clip ${i}:`, err)
        }
      }

      cursor += clippedDuration
    }

    // Disclaimer image temporarily removed — needs to be hosted in Supabase storage
    // TODO: upload disclaimer bar to splice-clips/assets/ and add URL here
    const disclaimerElement = null

    const renderScript = {
      output_format: 'mp4',
      width: 720,
      height: 1280,
      frame_rate: 30,
      elements: [
        {
          type: 'composition',
          track: 1,
          elements: [
            ...videoElements,
            ...captionElements,
            ...(disclaimerElement ? [disclaimerElement] : []),
          ],
        },
      ],
    }

    console.log('Creatomate payload clips:', clips.length, 'captions:', captionElements.length)

    const res = await fetch('https://api.creatomate.com/v2/renders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatomateKey}`,
      },
      body: JSON.stringify({ source: renderScript }),
    })

    const responseText = await res.text()
    console.log('Creatomate response:', res.status, responseText)

    if (!res.ok) throw new Error('Creatomate error: ' + responseText)

    const data = JSON.parse(responseText)
    const render = Array.isArray(data) ? data[0] : data
    const renderId = render?.id

    await sb.from('splice_videos')
      .update({ status: 'rendering', render_job_id: renderId })
      .eq('id', videoId)

    return NextResponse.json({ renderId, videoId, clipCount: clips.length, captionCount: captionElements.length })
  } catch (e: any) {
    console.error('Reels render error:', e)
    if (videoId) await supabase().from('splice_videos').update({ status: 'error' }).eq('id', videoId)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
