import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Allow up to 5 min for transcription + render submission
export const maxDuration = 300

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface WhisperWord {
  word: string
  start: number
  end: number
}

interface CaptionChunk {
  text: string
  start: number  // seconds into the full timeline
  end: number
}

// Fetch a clip URL and transcribe it with Whisper, returning word-level timestamps
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

  if (!res.ok) {
    const err = await res.text()
    console.warn('Whisper error for clip:', err)
    return []
  }

  const data = await res.json()
  return (data.words ?? []) as WhisperWord[]
}

// Group words into chunks of ~4 words for caption display
function groupWordsToChunks(words: WhisperWord[], timelineOffset: number, chunkSize = 4): CaptionChunk[] {
  const chunks: CaptionChunk[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize)
    if (!group.length) continue
    chunks.push({
      text: group.map(w => w.word).join(' ').trim(),
      start: timelineOffset + group[0].start,
      end: timelineOffset + group[group.length - 1].end,
    })
  }
  return chunks
}

// Build a Shotstack HTML overlay clip for a caption chunk
function captionClip(chunk: CaptionChunk) {
  const duration = Math.max(0.2, chunk.end - chunk.start)
  const escaped = chunk.text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return {
    asset: {
      type: 'html',
      html: `<p style="font-family:'Montserrat',sans-serif;font-size:56px;font-weight:800;color:#ffffff;text-align:center;margin:0;padding:8px 24px;text-shadow:0 2px 8px rgba(0,0,0,0.95),0 0 2px #000,0 0 2px #000">${escaped}</p>`,
      width: 1080,
      height: 160,
    },
    start: chunk.start,
    length: duration,
    position: 'bottom',
    offset: { x: 0, y: 0.08 },
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
      .select('full_name, email')
      .eq('id', video.user_id)
      .single()

    const shotStackApiKey = process.env.SHOTSTACK_API_KEY
    const shotStackUrl = process.env.SHOTSTACK_API_URL ?? 'https://api.shotstack.io/stage/render'
    const openAiKey = process.env.OPENAI_API_KEY

    if (!shotStackApiKey) {
      return NextResponse.json({ error: 'SHOTSTACK_API_KEY not configured' }, { status: 500 })
    }

    // Sort clips: scene_order first, then clip_order within each scene
    const clips: any[] = (video.splice_video_clips ?? []).sort((a: any, b: any) => {
      const sceneA = a.splice_scenes?.scene_order ?? 0
      const sceneB = b.splice_scenes?.scene_order ?? 0
      if (sceneA !== sceneB) return sceneA - sceneB
      return (a.clip_order ?? 0) - (b.clip_order ?? 0)
    })

    if (clips.length === 0) {
      return NextResponse.json({ error: 'No clips found for this video' }, { status: 400 })
    }

    // Build sequential video clips and transcribe each for captions
    let cursor = 0
    const videoClips: any[] = []
    const allCaptionChunks: CaptionChunk[] = []

    for (const clip of clips) {
      const duration = clip.duration_seconds ?? 5
      videoClips.push({
        asset: { type: 'video', src: clip.clip_url, trim: 0 },
        start: cursor,
        length: duration,
        transition: { in: 'fade', out: 'fade' },
      })

      // Transcribe for speech-synced captions if we have an OpenAI key
      if (openAiKey && clip.clip_url) {
        try {
          const words = await transcribeClip(clip.clip_url, openAiKey)
          const chunks = groupWordsToChunks(words, cursor)
          allCaptionChunks.push(...chunks)
        } catch (err) {
          console.warn('Transcription failed for clip, skipping captions for this clip:', err)
        }
      }

      cursor += duration
    }

    const totalDuration = cursor

    // End card (5 seconds)
    const endCardDuration = 5
    const endCardStart = totalDuration
    const displayName = (profile as any)?.full_name ?? ''
    const displayEmail = (profile as any)?.email ?? ''

    // Caption track — one clip per caption chunk
    const captionTrack = allCaptionChunks.length > 0
      ? [{ clips: allCaptionChunks.map(captionClip) }]
      : []

    const timeline = {
      background: '#000000',
      tracks: [
        // Video track
        { clips: videoClips },
        // Speech-synced captions
        ...captionTrack,
        // End card text
        {
          clips: [
            {
              asset: {
                type: 'html',
                html: `<p style="font-family:Montserrat,sans-serif;font-size:48px;font-weight:900;color:#ffffff;text-align:center;margin:0">${displayName}</p>`,
                width: 1080,
                height: 200,
              },
              start: endCardStart,
              length: endCardDuration,
              position: 'center',
              offset: { x: 0, y: 0.1 },
              transition: { in: 'fade' },
            },
            {
              asset: {
                type: 'html',
                html: `<p style="font-family:Montserrat,sans-serif;font-size:28px;color:#999999;text-align:center;margin:0">${displayEmail}</p>`,
                width: 1080,
                height: 120,
              },
              start: endCardStart,
              length: endCardDuration,
              position: 'center',
              offset: { x: 0, y: -0.05 },
              transition: { in: 'fade' },
            },
          ],
        },
        // End card background
        {
          clips: [
            {
              asset: { type: 'html', html: '<div style="width:1080px;height:1920px;background:#000a15"></div>', width: 1080, height: 1920 },
              start: endCardStart,
              length: endCardDuration,
            },
          ],
        },
      ],
    }

    const shotRes = await fetch(shotStackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotStackApiKey },
      body: JSON.stringify({
        timeline,
        output: { format: 'mp4', resolution: 'hd', aspectRatio: '9:16' },
      }),
    })

    if (!shotRes.ok) {
      const errText = await shotRes.text()
      throw new Error('Shotstack error: ' + errText)
    }

    const shotData = await shotRes.json()
    const renderId = shotData.response?.id

    await sb.from('splice_videos').update({ status: 'rendering', render_job_id: renderId }).eq('id', videoId)

    return NextResponse.json({
      renderId,
      videoId,
      clipCount: clips.length,
      totalDuration,
      captionChunks: allCaptionChunks.length,
    })
  } catch (e: any) {
    console.error('Reels render error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
